import { createClient } from "redis";
import "dotenv/config";

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    reconnectStrategy: (retries) => Math.min(1000 * Math.pow(2, retries), 30000),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on("error", (err) => console.error("[PhonePe Redis] Error:", err));
redis.on("ready", () => console.log("[PhonePe Redis] Ready"));

if (process.env.NODE_ENV !== "test") {
  await redis.connect();
}

export default redis;
