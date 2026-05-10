import { createClient } from "redis";
import "dotenv/config";

const backoff = (retries, base = 1000, cap = 30000) => Math.min(cap, base * Math.pow(2, retries));

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    keepAlive: 10_000,
    reconnectStrategy: (retries) => {
      const delay = backoff(retries);
      console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
      return delay;
    },
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on("ready", () => {
  console.log("[Redis Client] Ready");
});

redis.on("error", (err) => {
  console.error("[Redis Client] Error: " + err);
});

export default redis;
