// In-memory metrics collector — persisted to disk across restarts

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_GLOBAL_SAMPLES = 1000;
const MAX_ROUTE_SAMPLES = 200;
const MAX_STATUS_HISTORY = 100;
const MAX_DAILY_HISTORY = 30;
const PERSIST_INTERVAL = 60_000; // save every 60s
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "metrics.json");

let totalRequests = 0;
let lastTickTotalRequests = 0;
let lastTickErrorCount = 0;
const statusCodeCounts = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
const routeStats = new Map();
const globalResponseTimes = [];
const statusHistory = [];
const dailyHistory = []; // last 30 daily rollups
let startTime = Date.now();

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function ensureTodayEntry() {
    const today = todayKey();
    let entry = dailyHistory.find((d) => d.date === today);
    if (!entry) {
        entry = { date: today, requests: 0, errors: 0, totalTime: 0, responseTimes: [] };
        dailyHistory.push(entry);
        // Trim old days
        while (dailyHistory.length > MAX_DAILY_HISTORY) dailyHistory.shift();
    }
    return entry;
}

// --- Persistence: load / save ---

function loadFromDisk() {
    try {
        if (!fs.existsSync(DATA_FILE)) return;
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

        totalRequests = raw.totalRequests ?? 0;
        lastTickTotalRequests = totalRequests;
        lastTickErrorCount = (raw.statusCodeCounts?.["4xx"] ?? 0) + (raw.statusCodeCounts?.["5xx"] ?? 0);
        for (const key of Object.keys(statusCodeCounts)) {
            statusCodeCounts[key] = raw.statusCodeCounts?.[key] ?? 0;
        }
        globalResponseTimes.length = 0;
        globalResponseTimes.push(...(raw.globalResponseTimes ?? []).slice(-MAX_GLOBAL_SAMPLES));
        statusHistory.length = 0;
        statusHistory.push(...(raw.statusHistory ?? []).slice(-MAX_STATUS_HISTORY));

        if (raw.startTime) startTime = raw.startTime;

        dailyHistory.length = 0;
        dailyHistory.push(...(raw.dailyHistory ?? []).slice(-MAX_DAILY_HISTORY));

        routeStats.clear();
        for (const [route, rs] of Object.entries(raw.routeStats ?? {})) {
            routeStats.set(route, {
                count: rs.count ?? 0,
                totalTime: rs.totalTime ?? 0,
                minTime: rs.minTime ?? Infinity,
                maxTime: rs.maxTime ?? 0,
                responseTimes: (rs.responseTimes ?? []).slice(-MAX_ROUTE_SAMPLES),
                errorCount: rs.errorCount ?? 0,
            });
        }
    } catch {
        // Corrupted file — start fresh
    }
}

export async function saveToDisk() {
    try {
        await fs.promises.mkdir(DATA_DIR, { recursive: true });

        const routeObj = {};
        for (const [route, rs] of routeStats) {
            routeObj[route] = { ...rs };
        }

        // Strip responseTimes from daily entries for smaller file
        const dailyForDisk = dailyHistory.map((d) => ({
            date: d.date,
            requests: d.requests,
            errors: d.errors,
            totalTime: d.totalTime,
            responseTimes: d.responseTimes.slice(-MAX_ROUTE_SAMPLES),
        }));

        const snapshot = {
            totalRequests,
            statusCodeCounts: { ...statusCodeCounts },
            globalResponseTimes: [...globalResponseTimes],
            statusHistory: [...statusHistory],
            dailyHistory: dailyForDisk,
            routeStats: routeObj,
            startTime,
            savedAt: new Date().toISOString(),
        };

        // Atomic write: write to temp file then rename
        const tmpFile = path.join(DATA_DIR, `.metrics-${process.pid}.tmp`);
        await fs.promises.writeFile(tmpFile, JSON.stringify(snapshot), "utf-8");
        await fs.promises.rename(tmpFile, DATA_FILE);
    } catch {
        // Best-effort — don't crash on write failure
    }
}

// Load persisted data on module init
loadFromDisk();

// Periodic save
const persistInterval = setInterval(saveToDisk, PERSIST_INTERVAL);
persistInterval.unref();

function pushCapped(arr, value, max) {
    if (arr.length >= max) arr.shift();
    arr.push(value);
}

function calcP95(times) {
    if (times.length === 0) return 0;
    const sorted = [...times].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, idx)];
}

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(" ");
}

export function metricsMiddleware(req, res, next) {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const routePath = req.baseUrl + (req.route ? req.route.path : "");
        // Skip metrics/dashboard/export requests
        if (routePath === "/api/metrics" || routePath === "/api/metrics/export" || routePath === "/") return;

        const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
        const status = res.statusCode;

        totalRequests++;

        // Bucket status codes
        if (status >= 200 && status < 300) statusCodeCounts["2xx"]++;
        else if (status >= 300 && status < 400) statusCodeCounts["3xx"]++;
        else if (status >= 400 && status < 500) statusCodeCounts["4xx"]++;
        else if (status >= 500) statusCodeCounts["5xx"]++;

        // Global response times (sliding window)
        pushCapped(globalResponseTimes, elapsed, MAX_GLOBAL_SAMPLES);

        // Daily history
        const day = ensureTodayEntry();
        day.requests++;
        day.totalTime += elapsed;
        pushCapped(day.responseTimes, elapsed, MAX_ROUTE_SAMPLES);
        if (status >= 400) day.errors++;

        // Per-route stats
        const method = req.method;
        const normalizedRoute = req.route ? `${method} ${req.baseUrl}${req.route.path}` : `${method} (unmatched)`;

        if (!routeStats.has(normalizedRoute)) {
            routeStats.set(normalizedRoute, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                responseTimes: [],
                errorCount: 0,
            });
        }

        const rs = routeStats.get(normalizedRoute);
        rs.count++;
        rs.totalTime += elapsed;
        rs.minTime = Math.min(rs.minTime, elapsed);
        rs.maxTime = Math.max(rs.maxTime, elapsed);
        pushCapped(rs.responseTimes, elapsed, MAX_ROUTE_SAMPLES);
        if (status >= 400) rs.errorCount++;
    });

    next();
}

export function getMetrics() {
    const uptimeMs = Date.now() - startTime;
    const avg =
        globalResponseTimes.length > 0
            ? globalResponseTimes.reduce((a, b) => a + b, 0) / globalResponseTimes.length
            : 0;

    const errorTotal = statusCodeCounts["4xx"] + statusCodeCounts["5xx"];
    const errorRate = totalRequests > 0 ? (errorTotal / totalRequests) * 100 : 0;

    const routes = [];
    for (const [route, rs] of routeStats) {
        const [method, ...pathParts] = route.split(" ");
        routes.push({
            method,
            route: pathParts.join(" "),
            requests: rs.count,
            avgTime: +(rs.totalTime / rs.count).toFixed(2),
            p95: +calcP95(rs.responseTimes).toFixed(2),
            errors: rs.errorCount,
        });
    }
    routes.sort((a, b) => b.requests - a.requests);

    const daily = dailyHistory.map((d) => ({
        date: d.date,
        requests: d.requests,
        errors: d.errors,
        errorRate: d.requests > 0 ? +((d.errors / d.requests) * 100).toFixed(2) : 0,
        avgTime: d.requests > 0 ? +(d.totalTime / d.requests).toFixed(2) : 0,
        p95: +calcP95(d.responseTimes).toFixed(2),
    }));

    return {
        uptimeMs,
        uptimeFormatted: formatUptime(uptimeMs),
        totalRequests,
        avgResponseTime: +avg.toFixed(2),
        p95ResponseTime: +calcP95(globalResponseTimes).toFixed(2),
        statusCodes: { ...statusCodeCounts },
        errorRate: +errorRate.toFixed(2),
        routes,
        statusHistory: [...statusHistory],
        dailyHistory: daily,
    };
}

export function getMetricsCSV() {
    const m = getMetrics();
    const lines = [];

    // Summary
    lines.push("# Summary");
    lines.push("Metric,Value");
    lines.push(`Uptime,"${m.uptimeFormatted}"`);
    lines.push(`Total Requests,${m.totalRequests}`);
    lines.push(`Avg Response Time (ms),${m.avgResponseTime}`);
    lines.push(`p95 Response Time (ms),${m.p95ResponseTime}`);
    lines.push(`Error Rate (%),${m.errorRate}`);
    lines.push(`2xx,${m.statusCodes["2xx"]}`);
    lines.push(`3xx,${m.statusCodes["3xx"]}`);
    lines.push(`4xx,${m.statusCodes["4xx"]}`);
    lines.push(`5xx,${m.statusCodes["5xx"]}`);
    lines.push("");

    // Routes
    lines.push("# Routes");
    lines.push("Method,Route,Requests,Avg Time (ms),p95 (ms),Errors");
    for (const r of m.routes) {
        lines.push(`${r.method},"${r.route}",${r.requests},${r.avgTime},${r.p95},${r.errors}`);
    }
    lines.push("");

    // Daily history
    lines.push("# Daily History");
    lines.push("Date,Requests,Errors,Error Rate (%),Avg Time (ms),p95 (ms)");
    for (const d of m.dailyHistory) {
        lines.push(`${d.date},${d.requests},${d.errors},${d.errorRate},${d.avgTime},${d.p95}`);
    }

    return lines.join("\n");
}

export function startStatusTicker() {
    const interval = setInterval(() => {
        const currentErrors = statusCodeCounts["4xx"] + statusCodeCounts["5xx"];
        const intervalRequests = totalRequests - lastTickTotalRequests;
        const intervalErrors = currentErrors - lastTickErrorCount;

        lastTickTotalRequests = totalRequests;
        lastTickErrorCount = currentErrors;

        const errorRate = intervalRequests > 0 ? (intervalErrors / intervalRequests) * 100 : 0;

        pushCapped(
            statusHistory,
            {
                timestamp: new Date().toISOString(),
                status: errorRate > 50 ? "down" : "up",
            },
            MAX_STATUS_HISTORY
        );
    }, 30_000);

    interval.unref();
    return interval;
}
