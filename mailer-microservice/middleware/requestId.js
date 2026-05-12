import { randomUUID } from "node:crypto";

/**
 * Attach a per-request correlation ID. See utils/logger.js for log usage.
 *
 * Honors inbound `X-Request-ID` (riding through from nginx / centralized-server)
 * if it looks safe, otherwise mints a fresh UUID. The id is exposed back to
 * the caller via the response header for log-trace correlation.
 */
const ID_PATTERN = /^[A-Za-z0-9._\-:]{1,128}$/;

export default function requestId(req, res, next) {
  const inbound = req.headers["x-request-id"];
  const id = typeof inbound === "string" && ID_PATTERN.test(inbound) ? inbound : randomUUID();
  req.id = id;
  res.setHeader("X-Request-ID", id);
  next();
}
