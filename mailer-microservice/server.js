/**
 * ============================================================================
 * WorkPing Mailer Microservice — Email + OTP delivery
 * ============================================================================
 *
 * Stateless email + OTP delivery service. Any running instance can verify
 * any OTP because Redis is the shared source of truth. SMTP transport is
 * delivered through Nodemailer.
 *
 * ── ENDPOINTS ───────────────────────────────────────────────────────────────
 * Public (no auth):
 *   GET  /health        — liveness probe used by Docker HEALTHCHECK + nginx
 *   GET  /              — service status landing page
 *   GET  /dashboard     — live email analytics (Chart.js, success/failure rate)
 *   GET  /templates     — Handlebars template gallery (public/templates.html)
 *
 * Protected (Bearer token in `Authorization` header, timing-safe compared
 * to process.env.SECRET via crypto.timingSafeEqual — line 350-358):
 *   POST /api/v1/mail/send-mail              — templated transactional email
 *   POST /api/v1/mail/send-html              — raw HTML email
 *   POST /api/v1/mail/forgot-password        — password reset link
 *   POST /api/v1/mail/greeting               — onboarding welcome email
 *   POST /api/v1/mail/alert/{info|warning|danger|success}
 *   POST /api/v1/mail/notification           — generic notification
 *   POST /api/v1/otp/send-email-otp          — generate + cache + send
 *   POST /api/v1/otp/send-reset-password-otp
 *   POST /api/v1/otp/verify-email-otp        — single-use, deletes on match
 *   POST /api/v1/otp/verify-reset-password-otp
 *   GET  /api/v1/analytics/stats             — JSON for the dashboard
 *
 * ── OTP FLOW (Redis-backed, single-use, stateless across instances) ────────
 *   1. Caller POSTs to /api/v1/otp/send-email-otp with { email }
 *   2. Service generates a 6-digit OTP, stores under
 *        otp:email:<email> with TTL 30 min (10 min for password-reset)
 *   3. Nodemailer dispatches the Handlebars-rendered email
 *   4. Caller POSTs to /api/v1/otp/verify-email-otp with { email, otp }
 *   5. Service compares against the Redis value, DEL the key on match
 *      (single-use — replay attack impossible once verified)
 *
 * ── IMPLEMENTATION FILES IN THIS SERVICE ───────────────────────────────────
 *   config/redisConfig.js        — Redis client (used as OTP store)
 *   config/mailTransporter.js    — Nodemailer SMTP transport
 *   routes/router.mail.js        — /api/v1/mail/* handlers
 *   routes/router.otp.js         — /api/v1/otp/* handlers
 *   utils/analytics.js           — getStats() — rolling counters per email type
 *   public/templates/*.hbs       — Handlebars HTML email templates
 *
 * ── SECURITY ────────────────────────────────────────────────────────────────
 *   • Bearer token guard with crypto.timingSafeEqual (line 350-358) to
 *     prevent timing attacks on the shared secret.
 *   • Email format validation (regex) on every POST before mailing.
 *   • OTP keys auto-expire via Redis TTL — no manual cleanup required.
 *
 * ── CALLED BY ───────────────────────────────────────────────────────────────
 *   centralized-server/server/services/mailer/mail.service.js
 *   (HTTP client wrapper that prepends the Authorization header).
 *
 * ── KUBERNETES ──────────────────────────────────────────────────────────────
 *   This service is foundation-ready for k8s migration — stateless app,
 *   Redis is external, no local file dependencies beyond the templates dir.
 * ============================================================================
 */

import express from "express";
import crypto from "crypto";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import redis from "./config/redisConfig.js";
import transporter from "./config/mailTransporter.js";

import mailRoutes from "./routes/router.mail.js";
import otpRoutes from "./routes/router.otp.js";
import { getStats } from "./utils/analytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET;
const server = express();

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

/* ─── Liveness probe — bypasses auth, used by load balancers and Docker HEALTHCHECK ─── */
server.get("/health", (_req, res) => {
  res.status(200).json({ status: "UP", service: "workping-mailer", timestamp: new Date().toISOString() });
});

/* ─── Public: Landing Page ─── */
server.get("/", (req, res) => {
  return res.status(200).send(
    `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mailer Service | Status</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg: #f8fafc;
                    --text: #0f172a;
                    --text-muted: #64748b;
                    --accent: #2563eb;
                    --card: #ffffff;
                    --border: #e2e8f0;
                    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --bg: #020617;
                        --text: #f8fafc;
                        --text-muted: #94a3b8;
                        --accent: #3b82f6;
                        --card: #0f172a;
                        --border: #1e293b;
                        --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);
                    }
                }
                body {
                    margin: 0;
                    padding: 0;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    background: var(--bg);
                    color: var(--text);
                    transition: background 0.3s ease;
                }
                .container {
                    text-align: center;
                    padding: 2.5rem;
                    background: var(--card);
                    border-radius: 24px;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow);
                    max-width: 400px;
                    width: 90%;
                    backdrop-filter: blur(8px);
                }
                h1 {
                    font-size: 3.5rem;
                    font-weight: 800;
                    margin: 0;
                    background: linear-gradient(135deg, var(--accent), #9333ea);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(22, 163, 74, 0.1);
                    color: #16a34a;
                    padding: 6px 16px;
                    border-radius: 99px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin: 1.5rem 0;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #16a34a;
                    border-radius: 50%;
                    box-shadow: 0 0 12px #16a34a;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 1; }
                    70% { transform: scale(1.5); opacity: 0; }
                    100% { transform: scale(0.95); opacity: 0; }
                }
                p {
                    color: var(--text-muted);
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }
                .links {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    align-items: center;
                }
                .link {
                    color: var(--accent);
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.95rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: opacity 0.2s;
                }
                .link:hover {
                    opacity: 0.8;
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📧 Mailer</h1>
                <div class="status-badge">
                    <span class="status-dot"></span>
                    Service Operational
                </div>
                <p>Welcome to the WorkPing Mailer microservice. All systems are currently running within normal parameters.</p>
                <div class="links">
                    <a href="/templates" class="link">Explore Email Templates →</a>
                    <a href="/dashboard" class="link">View Analytics Dashboard →</a>
                </div>
            </div>
        </body>
        </html>
        `
  );
});

/* ─── Public: Analytics Dashboard ─── */
server.get("/dashboard", async (req, res) => {
  const stats = await getStats();
  return res.status(200).send(
    `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mailer Dashboard</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                :root {
                    --bg: #f8fafc;
                    --text: #0f172a;
                    --text-muted: #64748b;
                    --accent: #2563eb;
                    --card: #ffffff;
                    --border: #e2e8f0;
                    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    --success: #16a34a;
                    --failure: #dc2626;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --bg: #020617;
                        --text: #f8fafc;
                        --text-muted: #94a3b8;
                        --accent: #3b82f6;
                        --card: #0f172a;
                        --border: #1e293b;
                        --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);
                    }
                }
                body {
                    margin: 0;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    background: var(--bg);
                    color: var(--text);
                    padding: 2rem;
                }
                .dashboard {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                h1 { font-weight: 800; margin: 0; font-size: 2rem; }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .stat-card {
                    background: var(--card);
                    padding: 1.5rem;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow);
                }
                .stat-label { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; }
                .stat-value { font-size: 2rem; font-weight: 800; margin-top: 0.5rem; }
                .charts {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 1.5rem;
                }
                .chart-container {
                    background: var(--card);
                    padding: 1.5rem;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow);
                }
                @media (max-width: 500px) {
                    .charts { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
            <div class="dashboard">
                <header>
                    <h1>📊 Analytics Dashboard</h1>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}</div>
                </header>
                
                <div class="grid">
                    <div class="stat-card">
                        <div class="stat-label">TOTAL EMAILS SENT</div>
                        <div class="stat-value">${stats.totalSent}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">SUCCESS RATE</div>
                        <div class="stat-value" style="color: var(--success);">${stats.totalSent ? Math.round((stats.success / stats.totalSent) * 100) : 0}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">DELIVERY FAILURES</div>
                        <div class="stat-value" style="color: var(--failure);">${stats.failure}</div>
                    </div>
                </div>

                <div class="charts">
                    <div class="chart-container">
                        <h3 style="margin-top: 0;">Email Breakdown</h3>
                        <canvas id="typeChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3 style="margin-top: 0;">Delivery Status</h3>
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            </div>

            <script>
                const ctxType = document.getElementById('typeChart').getContext('2d');
                new Chart(ctxType, {
                    type: 'doughnut',
                    data: {
                        labels: ['OTP', 'Forgot Pwd', 'Greeting', 'Alert', 'Notification', 'Raw'],
                        datasets: [{
                            data: [
                                ${stats.byType.otp}, 
                                ${stats.byType.forgotPassword}, 
                                ${stats.byType.greeting}, 
                                ${stats.byType.alert}, 
                                ${stats.byType.notification}, 
                                ${stats.byType.raw}
                            ],
                            backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });

                const ctxStatus = document.getElementById('statusChart').getContext('2d');
                new Chart(ctxStatus, {
                    type: 'pie',
                    data: {
                        labels: ['Success', 'Failure'],
                        datasets: [{
                            data: [${stats.success}, ${stats.failure}],
                            backgroundColor: ['#16a34a', '#dc2626'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            </script>
        </body>
        </html>
        `
  );
});

/* ─── Public: Template Preview Page ─── */
server.get("/templates", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "templates.html"));
});

/* ─── Auth Middleware (protects API routes) ─── */
server.use((req, res, next) => {
  const token = req.headers.authorization;
  if (!token || typeof token !== "string") {
    return res.status(403).json({
      status: "error",
      error: "Unauthorized: Invalid or missing secret token",
    });
  }

  // Timing-safe comparison to prevent timing attacks on API key
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(SECRET);
  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return res.status(403).json({
      status: "error",
      error: "Unauthorized: Invalid or missing secret token",
    });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      status: "error",
      error: "Bad Request: Recipient email is required",
    });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: "error",
      error: "Bad Request: Invalid email format",
    });
  }

  next();
});

server.use("/api/v1/mail", mailRoutes);
server.use("/api/v1/otp", otpRoutes);

/* ─── API: Analytics Stats ─── */
server.get("/api/v1/analytics/stats", async (req, res) => {
  const stats = await getStats();
  return res.status(200).json(stats);
});

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      await redis.connect();
      server.listen(PORT, () => {
        console.log(`[Server] Listening on port ${PORT}`);
      });
    } catch (error) {
      console.error("[Server Initialization Error]", error);
      process.exit(1);
    }
  })();
}

export default server;
