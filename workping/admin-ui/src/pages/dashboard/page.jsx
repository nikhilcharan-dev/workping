import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import ReactApexChart from 'react-apexcharts'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'

const buildTrend = (finalValue) => {
  const safeFinal = Number(finalValue) || 0
  const seed = Math.max(1, Math.round(safeFinal * 0.52))
  return Array.from({ length: 6 }).map((_, idx) => {
    const value = seed + ((safeFinal - seed) * (idx + 1)) / 6
    return Math.round(value)
  })
}

const buildSundayDefaultsByMonth = (year = new Date().getFullYear()) => {
  const result = new Array(12).fill(0)
  const cursor = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  while (cursor <= end) {
    if (cursor.getDay() === 0) {
      result[cursor.getMonth()] += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

const MetricCard = ({ title, value, subtitle, colorClass }) => {
  return (
    <Card className={`h-100 wp-reveal ${colorClass}`}>
      <CardBody>
        <p className="mb-1 text-muted text-uppercase fw-semibold small">{title}</p>
        <h2 className="mb-1 fw-bold">{value}</h2>
        <p className="mb-0 text-muted">{subtitle}</p>
      </CardBody>
    </Card>
  )
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState({
    organizations: 0,
    teams: 0,
    employees: 0,
    projects: 0,
    organizationsByName: [],
    teamsByOrg: [],
    holidaysByMonth: new Array(12).fill(0),
    defaultSundaysByMonth: new Array(12).fill(0),
    customHolidaysByMonth: new Array(12).fill(0),
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError('')

      const [orgInfoRes, employeesRes, projectsRes, orgIdsRes] = await Promise.allSettled([
        axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true }),
        axiosClient.get('/api/admin/get-all-employees/get-all-employees-by-page-number?page=1&limit=1', { silent: true }),
        axiosClient.get('/api/admin/project/get-projects?page=1&limit=1', { silent: true }),
        axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true }),
      ])

      const orgInfo = orgInfoRes.status === 'fulfilled' ? (orgInfoRes.value?.data?.data ?? {}) : {}
      const orgEntries = Object.entries(orgInfo)

      const organizationsByName = orgEntries.map(([name]) => name)
      const teamsByOrg = orgEntries.map(([name, details]) => ({
        name,
        teams: Array.isArray(details?.teams) ? details.teams.length : 0,
      }))

      const organizations = orgEntries.length
      const teams = teamsByOrg.reduce((sum, item) => sum + item.teams, 0)
      const employees = employeesRes.status === 'fulfilled' ? Number(employeesRes.value?.data?.data?.totalRecords ?? 0) : 0
      const projects = projectsRes.status === 'fulfilled' ? Number(projectsRes.value?.data?.data?.totalRecords ?? 0) : 0

      const defaultSundaysByMonth = buildSundayDefaultsByMonth()
      const customHolidaysByMonth = new Array(12).fill(0)
      let holidaysByMonth = [...defaultSundaysByMonth]
      if (orgIdsRes.status === 'fulfilled') {
        const orgIds = orgIdsRes.value?.data?.data ?? []
        const holidayRequests = orgIds.map((org) =>
          axiosClient.get('/api/admin/holiday/get-holidays', {
            params: { organizationId: org.organizationId },
            silent: true,
          }),
        )

        const holidayResults = await Promise.allSettled(holidayRequests)
        holidayResults.forEach((res) => {
          if (res.status !== 'fulfilled') return
          const items = res.value?.data?.data ?? []
          items.forEach((h) => {
            if (!h?.date) return
            const d = new Date(h.date)
            if (Number.isNaN(d.getTime())) return
            customHolidaysByMonth[d.getMonth()] += 1
            holidaysByMonth[d.getMonth()] += 1
          })
        })
      }

      if (orgInfoRes.status === 'rejected' && employeesRes.status === 'rejected' && projectsRes.status === 'rejected') {
        setError('Unable to load dashboard metrics right now.')
      }

      setPayload({
        organizations,
        teams,
        employees,
        projects,
        organizationsByName,
        teamsByOrg,
        holidaysByMonth,
        defaultSundaysByMonth,
        customHolidaysByMonth,
      })

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const readinessScore = useMemo(() => {
    const orgFactor = Math.min(100, payload.organizations * 12)
    const teamFactor = Math.min(100, payload.teams * 6)
    const employeeFactor = Math.min(100, Math.round(payload.employees / 2))
    const projectFactor = Math.min(100, payload.projects * 8)
    return Math.round((orgFactor + teamFactor + employeeFactor + projectFactor) / 4)
  }, [payload])

  const entityMixSeries = [payload.organizations, payload.teams, payload.employees, payload.projects]
  const entityMixOptions = {
    labels: ['Organizations', 'Teams', 'Employees', 'Projects'],
    chart: { type: 'donut', toolbar: { show: false }, animations: { enabled: true } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    colors: ['#0ea5e9', '#14b8a6', '#f59e0b', '#6366f1'],
    plotOptions: { pie: { donut: { size: '68%' } } },
  }

  const workforceSeries = [
    { name: 'Employees', data: buildTrend(payload.employees) },
    { name: 'Projects', data: buildTrend(payload.projects) },
  ]
  const workforceOptions = {
    chart: { type: 'area', toolbar: { show: false }, animations: { easing: 'easeinout', speed: 900 } },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.04 } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    colors: ['#2563eb', '#22c55e'],
    grid: { strokeDashArray: 4 },
    legend: { position: 'top' },
  }

  const teamsBarOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { speed: 850 } },
    plotOptions: { bar: { borderRadius: 8, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: payload.teamsByOrg.map((o) => o.name), labels: { rotate: -25, trim: true } },
    yaxis: { min: 0 },
    colors: ['#0ea5e9'],
    grid: { strokeDashArray: 4 },
  }
  const teamsBarSeries = [{ name: 'Teams', data: payload.teamsByOrg.map((o) => o.teams) }]

  const orgStrengthOptions = {
    chart: { type: 'radar', toolbar: { show: false }, animations: { speed: 900 } },
    xaxis: { categories: payload.teamsByOrg.map((o) => o.name) },
    yaxis: { show: false },
    stroke: { width: 2 },
    fill: { opacity: 0.24 },
    markers: { size: 4 },
    colors: ['#06b6d4'],
  }
  const orgStrengthSeries = [
    {
      name: 'Org Strength',
      data: payload.teamsByOrg.map((o) => Math.max(1, o.teams * 8)),
    },
  ]

  const holidayTrendOptions = {
    chart: { type: 'line', toolbar: { show: false }, animations: { speed: 800 } },
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4 },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    colors: ['#f97316'],
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 5 },
  }
  const holidayTrendSeries = [{ name: 'Holidays', data: payload.holidaysByMonth }]

  const holidaySplitOptions = {
    chart: { type: 'bar', toolbar: { show: false }, stacked: true, animations: { speed: 850 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '52%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    colors: ['#64748b', '#f59e0b'],
    legend: { position: 'top' },
    grid: { strokeDashArray: 4 },
  }
  const holidaySplitSeries = [
    { name: 'Default Sundays', data: payload.defaultSundaysByMonth },
    { name: 'Custom Holidays', data: payload.customHolidaysByMonth },
  ]

  const readinessOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    colors: ['#7c3aed'],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: '#e5e7eb' },
        dataLabels: {
          name: { show: false },
          value: { fontSize: '28px', fontWeight: 700, offsetY: 8 },
        },
      },
    },
  }

  return (
    <>
      <PageBreadcrumb title="Analytics" subName="Dashboards" />
      <PageMetaData title="Analytics" />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <Row className="g-3 mb-1">
        <Col xs={12}>
          <Card className="border-0 wp-hero-card overflow-hidden">
            <CardBody className="py-4 px-4 position-relative">
              <div className="wp-hero-glow" />
              <div className="d-flex flex-wrap align-items-center gap-3 position-relative">
                <div>
                  <p className="mb-1 text-uppercase small text-white-50">WorkPing Operations Pulse</p>
                  <h2 className="mb-1 text-white">Realtime Workforce Command Center</h2>
                  <p className="mb-0 text-white-50">Live operational analytics for organizations, teams, projects, and holidays.</p>
                </div>
                <div className="ms-auto d-flex gap-2 align-items-center">
                  <Badge bg="light" text="dark" pill>
                    Live Sync
                  </Badge>
                  {loading ? (
                    <Spinner size="sm" animation="border" />
                  ) : (
                    <Badge bg="success" pill>
                      Updated
                    </Badge>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={6} xl={3}>
          <MetricCard title="Organizations" value={payload.organizations} subtitle="Active business units" colorClass="wp-metric-card" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Teams" value={payload.teams} subtitle="Structured departments" colorClass="wp-metric-card" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Employees" value={payload.employees} subtitle="Registered workforce" colorClass="wp-metric-card" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Projects" value={payload.projects} subtitle="Tracked initiatives" colorClass="wp-metric-card" />
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xl={8}>
          <Card className="h-100 wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Workforce Growth Signal</h5>
              <p className="text-muted mb-0">6-month operational trend projection from current records</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={workforceOptions} series={workforceSeries} type="area" height={320} />
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100 wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Operations Readiness</h5>
              <p className="text-muted mb-0">Composite operational maturity score</p>
            </CardHeader>
            <CardBody className="d-flex flex-column justify-content-center">
              <ReactApexChart options={readinessOptions} series={[readinessScore]} type="radialBar" height={280} />
              <div className="text-center text-muted small mt-2">Score from entities and delivery capacity</div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col lg={6}>
          <Card className="h-100 wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Entity Composition</h5>
              <p className="text-muted mb-0">Distribution snapshot across core operational entities</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={entityMixOptions} series={entityMixSeries} type="donut" height={320} />
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100 wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Teams Per Organization</h5>
              <p className="text-muted mb-0">Where departmental load is currently concentrated</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={teamsBarOptions} series={teamsBarSeries} type="bar" height={320} />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col lg={6}>
          <Card className="h-100 wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Holiday Composition</h5>
              <p className="text-muted mb-0">Default Sundays + custom holidays by month</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={holidaySplitOptions} series={holidaySplitSeries} type="bar" height={300} />
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100 wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Organization Strength Map</h5>
              <p className="text-muted mb-0">Relative team density by organization</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={orgStrengthOptions} series={orgStrengthSeries} type="radar" height={300} />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xs={12}>
          <Card className="wp-reveal">
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Holiday Load Timeline</h5>
              <p className="text-muted mb-0">Month-wise holiday count across all organizations</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={holidayTrendOptions} series={holidayTrendSeries} type="line" height={290} />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <style>{`
        .wp-hero-card {
          background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 40%, #0ea5e9 100%);
          box-shadow: 0 14px 38px rgba(14, 165, 233, 0.28);
        }

        .wp-hero-glow {
          position: absolute;
          right: -40px;
          top: -40px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0));
          animation: wpPulse 3.2s ease-in-out infinite;
        }

        .wp-metric-card {
          border: 0;
          background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }

        .wp-reveal {
          animation: wpRise 560ms ease both;
        }

        @keyframes wpRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wpPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.07);
            opacity: 0.75;
          }
        }
      `}</style>
    </>
  )
}
