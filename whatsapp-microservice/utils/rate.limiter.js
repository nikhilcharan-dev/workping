import redis from "./redis.client.js";
import { logger } from "./logger.js";

const DAILY_LIMIT = 10;
const WARN_AT = 5;
const BAN_DURATION_SEC = 2 * 24 * 60 * 60; // 2 days
const MAX_WARNINGS = 2;

const PROFANITY_LIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "damn",
  "cunt",
  "whore",
  "slut",
  "piss",
  "cock",
  "motherfucker",
  "wtf",
  "stfu",
  "idiot",
  "stupid bot",
  "useless bot",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function rateKey(phone) {
  return `wa:rate:${phone}:${todayISO()}`;
}
function banKey(phone) {
  return `wa:ban:${phone}`;
}

function normalize(text) {
  let s = text.toLowerCase();
  s = s.replace(/(?<=\b\w)[.\-\s]+(?=\w\b)/g, "");
  s = s
    .replace(/@/g, "a")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/4/g, "a");
  s = s.replace(/(.)\1{2,}/g, "$1");
  return s;
}

function containsProfanity(text) {
  const n = normalize(text);
  return PROFANITY_LIST.some((w) => n.includes(w));
}

export async function checkGuards(phone, text) {
  try {
    // 1. Check active ban
    const banRaw = await redis.get(banKey(phone));
    const ban = banRaw ? JSON.parse(banRaw) : { warnings: 0, bannedUntil: 0 };

    if (ban.bannedUntil > Date.now()) {
      const hoursLeft = Math.ceil((ban.bannedUntil - Date.now()) / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: "BANNED",
        replyText: `You have been temporarily banned for inappropriate language. You can use the bot again in *${hoursLeft} hours*.`,
      };
    }

    // 2. Profanity check
    if (containsProfanity(text)) {
      ban.warnings++;
      if (ban.warnings > MAX_WARNINGS) {
        ban.bannedUntil = Date.now() + BAN_DURATION_SEC * 1000;
        await redis.set(banKey(phone), JSON.stringify(ban), "EX", BAN_DURATION_SEC);
        return {
          allowed: false,
          reason: "BANNED",
          replyText:
            "You have been *banned for 2 days* due to repeated inappropriate language. Please be respectful when using this service.",
        };
      }
      await redis.set(banKey(phone), JSON.stringify(ban), "EX", BAN_DURATION_SEC);
      return {
        allowed: false,
        reason: "PROFANITY_WARNING",
        replyText: `Please avoid inappropriate language. This is warning *${ban.warnings}/${MAX_WARNINGS}*. Further violations will result in a 2-day ban.`,
      };
    }

    // 3. Daily rate limit — INCR + expire at end of day
    const count = await redis.incr(rateKey(phone));
    if (count === 1) {
      // First message today — expire key at midnight UTC+5:30
      const secondsUntilMidnight = 86400 - (Math.floor(Date.now() / 1000) % 86400);
      await redis.expire(rateKey(phone), secondsUntilMidnight + 19800); // +5:30h offset
    }

    if (count > DAILY_LIMIT) {
      return {
        allowed: false,
        reason: "RATE_LIMITED",
        replyText: "You've reached your daily message limit (*10 messages/day*). Please try again tomorrow!",
      };
    }

    const remaining = DAILY_LIMIT - count;
    const warning = count === WARN_AT ? `Note: You have *${remaining} messages* remaining for today.` : null;

    return { allowed: true, warning, remaining };
  } catch (error) {
    logger.error("[RateLimit] Redis unavailable, allowing message without enforcement:", error.message);
    return { allowed: true, warning: null, remaining: null };
  }
}

export async function getGuardedUsers() {
  const banKeys = await redis.keys("wa:ban:*");
  const rateKeys = await redis.keys(`wa:rate:*:${todayISO()}`);
  const users = new Map();

  for (const k of banKeys) {
    const phone = k.replace("wa:ban:", "");
    const raw = await redis.get(k);
    if (!raw) continue;
    const ban = JSON.parse(raw);
    if (ban.bannedUntil > Date.now() || ban.warnings > 0) {
      users.set(phone, {
        phone,
        ...users.get(phone),
        warnings: ban.warnings,
        banned: ban.bannedUntil > Date.now(),
        bannedUntil: ban.bannedUntil,
        banHoursLeft: Math.ceil((ban.bannedUntil - Date.now()) / (60 * 60 * 1000)),
      });
    }
  }

  for (const k of rateKeys) {
    const phone = k.split(":")[2];
    const count = parseInt((await redis.get(k)) || "0");
    if (count >= DAILY_LIMIT) {
      users.set(phone, { phone, ...users.get(phone), rateLimited: true, messagesUsed: count, date: todayISO() });
    }
  }

  return [...users.values()];
}

export async function unbanUser(phone) {
  const raw = await redis.get(banKey(phone));
  if (!raw) return false;
  await redis.set(banKey(phone), JSON.stringify({ warnings: 0, bannedUntil: 0 }), "EX", 60);
  return true;
}

export async function unrateLimitUser(phone) {
  await redis.del(rateKey(phone));
  return true;
}

export async function getGuardStats() {
  const banKeys = await redis.keys("wa:ban:*");
  const rateKeys = await redis.keys(`wa:rate:*:${todayISO()}`);
  let bannedCount = 0;
  let rateLimitedCount = 0;

  for (const k of banKeys) {
    const raw = await redis.get(k);
    if (!raw) continue;
    const ban = JSON.parse(raw);
    if (ban.bannedUntil > Date.now()) bannedCount++;
  }

  for (const k of rateKeys) {
    const count = parseInt((await redis.get(k)) || "0");
    if (count >= DAILY_LIMIT) rateLimitedCount++;
  }

  return { rateLimitedCount, bannedCount };
}
