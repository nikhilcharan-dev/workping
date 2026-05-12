import { randomUUID } from "node:crypto";

/**
 * Attach a per-request correlation ID. Honors inbound `X-Request-ID` if it
 * looks safe, otherwise mints a fresh UUID. Echoed back via response header
 * for log-trace correlation across services.
 */
const ID_PATTERN = /^[A-Za-z0-9._\-:]{1,128}$/;

export default function requestId(req, res, next) {
  const inbound = req.headers["x-request-id"];
  const id = typeof inbound === "string" && ID_PATTERN.test(inbound) ? inbound : randomUUID();
  req.id = id;
  res.setHeader("X-Request-ID", id);
  next();
}
