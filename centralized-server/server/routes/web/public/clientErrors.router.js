import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import logger from "#utils/logger.js";

const router = Router();

// Cap ingestion so a buggy page cannot flood the log pipeline.
const clientErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { type: "error", message: "Too many error reports" },
});

const trim = (s, n) => (typeof s === "string" ? s.slice(0, n) : undefined);

router.post("/", clientErrorLimiter, (req, res) => {
  const body = req.body || {};
  logger.error("client_error", {
    feature: "CLIENT_ERROR",
    source: trim(body.source, 32) || "unknown",
    kind: trim(body.kind, 32) || "error",
    message: trim(body.message, 1000),
    stack: trim(body.stack, 4000),
    componentStack: trim(body.componentStack, 4000),
    url: trim(body.url, 500),
    userAgent: trim(req.get("user-agent"), 500),
    ip: req.ip,
  });
  res.status(204).end();
});

export default router;
