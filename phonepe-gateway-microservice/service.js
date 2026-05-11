/**
 * ============================================================================
 * WorkPing Payments — PhonePe UPI Gateway Microservice
 * ============================================================================
 *
 * Thin wrapper around the PhonePe UPI payment API. Handles payment
 * initiation, status polling, refunds, and the server-to-server webhook
 * that PhonePe calls when a transaction reaches a terminal state.
 *
 * ── ENDPOINTS ───────────────────────────────────────────────────────────────
 *   GET  /health                         — liveness probe (bypasses limiters)
 *   POST /api/payments/initiate          — initiate a UPI payment (signed)
 *   GET  /api/payments/status/:txnId     — poll order status
 *   POST /api/refund/initiate            — initiate a refund
 *   GET  /api/refund/status/:refundId    — poll refund status
 *   POST /api/phonepe/webhook            — PhonePe server-to-server callback
 *                                          (x-webhook-secret verified with
 *                                          crypto.timingSafeEqual — see
 *                                          webhook/phonepe.webhook.js:33-45)
 *   POST /api/payments/phonepe/callback  — browser redirect after payment
 *
 * ── SECURITY LAYERS ─────────────────────────────────────────────────────────
 *   • helmet (CSP disabled here because PhonePe's redirect page injects
 *     its own scripts; everything else stays locked down)
 *   • CORS allowlist: only origins from process.env.ORIGIN +
 *     admin/api/phonepe.workping.live subdomains
 *   • generalLimiter — 100 req / 15 min site-wide
 *   • paymentLimiter — 20 req / 15 min on /api/payments and /api/refund
 *     (tighter brute-force window because each request hits PhonePe and
 *      costs an outbound API call)
 *   • timingSafeEqual on the webhook secret to prevent timing-based
 *     secret-byte enumeration
 *
 * ── PAYMENT STATE MACHINE (webhook/phonepe.webhook.js) ─────────────────────
 *   PENDING ──► COMPLETED  ── Subscription created + WhatsApp receipt
 *           ──► FAILED     ── Order marked failed, no subscription
 *           ──► CANCELLED  ── User-abort path
 *   Terminal states are absorbing — no further transitions accepted.
 *   On COMPLETED, a MongoDB transaction atomically inserts/updates
 *   Order + Payment + Subscription documents.
 *
 * ── PHONEPE ENVIRONMENTS ────────────────────────────────────────────────────
 *   Sandbox       https://api-preprod.phonepe.com/apis/pg-sandbox
 *   Production    https://api.phonepe.com/apis/pg
 *   Switch via PHONEPE_BASE_URL + PHONEPE_AUTH_BASE_URL env vars.
 *
 * ── IMPLEMENTATION FILES IN THIS SERVICE ───────────────────────────────────
 *   routes/router.payment.js         — /api/payments/* handlers
 *   routes/router.refund.js          — /api/refund/* handlers
 *   routes/callback.js               — browser redirect handler
 *   webhook/phonepe.webhook.js       — HMAC-verified webhook + state machine
 *   service/phonepe.client.js        — axios wrapper around PhonePe APIs
 *   test/sandbox.test.js             — HMAC + state-machine tests
 *
 * ── CALLED BY ───────────────────────────────────────────────────────────────
 *   centralized-server/server/services/phonepe/phonepe.gateway.js
 *   (Core API client that forwards initiate requests with API-key auth.)
 * ============================================================================
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import "dotenv/config";

import paymentRoutes from "./routes/router.payment.js";
import refundRoutes from "./routes/router.refund.js";
import phonepeWebhook from "./webhook/phonepe.webhook.js";
import phonepeCallback from "./routes/callback.js";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security headers ---
app.use(helmet({ contentSecurityPolicy: false }));

// --- CORS ---
const allowedOrigins = [
  process.env.ORIGIN,
  "https://admin.workping.live",
  "https://workping.live",
  "https://api.workping.live",
  "https://phonepe.workping.live",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked")),
    credentials: true,
  })
);

// --- Rate limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

// Stricter limiter for payment initiation routes
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many payment attempts, please try again later." },
});

app.use(generalLimiter);

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Health check (before auth) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/api/refund", paymentLimiter, refundRoutes);
app.post("/api/phonepe/webhook", phonepeWebhook);
app.post("/api/payments/phonepe/callback", phonepeCallback);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = status === 500 ? "Internal Server Error" : err.message;

  console.error({
    level: "error",
    status,
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: message,
  });
});

if (process.env.NODE_ENV !== "test") {
  (async () => {
    app.listen(PORT, () => {
      console.log(`PhonePe Gateway running on port ${PORT}`);
    });
  })();
}

export default app;
