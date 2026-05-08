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

const TeamsAnalytics = () => {
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalTeams, setTotalTeams] = useState(0)
  const [orgTeams, setOrgTeams] = useState([])
  const [orgTotal, setOrgTotal] = useState(0)

  useEffect(() => {
    fetchOrgs()
  }, [])
  useEffect(() => {
    if (orgId) fetchOrgTeams(orgId)
  }, [orgId])

  const fetchOrgs = async () => {
    try {
      const res = await axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true })
      const orgs = res.data?.data ?? []
      setOrganizations(orgs)
      if (orgs.length > 0) setOrgId(orgs[0].organizationId)
      const totalRes = await axiosClient.get('api/admin/team/get-teams-filter?page=1&limit=1', { silent: true })
      setTotalTeams(totalRes.data?.data?.totalRecords ?? 0)
    } catch {}
  }

  const fetchOrgTeams = async (selectedOrgId) => {
    setLoading(true)
    try {
      const res = await axiosClient.get(`api/admin/team/get-teams-filter?page=1&limit=50&organizationId=${selectedOrgId}`, { silent: true })
      const list = res.data?.data?.teamList ?? []
      setOrgTeams(list)
      setOrgTotal(res.data?.data?.totalRecords ?? list.length)
    } catch {
      setOrgTeams([])
      setOrgTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const selectedOrgName = organizations.find((o) => o.organizationId === orgId)?.name ?? ''
  const orgShare = totalTeams > 0 ? Math.round((orgTotal / totalTeams) * 100) : 0

  const barSeries = [{ name: 'Team', data: orgTeams.map((_, i) => i + 1) }]
  const barOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, horizontal: true, distributed: true } },
    dataLabels: { enabled: false },
    xaxis: { labels: { show: false } },
    yaxis: {
      labels: {
        formatter: (_, i) => {
          const t = orgTeams[i]
          if (!t) return ''
          const name = t.teamName ?? t.name ?? `Team ${i + 1}`
          return name.length > 20 ? name.slice(0, 18) + '…' : name
        },
      },
    },
    colors: ['#0ea5e9', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899'],
    grid: { strokeDashArray: 4 },
    legend: { show: false },
    noData: { text: 'No teams found' },
    tooltip: {
      y: {
        formatter: (_, { dataPointIndex }) => {
          const t = orgTeams[dataPointIndex]
          return t ? (t.teamName ?? t.name ?? 'Team') : ''
        },
      },
    },
  }

  const radialOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    colors: ['#6366f1'],
    plotOptions: {
      radialBar: {
        hollow: { size: '58%' },
        track: { background: '#e5e7eb' },
        dataLabels: {
          name: { show: false },
          value: { fontSize: '26px', fontWeight: 700, offsetY: 8, formatter: (v) => `${Math.round(v)}%` },
        },
      },
    },
  }

  return (
    <>
      <PageBreadcrumb title="Teams Analytics" subName="Teams" />
      <PageMetaData title="Teams Analytics" />

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
            title="Total Teams"
            value={totalTeams}
            subtitle="Across all organizations"
            iconName="mdi:account-group-outline"
            color="#0ea5e9"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard
            title="Teams in Org"
            value={orgTotal}
            subtitle={selectedOrgName || 'Selected organization'}
            iconName="mdi:office-building"
            color="#6366f1"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard
            title="Other Orgs"
            value={Math.max(0, totalTeams - orgTotal)}
            subtitle="Teams outside this org"
            iconName="mdi:format-list-bulleted"
            color="#14b8a6"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Org Share" value={`${orgShare}%`} subtitle="Share of total teams" iconName="mdi:chart-donut" color="#f97316" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={8}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Teams in {selectedOrgName || 'Organization'}</h5>
              <p className="text-muted mb-0 small">All teams registered under the selected organization</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
                  <Spinner animation="border" />
                </div>
              ) : (
                <ReactApexChart options={barOptions} series={barSeries} type="bar" height={Math.max(250, orgTeams.length * 36)} />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Org Share</h5>
              <p className="text-muted mb-0 small">Teams in this org vs total</p>
            </CardHeader>
            <CardBody className="d-flex flex-column justify-content-center">
              <ReactApexChart options={radialOptions} series={[orgShare]} type="radialBar" height={260} />
              <div className="text-center small text-muted mt-1">
                {orgTotal} of {totalTeams} teams
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default TeamsAnalytics
