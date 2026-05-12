import { randomUUID } from "node:crypto";

/**
 * Attach a per-request correlation ID.
 *
 * Honors an inbound `X-Request-ID` header (so the value rides downstream from
 * nginx / a parent service), otherwise mints a fresh UUID. The id is exposed
 * back to the caller via the response header for log correlation and stashed
 * on `req.id` so handlers / loggers can include it in every line.
 *
 * Format guard: an inbound header is only accepted if it's a sane single-line
 * ASCII token under 128 chars. This prevents log-injection via CR/LF and
 * caps the field width for log aggregators that truncate at 256.
 */
const ID_PATTERN = /^[A-Za-z0-9._\-:]{1,128}$/;

export default function requestId(req, res, next) {
  const inbound = req.headers["x-request-id"];
  const id = typeof inbound === "string" && ID_PATTERN.test(inbound) ? inbound : randomUUID();
  req.id = id;
  res.setHeader("X-Request-ID", id);
  next();
}
