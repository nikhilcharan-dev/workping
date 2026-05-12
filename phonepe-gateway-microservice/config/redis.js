import { createClient } from "redis";
import "dotenv/config";
import { logger } from "../utils/logger.js";

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    reconnectStrategy: (retries) => Math.min(1000 * Math.pow(2, retries), 30000),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on("error", (err) => logger.error("[PhonePe Redis] Error:", { err: err.message }));
redis.on("ready", () => logger.info("[PhonePe Redis] Ready"));

if (process.env.NODE_ENV !== "test") {
  await redis.connect();
}

export default redis;
