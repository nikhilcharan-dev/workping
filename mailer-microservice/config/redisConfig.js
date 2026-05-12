import { createClient } from "redis";
import "dotenv/config";
import { logger } from "../utils/logger.js";

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    keepAlive: 10_000,
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on("ready", () => {
  logger.info("[Redis Client] Ready");
});

redis.on("error", (err) => {
  logger.error("[Redis Client] Error occurred:", { err: err.message });
});

export default redis;
