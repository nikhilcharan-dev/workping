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

const EmployeesAnalytics = () => {
  const [orgData, setOrgData] = useState({})
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [orgEmployees, setOrgEmployees] = useState(0)

  const orgNames = useMemo(() => Object.keys(orgData), [orgData])

  useEffect(() => {
    fetchInit()
  }, [])
  useEffect(() => {
    if (orgName && orgData[orgName]) fetchOrgEmployees(orgData[orgName].organizationId)
  }, [orgName])

  const fetchInit = async () => {
    try {
      const [infoRes, totalRes] = await Promise.all([
        axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true }),
        axiosClient.get('/api/admin/get-all-employees/get-all-employees-by-page-number?page=1&limit=1', { silent: true }),
      ])
      const info = infoRes.data?.data ?? {}
      setOrgData(info)
      setTotalEmployees(totalRes.data?.data?.totalRecords ?? 0)
      const names = Object.keys(info)
      if (names.length > 0) setOrgName(names[0])
    } catch {}
  }

  const fetchOrgEmployees = async (organizationId) => {
    setLoading(true)
    try {
      const res = await axiosClient.get(
        `/api/admin/get-all-employees/get-all-employees-by-page-number?page=1&limit=1&organizationId=${organizationId}`,
        { silent: true },
      )
      setOrgEmployees(res.data?.data?.totalRecords ?? 0)
    } catch {
      setOrgEmployees(0)
    } finally {
      setLoading(false)
    }
  }

  const teamsInOrg = orgData[orgName]?.teams?.length ?? 0
  const orgShare = totalEmployees > 0 ? Math.round((orgEmployees / totalEmployees) * 100) : 0
  const otherEmployees = Math.max(0, totalEmployees - orgEmployees)

  const donutSeries = [orgEmployees, otherEmployees].filter((v, i) => i === 0 || v > 0)
  const donutLabels =
    orgEmployees > 0 && otherEmployees > 0 ? [orgName || 'Selected Org', 'Other Orgs'] : orgEmployees > 0 ? [orgName || 'Selected Org'] : ['No Data']

  const donutOptions = {
    labels: donutLabels,
    chart: { type: 'donut' },
    colors: ['#6366f1', '#e5e7eb'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    plotOptions: {
      pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '13px' } } } },
    },
    noData: { text: 'No employee data' },
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
      <PageBreadcrumb title="Employees Analytics" subName="Employees" />
      <PageMetaData title="Employees Analytics" />

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
            title="Total Employees"
            value={totalEmployees}
            subtitle="Across all organizations"
            iconName="mdi:account-multiple-outline"
            color="#6366f1"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard
            title="Org Employees"
            value={orgEmployees}
            subtitle={orgName || 'Selected organization'}
            iconName="mdi:account-tie"
            color="#0ea5e9"
          />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Teams in Org" value={teamsInOrg} subtitle="Registered teams" iconName="mdi:account-group-outline" color="#14b8a6" />
        </Col>
        <Col md={6} xl={3}>
          <MetricCard title="Org Share" value={`${orgShare}%`} subtitle="Of total workforce" iconName="mdi:chart-donut" color="#f97316" />
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={5}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Employee Distribution</h5>
              <p className="text-muted mb-0 small">Selected org vs rest of workforce</p>
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
        <Col lg={4}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Workforce Share</h5>
              <p className="text-muted mb-0 small">Percentage of total employees</p>
            </CardHeader>
            <CardBody className="d-flex flex-column justify-content-center">
              <ReactApexChart options={radialOptions} series={[orgShare]} type="radialBar" height={260} />
              <div className="text-center small text-muted mt-1">
                {orgEmployees} of {totalEmployees} employees
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={3}>
          <Card className="h-100 border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
            <CardHeader className="border-0 pb-0">
              <h5 className="mb-1">Org Teams</h5>
              <p className="text-muted mb-0 small">Teams under this org</p>
            </CardHeader>
            <CardBody>
              {(orgData[orgName]?.teams ?? []).length === 0 ? (
                <div className="text-center text-muted py-4 small">No teams found</div>
              ) : (
                <ul className="list-unstyled mb-0" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {(orgData[orgName]?.teams ?? []).map((t, i) => (
                    <li key={i} className="d-flex align-items-center gap-2 py-1 border-bottom small">
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: 8,
                          height: 8,
                          background: ['#0ea5e9', '#6366f1', '#14b8a6', '#f97316', '#8b5cf6'][i % 5],
                          display: 'inline-block',
                        }}
                      />
                      {typeof t === 'string' ? t : t.teamName ?? t.name ?? `Team ${i + 1}`}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default EmployeesAnalytics
