const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes
const LOCK_SECONDS = 15 * 60;   // 15-minute lockout

const attemptKey = (email) => `brute:attempts:${email}`;
const lockKey = (email) => `brute:lock:${email}`;

/**
 * Call after a failed login attempt. Increments the counter and locks the
 * account when MAX_ATTEMPTS is reached.
 */
export async function recordFailedAttempt(email) {
    const key = attemptKey(email);
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
    }
    if (count >= MAX_ATTEMPTS) {
        await redis.set(lockKey(email), "1", { EX: LOCK_SECONDS });
        await redis.del(key);
    }
}

/**
 * Call after a successful login to clear the failure counter.
 */
export async function clearFailedAttempts(email) {
    await redis.del(attemptKey(email));
}

/**
 * Express middleware. Rejects the request immediately when the account is
 * locked. Place BEFORE the password comparison in login routes.
 */
export function checkBruteForce(emailField = "email") {
    return async (req, res, next) => {
        const raw = req.body?.[emailField];
        if (!raw || typeof raw !== "string") return next();

        const email = raw.trim().toLowerCase();
        try {
            const locked = await redis.get(lockKey(email));
            if (locked) {
                return res.status(429).json({
                    type: "error",
                    message: "Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.",
                    code: "ACCOUNT_LOCKED",
                });
            }
        } catch {
            // Redis down — fail open to avoid blocking all logins
        }
        req._loginEmail = email;
        next();
    };
}
