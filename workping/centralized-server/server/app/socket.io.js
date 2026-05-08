import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const allowedOrigins = [
    "http://10.144.15.154:5173",
    "http://localhost:5173",
    "https://work-ping-liart.vercel.app",
    "http://127.0.0.1:5501",
    "https://workping.live",
    "https://www.workping.live",
    "https://phonepe.workping.live",
    "https://whatsapp.workping.live",
    process.env.CLIENT_URL,
];

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

    await Promise.all([pubClient.connect(), subClient.connect()]);

    pubClient.on("error", (err) => console.error("[Socket.io pubClient]", err.message));
    subClient.on("error", (err) => console.error("[Socket.io subClient]", err.message));

    globalThis.io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
        },
        adapter: createAdapter(pubClient, subClient),
    });

    console.log("[Socket.io] Redis adapter attached — cluster-safe");

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
                console.error("[Socket] redis.get error:", err.message);
                socket.emit("payment:error", "Failed to fetch payment status");
            }
        });

        socket.on("disconnect", () => {
            // rooms are cleaned up automatically by socket.io
        });
    });
}
