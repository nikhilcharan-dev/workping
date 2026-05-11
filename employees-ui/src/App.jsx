/**
 * ============================================================================
 * WorkPing Employee Portal — Root <App /> component
 * ============================================================================
 *
 * Mounted by src/main.jsx inside <BrowserRouter>. Mirrors the admin-ui App
 * structure but exposes the employee-scoped route tree only.
 *
 *   AppProvidersWrapper  (components/wrappers/AppProvidersWrapper.jsx)
 *     └── AuthContext              — JWT (role: "user") + refresh rotation
 *     └── UserContext              — current employee profile cache
 *     └── ToastContext             — feedback toasts
 *     └── ThemeContext             — light/dark mode
 *
 *   AppRouter  (routes/router.jsx)
 *     └── PublicRoutes             — /login, /forgot-password, OAuth callbacks
 *     └── ProtectedRoutes          — wrapped in <RequireAuth role="user" />
 *         ├── /dashboard           — KPI cards (attendance %, leave balance)
 *         ├── /check-in            — react-webcam capture → POST /api/user/attendance
 *         │                          (1:1 verification via face-api-microservice)
 *         ├── /attendance/history  — heatmap + month drilldown
 *         ├── /leaves              — apply / cancel / track
 *         ├── /salary              — payslip list + PDF download
 *         ├── /shifts              — upcoming shift schedule
 *         ├── /profile             — name, avatar, 2FA setup
 *         └── /notifications       — socket.io live feed
 *
 * ── DIFFERENCE FROM admin-ui ────────────────────────────────────────────────
 * Same shell, same providers, but a strict employee route tree with NO
 * admin/manager capabilities (employee/manager separation enforced at the
 * server middleware level — see centralized-server/server/middleware/
 * requireRole.js and authorizeManager.js).
 * ============================================================================
 */
import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import AppRouter from './routes/router'
import '@/assets/scss/app.scss'
const App = () => {
  return (
    <AppProvidersWrapper>
      {/* remove appproviderwrapper */}
      <AppRouter />
    </AppProvidersWrapper>
  )
}
export default App
