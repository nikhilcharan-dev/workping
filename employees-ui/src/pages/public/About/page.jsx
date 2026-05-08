import { useEffect, useRef, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { developedBy } from '@/context/constants'
import httpClient from '@/helpers/httpClient'

const features = [
  {
    icon: 'iconamoon:profile-circle-duotone',
    title: 'Employee Management',
    description: 'Manage your entire workforce from a single dashboard — onboarding, profiles, attendance, and more.',
  },
  {
    icon: 'iconamoon:category-duotone',
    title: 'Team Collaboration',
    description: 'Organize employees into departments and project teams with clear roles and responsibilities.',
  },
  {
    icon: 'iconamoon:briefcase-duotone',
    title: 'Project Tracking',
    description: 'Assign projects to teams, track progress, and ensure deadlines are met efficiently.',
  },
  {
    icon: 'iconamoon:calendar-2-duotone',
    title: 'Holiday & Leave',
    description: 'Manage holidays, leave requests, and attendance records with ease.',
  },
  {
    icon: 'iconamoon:shield-duotone',
    title: 'Secure & Reliable',
    description: 'Two-factor authentication, role-based access control, and enterprise-grade security built in.',
  },
  {
    icon: 'iconamoon:lightning-2-duotone',
    title: 'Fast & Scalable',
    description: 'Built for businesses of all sizes — from startups to large enterprises.',
  },
]

// Animates a number from 0 → target over `duration` ms using easeOut
const useCountUp = (target, duration = 1400, active = true) => {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active || target === 0) {
      setDisplay(target)
      return
    }
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, active])

  return display
}

const StatCard = ({ target, suffix = '', decimals = 0, label, color, loading }) => {
  const count = useCountUp(target, 1400, !loading && target > 0)
  const formatted = decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()

  return (
    <div className="text-center py-2">
      {loading ? (
        <>
          <span className="stat-skeleton-value" />
          <span className="stat-skeleton-label" />
        </>
      ) : (
        <>
          <h2 key={target} className={`fw-bold text-${color} mb-0 stat-value-enter`}>
            {formatted}
            {suffix}
          </h2>
          <small className="text-muted">{label}</small>
        </>
      )}
    </div>
  )
}

const About = () => {
  const [stats, setStats] = useState({ employeeCount: 0, organizationCount: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    httpClient
      .get('/api/public/stats', { silent: true })
      .then((res) => {
        if (res.data?.data) setStats(res.data.data)
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  return (
    <>
      <PageMetaData title="About Us" />

      {/* Hero */}
      <div className="text-center mb-5">
        <h1 className="fw-bold">About {developedBy}</h1>
        <p className="text-muted fs-5 mt-2 mx-auto" style={{ maxWidth: 600 }}>
          A modern workforce management platform designed to help businesses streamline operations, empower teams, and drive productivity.
        </p>
      </div>

      {/* Mission */}
      <Card className="shadow-sm mb-4">
        <CardBody className="p-4 p-lg-5">
          <Row className="align-items-center g-4">
            <Col lg={6}>
              <h2 className="fw-bold mb-3">Our Mission</h2>
              <p className="text-muted">
                At {developedBy}, we believe that great businesses are built by great people. Our mission is to give HR teams, managers, and employees
                the tools they need to work smarter — not harder.
              </p>
              <p className="text-muted">
                We built {developedBy} to solve the real challenges that growing organizations face: scattered employee data, manual attendance
                tracking, siloed project management, and inefficient communication. Everything you need is in one place.
              </p>
              <Link to="/auth/sign-in" className="btn btn-primary mt-2">
                Get Started Free
              </Link>
            </Col>
            <Col lg={6}>
              <div className="bg-light rounded-3 p-4">
                <Row className="g-3">
                  <Col xs={6}>
                    <StatCard target={stats.employeeCount} label="Employees" color="primary" loading={statsLoading} />
                  </Col>
                  <Col xs={6}>
                    <StatCard target={stats.organizationCount} label="Organizations" color="success" loading={statsLoading} />
                  </Col>
                  <Col xs={6}>
                    <StatCard target={99.9} suffix="%" decimals={1} label="Uptime" color="warning" loading={false} />
                  </Col>
                  <Col xs={6}>
                    <StatCard target={24} suffix="/7" label="Support" color="danger" loading={false} />
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Features */}
      <div className="mb-5">
        <h2 className="fw-bold text-center mb-4">What We Offer</h2>
        <Row className="g-4">
          {features.map((feature, idx) => (
            <Col md={6} lg={4} key={idx}>
              <Card className="h-100 shadow-sm border-0">
                <CardBody className="p-4">
                  <div className="avatar-md mb-3">
                    <span className="avatar-title bg-primary bg-opacity-10 text-primary fs-24 rounded-circle">
                      <IconifyIcon icon={feature.icon} />
                    </span>
                  </div>
                  <h5 className="fw-semibold mb-2">{feature.title}</h5>
                  <p className="text-muted mb-0">{feature.description}</p>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA */}
      <Card className="shadow-sm bg-primary text-white text-center border-0">
        <CardBody className="p-5">
          <h2 className="fw-bold mb-3">Ready to transform your workforce management?</h2>
          <p className="mb-4 opacity-75">Start managing your workforce smarter with {developedBy} — all your HR needs in one place.</p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/auth/sign-in" className="btn btn-light text-primary fw-semibold px-4">
              Start Free Trial
            </Link>
            <Link to="/contact" className="btn btn-outline-light fw-semibold px-4">
              Talk to Us
            </Link>
          </div>
        </CardBody>
      </Card>
    </>
  )
}

export default About
