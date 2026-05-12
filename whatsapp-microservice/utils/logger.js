/**
 * Structured JSON logger (zero deps). One JSON line per call to stdout/stderr.
 * Levels filter via LOG_LEVEL (default "info"). `child(...)` attaches scope
 * fields (e.g. requestId, phone) that ride every downstream log line.
 */

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
const ACTIVE_LEVEL = LEVELS[(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;

function emit(level, msg, fields) {
  if (LEVELS[level] < ACTIVE_LEVEL) return;
  const record = {
    ts: new Date().toISOString(),
    level,
    msg: typeof msg === "string" ? msg : String(msg),
    ...(fields && typeof fields === "object" ? fields : {}),
  };
  const out = level === "error" || level === "fatal" ? process.stderr : process.stdout;
  out.write(JSON.stringify(record) + "\n");
}

function makeLogger(baseFields = {}) {
  const bind = (level) => (msg, fields) => emit(level, msg, { ...baseFields, ...(fields || {}) });
  return {
    trace: bind("trace"),
    debug: bind("debug"),
    info: bind("info"),
    warn: bind("warn"),
    error: bind("error"),
    fatal: bind("fatal"),
    child: (extra) => makeLogger({ ...baseFields, ...extra }),
  };
}

export const logger = makeLogger({ service: process.env.SERVICE_NAME || "workping-chatbot" });
export default logger;
