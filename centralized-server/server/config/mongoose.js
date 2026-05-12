import mongoose from "mongoose";
import { logger } from "#utils/logger.js";

const backoff = (retries, base = 1000, cap = 30000) => Math.min(cap, base * Math.pow(2, retries));

let retries = 0;

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
    });
    logger.info("[MongoDB] Connected");
    retries = 0;
  } catch (err) {
    const delay = backoff(retries++);
    logger.error("[MongoDB] Connection failed, retrying", { delayMs: delay });
    setTimeout(connect, delay);
  }
};

mongoose.set("autoCreate", false);

mongoose.connection.on("disconnected", () => {
  const delay = backoff(retries++);
  logger.warn("[MongoDB] Disconnected, retrying", { delayMs: delay });
  setTimeout(connect, delay);
});

export default connect;
