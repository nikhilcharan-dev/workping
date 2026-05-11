/**
 * ============================================================================
 * AppError — Operational Error Class for WorkPing Core API
 * ============================================================================
 *
 * Every controller wraps its work with `globalThis.asyncHandler` (set up in
 * globals.js). When a handler throws `new AppError(...)`, the error reaches
 * `middleware/errorHandler.js` which inspects the operational flag and
 * decides whether to (a) return a clean JSON response with the carried
 * status/code or (b) treat it as a programming bug and log a stack trace.
 *
 * ── WHY A CUSTOM ERROR CLASS ────────────────────────────────────────────────
 * • `statusCode` — the HTTP status code we want returned to the client.
 *   Lets controllers stay focused on business logic without `res.status(...)`
 *   noise at every failure branch.
 * • `code` — stable machine-readable error code (e.g. "NO_TOKEN",
 *   "ORG_NOT_FOUND") that mobile and SPA clients switch on instead of
 *   parsing free-text messages. Localisation-friendly.
 * • `isOperational = true` — distinguishes EXPECTED failures (bad input,
 *   missing resource) from PROGRAMMING failures (null deref, syntax). The
 *   global error handler logs operational errors at INFO and programming
 *   errors at ERROR — alerts only fire on the latter, so Sentry / pager
 *   noise stays low.
 * • `feature` — which feature surface the error came from
 *   (e.g. "attendance.check_in"), for analytics + per-feature dashboards.
 * • `upstream` — when a microservice call fails, this carries the upstream
 *   service name (e.g. "face-api", "phonepe-gateway") so the error response
 *   tells the client which downstream system is degraded — useful for
 *   status-page automation.
 * • `cause` — preserved original error reference, accessible while
 *   keeping the AppError as the visible boundary.
 * • `Error.captureStackTrace` — strips the constructor itself from the
 *   stack so the trace begins at the actual throw site.
 *
 * ── USAGE ──────────────────────────────────────────────────────────────────
 *   throw new AppError("Org not found", 404, "ORG_NOT_FOUND", {
 *     feature: "organization.fetch",
 *   });
 *
 *   throw new AppError("Face service unreachable", 503, "UPSTREAM_DOWN", {
 *     upstream: "face-api",
 *     cause: err,
 *   });
 * ============================================================================
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code, options = {}) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Optional metadata (very useful in microservices)
    this.feature = options.feature;
    this.upstream = options.upstream;
    this.cause = options.cause;

    Error.captureStackTrace(this, this.constructor);
  }
}
