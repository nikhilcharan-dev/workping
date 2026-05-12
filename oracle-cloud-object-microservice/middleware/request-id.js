import { randomUUID } from "node:crypto";

/**
 * Per-request correlation ID. Honors a sane inbound `X-Request-ID` so the
 * value rides through from nginx / centralized-server, otherwise mints a
 * fresh UUID. The id is echoed back via the response header and pinned to
 * `req.id` so pino's child logger can include it on every log line in the
 * request's lifecycle.
 */
const ID_PATTERN = /^[A-Za-z0-9._\-:]{1,128}$/;

export default function requestId(req, res, next) {
  const inbound = req.headers["x-request-id"];
  const id = typeof inbound === "string" && ID_PATTERN.test(inbound) ? inbound : randomUUID();
  req.id = id;
  res.setHeader("X-Request-ID", id);
  next();
}
