// Field names whose values should never be retained verbatim. The list errs
// on the side of over-redaction — a debugging log is allowed to hide a value
// it doesn't really need to show.
const SENSITIVE_KEYS = new Set([
    "password",
    "currentPassword",
    "newPassword",
    "confirmPassword",
    "token",
    "accessToken",
    "refreshToken",
    "Authorization",
    "authorization",
    "code",
    "code_verifier",
    "image_base64",
    "frames",
    "otp",
    "pin",
    "secret",
    "apiKey",
    "api_key",
]);

function redact(value, depth = 0) {
    if (depth > 5 || value == null) return value;
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    if (typeof value !== "object") return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEYS.has(k)) {
            out[k] = typeof v === "string" && v.length ? `[REDACTED:${v.length}]` : "[REDACTED]";
        } else {
            out[k] = redact(v, depth + 1);
        }
    }
    return out;
}

class LogStore {
    constructor() {
        this.logs = [];
        this.maxLogs = 50;
        this.listeners = [];
    }

    addLog(log) {
        const newLog = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            ...redact(log),
        };
        this.logs = [newLog, ...this.logs].slice(0, this.maxLogs);
        this.notify();
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        this.notify();
    }

    on(event, callback) {
        if (event === "change") {
            this.listeners.push(callback);
        }
    }

    off(event, callback) {
        if (event === "change") {
            this.listeners = this.listeners.filter((l) => l !== callback);
        }
    }

    notify() {
        this.listeners.forEach((callback) => callback(this.logs));
    }
}

const logStore = new LogStore();
export default logStore;
