import express from "express";
import cors from "cors";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";

import whatsappConfig from "./config/whatsappConfig.js";
import whatsAppWebhook from "./webhook/whatsapp.webhook.js";
import whatsAppRoutes from "./routes/origin.router.js";
import dashboardApi from "./routes/dashboard.api.js";
import { healthCheck } from "./utils/llm.provider.js";
import { startReminderWorker } from "./scheduler/shift.reminder.js";

// Dashboard auth
const DASHBOARD_USER = process.env.DASHBOARD_USER;
const DASHBOARD_PASS = process.env.DASHBOARD_PASS;
if (!DASHBOARD_USER || !DASHBOARD_PASS) {
    throw new Error("[CONFIG] DASHBOARD_USER and DASHBOARD_PASS env vars are required");
}
const activeSessions = new Map(); // token -> expiry

// Sweep expired sessions every 30 minutes
setInterval(
    () => {
        const now = Date.now();
        for (const [token, expiry] of activeSessions) {
            if (now > expiry) activeSessions.delete(token);
        }
    },
    30 * 60 * 1000
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3000;
const ORIGIN = process.env.ORIGIN;

const server = express();
server.use(cors({ origin: ORIGIN, credentials: true }));
server.use(express.urlencoded({ extended: false }));
server.use(express.json());

// Request logging
server.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
});

// Static files
server.use("/static", express.static(join(__dirname, "public")));

// Login endpoint
server.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === DASHBOARD_USER && password === DASHBOARD_PASS) {
        const token = crypto.randomBytes(32).toString("hex");
        activeSessions.set(token, Date.now() + 24 * 60 * 60 * 1000); // 24h
        return res.json({ ok: true, token });
    }
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
});

// Auth middleware for dashboard & API
function requireAuth(req, res, next) {
    const token = req.headers["x-dashboard-token"] || req.query.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const expiry = activeSessions.get(token);
    if (!expiry || Date.now() > expiry) {
        activeSessions.delete(token);
        return res.status(401).json({ error: "Session expired" });
    }
    next();
}

// Dashboard (serves login page or dashboard based on client-side token)
server.get("/dashboard", (req, res) => {
    res.sendFile(join(__dirname, "public", "dashboard.html"));
});

server.get("/keepmealive", (req, res) => {
    return res.status(200).send({
        status: "OK",
    });
});

server.get("/health", async (req, res) => {
    const llm = await healthCheck();
    return res.status(llm.ok ? 200 : 503).send({
        status: llm.ok ? "OK" : "DEGRADED",
        llm,
    });
});

// API routes (dashboard protected by auth)
server.use("/api/dashboard", requireAuth, dashboardApi);
server.use("/api/secure/whatsapp", whatsappConfig);
server.use("/api/secure/whatsapp", whatsAppWebhook);
server.use("/api/secure/whatsapp", whatsAppRoutes);

(async () => {
    const llm = await healthCheck();
    console.log("LLM status:", llm);

    server.listen(PORT, () => {
        console.log(`Listening on ${PORT}`);
        console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
        startReminderWorker();
    });
})();
