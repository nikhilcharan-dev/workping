import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";

import whatsappConfig from "./config/whatsappConfig.js";
import whatsAppWebhook from "./webhook/whatsapp.webhook.js";
import whatsAppRoutes from "./routes/origin.router.js";
import dashboardApi from "./routes/dashboard.api.js";
import { healthCheck } from "./utils/llm.provider.js";
import { startReminderWorker } from "./scheduler/shift.reminder.js";

// Dashboard auth — password is stored as a bcrypt hash in the env var.
// To generate: node -e "const b=require('bcryptjs');console.log(b.hashSync('yourpass',12))"
const DASHBOARD_USER = process.env.DASHBOARD_USER;
const DASHBOARD_PASS_HASH = process.env.DASHBOARD_PASS_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
if (!DASHBOARD_USER || !DASHBOARD_PASS_HASH || !JWT_SECRET) {
    throw new Error("[CONFIG] DASHBOARD_USER, DASHBOARD_PASS_HASH, and JWT_SECRET env vars are required");
}
const DASHBOARD_TOKEN_TTL = "24h";

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

// Login endpoint — compares against bcrypt hash, issues a signed JWT
server.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ ok: false, error: "username and password required" });
    }
    const usernameMatch = username === DASHBOARD_USER;
    const passwordMatch = await bcrypt.compare(password, DASHBOARD_PASS_HASH);
    if (!usernameMatch || !passwordMatch) {
        return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    const token = jwt.sign({ sub: username, role: "dashboard" }, JWT_SECRET, { expiresIn: DASHBOARD_TOKEN_TTL });
    return res.json({ ok: true, token });
});

// Auth middleware — verifies the signed JWT
function requireAuth(req, res, next) {
    const token = req.headers["x-dashboard-token"] || req.query.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    try {
        req.dashboardUser = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Session invalid or expired" });
    }
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
