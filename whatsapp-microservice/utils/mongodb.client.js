import mongoose from "mongoose";
import { logger } from "./logger.js";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "workping_chatbot";

if (!MONGODB_URI && process.env.NODE_ENV !== "test") {
  logger.warn("[MONGODB] MONGODB_URI not set. Persistent fallback will be disabled.");
}

const connectDB = async () => {
  if (!MONGODB_URI) return null;
  
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
      autoIndex: true,
    });
    logger.info(`[MONGODB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`[MONGODB] Error: ${error.message}`);
    return null;
  }
};

// Handle connection events
mongoose.connection.on("error", (err) => {
  logger.error(`[MONGODB] Connection error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("[MONGODB] Disconnected");
});

export { connectDB };
export default mongoose;
