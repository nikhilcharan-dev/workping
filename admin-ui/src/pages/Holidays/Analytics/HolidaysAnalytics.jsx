import { useState, useEffect } from 'react'
import { Badge, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import ReactApexChart from 'react-apexcharts'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const toYmd = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const countSundaysThisYear = () => {
  const year = new Date().getFullYear()
  let count = 0
  const cursor = new Date(year, 0, 1)
  while (cursor.getFullYear() === year) {
    if (cursor.getDay() === 0) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

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

const HolidaysAnalytics = () => {
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(false)
  const [holidays, setHolidays] = useState([])

  useEffect(() => {
    fetchOrgs()
  }, [])
  useEffect(() => {
    if (orgId) fetchHolidays(orgId)
  }, [orgId])

  const fetchOrgs = async () => {
    try {
      const res = await axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true })
      const orgs = res.data?.data ?? []
      setOrganizations(orgs)
      if (orgs.length > 0) setOrgId(orgs[0].organizationId)
    } catch {}
  }

  const fetchHolidays = async (selectedOrgId) => {
    setLoading(true)
    try {
      const res = await axiosClient.get('/api/admin/holiday/get-holidays', {
        params: { organizationId: selectedOrgId },
        silent: true,
      })
      setHolidays((res.data?.data ?? []).map((h) => ({ ...h, date: toYmd(h.date) || h.date })))
    } catch {
      setHolidays([])
    } finally {
      setLoading(false)
    }
  }

  const year = new Date().getFullYear()
  const thisYearHolidays = holidays.filter((h) => h.date?.startsWith(String(year)))
  const publicCount = thisYearHolidays.filter((h) => h.type === 'public').length
  const optionalCount = thisYearHolidays.filter((h) => h.type === 'optional').length
  const customCount = thisYearHolidays.filter((h) => h.type !== 'public' && h.type !== 'optional').length
  const sundayCount = countSundaysThisYear()

  const today = toYmd(new Date())
  const upcoming = thisYearHolidays.filter((h) => h.date >= today).length

  const byMonth = new Array(12).fill(0)
  thisYearHolidays.forEach((h) => {
    const m = new Date(h.date).getMonth()
    if (m >= 0 && m < 12) byMonth[m]++
  })

  const barSeries = [{ name: 'Holidays', data: byMonth }]
  const barOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { speed: 800 } },
    plotOptions: { bar: { borderRadius: 5, columnWidth: '52%', distributed: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: MONTHS, labels: { style: { fontSize: '11px' } } },
    yaxis: { min: 0, labels: { formatter: (v) => Math.round(v) } },
    colors: ['#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#84cc16', '#06b6d4', '#a855f7'],
    grid: { strokeDashArray: 4 },
    legend: { show: false },
    noData: { text: 'No holiday data for this year' },
  }

  const nonZero = [publicCount, optionalCount, customCount].some((v) => v > 0)
  const donutSeries = nonZero ? [publicCount, optionalCount, customCount] : [1]
  const donutLabels = nonZero ? ['Public', 'Optional', 'Custom / Other'] : ['No Holidays']

  const donutOptions = {
    labels: donutLabels,
    chart: { type: 'donut' },
    colors: ['#22c55e', '#0ea5e9', '#f59e0b'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    plotOptions: {
      pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '13px' } } } },
    },
    noData: { text: 'No data' },
  }

  return (
    <>
      <PageBreadcrumb title="Holidays Analytics" subName="Holidays" />
      <PageMetaData title="Holidays Analytics" />

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
            <Badge bg="success" pill>
              Live
            </Badge>
          )}
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={6} xl={3}>
          <MetricCard
            title={`Holidays ${year}`}
            value={thisYearHolidays.length}
            subtitle="Custom holidays this year"
            iconName="mdi:calendar-check-outline"
            color="#22c55e"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Public Holidays" value={publicCount} subtitle="National / gazetted" iconName="mdi:bank-outline" color="#0ea5e9" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Upcoming" value={upcoming} subtitle="Remaining this year" iconName="mdi:clock-time-four-outline" color="#f59e0b" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Weekly Offs" value={sundayCount} subtitle={`Sundays in ${year}`} iconName="mdi:calendar-week-outline" color="#6366f1" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={7}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Holidays by Month — {year}</h5>
              <p className="text-muted mb-0 small">Custom holidays distributed across the calendar year</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactApexChart options={barOptions} series={barSeries} type="bar" height={300} />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Holiday Types</h5>
              <p className="text-muted mb-0 small">Public / Optional / Custom breakdown</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={300} />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default HolidaysAnalytics
