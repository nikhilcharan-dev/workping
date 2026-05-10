import { createClient } from "redis";
import "dotenv/config";

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    keepAlive: 10_000,
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on("ready", () => {
  console.log("[Redis Client] Ready");
});

redis.on("error", (err) => {
  console.log("[Redis Client] Error occurred: " + err);
});

export default redis;
