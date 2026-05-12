import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import logger from "#utils/logger.js";

import { allowedOrigins } from "#config/cors.js";

const JWT_ALGORITHMS = ["HS256"];

function extractTokenFromHandshake(socket) {
  // Prefer explicit auth payload (works in browsers and native clients).
  const authToken = socket.handshake?.auth?.token;
  if (typeof authToken === "string" && authToken) return authToken;

  // Fallback to Authorization header for non-browser clients.
  const authHeader = socket.handshake?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Last resort: parse the accessToken cookie out of the handshake.
  const rawCookie = socket.handshake?.headers?.cookie;
  if (typeof rawCookie === "string") {
    for (const part of rawCookie.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const name = part.slice(0, idx).trim();
      if (name === "accessToken") {
        return decodeURIComponent(part.slice(idx + 1).trim());
      }
    }
  }
  return null;
}

function makeRedisClient() {
  return createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      keepAlive: 10_000,
      reconnectStrategy: (retries) => Math.min(30_000, 1000 * Math.pow(2, retries)),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

export default async function socket(server) {
  // Two separate clients are required — Redis pub and sub cannot share a connection
  const pubClient = makeRedisClient();
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => logger.error("[Socket.io pubClient]", err.message));
  subClient.on("error", (err) => logger.error("[Socket.io subClient]", err.message));

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
  } catch (err) {
    logger.error("[Socket.io] CRITICAL: Redis connection failed, real-time payment events will not be delivered:", err.message);
    throw new Error(`[Socket.io] Failed to initialize Redis adapter: ${err.message}`);
  }

  globalThis.io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
    adapter: createAdapter(pubClient, subClient),
  });

  logger.info("[Socket.io] Redis adapter attached — cluster-safe");

  // Connection-level auth: every socket must present a valid JWT at handshake.
  // Without this, any client can join any user's payment room (see audit P0).
  io.use((socket, next) => {
    const token = extractTokenFromHandshake(socket);
    if (!token) return next(new Error("Unauthorized"));
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY, { algorithms: JWT_ALGORITHMS });
      if (!decoded?.userId) return next(new Error("Unauthorized"));
      socket.data.userId = String(decoded.userId);
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    /**
     * Client emits "payment:join" with { userId } immediately after
     * being redirected to the PhonePe payment page.
     * We join them to their room and replay the current Redis status so
     * the UI shows "Processing your payment..." straight away.
     */
    socket.on("payment:join", async ({ userId }) => {
      if (!userId || typeof userId !== "string") {
        return socket.emit("payment:error", "Invalid userId");
      }

      // Ownership check: a socket may only join its own payment room.
      if (userId !== socket.data.userId) {
        return socket.emit("payment:error", "Forbidden");
      }

      socket.join(`payment:${userId}`);

      try {
        const raw = await redis.get(`payment:${userId}`);
        const data = raw ? JSON.parse(raw) : null;

        if (data) {
          socket.emit("payment:status", data);
        } else {
          socket.emit("payment:status", { status: "None" });
        }
      } catch (err) {
        logger.error("[Socket] redis.get error:", err.message);
        socket.emit("payment:error", "Failed to fetch payment status");
      }
    });

    socket.on("disconnect", () => {
      // rooms are cleaned up automatically by socket.io
    });
  });
}
