import { useCallback, useEffect, useState } from 'react'
import { Badge, Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—')

const InfoRow = ({ icon, label, value }) => (
  <div className="d-flex align-items-start gap-3 py-2 border-bottom">
    <div className="bg-primary-subtle rounded d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32 }}>
      <IconifyIcon icon={icon} className="text-primary fs-5" />
    </div>
    <div>
      <div className="text-muted fs-12 text-uppercase fw-semibold" style={{ letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div className="fw-medium mt-1">{value || '—'}</div>
    </div>
  </div>
)

const OrganisationPage = () => {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchOrg = useCallback(async () => {
    setLoading(true)
    try {
      const res = await httpClient.get('/user/organisation/my-organization', { silent: true })
      setOrg(res.data?.data ?? null)
    } catch {
      setOrg(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (!org) {
    return (
      <>
        <PageMetaData title="My Organisation" />
        <Card className="mt-4">
          <CardBody className="text-center py-5 text-muted">
            <IconifyIcon icon="bx:building" className="fs-1 mb-2" />
            <p>Organisation information is not available.</p>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageMetaData title="My Organisation" />

      {/* Hero */}
      <Card className="border-0 shadow-sm mb-4 overflow-hidden">
        <div className="bg-primary" style={{ height: 100 }} />
        <CardBody className="pt-0">
          <div className="d-flex align-items-end gap-4" style={{ marginTop: -48 }}>
            <div
              className="bg-white border border-3 border-primary rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
              style={{ width: 96, height: 96 }}>
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="rounded-3" style={{ width: 88, height: 88, objectFit: 'cover' }} />
              ) : (
                <IconifyIcon icon="bx:building-house" className="text-primary" style={{ fontSize: 48 }} />
              )}
            </div>
            <div className="mb-1">
              <h3 className="mb-1 fw-bold">{org.name}</h3>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {org.type && (
                  <Badge bg="primary-subtle" className="text-primary px-2 py-1 text-capitalize">
                    {org.type}
                  </Badge>
                )}
                <Badge bg="success-subtle" className="text-success px-2 py-1">
                  <IconifyIcon icon="bx:check-circle" className="me-1" />
                  Active
                </Badge>
              </div>
            </div>
          </div>

          {org.description && (
            <p className="text-muted mt-3 mb-0 fs-14" style={{ maxWidth: 720 }}>
              {org.description}
            </p>
          )}
        </CardBody>
      </Card>

      <Row className="g-4">
        {/* Details */}
        <Col lg={7}>
          <Card className="h-100">
            <CardBody>
              <h5 className="fw-semibold mb-3">
                <IconifyIcon icon="bx:info-circle" className="me-2 text-primary" />
                Organisation Details
              </h5>
              <InfoRow icon="bx:buildings" label="Organisation Name" value={org.name} />
              <InfoRow icon="bx:category" label="Type" value={org.type} />
              <InfoRow icon="bx:calendar-event" label="Founded" value={fmtDate(org.foundedAt)} />
              <InfoRow
                icon="bx:map-pin"
                label="Location"
                value={org.coordinates?.length === 2 ? `${org.coordinates[1].toFixed(4)}° N, ${org.coordinates[0].toFixed(4)}° E` : undefined}
              />
              <div className="d-flex align-items-start gap-3 py-2">
                <div
                  className="bg-primary-subtle rounded d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 32, height: 32 }}>
                  <IconifyIcon icon="bx:briefcase-alt" className="text-primary fs-5" />
                </div>
                <div>
                  <div className="text-muted fs-12 text-uppercase fw-semibold" style={{ letterSpacing: '0.05em' }}>
                    Member Since
                  </div>
                  <div className="fw-medium mt-1">{fmtDate(org.createdAt)}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Policy & quick stats */}
        <Col lg={5}>
          <Row className="g-3">
            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <CardBody>
                  <h5 className="fw-semibold mb-3">
                    <IconifyIcon icon="bx:shield-quarter" className="me-2 text-success" />
                    Leave Policy
                  </h5>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted">Annual Casual Leaves</span>
                    <Badge bg="success" className="fs-14 px-3 py-2">
                      {org.clDays ?? 12} days
                    </Badge>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div className="progress-bar bg-success" style={{ width: `${Math.min(100, ((org.clDays ?? 12) / 30) * 100)}%` }} />
                  </div>
                  <p className="text-muted fs-12 mt-2 mb-0">Your organisation provides {org.clDays ?? 12} casual leave days per year.</p>
                </CardBody>
              </Card>
            </Col>

            <Col xs={12}>
              <Card className="border-0 shadow-sm">
                <CardBody>
                  <h5 className="fw-semibold mb-3">
                    <IconifyIcon icon="bx:lock-alt" className="me-2 text-warning" />
                    Access & Security
                  </h5>
                  <div className="d-flex align-items-center gap-3 py-1">
                    <IconifyIcon icon="bx:network-chart" className="text-warning fs-5" />
                    <div>
                      <div className="fw-medium">IP Whitelisting</div>
                      <div className="text-muted fs-12">
                        {org.IPWhitelist?.length
                          ? `${org.IPWhitelist.length} IP address${org.IPWhitelist.length > 1 ? 'es' : ''} configured`
                          : 'No IP restrictions'}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 py-1 mt-1">
                    <IconifyIcon icon="bx:map" className="text-info fs-5" />
                    <div>
                      <div className="fw-medium">Location Fencing</div>
                      <div className="text-muted fs-12">
                        {org.areaPins?.length
                          ? `${org.areaPins.length} boundary point${org.areaPins.length > 1 ? 's' : ''} set`
                          : 'No geo-fence configured'}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  )
}

export default OrganisationPage
