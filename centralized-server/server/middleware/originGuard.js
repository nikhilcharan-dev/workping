import { allowedOrigins } from "#config/cors.js";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Routes that legitimately receive cross-origin / server-to-server traffic
// without a browser Origin header. These rely on their own authentication
// (HMAC signature for PhonePe, x-internal-secret for internal routes).
const EXEMPT_PREFIXES = ["/api/phonepe", "/internal"];

function originOf(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export default function originGuard(req, res, next) {
  if (!STATE_CHANGING.has(req.method)) return next();
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const origin = req.get("origin") || originOf(req.get("referer"));
  if (origin && allowedOrigins.includes(origin)) return next();

  return res.status(403).json({
    type: "error",
    message: "Request origin not allowed",
  });
}
