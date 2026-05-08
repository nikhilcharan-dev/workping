import { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'

const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'danger' }

const LeaveApproval = () => {
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [leaves, setLeaves] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

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
          limit: 10,
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

  const handleApprove = async (leaveId) => {
    setActionLoading(leaveId + '-approve')
    try {
      await axiosClient.post(`/api/admin/leaves/approve/${leaveId}`, {}, { silent: true })
      toast.success('Leave approved')
      fetchLeaves()
    } catch {
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal._id + '-reject')
    try {
      await axiosClient.post(`/api/admin/leaves/reject/${rejectModal._id}`, { reason: rejectReason }, { silent: true })
      toast.success('Leave rejected')
      fetchLeaves()
    } catch {
    } finally {
      setActionLoading(null)
      setRejectModal(null)
      setRejectReason('')
    }
  }

  const pendingCount = leaves.filter((l) => l.status === 'pending').length
  const approvedCount = leaves.filter((l) => l.status === 'approved').length
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length

  const fmtDates = (dates) => {
    if (!dates?.length) return '--'
    const sorted = [...dates].sort()
    if (sorted.length === 1) return new Date(sorted[0]).toLocaleDateString()
    return `${new Date(sorted[0]).toLocaleDateString()} – ${new Date(sorted[sorted.length - 1]).toLocaleDateString()} (${sorted.length}d)`
  }

  return (
    <>
      <PageBreadcrumb title="Leave Approval" subName="Attendance" />
      <PageMetaData title="Leave Approval" />

      <Row className="g-3 mb-3">
        {[
          { label: 'Pending', count: pendingCount, color: '#f59e0b', bg: '#fffbeb', icon: 'mdi:clock-outline' },
          { label: 'Approved', count: approvedCount, color: '#22c55e', bg: '#f0fdf4', icon: 'mdi:check-circle-outline' },
          { label: 'Rejected', count: rejectedCount, color: '#ef4444', bg: '#fef2f2', icon: 'mdi:close-circle-outline' },
        ].map(({ label, count, color, bg, icon }) => (
          <Col md={4} key={label}>
            <Card className="border-0" style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.07)', background: bg }}>
              <CardBody className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-0 text-muted small fw-semibold text-uppercase">{label} (this page)</p>
                  <h2 className="mb-0 fw-bold" style={{ color }}>
                    {count}
                  </h2>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 48, height: 48, background: color + '25' }}>
                  <IconifyIcon icon={icon} style={{ fontSize: 24, color }} />
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
        <CardBody>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h5 className="mb-0 me-auto">
              Leave Requests {totalRecords > 0 && <span className="text-muted fw-normal fs-6">({totalRecords} total)</span>}
            </h5>

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
                  <th>Reason</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <Spinner animation="border" />
                    </td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave, i) => (
                    <tr key={leave._id}>
                      <td>{(page - 1) * 10 + i + 1}</td>
                      <td>
                        <div className="fw-semibold">{leave.employee?.name ?? '--'}</div>
                        <div className="text-muted small">{leave.employee?.email ?? ''}</div>
                      </td>
                      <td>{leave.teamName ?? '--'}</td>
                      <td>
                        <span className="badge bg-secondary">{leave.leaveType ?? '--'}</span>
                      </td>
                      <td style={{ minWidth: 160 }}>{fmtDates(leave.dates)}</td>
                      <td className="text-muted small" style={{ maxWidth: 180 }}>
                        {leave.reason ? (leave.reason.length > 40 ? leave.reason.slice(0, 40) + '…' : leave.reason) : '--'}
                      </td>
                      <td>{leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : '--'}</td>
                      <td>
                        <Badge bg={STATUS_COLOR[leave.status] ?? 'secondary'}>{leave.status}</Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button variant="outline-info" size="sm" title="View" onClick={() => setDetailModal(leave)}>
                            <IconifyIcon icon="mdi:eye-outline" />
                          </Button>
                          {leave.status === 'pending' && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                title="Approve"
                                disabled={actionLoading === leave._id + '-approve'}
                                onClick={() => handleApprove(leave._id)}>
                                {actionLoading === leave._id + '-approve' ? (
                                  <Spinner as="span" size="sm" animation="border" />
                                ) : (
                                  <IconifyIcon icon="mdi:check" />
                                )}
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                title="Reject"
                                onClick={() => {
                                  setRejectModal(leave)
                                  setRejectReason('')
                                }}>
                                <IconifyIcon icon="mdi:close" />
                              </Button>
                            </>
                          )}
                        </div>
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
                Page {page} of {totalPages}
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

      {/* Detail Modal */}
      <Modal show={!!detailModal} onHide={() => setDetailModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave Request Details</Modal.Title>
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
          {detailModal?.status === 'pending' && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  handleApprove(detailModal._id)
                  setDetailModal(null)
                }}>
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setRejectModal(detailModal)
                  setDetailModal(null)
                  setRejectReason('')
                }}>
                Reject
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={!!rejectModal} onHide={() => setRejectModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Rejecting leave for <strong>{rejectModal?.employee?.name}</strong>
          </p>
          <Form.Group>
            <Form.Label>
              Reason <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRejectModal(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!rejectReason.trim() || !!actionLoading} onClick={handleRejectSubmit}>
            {actionLoading ? <Spinner as="span" size="sm" animation="border" className="me-1" /> : null}
            Confirm Reject
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default LeaveApproval
