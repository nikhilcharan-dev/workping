import crypto from "crypto";
import logger from "../logger.js";

export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!process.env.API_KEY) {
    logger.error("API_KEY not set — refusing request to prevent open access");
    return res.status(503).json({ error: "Service not configured" });
  }

  if (!apiKey) {
    return res.status(401).json({ error: "Unauthorized: missing API key" });
  }

  try {
    const secretBuf = Buffer.from(process.env.API_KEY);
    const inputBuf = Buffer.from(apiKey);

    if (secretBuf.length !== inputBuf.length || !crypto.timingSafeEqual(secretBuf, inputBuf)) {
      return res.status(401).json({ error: "Unauthorized: invalid API key" });
    }
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: invalid API key" });
  }

  next();
}
