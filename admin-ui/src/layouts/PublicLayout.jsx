import { Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import LogoBox from '@/components/LogoBox'
import ThemeModeToggle from '@/components/layout/TopNavigationBar/components/ThemeModeToggle'
import Footer from '@/components/layout/Footer'
import Preloader from '@/components/Preloader'
import { useAuthContext } from '@/context/useAuthContext'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'

const PublicLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, logout } = useAuthContext()

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/about' },
    { label: 'Privacy', to: '/privacy-policy' },
    { label: 'Terms', to: '/terms-and-conditions' },
    { label: 'Dashboard', to: '/dashboard/analytics' },
  ]

  const handleLogout = async () => {
    try {
      await axiosClient.post('/api/admin/auth/logout', {}, { silent: true })
    } catch (_) {
      // Keep UX consistent even if API logout fails.
    }
    logout()
    navigate('/')
  }

  return (
    <div className="wrapper">
      <header className="topbar public-topbar" style={{ paddingLeft: 0, height: 'auto' }}>
        <div className="container-xxl">
          <div className="navbar-header flex-wrap gap-2 py-2 public-navbar-inner">
            <LogoBox containerClassName="logo-box public-brand" to="/" />
            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end ms-auto public-navbar-actions">
              <nav className="d-flex align-items-center flex-wrap me-1 public-nav-pills">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to
                  return (
                    <Link key={item.to} to={item.to} className={`public-nav-link ${isActive ? 'public-nav-link-active' : ''}`}>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="topbar-item">
                <ThemeModeToggle />
              </div>
              {isAuthenticated ? (
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="px-3 d-inline-flex align-items-center gap-1 public-auth-btn"
                  onClick={handleLogout}>
                  <IconifyIcon icon="bx:log-out" />
                  Logout
                </Button>
              ) : (
                <Button size="sm" className="px-3 d-inline-flex align-items-center gap-1 public-auth-btn" onClick={() => navigate('/auth/sign-in')}>
                  <IconifyIcon icon="bx:log-in" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="page-content" style={{ marginLeft: 0, paddingLeft: 0, paddingRight: 0 }}>
        <div className="container-xxl py-4">
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>
        <Footer />
      </div>

      <style>{`
        .public-topbar {
          border-bottom: 1px solid var(--bs-border-color);
          background: var(--bs-body-bg);
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
          margin-bottom: 12px;
        }
        .public-navbar-inner {
          min-height: 66px;
          padding-top: 0.35rem !important;
          padding-bottom: 0.35rem !important;
        }
        .public-brand .logo-text {
          font-size: 1.05rem !important;
          letter-spacing: -0.2px !important;
          color: var(--bs-emphasis-color) !important;
        }
        .public-nav-pills {
          background: transparent;
          border: 0;
          gap: 2px;
          padding: 0;
        }
        .public-nav-link {
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--bs-body-color) !important;
          font-weight: 600;
          font-size: 0.95rem;
          padding: 7px 12px;
          line-height: 1.2;
          transition: all .16s ease;
        }
        .public-nav-link:hover {
          background: rgba(var(--bs-emphasis-color-rgb), 0.06);
          color: var(--bs-emphasis-color) !important;
          border-color: rgba(var(--bs-border-color-rgb), 0.9);
        }
        .public-nav-link-active {
          background: rgba(var(--bs-primary-rgb), 0.14);
          color: var(--bs-primary) !important;
          border-color: rgba(var(--bs-primary-rgb), 0.25);
        }
        .public-auth-btn {
          min-width: 96px;
          min-height: 34px;
          border-radius: 8px;
          font-weight: 600;
          letter-spacing: 0;
        }
        [data-bs-theme='dark'] .public-topbar,
        html[data-bs-theme='dark'] .public-topbar {
          background: rgba(var(--bs-body-bg-rgb), 0.95);
          border-bottom-color: rgba(var(--bs-border-color-rgb), 0.7);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
        }
        [data-bs-theme='dark'] .public-nav-link:hover,
        html[data-bs-theme='dark'] .public-nav-link:hover {
          background: rgba(var(--bs-light-rgb), 0.08);
        }
        [data-bs-theme='dark'] .public-nav-link-active,
        html[data-bs-theme='dark'] .public-nav-link-active {
          background: rgba(var(--bs-primary-rgb), 0.28);
          border-color: rgba(var(--bs-primary-rgb), 0.42);
          color: #b7d1ff !important;
        }
        @media (max-width: 992px) {
          .public-navbar-inner {
            min-height: 78px;
          }
          .public-navbar-actions {
            width: 100%;
            justify-content: flex-start !important;
          }
          .public-nav-pills {
            width: 100%;
            justify-content: flex-start;
            row-gap: 6px;
          }
        }
      `}</style>
    </div>
  )
}

export default PublicLayout
