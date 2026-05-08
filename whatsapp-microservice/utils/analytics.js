/**
 * Analytics tracker with file-based persistence.
 * Saves stats to data/analytics.json periodically and on each message.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "data");
const DATA_FILE = resolve(DATA_DIR, "analytics.json");

const MAX_RECENT = 50;
const MAX_RESPONSE_TIMES = 200;
const FLUSH_INTERVAL_MS = 30_000; // flush every 30s

// ---- Default empty state ----
function emptyStats() {
    return {
        totalMessages: 0,
        totalErrors: 0,
        intentCounts: {},
        modeCounts: { TEMPLATE: 0, LLM: 0, GUARD: 0 },
        hourlyMessages: new Array(24).fill(0),
        recentMessages: [],
        uniqueUsersArr: [],
        avgResponseTime: 0,
        responseTimes: [],
        startedAt: Date.now(),
    };
}

// ---- Load from disk ----
function loadStats() {
    try {
        const raw = readFileSync(DATA_FILE, "utf-8");
        const saved = JSON.parse(raw);

        // Merge saved data into a clean structure
        const s = emptyStats();
        s.totalMessages = saved.totalMessages ?? 0;
        s.totalErrors = saved.totalErrors ?? 0;
        s.intentCounts = saved.intentCounts ?? {};
        s.modeCounts = { TEMPLATE: 0, LLM: 0, ...(saved.modeCounts ?? {}) };
        s.hourlyMessages =
            Array.isArray(saved.hourlyMessages) && saved.hourlyMessages.length === 24
                ? saved.hourlyMessages
                : new Array(24).fill(0);
        s.recentMessages = Array.isArray(saved.recentMessages) ? saved.recentMessages.slice(0, MAX_RECENT) : [];
        s.uniqueUsersArr = Array.isArray(saved.uniqueUsersArr) ? saved.uniqueUsersArr : [];
        s.avgResponseTime = saved.avgResponseTime ?? 0;
        s.responseTimes = Array.isArray(saved.responseTimes) ? saved.responseTimes.slice(-MAX_RESPONSE_TIMES) : [];
        s.startedAt = saved.startedAt ?? Date.now();

        console.log("[ANALYTICS] Loaded from disk:", s.totalMessages, "messages,", s.uniqueUsersArr.length, "users");
        return s;
    } catch {
        console.log("[ANALYTICS] No saved data found, starting fresh");
        return emptyStats();
    }
}

// ---- Save to disk ----
function saveStats() {
    try {
        mkdirSync(DATA_DIR, { recursive: true });
        const toSave = {
            totalMessages: stats.totalMessages,
            totalErrors: stats.totalErrors,
            intentCounts: stats.intentCounts,
            modeCounts: stats.modeCounts,
            hourlyMessages: stats.hourlyMessages,
            recentMessages: stats.recentMessages,
            uniqueUsersArr: [...uniqueUsers],
            avgResponseTime: stats.avgResponseTime,
            responseTimes: stats.responseTimes,
            startedAt: stats.startedAt,
        };
        writeFileSync(DATA_FILE, JSON.stringify(toSave, null, 2), "utf-8");
    } catch (err) {
        console.error("[ANALYTICS] Failed to save:", err.message);
    }
}

// ---- Init ----
const stats = loadStats();
const uniqueUsers = new Set(stats.uniqueUsersArr);
let dirty = false;

// Periodic flush
setInterval(() => {
    if (dirty) {
        saveStats();
        dirty = false;
    }
}, FLUSH_INTERVAL_MS);

// Save on process exit
process.on("beforeExit", saveStats);
process.on("SIGINT", () => {
    saveStats();
    process.exit(0);
});
process.on("SIGTERM", () => {
    saveStats();
    process.exit(0);
});

// ---- Public API ----

export function trackMessage({ from, username, text, intent, confidence, mode, responseTimeMs }) {
    stats.totalMessages++;

    // Intent distribution
    stats.intentCounts[intent] = (stats.intentCounts[intent] || 0) + 1;

    // Response mode
    if (mode) {
        stats.modeCounts[mode] = (stats.modeCounts[mode] || 0) + 1;
    }

    // Hourly distribution
    const hour = new Date().getHours();
    stats.hourlyMessages[hour]++;

    // Unique users
    uniqueUsers.add(from);

    // Response time
    if (responseTimeMs) {
        stats.responseTimes.push(responseTimeMs);
        if (stats.responseTimes.length > MAX_RESPONSE_TIMES) {
            stats.responseTimes.shift();
        }
        stats.avgResponseTime = Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length);
    }

    // Recent messages log
    stats.recentMessages.unshift({
        from,
        username: username || from,
        text: text?.slice(0, 100),
        intent,
        confidence,
        mode,
        responseTimeMs,
        timestamp: Date.now(),
    });
    if (stats.recentMessages.length > MAX_RECENT) {
        stats.recentMessages.pop();
    }

    dirty = true;
    // Immediate save on each message (cheap for low-volume WhatsApp bot)
    saveStats();
}

export function trackError() {
    stats.totalErrors++;
    dirty = true;
}

export function getStats() {
    return {
        totalMessages: stats.totalMessages,
        totalErrors: stats.totalErrors,
        uniqueUsers: uniqueUsers.size,
        avgResponseTime: stats.avgResponseTime,
        intentCounts: { ...stats.intentCounts },
        modeCounts: { ...stats.modeCounts },
        hourlyMessages: [...stats.hourlyMessages],
        recentMessages: stats.recentMessages.slice(0, 50),
        uptime: Math.floor((Date.now() - stats.startedAt) / 1000),
    };
}
