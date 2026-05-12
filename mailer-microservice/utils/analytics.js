import redis from "../config/redisConfig.js";

// Counters live in a single Redis hash keyed by field. HINCRBY is atomic at
// the Redis side, so concurrent /send-* calls from multiple replicas can no
// longer clobber each other the way the previous read-modify-write against
// analytics.json could. lastUpdated is last-writer-wins by design — it's a
// status marker, not a counter, and an exact ordering isn't load-bearing.
const HASH_KEY = "mail:analytics";

const KNOWN_TYPES = new Set(["otp", "forgotPassword", "greeting", "alert", "notification", "raw"]);

const INITIAL_DATA = {
  totalSent: 0,
  success: 0,
  failure: 0,
  byType: {
    otp: 0,
    forgotPassword: 0,
    greeting: 0,
    alert: 0,
    notification: 0,
    raw: 0,
  },
  lastUpdated: new Date(0).toISOString(),
};

export async function logEmailEvent(type, status) {
  try {
    const typeField = KNOWN_TYPES.has(type) ? type : "raw";
    const statusField = status === "success" ? "success" : "failure";
    await Promise.all([
      redis.hIncrBy(HASH_KEY, "totalSent", 1),
      redis.hIncrBy(HASH_KEY, statusField, 1),
      redis.hIncrBy(HASH_KEY, `byType:${typeField}`, 1),
      redis.hSet(HASH_KEY, "lastUpdated", new Date().toISOString()),
    ]);
  } catch (err) {
    // Fail open — losing a counter is acceptable, blocking the email isn't.
    console.error("[Analytics Error] Failed to log event:", err.message);
  }
}

export async function getStats() {
  try {
    const raw = await redis.hGetAll(HASH_KEY);
    if (!raw || Object.keys(raw).length === 0) return INITIAL_DATA;
    const num = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      totalSent: num(raw.totalSent),
      success: num(raw.success),
      failure: num(raw.failure),
      byType: {
        otp: num(raw["byType:otp"]),
        forgotPassword: num(raw["byType:forgotPassword"]),
        greeting: num(raw["byType:greeting"]),
        alert: num(raw["byType:alert"]),
        notification: num(raw["byType:notification"]),
        raw: num(raw["byType:raw"]),
      },
      lastUpdated: raw.lastUpdated || INITIAL_DATA.lastUpdated,
    };
  } catch (err) {
    console.error("[Analytics Error] Failed to get stats:", err.message);
    return INITIAL_DATA;
  }
}
