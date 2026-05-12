import Redis from "ioredis";

const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

redisClient.on("error", (err) => {
  console.error("[REDIS] Connection error:", err.message);
});

export default redisClient;
