import redis from "../config/redisConfig.js";

const PER_RECIPIENT_PER_HOUR = parseInt(process.env.MAIL_RL_PER_HOUR || "10", 10);
const PER_RECIPIENT_PER_DAY = parseInt(process.env.MAIL_RL_PER_DAY || "50", 10);

// Per-recipient rate limit. A single shared secret + an open relay shape would
// otherwise mean one leaked SECRET == unlimited mailbombs. Hard caps per
// recipient per hour and per day keep the blast radius bounded even if the
// auth gate fails. Redis is already a dep so the counters survive restarts
// and are shared across replicas.
export function perRecipientRateLimit() {
  return async (req, res, next) => {
    const email = req.body?.email;
    if (typeof email !== "string" || !email) return next();
    const norm = email.toLowerCase();

    try {
      const hourKey = `mail:rl:hour:${norm}`;
      const dayKey = `mail:rl:day:${norm}`;
      const [hourCount, dayCount] = await Promise.all([
        redis.incr(hourKey),
        redis.incr(dayKey),
      ]);
      // Set TTL on first increment of each window
      if (hourCount === 1) await redis.expire(hourKey, 3600);
      if (dayCount === 1) await redis.expire(dayKey, 86400);

      if (hourCount > PER_RECIPIENT_PER_HOUR || dayCount > PER_RECIPIENT_PER_DAY) {
        return res.status(429).json({
          status: "error",
          error: "Recipient rate limit exceeded",
        });
      }
      next();
    } catch (err) {
      // Fail open on Redis blip — better to deliver real mail than block
      // legitimate users on a transient cache outage. The error is logged
      // so operators can see the gap forming.
      console.error("[RateLimit] Redis check failed, allowing through:", err.message);
      next();
    }
  };
}
