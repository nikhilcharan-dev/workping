import { useState, useEffect } from 'react'
import { Badge, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import ReactApexChart from 'react-apexcharts'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'

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

const OrganizationAnalytics = () => {
  const [loading, setLoading] = useState(false)
  const [orgList, setOrgList] = useState([])
  const [orgInfo, setOrgInfo] = useState({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [idsRes, infoRes] = await Promise.all([
        axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true }),
        axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true }),
      ])
      setOrgList(idsRes.data?.data ?? [])
      setOrgInfo(infoRes.data?.data ?? {})
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const totalOrgs = orgList.length
  const orgNames = Object.keys(orgInfo)
  const teamCounts = orgNames.map((n) => orgInfo[n]?.teams?.length ?? 0)
  const totalTeams = teamCounts.reduce((a, b) => a + b, 0)
  const avgTeams = totalOrgs > 0 ? (totalTeams / totalOrgs).toFixed(1) : 0
  const maxTeams = teamCounts.length > 0 ? Math.max(...teamCounts) : 0

  const barSeries = [{ name: 'Teams', data: teamCounts }]
  const barOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { speed: 800 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '52%', distributed: true } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: orgNames.map((n) => (n.length > 16 ? n.slice(0, 14) + '…' : n)),
      labels: { rotate: -20, style: { fontSize: '11px' } },
    },
    yaxis: { min: 0, labels: { formatter: (v) => Math.round(v) } },
    colors: ['#0ea5e9', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899'],
    grid: { strokeDashArray: 4 },
    legend: { show: false },
    noData: { text: 'No organization data' },
  }

  const donutSeries = teamCounts.length > 0 ? teamCounts : [1]
  const donutOptions = {
    labels: teamCounts.length > 0 ? orgNames : ['No data'],
    chart: { type: 'donut' },
    colors: ['#0ea5e9', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    plotOptions: {
      pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total Teams' } } } },
    },
    noData: { text: 'No data' },
  }

  return (
    <>
      <PageBreadcrumb title="Organization Analytics" subName="Organizations" />
      <PageMetaData title="Organization Analytics" />

      <Row className="g-2 mb-3 align-items-center">
        <Col xs="auto" className="ms-auto d-flex align-items-center gap-2">
          {loading ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <Badge bg="success" pill>
              Live
            </Badge>
          )}
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchData} disabled={loading}>
            Refresh
          </button>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={6} xl={3}>
          <MetricCard
            title="Total Organizations"
            value={totalOrgs}
            subtitle="Registered organizations"
            iconName="mdi:office-building"
            color="#0ea5e9"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard
            title="Total Teams"
            value={totalTeams}
            subtitle="Across all organizations"
            iconName="mdi:account-group-outline"
            color="#6366f1"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Avg Teams / Org" value={avgTeams} subtitle="Average team count per org" iconName="mdi:chart-bar" color="#14b8a6" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Most Teams" value={maxTeams} subtitle="Highest team count in one org" iconName="mdi:trophy-outline" color="#f97316" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={7}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Teams per Organization</h5>
              <p className="text-muted mb-0 small">Number of teams in each organization</p>
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
              <h5 className="mb-1">Team Distribution</h5>
              <p className="text-muted mb-0 small">Share of teams across organizations</p>
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

export default OrganizationAnalytics
