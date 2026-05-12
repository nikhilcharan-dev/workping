import { randomUUID } from "node:crypto";
import logger from "#utils/logger.js";

/**
 * Attach a per-request correlation ID AND a bound child logger.
 *
 * `req.id`  — the correlation ID, mirrored in the X-Request-ID response header
 *              so callers can grep logs by the id they saw in the response.
 * `req.log` — a child logger with `{ requestId }` baked in. Every call to
 *              `req.log.info(...)` / `req.log.error(...)` automatically
 *              includes the id, so controllers never have to pass it manually:
 *
 *                req.log.info("fetching employee", { userId: req.user.userId });
 *
 * Format guard: inbound X-Request-ID is only accepted if it's a sane single-line
 * ASCII token under 128 chars — prevents log-injection via CR/LF.
 */
const ID_PATTERN = /^[A-Za-z0-9._\-:]{1,128}$/;

export default function requestId(req, res, next) {
  const inbound = req.headers["x-request-id"];
  const id = typeof inbound === "string" && ID_PATTERN.test(inbound) ? inbound : randomUUID();
  req.id = id;
  req.log = logger.child({ requestId: id });
  res.setHeader("X-Request-ID", id);
  next();
}
