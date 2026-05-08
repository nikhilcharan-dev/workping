import { useState, useEffect, useMemo } from 'react'
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

const ProjectsAnalytics = () => {
  const [orgData, setOrgData] = useState({})
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalProjects, setTotalProjects] = useState(0)
  const [orgProjects, setOrgProjects] = useState([])
  const [orgTotal, setOrgTotal] = useState(0)

  const orgNames = useMemo(() => Object.keys(orgData), [orgData])

  useEffect(() => {
    fetchInit()
  }, [])
  useEffect(() => {
    if (orgName && orgData[orgName]) fetchOrgProjects(orgData[orgName].organizationId)
  }, [orgName])

  const fetchInit = async () => {
    try {
      const [infoRes, totalRes] = await Promise.all([
        axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true }),
        axiosClient.get('/api/admin/project/get-projects?page=1&limit=1', { silent: true }),
      ])
      const info = infoRes.data?.data ?? {}
      setOrgData(info)
      setTotalProjects(totalRes.data?.data?.totalRecords ?? 0)
      const names = Object.keys(info)
      if (names.length > 0) setOrgName(names[0])
    } catch {}
  }

  const fetchOrgProjects = async (organizationId) => {
    setLoading(true)
    try {
      const res = await axiosClient.get(`/api/admin/project/get-projects?page=1&limit=50&organizationId=${organizationId}`, { silent: true })
      const list = res.data?.data?.projects ?? []
      setOrgProjects(list)
      setOrgTotal(res.data?.data?.totalRecords ?? list.length)
    } catch {
      setOrgProjects([])
      setOrgTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const orgShare = totalProjects > 0 ? Math.round((orgTotal / totalProjects) * 100) : 0
  const otherProjects = Math.max(0, totalProjects - orgTotal)

  const trendSeries = [{ name: 'Projects', data: orgProjects.map((_, i) => i + 1) }]
  const trendOptions = {
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 800 } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.04 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: orgProjects.map((p, i) => {
        const name = p.projectName ?? p.name ?? `P${i + 1}`
        return name.length > 12 ? name.slice(0, 10) + '…' : name
      }),
      labels: { rotate: -20, style: { fontSize: '10px' } },
    },
    colors: ['#f97316'],
    grid: { strokeDashArray: 4 },
    noData: { text: 'No project data' },
  }

  const donutSeries = [orgTotal, otherProjects].filter((v, i) => i === 0 || v > 0)
  const donutLabels =
    orgTotal > 0 && otherProjects > 0 ? [orgName || 'Selected Org', 'Other Orgs'] : orgTotal > 0 ? [orgName || 'Selected Org'] : ['No Data']

  const donutOptions = {
    labels: donutLabels,
    chart: { type: 'donut' },
    colors: ['#f97316', '#e5e7eb'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    plotOptions: {
      pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '13px' } } } },
    },
    noData: { text: 'No data' },
  }

  const radialOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    colors: ['#f97316'],
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
      <PageBreadcrumb title="Projects Analytics" subName="Projects" />
      <PageMetaData title="Projects Analytics" />

      <Row className="g-2 mb-3 align-items-center">
        <Col xs="auto">
          <select className="form-select form-select-sm" value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ minWidth: 200 }}>
            {orgNames.length === 0 && <option value="">No organizations</option>}
            {orgNames.map((n) => (
              <option key={n} value={n}>
                {n}
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
            title="Total Projects"
            value={totalProjects}
            subtitle="Across all organizations"
            iconName="mdi:briefcase-variant-outline"
            color="#f97316"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard
            title="Org Projects"
            value={orgTotal}
            subtitle={orgName || 'Selected organization'}
            iconName="mdi:office-building"
            color="#0ea5e9"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard
            title="Other Orgs"
            value={otherProjects}
            subtitle="Projects outside this org"
            iconName="mdi:format-list-bulleted"
            color="#6366f1"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Org Share" value={`${orgShare}%`} subtitle="Of all projects" iconName="mdi:chart-donut" color="#14b8a6" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={8}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Projects in {orgName || 'Organization'}</h5>
              <p className="text-muted mb-0 small">All projects under the selected organization</p>
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
        <Col lg={4}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Project Share</h5>
              <p className="text-muted mb-0 small">This org vs total projects</p>
            </CardHeader>
            <CardBody className="d-flex flex-column justify-content-center">
              <ReactApexChart options={radialOptions} series={[orgShare]} type="radialBar" height={200} />
              <div className="text-center small text-muted mt-1">
                {orgTotal} of {totalProjects} projects
              </div>
              <div className="mt-3">
                <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={160} />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ProjectsAnalytics
