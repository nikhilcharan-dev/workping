/**
 * ============================================================================
 * WorkPing Core API — Express 5 Application Entry
 * ============================================================================
 *
 * This module wires the entire HTTP surface: security middleware, observability,
 * authentication, the three role-scoped route trees (admin / user / internal),
 * and the global error handler. The HTTP server itself is created in
 * server.js, which also attaches Socket.io (see ../app/socket.io.js).
 *
 * ── REQUEST LIFECYCLE ───────────────────────────────────────────────────────
 *  1. /health and /metrics are mounted FIRST, before middlewares, so load
 *     balancers, Docker health probes, and Kubernetes liveness/readiness
 *     checks (k8s/api/deployment.yaml lines 57-68) bypass auth and rate-limit.
 *  2. middlewares(app) — see ./middleware.js:
 *       • helmet (CSP locked to default-src 'none' since this is JSON-only)
 *       • cors (allowlist driven, credentials: true)
 *       • generalLimiter (200 req / 15 min — express-rate-limit)
 *       • express.json({ limit: '10kb' })  — DoS guard
 *       • sanitizeMongo — strips $ and . from keys (NoSQL injection)
 *       • cookieParser — for accessToken httpOnly cookie
 *  3. Auth routes use the stricter authLimiter (10 req / 15 min):
 *     POST /api/admin/auth/register|login, /api/auth/refresh, OTP routes.
 *  4. Every authenticated request runs middleware/jwtBearer.js which:
 *       • verifies the JWT signature
 *       • checks token.helper.js::isTokenBlacklisted() against Redis
 *         (key prefix "bl:", SHA-256 hash, TTL = remaining token lifetime)
 *       • populates req.user (userId, role) for downstream handlers.
 *  5. RBAC layer — middleware/requireRole.js + middleware/authorizeManager.js:
 *     - requireRole("admin") rejects with 403 unless req.user.role matches
 *     - authorizeManager scopes managers to their own organizationId
 *       and attaches req.managedOrgId for controllers to query against.
 *
 * ── AUTH STACK ──────────────────────────────────────────────────────────────
 *  • Local credentials   : bcrypt(10) hash in models/Account.js
 *  • JWT pairs           : utils/token.helper.js
 *      - access token  : 1h on web, 7d on mobile (UA-sniffed)
 *      - refresh token : 7d / 30d, stored in models/RefreshToken.js,
 *                         rotated atomically via findOneAndDelete (single-use)
 *      - revocation    : blacklistToken() + isTokenBlacklisted() (Redis)
 *      - revokeAllTokens(userId) deletes all refresh docs on logout /
 *        password change / role change.
 *  • TOTP 2FA            : services/2fa/index.js (speakeasy + qrcode)
 *  • Google OAuth2       : services/google/google.signin.js
 *  • Microsoft OAuth2    : services/microsoft/microsoft.signin.js
 *  • Brute-force guard   : middleware/bruteForce.js — Redis-counted, locks
 *                          the account for 15 min after 5 failed attempts.
 *
 * ── REAL-TIME (Socket.io + Redis adapter) ───────────────────────────────────
 *  Attached in server.js (line ~54) via app/socket.io.js.
 *  Two separate Redis clients (pub/sub cannot share one connection) connect
 *  via @socket.io/redis-adapter so io.to(`payment:${userId}`).emit(...) works
 *  across every worker in the node cluster. Without the adapter, only the
 *  worker holding the socket would receive the broadcast.
 *  Rooms: `payment:<userId>` for PhonePe status replay on join.
 *
 * ── PAYMENTS (PhonePe UPI) ──────────────────────────────────────────────────
 *  • Gateway      : services/phonepe/phonepe.gateway.js — initiate payment
 *  • Webhook      : services/phonepe/phonepe.webhook.js — verifies
 *                   x-webhook-secret with crypto.timingSafeEqual, applies a
 *                   PENDING → {COMPLETED|FAILED|CANCELLED} state machine,
 *                   creates Subscription + Order docs in a Mongo transaction.
 *  • Renewal cron : services/subscription/renewal.cron.js — node-cron, fires
 *                   7d / 3d / 1d before expiry, notifies via email + WhatsApp.
 *
 * ── BIOMETRIC + STORAGE INTEGRATION ─────────────────────────────────────────
 *  Out-of-process: face-api-microservice/app.py (FastAPI + InsightFace
 *  AntelopeV2 + FAISS IndexFlatIP + optical-flow liveness). The Core API
 *  enrols and verifies via services/face_recognition/enroll.js and model.js.
 *  GPS + WiFi geofence cross-checked server-side in utils/location.js
 *  using the haversine formula against the organisation's office coordinates;
 *  client-side collector lives in mobile-app/src/utils/locationLock.js.
 *  Object storage proxied through services/storage/oracle.service.js to
 *  oracle-cloud-object-microservice/app.js (helmet + API-key + rate-limit).
 *
 * ── INFRASTRUCTURE ──────────────────────────────────────────────────────────
 *  Reverse proxy   : edge proxy config — SSL/TLS termination, /api → this
 *                    process, /socket.io → WebSocket upgrade pass-through,
 *                    /admin and /portal → SPA dist/ static serving.
 *  Orchestration   : docker-compose.yml — 6 services (gateway, redis, api,
 *                    biometric, mailer, payments, chatbot, storage) each
 *                    with health checks, resource limits, restart policies.
 *  Process model   : node:cluster (server.js) — primary forks workers per
 *                    CPU; each worker runs Express + Socket.io + crons.
 *                    PM2-supervised in production.
 *  Kubernetes      : k8s/api/deployment.yaml — Deployment + HorizontalPodAutoscaler
 *                    (minReplicas: 2, maxReplicas: 10, 70% CPU target).
 *
 * ── OBSERVABILITY ───────────────────────────────────────────────────────────
 *  • /metrics endpoint (Prometheus) wired below from utils/metrics.js
 *    (prom-client default metrics + http_request_duration_seconds histogram).
 *  • Winston structured logging used by services/storage and others.
 *  • Morgan HTTP access logs configured per middleware.js.
 *
 * ── TESTING ─────────────────────────────────────────────────────────────────
 *  Unit + security  : npm test            (jest.config.js)
 *      __tests__/validators.test.js   — 55+ unit tests, every validator fn
 *      __tests__/auth.test.js         — 14 validation-rejection paths
 *      __tests__/otp.test.js          — OTP send/verify validation
 *      __tests__/health.test.js       — /health + /metrics smoke
 *      __tests__/security.test.js     — JWT middleware rejection paths +
 *                                        blacklistToken / isTokenBlacklisted
 *                                        unit (mocked Redis)
 *  DB integration  : npm run test:integration  (jest.integration.config.js)
 *      __tests__/setup/globalSetup.js — starts mongo:7 Docker container
 *                                        with replicaSet("rs0") via
 *                                        @testcontainers/mongodb (required
 *                                        for Mongoose transactions used in
 *                                        the register controller).
 *      __tests__/auth.integration.test.js — full lifecycle:
 *          register → 201 (Admin + Account created in a Mongo txn)
 *          register dup email → 409 (unique index enforced)
 *          login → 200 (bcrypt verify + JWT pair)
 *          login wrong password → 401
 *          GET /verify-cookie with new token → 200 (JWT + DB round-trip)
 *          refresh rotation (single-use): old token rejected on 2nd use
 *          logout → access token blacklisted in Redis mock →
 *                    next request returns 401 TOKEN_REVOKED
 * ============================================================================
 */

import express from "express";
import "dotenv/config";
import validateEnv from "../utils/validateEnv.js";

import middlewares from "./middleware.js";

validateEnv();

import twoFactorRoutes from "./2fa.js";
import centralWebRoutes from "./routes/web/routes.central.js";
import adminWebRoutes from "./routes/web/routes.admin.js";
import userWebRoutes from "./routes/web/routes.user.js";
import internalRouter from "../routes/internal/router.js";

import register from "../utils/metrics.js";
import errorHandler from "../middleware/errorHandler.js";

const app = express();

// Liveness probe — used by load balancers, Docker health checks, and k8s probes.
// Intentionally placed BEFORE middlewares so it bypasses rate-limiting and auth.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "Running",
    contributors: [
      {
        name: "Nikhil Charan",
        role: "Developer",
        github: "https://github.com/nikhilcharan-dev",
      },
      {
        name: "Lova Reddy",
        role: "Developer",
        github: "https://github.com/Lova-Reddy",
      },
      {
        name: "Umar",
        role: "Developer",
        github: "https://github.com/shaikumar0",
      },
    ],
  });
});

middlewares(app);

twoFactorRoutes(app);
centralWebRoutes(app);
adminWebRoutes(app);
userWebRoutes(app);
app.use("/internal", internalRouter);

app.use(errorHandler);

export default app;
