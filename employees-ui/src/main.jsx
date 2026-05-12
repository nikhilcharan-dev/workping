/**
 * ============================================================================
 * WorkPing Employee Portal — React 18 + Vite 5 SPA entry
 * ============================================================================
 *
 * Browser-based portal for individual employees (separate from the admin
 * dashboard). Mounted by index.html (<script type="module" src="/src/main.jsx">).
 *
 * ── DEPLOYMENT ──────────────────────────────────────────────────────────────
 * Built with `vite build` into ./dist, served by nginx at
 * employee.workping.live. Every API call proxied to api.workping.live
 * (centralized-server/server/server.js).
 *
 * ── EMPLOYEE PORTAL CAPABILITIES ────────────────────────────────────────────
 *   • Self check-in / check-out      — browser-side webcam capture →
 *                                       base64 JPEG → /api/user/attendance
 *                                       which forwards the frame to
 *                                       face-api-microservice/app.py for
 *                                       1:1 verification against the user's
 *                                       enrolled 512-d embedding
 *   • Attendance heatmap             — month/year drilldown
 *   • Leave requests                 — apply / cancel / track approval
 *   • Salary slip download           — PDF from /api/user/payroll
 *   • Profile + 2FA settings         — TOTP enable/disable via speakeasy
 *   • Shift schedule                 — upcoming + holiday overlay
 *   • Real-time notifications        — socket.io-client subscribes to
 *                                       `user:<userId>` for leave approvals
 *
 * ── AUTH FLOW ───────────────────────────────────────────────────────────────
 * Same JWT + refresh-token stack as admin-ui. The shared Core API
 * (centralized-server/server) issues identical tokens — only the JWT
 * `role` claim differs ("user" vs "admin"), which gates the route trees.
 *
 * ── KEY DEPENDENCIES ────────────────────────────────────────────────────────
 * Same Vite + React 18 + react-router-dom + axios + socket.io-client +
 * react-webcam + apexcharts stack as admin-ui. See package.json.
 *
 * ── StrictMode ──────────────────────────────────────────────────────────────
 * Enabled here (unlike admin-ui) to catch effect-cleanup bugs early in
 * development. StrictMode is a no-op in production builds.
 * ============================================================================
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { basePath } from './context/constants'
import { installGlobalErrorListeners } from './helpers/errorReporter'

installGlobalErrorListeners()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basePath}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
