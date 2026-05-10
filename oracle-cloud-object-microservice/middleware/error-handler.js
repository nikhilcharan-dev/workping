import logger from "../logger.js";

export function errorHandler(err, req, res, _next) {
  logger.error({ err, method: req.method, url: req.url }, "Unhandled error");

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Internal server error";

  res.status(status).json({ error: message });
}
