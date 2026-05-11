/**
 * ============================================================================
 * WorkPing Storage — Oracle Cloud Infrastructure Object Storage Proxy
 * ============================================================================
 *
 * Thin proxy in front of OCI Object Storage. The Core API + admin/employee
 * clients never see OCI credentials — they call this service with an
 * internal API key, and the service issues short-lived pre-signed URLs.
 *
 * ── ENDPOINTS ───────────────────────────────────────────────────────────────
 *   GET  /health                          — liveness probe
 *   GET  /                                — service info (no auth)
 *   GET  /api/metrics                     — Prometheus-style metrics text
 *   GET  /api/metrics/csv                 — CSV export (operator dashboard)
 *   POST /api/v1/bucket/upload            — direct upload (multipart)
 *   GET  /api/v1/bucket/:name             — fetch object
 *   DELETE /api/v1/bucket/:name           — delete object (admin only)
 *   POST /api/v1/presigned                — issue a time-limited pre-signed
 *                                            URL so the client can PUT/GET
 *                                            directly to OCI (offloads
 *                                            bandwidth from this VM)
 *
 * ── WHY PRE-SIGNED URLS ─────────────────────────────────────────────────────
 * Direct upload through this proxy is bandwidth-bound (every byte transits
 * the VM). Pre-signed URLs let the browser POST profile images / payslip
 * PDFs directly to OCI for a 15-minute window, then call back to the Core
 * API with the resulting object key. This service stays small and cheap.
 *
 * ── SECURITY LAYERS (defensive in depth) ───────────────────────────────────
 *   • helmet              — security headers, CSP, frameguard
 *   • CORS allowlist      — derived from process.env.ALLOWED_ORIGINS;
 *                            credentials enabled when origin matches
 *   • rate-limit          — 100 req / 15 min per IP, excluding /health
 *   • apiKeyAuth          — middleware/auth.js. Internal services pass
 *                            X-API-KEY which must equal process.env.API_KEY
 *                            (constant-time compared)
 *   • Input validation    — middleware on every route checks name + size
 *   • Graceful shutdown   — SIGTERM handler flushes metrics to disk before
 *                            exit so the operator dashboard isn't blank
 *                            after a restart (saveToDisk in middleware/metrics.js)
 *
 * ── METRICS PIPELINE ────────────────────────────────────────────────────────
 * middleware/metrics.js maintains rolling counters (total requests, success/
 * failure per bucket op, P50/P95 latency). startStatusTicker() persists the
 * latest snapshot to disk every 60 s so a crash never loses the full window.
 * Both Prometheus text + CSV export are exposed at /api/metrics(/csv).
 *
 * ── BOOT-TIME ENV VALIDATION ────────────────────────────────────────────────
 * COMPARTMENT_ID and REGION are required at startup — the service refuses
 * to boot if either is missing (see check below). The OCI SDK reads the
 * credentials from ~/.oci/config + .pem file mounted into the container by
 * docker-compose.yml (volume: ${HOME}/.oci:/root/.oci:ro).
 *
 * ── CALLED BY ───────────────────────────────────────────────────────────────
 * centralized-server/server/services/storage/oracle.service.js — Core API
 * client wrapper that injects the X-API-KEY header.
 * ============================================================================
 */

import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { metricsMiddleware, getMetrics, getMetricsCSV, startStatusTicker, saveToDisk } from "./middleware/metrics.js";
import bucketRoutes from "./routes/bucket.routes.js";
import presignRoutes from "./routes/presigned.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Validate required env vars at startup ---
// Skipped under NODE_ENV=test because integration tests set these on-the-fly.
if (process.env.NODE_ENV !== "test") {
  const REQUIRED_ENV = ["COMPARTMENT_ID", "REGION"];
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      logger.fatal(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }
}

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/" || req.path.startsWith("/api/metrics"),
  })
);

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ["GET", "POST", "DELETE"],
  })
);

// --- Body parsing & logging ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan("dev"));
app.use(metricsMiddleware);
// Status ticker writes metrics to disk every 60s — skipped in tests so the
// suite doesn't leave a timer pinning the event loop.
if (process.env.NODE_ENV !== "test") {
  startStatusTicker();
}

// --- Health check (unauthenticated) ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --- Metrics & Dashboard ---
app.get("/api/metrics", apiKeyAuth, (_req, res) => res.json(getMetrics()));

app.get("/api/metrics/export", apiKeyAuth, (req, res) => {
  const format = req.query.format || "json";
  const timestamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="metrics-${timestamp}.csv"`);
    return res.send(getMetricsCSV());
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="metrics-${timestamp}.json"`);
  res.json(getMetrics());
});

app.get("/", (_req, res) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
  );
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// --- Authenticated API routes ---
app.use("/api", apiKeyAuth, bucketRoutes);
app.use("/api/presigned", apiKeyAuth, presignRoutes);

// --- Centralized error handler ---
app.use(errorHandler);

// --- Start server (skipped under NODE_ENV=test — supertest binds the app directly) ---
if (process.env.NODE_ENV !== "test") {
  const PORT = parseInt(process.env.PORT || "8000", 10);
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // --- Graceful shutdown ---
  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    await saveToDisk();
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export default app;
