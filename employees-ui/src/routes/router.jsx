import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '@/layouts/AuthLayout'
import AdminLayout from '@/layouts/AdminLayout'
import PublicLayout from '@/layouts/PublicLayout'
import { useAuthContext } from '@/context/useAuthContext'
import { hasAccess } from '@/utils/rbac'
import { appRoutes, authRoutes, publicRoutes } from '@/routes/index'

/**
 * Guards authenticated routes.
 * - Redirects to /auth/sign-in if not logged in.
 * - Redirects to /unauthorized if the user's role is not in allowedRoles.
 * - Admin bypasses role checks (handled inside hasAccess).
 */
const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, authLoading, role } = useAuthContext()

  if (authLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace />
  }

  if (!hasAccess(role, roles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

const AppRouter = (props) => {
  return (
    <Routes>
      {/* Public pages — no auth required */}
      {(publicRoutes || []).map((route, idx) => (
        <Route key={idx + route.name} path={route.path} element={<PublicLayout {...props}>{route.element}</PublicLayout>} />
      ))}

      {/* Auth pages — sign-in, maintenance, etc. */}
      {(authRoutes || []).map((route, idx) => (
        <Route key={idx + route.name} path={route.path} element={<AuthLayout {...props}>{route.element}</AuthLayout>} />
      ))}

      {/* Protected app pages — wrapped in PrivateRoute with per-route roles */}
      {(appRoutes || []).map((route, idx) => (
        <Route
          key={idx + route.name}
          path={route.path}
          element={
            <PrivateRoute roles={route.roles}>
              <AdminLayout {...props}>{route.element}</AdminLayout>
            </PrivateRoute>
          }
        />
      ))}
    </Routes>
  )
}

export default AppRouter
