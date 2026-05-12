import crypto from "node:crypto";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

if (!INTERNAL_SECRET && process.env.NODE_ENV !== "test") {
  console.error("[Startup] FATAL: INTERNAL_SECRET is not set. Payment/refund endpoints would fail open.");
  process.exit(1);
}

export default function internalAuth(req, res, next) {
  if (!INTERNAL_SECRET) return res.status(503).json({ error: "Service not configured" });

  const provided = req.headers["x-internal-secret"];
  if (!provided || typeof provided !== "string") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(INTERNAL_SECRET);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
