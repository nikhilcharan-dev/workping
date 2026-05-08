import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '@/layouts/AuthLayout'
import PublicLayout from '@/layouts/PublicLayout'
import { useAuthContext } from '@/context/useAuthContext'
import { appRoutes, authRoutes, publicRoutes } from '@/routes/index'
import AdminLayout from '@/layouts/AdminLayout'
import Preloader from '@/components/Preloader'

const Error404 = lazy(() => import('@/app/(other)/(error-pages)/error-404/page'))

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuthContext()

  if (authLoading) return null

  return isAuthenticated ? children : <Navigate to="/auth/sign-in" replace />
}

const AppRouter = (props) => {
  return (
    <Routes>
      {/* Auth pages (sign-in, sign-up, reset-pass, etc.) */}
      {(authRoutes || []).map((route, idx) => (
        <Route key={idx + route.name} path={route.path} element={<AuthLayout {...props}>{route.element}</AuthLayout>} />
      ))}

      {/* Public pages — accessible with or without login */}
      {(publicRoutes || []).map((route, idx) => (
        <Route key={idx + route.name} path={route.path} element={<PublicLayout {...props}>{route.element}</PublicLayout>} />
      ))}

      {/* Protected admin pages — redirect to sign-in if not logged in */}
      {(appRoutes || []).map((route, idx) => (
        <Route
          key={idx + route.name}
          path={route.path}
          element={
            <PrivateRoute>
              <AdminLayout {...props}>{route.element}</AdminLayout>
            </PrivateRoute>
          }
        />
      ))}

      {/* 404 — unknown routes */}
      <Route
        path="*"
        element={
          <AuthLayout {...props}>
            <Suspense fallback={<Preloader />}>
              <Error404 />
            </Suspense>
          </AuthLayout>
        }
      />
    </Routes>
  )
}

export default AppRouter
