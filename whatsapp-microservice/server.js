/**
 * ============================================================================
 * WorkPing Chatbot — WhatsApp Business + LLM Microservice
 * ============================================================================
 *
 * WhatsApp chatbot for employees: query attendance, apply leave, check salary,
 * file complaints, and run multi-step conversational flows. Backed by an
 * LLM intent layer (provider-agnostic via the OpenAI-compatible wire format
 * — Ollama / Bedrock / OpenAI / Groq / OpenRouter / Mistral all work).
 *
 * ── ENDPOINTS ───────────────────────────────────────────────────────────────
 *   GET  /health               — LLM provider health-check (503 if degraded)
 *   GET  /keepmealive          — lightweight ping
 *   GET  /dashboard            — operator dashboard (HTML, login-gated)
 *   POST /api/login            — bcrypt password compare → JWT (24h TTL)
 *   GET  /api/dashboard/*      — protected dashboard API (token in header)
 *   POST /api/secure/whatsapp/webhook  — Meta WhatsApp Cloud API webhook
 *   POST /api/secure/whatsapp/* — config + send routes (internal API key)
 *
 * ── MESSAGE PIPELINE (pipeline/message.pipeline.js) ─────────────────────────
 *   1. Meta webhook → webhook/whatsapp.webhook.js verifies x-hub-signature
 *   2. ruleEngine (intent/rule.engine.js) — fast keyword/regex first pass
 *   3. detectIntent (intent/intent.llm.js) — LLM fallback for ambiguous text
 *   4. context.builder.js — fetches employee profile + last 5 messages
 *   5. strategy.resolver.js — picks template / LLM / multi-step flow
 *   6. Response → sender.js → Meta WhatsApp Cloud API
 *
 * ── MULTI-STEP CONVERSATIONAL FLOWS ────────────────────────────────────────
 * Conversation state lives in Redis (utils/conversation.state.js). Active
 * flows are recognised first via resolveFlowIntent (pipeline lines 13-65)
 * so a user typing "yes" mid-confirmation isn't routed to GREETING:
 *   • LEAVE_REQUEST   — AWAITING_TYPE → DATES → REASON → CONFIRM
 *   • COMPLAINT       — AWAITING_DESCRIPTION → CONFIRM
 *   • LEAVE_APPROVAL  — manager flow, AWAITING_DECISION (approve / reject)
 *
 * ── VOICE FOUNDATION (Future Scope) ────────────────────────────────────────
 *   @aws-sdk/client-transcribe + @aws-sdk/client-polly are installed.
 *   Path: incoming voice note → OGG → Transcribe → existing pipeline →
 *         Polly TTS → response audio. SDKs wired, integration not yet active.
 *
 * ── BACKGROUND WORKERS ──────────────────────────────────────────────────────
 *   scheduler/shift.reminder.js — BullMQ worker that consumes shift-reminder
 *   jobs queued by the Core API (centralized-server/server) at 06:30 IST.
 *
 * ── SECURITY LAYERS ─────────────────────────────────────────────────────────
 *   • CORS allowlist (process.env.ORIGIN with credentials)
 *   • Dashboard auth: bcryptjs hash (12 rounds) + JWT (jsonwebtoken, 24h)
 *     — env vars DASHBOARD_USER, DASHBOARD_PASS_HASH, JWT_SECRET are
 *       hard-required at boot (throws if any missing — line 21-23 below)
 *   • Meta webhook signature verified in webhook/whatsapp.webhook.js
 *   • Per-conversation Redis rate-limiter in utils/rate.limiter.js
 *
 * ── IMPLEMENTATION FILES IN THIS SERVICE ───────────────────────────────────
 *   pipeline/message.pipeline.js    — main message orchestration
 *   intent/rule.engine.js           — keyword/regex intent matcher
 *   intent/intent.llm.js            — LLM intent classifier
 *   response/llm.generator.js       — OpenAI-compatible chat completion
 *   response/templates.js           — pre-written response templates
 *   utils/conversation.state.js     — Redis-backed flow state machine
 *   utils/llm.provider.js           — provider router (Ollama/Bedrock/...)
 *   utils/rate.limiter.js           — per-user message guards
 *   webhook/whatsapp.webhook.js     — Meta Cloud API webhook receiver
 *
 * ── KUBERNETES ──────────────────────────────────────────────────────────────
 *   k8s/whatsapp/deployment.yaml — Deployment + Service manifests authored.
 * ============================================================================
 */

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
import logger from "./utils/logger.js";
import requestId from "./middleware/requestId.js";
import mongoose, { connectDB } from "./utils/mongodb.client.js";

// Dashboard auth — password is stored as a bcrypt hash in the env var.
// To generate: node -e "const b=require('bcryptjs');console.log(b.hashSync('yourpass',12))"
const DASHBOARD_USER = process.env.DASHBOARD_USER;
const DASHBOARD_PASS_HASH = process.env.DASHBOARD_PASS_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
// Integration tests set these vars before importing this module; the env-var
// guard is enforced everywhere else.
const ORIGIN = process.env.ORIGIN;
if (process.env.NODE_ENV !== "test" && (!DASHBOARD_USER || !DASHBOARD_PASS_HASH || !JWT_SECRET || !ORIGIN)) {
  throw new Error("[CONFIG] DASHBOARD_USER, DASHBOARD_PASS_HASH, JWT_SECRET, and ORIGIN env vars are required");
}
const DASHBOARD_TOKEN_TTL = "24h";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3000;

const server = express();
// Request correlation. Must run before any logging so 4xx/5xx responses are
// also tagged with an X-Request-ID the operator can grep against.
server.use(requestId);
server.use(cors({ origin: ORIGIN, credentials: true }));
server.use(express.json({ limit: "10kb" }));
server.use(express.urlencoded({ extended: false, limit: "10kb" }));

// Structured request lifecycle log — JSON line per response, status-aware level.
server.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]("request", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: ms,
    });
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
  const mongoStatus = mongoose.connection.readyState === 1 ? "OK" : "DISCONNECTED";
  const ok = llm.ok && mongoStatus === "OK";
  
  return res.status(ok ? 200 : 503).send({
    status: ok ? "OK" : "DEGRADED",
    llm,
    mongo: mongoStatus,
  });
});

// API routes (dashboard protected by auth)
server.use("/api/dashboard", requireAuth, dashboardApi);
server.use("/api/secure/whatsapp", whatsappConfig);
server.use("/api/secure/whatsapp", whatsAppWebhook);
server.use("/api/secure/whatsapp", whatsAppRoutes);

if (process.env.NODE_ENV !== "test") {
  (async () => {
    await connectDB();
    const llm = await healthCheck();
    console.log("LLM status:", llm);

    server.listen(PORT, () => {
      console.log(`Listening on ${PORT}`);
      console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
      startReminderWorker();
    });
  })();
}

export default server;
