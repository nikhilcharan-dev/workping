import { randomUUID } from "node:crypto";
import logger from "../utils/logger.js";

/**
 * Attach a per-request correlation ID AND a bound child logger.
 *
 * `req.id`  — correlation ID, echoed back via X-Request-ID response header.
 * `req.log` — child logger with { requestId } baked in. Webhook handlers
 *              and dashboard routes can log with correlation:
 *                req.log.info("webhook received", { from: phone });
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
