/**
 * ============================================================================
 * WorkPing Admin Dashboard — Root <App /> component
 * ============================================================================
 *
 * Mounted by src/main.jsx inside <BrowserRouter>. Composes two layers:
 *
 *   AppProvidersWrapper  (components/wrappers/AppProvidersWrapper.jsx)
 *     └── AuthContext              — JWT + refresh token in HttpOnly cookie
 *     └── ToastContext             — react-toastify global toaster
 *     └── ThemeContext             — light/dark from localStorage
 *     └── LayoutContext            — sidebar collapse / RTL toggle
 *
 *   AppRouter            (routes/router.jsx)
 *     └── PublicRoutes             — /login, /register, /forgot-password,
 *                                    /2fa, /verify-email, OAuth callbacks
 *     └── ProtectedRoutes          — wrapped in <RequireAuth /> + role check
 *         ├── /dashboard           — KPI cards + real-time attendance feed
 *         ├── /employees           — CRUD + bulk Excel (xlsx) import
 *         ├── /attendance          — heatmap + per-employee history
 *         ├── /leaves              — multi-level approval workflows
 *         ├── /holidays            — per-org calendar
 *         ├── /shifts              — assignment grid
 *         ├── /subscriptions       — plan + PhonePe checkout
 *         ├── /face-enroll         — react-webcam → POST to face-api
 *         ├── /analytics           — apexcharts + biometric productivity
 *         │                          insights from face-api /api/v1/analytics/productivity
 *         └── /settings            — profile + 2FA setup + OAuth linking
 *
 * ── REQUEST AUTH ────────────────────────────────────────────────────────────
 * The axios instance in src/app/ adds two automatic behaviours:
 *   1. Attaches the access token from the auth context to every request.
 *   2. On 401 TOKEN_EXPIRED, calls POST /api/auth/refresh once with the
 *      stored refresh token, retries the original request with the new
 *      access token. On 401 TOKEN_REVOKED, logs the user out immediately
 *      (token-helper at centralized-server/server/utils/token.helper.js
 *      has blacklisted the token via Redis after logout / password change).
 *
 * ── REAL-TIME UPDATES (socket.io-client) ───────────────────────────────────
 * The dashboard joins two rooms on login:
 *   • `attendance:<orgId>` — new check-ins broadcast by the Core API
 *   • `payment:<userId>`   — PhonePe status pushed by centralized-server's
 *                            socket.io.js (uses @socket.io/redis-adapter so
 *                            broadcasts work across all cluster workers)
 *
 * ── STYLES ──────────────────────────────────────────────────────────────────
 * The SCSS entry at @/assets/scss/app.scss is the Reback Bootstrap 5 theme
 * compiled by sass + vite. Dark mode toggles a body class.
 * ============================================================================
 */
import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import AppRouter from './routes/router'
import '@/assets/scss/app.scss'
const App = () => {
  return (
    <AppProvidersWrapper>
      <AppRouter />
    </AppProvidersWrapper>
  )
}
export default App
