import { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Card, CardBody, Col, Modal, Row, Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'

const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'danger' }

const LeaveOverview = () => {
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [leaves, setLeaves] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detailModal, setDetailModal] = useState(null)

  useEffect(() => {
    fetchOrganizations()
  }, [])
  useEffect(() => {
    if (orgId) fetchLeaves()
  }, [orgId, statusFilter, page])

  const fetchOrganizations = async () => {
    try {
      const res = await axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true })
      const orgs = res.data?.data ?? []
      setOrganizations(orgs)
      if (orgs.length > 0) setOrgId(orgs[0].organizationId)
    } catch {}
  }

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axiosClient.get('/api/admin/leaves/all', {
        params: {
          organizationId: orgId,
          status: statusFilter === 'all' ? undefined : statusFilter,
          page,
          limit: 15,
        },
        silent: true,
      })
      const data = res.data?.data ?? {}
      setLeaves(data.leaves ?? [])
      setTotalRecords(data.totalRecords ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch {
      setLeaves([])
    } finally {
      setLoading(false)
    }
  }, [orgId, statusFilter, page])

  const fmtDates = (dates) => {
    if (!dates?.length) return '--'
    const sorted = [...dates].sort()
    if (sorted.length === 1) return new Date(sorted[0]).toLocaleDateString()
    return `${new Date(sorted[0]).toLocaleDateString()} – ${new Date(sorted[sorted.length - 1]).toLocaleDateString()} (${sorted.length}d)`
  }

  const stats = {
    pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
  }

  return (
    <>
      <PageBreadcrumb title="Leave Overview" subName="Attendance" />
      <PageMetaData title="Leave Overview" />

      <Row className="g-3 mb-3">
        {[
          { label: 'Total', count: totalRecords, color: '#2563eb', icon: 'mdi:calendar-text-outline' },
          { label: 'Pending (page)', count: stats.pending, color: '#f59e0b', icon: 'mdi:clock-outline' },
          { label: 'Approved (page)', count: stats.approved, color: '#22c55e', icon: 'mdi:check-circle-outline' },
          { label: 'Rejected (page)', count: stats.rejected, color: '#ef4444', icon: 'mdi:close-circle-outline' },
        ].map(({ label, count, color, icon }) => (
          <Col sm={6} xl={3} key={label}>
            <Card className="border-0 h-100" style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.07)' }}>
              <CardBody className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48, background: color + '18' }}>
                  <IconifyIcon icon={icon} style={{ fontSize: 24, color }} />
                </div>
                <div>
                  <p className="mb-0 text-muted small fw-semibold text-uppercase">{label}</p>
                  <h3 className="mb-0 fw-bold" style={{ color }}>
                    {count}
                  </h3>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
        <CardBody>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h5 className="mb-0 me-auto">All Leave Requests</h5>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 190 }}
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value)
                setPage(1)
              }}>
              {organizations.map((o) => (
                <option key={o.organizationId} value={o.organizationId}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 130 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button variant="outline-secondary" size="sm" onClick={fetchLeaves} disabled={loading}>
              <IconifyIcon icon="mdi:refresh" />
            </Button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Team</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Actioned By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5">
                      <Spinner animation="border" />
                    </td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-muted">
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave, i) => (
                    <tr key={leave._id}>
                      <td>{(page - 1) * 15 + i + 1}</td>
                      <td>
                        <div className="fw-semibold">{leave.employee?.name ?? '--'}</div>
                        <div className="text-muted small">{leave.employee?.email ?? ''}</div>
                      </td>
                      <td>{leave.teamName ?? '--'}</td>
                      <td>
                        <span className="badge bg-secondary">{leave.leaveType ?? '--'}</span>
                      </td>
                      <td style={{ minWidth: 160 }}>{fmtDates(leave.dates)}</td>
                      <td>{leave.dates?.length ?? '--'}</td>
                      <td>{leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : '--'}</td>
                      <td>
                        <Badge bg={STATUS_COLOR[leave.status] ?? 'secondary'}>{leave.status}</Badge>
                      </td>
                      <td className="text-muted small">{leave.approvedByUser?.name ?? '--'}</td>
                      <td>
                        <Button variant="outline-secondary" size="sm" onClick={() => setDetailModal(leave)}>
                          <IconifyIcon icon="mdi:eye-outline" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                Page {page} of {totalPages} ({totalRecords} records)
              </span>
              <div className="d-flex gap-1">
                <Button variant="outline-secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <IconifyIcon icon="mdi:chevron-left" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                  const p = idx + 1
                  return (
                    <Button key={p} variant={page === p ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  )
                })}
                <Button variant="outline-secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  <IconifyIcon icon="mdi:chevron-right" />
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal show={!!detailModal} onHide={() => setDetailModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailModal && (
            <div className="d-flex flex-column gap-2">
              {[
                ['Employee', detailModal.employee?.name ?? '--'],
                ['Email', detailModal.employee?.email ?? '--'],
                ['Team', detailModal.teamName ?? '--'],
                ['Leave Type', detailModal.leaveType ?? '--'],
                ['Dates', fmtDates(detailModal.dates)],
                ['Days', detailModal.dates?.length ?? '--'],
                ['Applied On', detailModal.createdAt ? new Date(detailModal.createdAt).toLocaleDateString() : '--'],
                ['Status', detailModal.status],
                ...(detailModal.approvedByUser ? [['Actioned By', detailModal.approvedByUser.name]] : []),
              ].map(([label, value]) => (
                <div key={label} className="d-flex justify-content-between border-bottom pb-1">
                  <span className="text-muted">{label}</span>
                  <span className="fw-semibold text-capitalize">{value}</span>
                </div>
              ))}
              {detailModal.reason && (
                <div>
                  <div className="text-muted mb-1">Reason</div>
                  <div className="p-2 rounded bg-light">{detailModal.reason}</div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetailModal(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default LeaveOverview
