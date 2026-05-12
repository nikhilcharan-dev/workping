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
import internalAuth from "./middleware/internalAuth.js";
import requestId from "./middleware/requestId.js";
import logger from "./utils/logger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Request correlation. Runs before everything else so 4xx/5xx responses are
// also tagged with an X-Request-ID the operator can grep against.
app.use(requestId);

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
    origin: (origin, cb) => {
      // Require origin to be present and in the allowlist (no null origin allowed)
      if (origin && allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("CORS not allowed"));
      }
    },
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
// Capture raw body on the webhook path so HMAC verification operates on the
// exact bytes PhonePe signed. Re-serializing parsed JSON would break HMAC
// because key order / whitespace / Unicode escaping is not guaranteed stable.
app.use(
  express.json({
    limit: "10kb",
    verify: (req, _res, buf) => {
      if (req.originalUrl === "/api/phonepe/webhook") {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// --- Health check (before auth) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// --- Routes ---
// /api/payments and /api/refund are server-to-server only (called by
// centralized-server). The webhook authenticates via PhonePe's HMAC, and the
// callback authenticates via its own internal secret + PhonePe status re-fetch.
app.use("/api/payments", paymentLimiter, internalAuth, paymentRoutes);
app.use("/api/refund", paymentLimiter, internalAuth, refundRoutes);
app.post("/api/phonepe/webhook", phonepeWebhook);
app.post("/api/payments/phonepe/callback", internalAuth, phonepeCallback);

// --- Global Error Handler ---
app.use((err, req, res, _next) => {
  const status = err.statusCode || 500;
  const clientMessage = status === 500 ? "Internal Server Error" : err.message;

  logger.error("unhandled error", {
    requestId: req.id,
    status,
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: clientMessage,
  });
});

if (process.env.NODE_ENV !== "test") {
  if (!process.env.ORIGIN) {
    console.error("[Startup] ERROR: ORIGIN environment variable is not set. CORS will be misconfigured.");
    process.exit(1);
  }
  (async () => {
    app.listen(PORT, () => {
      console.log(`PhonePe Gateway running on port ${PORT}`);
    });
  })();
}

export default app;
