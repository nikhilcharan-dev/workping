import { createClient } from "redis";
import "dotenv/config";
import { logger } from "#utils/logger.js";

const backoff = (retries, base = 1000, cap = 30000) => Math.min(cap, base * Math.pow(2, retries));

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    keepAlive: 10_000,
    reconnectStrategy: (retries) => {
      const delay = backoff(retries);
      logger.warn("[Redis] Reconnecting", { delayMs: delay, attempt: retries + 1 });
      return delay;
    },
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on("ready", () => {
  logger.info("[Redis Client] Ready");
});

redis.on("error", (err) => {
  logger.error("[Redis Client] Error", { error: err.message });
});

export default redis;
