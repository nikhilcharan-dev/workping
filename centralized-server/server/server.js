/**
 * ============================================================================
 * WorkPing Core API — Cluster Bootstrap (PM2-supervised in production)
 * ============================================================================
 *
 * This is the entry point launched by `node server.js` (or `pm2 start`).
 * It forks one worker per CPU using node's `cluster` module; the primary
 * process never imports app code — it only manages workers.
 *
 * ── BOOT SEQUENCE (worker) ──────────────────────────────────────────────────
 *  1. Dynamic import of ./app/app.js     (Express stack — see file header)
 *  2. Dynamic import of ./app/socket.io.js  (Socket.io + Redis adapter)
 *  3. mongooseConfig() — connect to MongoDB Atlas with retry/back-off
 *     (see config/mongoose.js — exponential backoff, maxPoolSize 50)
 *  4. redis.connect() — bring up the shared Redis client used by:
 *       • token.helper.js blacklist (key prefix "bl:")
 *       • bruteForce.js login lockout counter
 *       • Socket.io @socket.io/redis-adapter pub/sub
 *       • subscription.cron payment status replay
 *  5. socket(server) attaches Socket.io to the http server with two Redis
 *     pub/sub clients (cannot share one — see ./app/socket.io.js:20-22).
 *  6. startRenewalCron() — node-cron job firing at 09:00 IST. Sends
 *     7d / 3d / 1d expiry alerts via email + WhatsApp.
 *  7. startShiftReminderCron() — fires at 06:30 IST. Notifies employees
 *     whose shift starts within 90 minutes (multi-tenant per-org).
 *  8. server.listen(PORT, "0.0.0.0") — binds for Nginx upstream
 *     (nginx/nginx.conf forwards api.workping.live → upstream workping_api).
 *
 * ── WHY CLUSTER + REDIS ADAPTER ─────────────────────────────────────────────
 * Each cluster worker is its own Node process with its own memory + sockets.
 * Without the Socket.io Redis adapter, `io.to("payment:user123").emit(...)`
 * only reaches the worker that holds that socket — other workers silently
 * drop the broadcast. The adapter publishes the emit on a Redis channel
 * that every worker subscribes to, so any worker can broadcast to any room.
 *
 * ── WORKER RESILIENCE ───────────────────────────────────────────────────────
 * The primary watches each worker's "exit" event. Non-zero exits trigger a
 * re-spawn with exponential back-off (1s, 2s, 4s … cap 30s). A clean SIGTERM
 * or code=0 is treated as graceful shutdown and is NOT re-spawned, so
 * `pm2 stop` and `docker stop` work as expected.
 *
 * ── CROSS-SERVICE ATTACHMENTS (out-of-process) ──────────────────────────────
 *  • face-api-microservice/app.py     — biometric enrollment + 1:N FAISS search
 *  • mailer-microservice/server.js    — OTP + transactional email
 *  • phonepe-gateway-microservice/service.js  — UPI payments + webhook
 *  • whatsapp-microservice/server.js  — Meta Cloud API + LLM chatbot
 *  • oracle-cloud-object-microservice/app.js  — OCI Object Storage proxy
 * Each runs on its own Ubuntu VM behind nginx (see ../README.md → Infrastructure).
 *
 * ── KUBERNETES MIGRATION FOUNDATION ────────────────────────────────────────
 * k8s/api/deployment.yaml — Deployment (replicas: 3) + HorizontalPodAutoscaler
 * (minReplicas: 2, maxReplicas: 10, targetCPUUtilizationPercentage: 70).
 * Liveness + readiness probes hit GET /health (defined in app/app.js).
 * ============================================================================
 */

import "./globals.js";
import "dotenv/config";
import cluster from "cluster";
import http from "http";
import mongooseConfig from "./config/mongoose.js";

// Exponential backoff for worker restart — prevents thrash-looping on a crash
const backoff = (retries, base = 1000, cap = 30000) => Math.min(cap, base * Math.pow(2, retries));

/*
 * CLUSTER ARCHITECTURE
 * --------------------
 * Primary process only manages workers — it never runs Express or connects to DBs.
 * This prevents memory leaks and keeps the primary stable even if a worker crashes.
 *
 * Worker process runs the full app: Express, MongoDB, Redis, Socket.io.
 * Socket.io uses @socket.io/redis-adapter so io.to(room).emit() works across
 * all worker processes — without the adapter, only the worker holding that socket
 * would receive the emit.
 */
if (cluster.isPrimary) {
  let retries = 0;

  const spawnWorker = () => {
    const worker = cluster.fork();
    worker.on("online", () => {
      console.log(`[Cluster] Worker ${worker.process.pid} online`);
      retries = 0;
    });
    worker.on("exit", (code, signal) => {
      if (signal === "SIGTERM" || code === 0) return;
      const delay = backoff(retries++);
      console.warn(`[Cluster] Worker exited (${signal || code}), restarting in ${delay}ms`);
      setTimeout(spawnWorker, delay);
    });
  };

  spawnWorker();
} else {
  // Dynamic imports are deferred to the worker so the primary process
  // never imports app code (avoids double-initialization of globals).
  const { default: app } = await import("./app/app.js");
  const { default: socket } = await import("./app/socket.io.js");

  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);

  // Connect datastores before starting Socket.io — the Redis adapter
  // pub/sub clients are created inside socket() and need Redis to be up first.
  await mongooseConfig();
  await redis.connect();

  // Must await — socket adapter needs its own Redis pub/sub clients connected
  await socket(server);

  const { startRenewalCron } = await import("#services/subscription/renewal.cron.js");
  startRenewalCron();

  const { startShiftReminderCron } = await import("#services/shiftReminder/shiftReminder.cron.js");
  startShiftReminderCron();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}
