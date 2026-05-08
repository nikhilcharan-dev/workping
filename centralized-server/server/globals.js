import { asyncHandler } from "./utils/async.handler.js";
import { AppError } from "./utils/app.error.js";
import redis from "./config/redis.js";

globalThis.asyncHandler = asyncHandler;
globalThis.AppError = AppError;
globalThis.redis = redis;
