import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { developedBy } from '@/context/constants'
import axiosClient from '@/helpers/httpClient'

const highlights = [
  {
    icon: 'bx:time-five',
    title: 'Live Attendance Intelligence',
    description: 'Track attendance trends, late patterns, and team productivity in real time.',
  },
  {
    icon: 'iconamoon:lock-duotone',
    title: 'Enterprise-Grade Security',
    description: 'Role-based access, 2FA controls, and secure flows for every critical action.',
  },
  {
    icon: 'iconamoon:category-duotone',
    title: 'Unified Team Operations',
    description: 'Organizations, teams, projects, and holidays in one tightly integrated platform.',
  },
]

const useCountUp = (target, duration = 1200, active = true) => {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active || target <= 0) {
      setDisplay(target)
      return
    }

    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, active])

  return display
}

const AnimatedCount = ({ value, loading, className = '' }) => {
  const count = useCountUp(value, 1200, !loading && value > 0)
  return <span className={className}>{loading ? '...' : count.toLocaleString()}</span>
}

const HomePublic = () => {
  const [stats, setStats] = useState({ employeeCount: 0, organizationCount: 0 })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStats = async ({ silentRefresh = false } = {}) => {
    if (!silentRefresh) {
      setIsLoadingStats(true)
    }
    try {
      const res = await axiosClient.get('/api/public/stats', { silent: true })
      const data = res?.data?.data ?? {}
      setStats({
        employeeCount: Number(data.employeeCount ?? 0),
        organizationCount: Number(data.organizationCount ?? 0),
      })
      setLastUpdated(new Date())
    } catch (_) {
      // Keep previous values if API call fails.
    } finally {
      if (!silentRefresh) {
        setIsLoadingStats(false)
      }
    }
  }

  useEffect(() => {
    fetchStats()
    const intervalId = setInterval(() => {
      fetchStats({ silentRefresh: true })
    }, 15000)

    return () => clearInterval(intervalId)
  }, [])

  const metrics = useMemo(() => {
    const avgTeamSize = stats.organizationCount > 0 ? Math.max(1, Math.round(stats.employeeCount / stats.organizationCount)) : 0

    return [
      { label: 'Employees', value: stats.employeeCount },
      { label: 'Organizations', value: stats.organizationCount },
      { label: 'Avg Employees / Org', value: avgTeamSize },
    ]
  }, [stats.employeeCount, stats.organizationCount])

  const lastUpdatedLabel = lastUpdated ? lastUpdated.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' }) : 'Syncing...'

  return (
    <>
      <PageMetaData title={`${developedBy} Home`} />

      <section className="home-hero rounded-4 overflow-hidden mb-4 p-4 p-lg-5">
        <div className="home-gradient-orb home-gradient-orb-1" />
        <div className="home-gradient-orb home-gradient-orb-2" />
        <Row className="align-items-center position-relative" style={{ zIndex: 2 }}>
          <Col lg={7}>
            <span className="home-kicker mb-3 d-inline-flex align-items-center gap-2">
              <IconifyIcon icon="iconamoon:sparkle-1-duotone" />
              Workforce Command Center
            </span>
            <h1 className="display-5 fw-bold mb-3 text-white">Run your workforce at speed with {developedBy}</h1>
            <p className="home-subtitle mb-4">
              A focused admin experience for organizations, teams, employees, projects, and compliance ready records.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/auth/sign-up" className="btn btn-light btn-lg px-4 fw-semibold">
                Start Free
              </Link>
              <Link to="/dashboard/analytics" className="btn btn-lg px-4 home-dashboard-btn">
                Go To Dashboard
              </Link>
            </div>
          </Col>
          <Col lg={5} className="mt-4 mt-lg-0">
            <Card className="border-0 shadow-lg home-hero-card">
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold mb-0">Live Snapshot</h5>
                  <span className="badge bg-success-subtle text-success">Real-time</span>
                </div>
                <div className="vstack gap-3">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Employees</span>
                    <strong>
                      <AnimatedCount value={stats.employeeCount} loading={isLoadingStats} />
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Organizations</span>
                    <strong>
                      <AnimatedCount value={stats.organizationCount} loading={isLoadingStats} />
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Last Synced</span>
                    <strong>{lastUpdatedLabel}</strong>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </section>

      <Row className="g-3 mb-4">
        {metrics.map((item) => (
          <Col md={4} key={item.label}>
            <Card className="home-metric-card border-0 h-100">
              <CardBody className="p-4 text-center">
                <h3 className="fw-bold mb-1">
                  <AnimatedCount value={item.value} loading={isLoadingStats} />
                </h3>
                <div className="text-muted">{item.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="mb-4">
        <h2 className="fw-bold mb-3">Why teams choose {developedBy}</h2>
        <Row className="g-3">
          {highlights.map((item) => (
            <Col md={4} key={item.title}>
              <Card className="home-feature-card border-0 h-100">
                <CardBody className="p-4">
                  <span className="home-feature-icon mb-3 d-inline-flex align-items-center justify-content-center">
                    <IconifyIcon icon={item.icon} className="fs-22" />
                  </span>
                  <h5 className="fw-semibold mb-2">{item.title}</h5>
                  <p className="text-muted mb-0">{item.description}</p>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Card className="border-0 home-cta-card mb-1">
        <CardBody className="p-4 p-lg-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <h3 className="fw-bold mb-1">Build a smarter HR stack now</h3>
            <p className="mb-0 text-muted">From onboarding to project visibility, manage everything from one admin platform.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/about" className="btn btn-outline-secondary px-4">
              About Us
            </Link>
            <Link to="/auth/sign-in" className="btn btn-primary px-4">
              Sign In
            </Link>
          </div>
        </CardBody>
      </Card>

      <style>{`
        .home-hero {
          position: relative;
          background: radial-gradient(1200px 500px at 10% -10%, #58d4ff33, transparent 60%),
                      linear-gradient(120deg, #0f1f4d 0%, #17357d 45%, #2a65d4 100%);
          color: #dbe8ff;
          border: 1px solid #2e55aa;
        }
        .home-kicker {
          background: #ffffff1f;
          color: #c7dcff;
          border: 1px solid #ffffff30;
          border-radius: 999px;
          padding: 6px 12px;
          font-weight: 600;
          letter-spacing: .2px;
          backdrop-filter: blur(6px);
        }
        .home-subtitle {
          max-width: 640px;
          color: #c5d6ff;
          font-size: 1.05rem;
        }
        .home-dashboard-btn {
          border: 1px solid #d9e8ff;
          color: #eef5ff;
          background: rgba(255, 255, 255, 0.08);
          font-weight: 600;
        }
        .home-dashboard-btn:hover {
          background: #ffffff;
          color: #1c4693;
          border-color: #ffffff;
        }
        .home-gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(30px);
          opacity: .4;
        }
        .home-gradient-orb-1 {
          width: 260px;
          height: 260px;
          background: #2bd9ff;
          right: -70px;
          top: -60px;
        }
        .home-gradient-orb-2 {
          width: 220px;
          height: 220px;
          background: #93b7ff;
          left: -80px;
          bottom: -90px;
        }
        .home-hero-card {
          background: rgba(var(--bs-body-bg-rgb), 0.92);
          border: 1px solid rgba(var(--bs-border-color-rgb), 0.75);
          animation: home-fade-up .7s ease both;
        }
        .home-feature-card,
        .home-metric-card,
        .home-cta-card {
          box-shadow: 0 8px 24px rgba(var(--bs-dark-rgb), 0.08);
        }
        .home-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(var(--bs-primary-rgb), 0.12);
          color: var(--bs-primary);
        }
        .home-metric-card h3 {
          color: var(--bs-primary);
        }
        [data-bs-theme='dark'] .home-hero,
        html[data-bs-theme='dark'] .home-hero {
          background: radial-gradient(1000px 420px at 10% -10%, #50a7ff22, transparent 60%),
                      linear-gradient(120deg, #091027 0%, #0f1d46 45%, #174da0 100%);
          border-color: #234785;
        }
        [data-bs-theme='dark'] .home-kicker,
        html[data-bs-theme='dark'] .home-kicker {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.22);
        }
        [data-bs-theme='dark'] .home-hero-card,
        html[data-bs-theme='dark'] .home-hero-card {
          background: rgba(var(--bs-body-bg-rgb), 0.82);
          border-color: rgba(var(--bs-border-color-rgb), 0.6);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
        }
        [data-bs-theme='dark'] .home-feature-card,
        [data-bs-theme='dark'] .home-metric-card,
        [data-bs-theme='dark'] .home-cta-card,
        html[data-bs-theme='dark'] .home-feature-card,
        html[data-bs-theme='dark'] .home-metric-card,
        html[data-bs-theme='dark'] .home-cta-card {
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
        }
        [data-bs-theme='dark'] .home-subtitle,
        html[data-bs-theme='dark'] .home-subtitle {
          color: #d7e7ff;
        }
        @keyframes home-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

export default HomePublic
