import { Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Button } from 'react-bootstrap'
import LogoBox from '@/components/LogoBox'
import ThemeModeToggle from '@/components/layout/TopNavigationBar/components/ThemeModeToggle'
import Preloader from '@/components/Preloader'
import { currentYear, developedBy, developedByLink } from '@/context/constants'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useAuthContext } from '@/context/useAuthContext'

const PublicLayout = ({ children }) => {
  const navigate = useNavigate()
  const { isAuthenticated, authLoading } = useAuthContext()

  return (
    <div className="wrapper">
      {/* ─── NAVBAR ─── */}
      <header className="topbar position-sticky top-0" style={{ zIndex: 1005, paddingLeft: 0 }}>
        <div className="container-xxl">
          <div className="navbar-header">
            <LogoBox containerClassName="logo-box" squareLogo={{ className: 'logo-sm' }} textLogo={{ className: 'logo-lg' }} />
            <div className="d-flex align-items-center gap-2">
              <ThemeModeToggle />
              {!authLoading &&
                (isAuthenticated ? (
                  <Link to="/" className="topbar-button btn btn-sm btn-primary px-3">
                    Dashboard
                  </Link>
                ) : (
                  <Button size="sm" className="px-3" onClick={() => navigate('/auth/sign-in')}>
                    Sign In
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </header>

      {/* ─── PAGE CONTENT ─── */}
      <div className="page-content" style={{ marginLeft: 0, paddingLeft: 0, paddingRight: 0 }}>
        <div className="container-xxl py-4">
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>

        {/* ─── FOOTER ─── */}
        <footer className="footer">
          <Container fluid>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="d-flex align-items-center gap-1">
                <IconifyIcon icon="iconamoon:heart-duotone" className="fs-18 align-middle text-danger" />
                <span>
                  {currentYear} &copy;{' '}
                  <a href={developedByLink} target="_blank" rel="noreferrer" className="text-primary fw-semibold">
                    {developedBy}
                  </a>
                </span>
              </span>
              <nav className="d-flex align-items-center gap-2 flex-wrap">
                <Link to="/about" className="text-muted footer-text">
                  About
                </Link>
                <span className="text-muted">|</span>
                <Link to="/contact" className="text-muted footer-text">
                  Contact
                </Link>
                <span className="text-muted">|</span>
                <Link to="/privacy-policy" className="text-muted footer-text">
                  Privacy Policy
                </Link>
                <span className="text-muted">|</span>
                <Link to="/terms-and-conditions" className="text-muted footer-text">
                  Terms &amp; Conditions
                </Link>
              </nav>
            </div>
          </Container>
        </footer>
      </div>
    </div>
  )
}

export default PublicLayout
