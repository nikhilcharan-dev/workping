/**
 * ============================================================================
 * WorkPing Admin Dashboard — React 18 + Vite 5 SPA entry
 * ============================================================================
 *
 * This is the JS entry mounted by index.html (<script type="module"
 * src="/src/main.jsx">). It wraps the React tree in BrowserRouter and hands
 * off to <App />, which composes every provider in the app.
 *
 * ── DEPLOYMENT ──────────────────────────────────────────────────────────────
 * Built with `vite build` into ./dist, then served by nginx at
 * admin.workping.live (nginx/nginx.conf — see "Admin dashboard SPA" block).
 * Nginx serves the static dist/ files; every API call is proxied to
 * api.workping.live (which is centralized-server/server/server.js).
 *
 * ── ADMIN DASHBOARD CAPABILITIES ────────────────────────────────────────────
 * Built on the React Hyper Reback boilerplate; pages live under src/pages:
 *   • Authentication       — login + register + Google/Microsoft OAuth + 2FA
 *   • Employee management  — list, add (form + bulk Excel via xlsx),
 *                            update, delete; Syncfusion grids + TanStack table
 *   • Attendance           — heatmap, per-day drilldown, manual correction
 *   • Leave management     — pending/approved/rejected queues + multi-level
 *                            approval workflow
 *   • Holiday calendar     — react-flatpickr per-org holiday CRUD
 *   • Shift scheduling     — assignment grid + bulk shift import
 *   • Subscription billing — plan picker → PhonePe redirect → live status
 *                            push via socket.io-client (room: payment:<userId>)
 *   • Face enrollment      — react-webcam captures the admin's photo and
 *                            POSTs base64 JPEG to /api/admin/employees/face-enroll
 *                            which forwards to face-api-microservice/app.py
 *                            POST /api/v1/enroll (server-side InsightFace
 *                            extracts the 512-d embedding — no TF.js / no
 *                            on-device ML model)
 *   • Real-time analytics  — Socket.io subscribes to attendance + payment rooms
 *   • Reports + charts     — apexcharts via react-apexcharts
 *
 * ── KEY DEPENDENCIES (see package.json) ─────────────────────────────────────
 *   react 18.3 + react-dom 18.3            — UI runtime
 *   vite 5.2                                — dev server + build
 *   react-router-dom 6.23                   — routing (configured below)
 *   axios 1.13                              — HTTP client (interceptor in
 *                                              src/app/ injects access token)
 *   socket.io-client 4.8                    — real-time channels
 *   react-webcam 7.2                        — admin-side enrollment capture
 *   @tanstack/react-table + Syncfusion grids — admin tables
 *   xlsx 0.18                               — bulk employee import parsing
 *   react-hook-form + yup                   — form validation
 *
 * ── BASE PATH ───────────────────────────────────────────────────────────────
 * basePath is read from src/context/constants.js so the build can be
 * mounted at "/" or under a sub-path like "/admin/" without code changes.
 * ============================================================================
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { basePath } from './context/constants'
createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={basePath}>
    <App />
  </BrowserRouter>,
)
