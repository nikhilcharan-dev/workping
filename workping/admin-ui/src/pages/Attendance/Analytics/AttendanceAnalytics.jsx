import { useState, useEffect } from 'react'
import { Badge, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import ReactApexChart from 'react-apexcharts'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'

const toYmd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const MetricCard = ({ title, value, subtitle, iconName, color }) => (
  <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
    <CardBody className="d-flex align-items-center gap-3">
      <div
        className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 52, height: 52, background: color + '20' }}>
        <Icon icon={iconName} style={{ fontSize: 26, color }} />
      </div>
      <div>
        <p className="mb-0 text-muted text-uppercase small fw-semibold">{title}</p>
        <h3 className="mb-0 fw-bold" style={{ color }}>
          {value ?? '--'}
        </h3>
        <p className="mb-0 text-muted small">{subtitle}</p>
      </div>
    </CardBody>
  </Card>
)

const AttendanceAnalytics = () => {
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetchInit()
  }, [])
  useEffect(() => {
    if (orgId) fetchSummary(orgId)
  }, [orgId])

  const fetchInit = async () => {
    try {
      const res = await axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true })
      const orgs = res.data?.data ?? []
      setOrganizations(orgs)
      if (orgs.length > 0) setOrgId(orgs[0].organizationId)
    } catch {}
  }

  const fetchSummary = async (selectedOrgId) => {
    setLoading(true)
    setSummary(null)
    try {
      const res = await axiosClient.get('/api/admin/attendance/summary', {
        params: { organizationId: selectedOrgId, date: toYmd() },
        silent: true,
      })
      setSummary(res.data?.data ?? null)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const today = summary?.today ?? {}
  const presentCount = today.present ?? 0
  const absentCount = today.absent ?? 0
  const lateCount = today.late ?? 0
  const halfDayCount = today.halfDay ?? 0
  const totalEmployees = today.total ?? 0
  const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0

  // Build 30-day trend arrays from trend map
  const trend = summary?.trend ?? {}
  const trendDates = Object.keys(trend).sort()
  const trendPresent = trendDates.map((d) => trend[d]?.present ?? 0)
  const trendAbsent = trendDates.map((d) => trend[d]?.absent ?? 0)
  const trendLate = trendDates.map((d) => trend[d]?.late ?? 0)
  const trendLabels = trendDates.map((d) => {
    const dt = new Date(d)
    return `${dt.getDate()}/${dt.getMonth() + 1}`
  })

  const trendSeries = [
    { name: 'Present', data: trendPresent },
    { name: 'Absent', data: trendAbsent },
    { name: 'Late', data: trendLate },
  ]
  const trendOptions = {
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 800 } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.04 } },
    dataLabels: { enabled: false },
    xaxis: { categories: trendLabels, labels: { rotate: -30, style: { fontSize: '10px' } } },
    colors: ['#22c55e', '#ef4444', '#f59e0b'],
    legend: { position: 'top' },
    grid: { strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false },
    noData: { text: 'No attendance data in range' },
  }

  const donutSeries = [presentCount, absentCount, lateCount, halfDayCount]
  const donutOptions = {
    labels: ['Present', 'Absent', 'Late', 'Half Day'],
    chart: { type: 'donut', animations: { enabled: true } },
    colors: ['#22c55e', '#ef4444', '#f59e0b', '#0ea5e9'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '13px' } } } } },
    noData: { text: 'No data for today' },
  }

  const teamRates = summary?.teamRates ?? []
  const teamBarSeries = [{ name: 'Attendance Rate (%)', data: teamRates.map((t) => t.rate) }]
  const teamBarOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { speed: 800 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '52%', distributed: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: teamRates.map((t) => t.teamName), labels: { rotate: -20, trim: true, style: { fontSize: '11px' } } },
    yaxis: { min: 0, max: 100, labels: { formatter: (v) => `${v}%` } },
    colors: ['#0ea5e9', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899'],
    grid: { strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => `${v}%` } },
    noData: { text: 'No team data' },
  }

  const radialOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    colors: ['#22c55e'],
    plotOptions: {
      radialBar: {
        hollow: { size: '58%' },
        track: { background: '#e5e7eb' },
        dataLabels: {
          name: { show: false },
          value: { fontSize: '26px', fontWeight: 700, offsetY: 8, formatter: (v) => `${v}%` },
        },
      },
    },
  }

  return (
    <>
      <PageBreadcrumb title="Attendance Analytics" subName="Attendance" />
      <PageMetaData title="Attendance Analytics" />

      <Row className="g-2 mb-3 align-items-center">
        <Col xs="auto">
          <select className="form-select form-select-sm" value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ minWidth: 200 }}>
            {organizations.length === 0 && <option value="">No organizations</option>}
            {organizations.map((o) => (
              <option key={o.organizationId} value={o.organizationId}>
                {o.name}
              </option>
            ))}
          </select>
        </Col>
        <Col xs="auto" className="ms-auto d-flex align-items-center gap-2">
          {loading ? (
            <Spinner size="sm" animation="border" />
          ) : (
            summary && (
              <Badge bg="success" pill>
                Loaded
              </Badge>
            )
          )}
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={6} xl={3}>
          <MetricCard
            title="Present Today"
            value={presentCount}
            subtitle={`of ${totalEmployees} employees`}
            iconName="mdi:account-check-outline"
            color="#22c55e"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Absent Today" value={absentCount} subtitle="Not checked in" iconName="mdi:account-remove-outline" color="#ef4444" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Late Arrivals" value={lateCount} subtitle="After cutoff time" iconName="mdi:clock-alert-outline" color="#f59e0b" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Half Day" value={halfDayCount} subtitle="Partial attendance" iconName="mdi:clock-time-twelve-outline" color="#0ea5e9" />
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xl={8}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">30-Day Attendance Trend</h5>
              <p className="text-muted mb-0 small">Daily headcount from attendance records</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactApexChart options={trendOptions} series={trendSeries} type="area" height={300} />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Today&apos;s Rate</h5>
              <p className="text-muted mb-0 small">Overall attendance percentage</p>
            </CardHeader>
            <CardBody className="d-flex flex-column justify-content-center">
              <ReactApexChart options={radialOptions} series={[attendanceRate]} type="radialBar" height={260} />
              <div className="text-center small text-muted mt-1">
                {presentCount} of {totalEmployees} present
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Today&apos;s Breakdown</h5>
              <p className="text-muted mb-0 small">Present / Absent / Late / Half Day</p>
            </CardHeader>
            <CardBody>
              <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={300} />
            </CardBody>
          </Card>
        </Col>
        <Col lg={7}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Team-wise Attendance Rate</h5>
              <p className="text-muted mb-0 small">Percentage of employees present per team today</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactApexChart options={teamBarOptions} series={teamBarSeries} type="bar" height={300} />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AttendanceAnalytics
