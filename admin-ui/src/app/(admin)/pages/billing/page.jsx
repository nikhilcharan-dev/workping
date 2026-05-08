import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Modal, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'

const STATUS_VARIANTS = {
  ACTIVE: 'success',
  CANCELLED: 'danger',
  EXPIRED: 'secondary',
  PENDING: 'warning',
}

const fmt = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const CancelModal = ({ show, onHide, onConfirm, cancelling }) => (
  <Modal show={show} onHide={onHide} centered size="sm">
    <Modal.Body className="p-4 text-center">
      <div
        className="mb-3"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(220,53,69,.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}>
        <IconifyIcon icon="bx:error-alt" style={{ fontSize: 26, color: '#dc3545' }} />
      </div>
      <h5 className="fw-bold mb-1">Cancel subscription?</h5>
      <p className="text-muted small mb-4">You will retain access until the end of the current billing period. This action cannot be undone.</p>
      <div className="d-grid gap-2">
        <Button variant="danger" onClick={onConfirm} disabled={cancelling}>
          {cancelling ? (
            <>
              <Spinner size="sm" className="me-2" />
              Cancelling…
            </>
          ) : (
            'Yes, cancel'
          )}
        </Button>
        <Button variant="link" className="text-muted p-0" onClick={onHide} disabled={cancelling}>
          Keep subscription
        </Button>
      </div>
    </Modal.Body>
  </Modal>
)

const Billing = () => {
  const [active, setActive] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [activeRes, histRes] = await Promise.allSettled([
      axiosClient.get('/api/admin/subscriptions/active', { silent: true }),
      axiosClient.get('/api/admin/subscriptions/history', { silent: true }),
    ])
    if (activeRes.status === 'fulfilled') setActive(activeRes.value.data?.data ?? null)
    if (histRes.status === 'fulfilled') setHistory(histRes.value.data?.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await axiosClient.patch('/api/admin/subscriptions/cancel')
      setShowCancel(false)
      await load()
    } catch {
      // toast shown by interceptor
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <PageMetaData title="Billing" />
      <div className="container-fluid py-4" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="fw-bold mb-0">Billing &amp; Subscription</h4>
            <p className="text-muted mb-0" style={{ fontSize: 13 }}>
              Manage your plan and view payment history
            </p>
          </div>
          <Link to="/pages/pricing" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
            <IconifyIcon icon="bx:rocket" style={{ fontSize: 15 }} />
            {active ? 'Upgrade Plan' : 'View Plans'}
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Active plan card */}
            <div className="card mb-4" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div
                style={{
                  background: active ? 'linear-gradient(135deg,#0d6efd 0%,#6f42c1 100%)' : 'linear-gradient(135deg,#6c757d 0%,#495057 100%)',
                  padding: '28px 28px 24px',
                  color: '#fff',
                }}>
                <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <IconifyIcon icon="bx:credit-card" style={{ fontSize: 20 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>Current Plan</span>
                    </div>
                    <h3 className="fw-bold mb-1" style={{ fontSize: 28 }}>
                      {active ? active.planName : 'No active plan'}
                    </h3>
                    {active?.endDate && <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 0 }}>Renews on {fmt(active.endDate)}</p>}
                    {!active && <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 0 }}>Subscribe to unlock WorkPing features</p>}
                  </div>
                  {active && (
                    <div className="text-end">
                      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                        ₹{Number(active.amount ?? active.planId?.amount ?? 0).toLocaleString()}
                      </div>
                      <span style={{ fontSize: 13, opacity: 0.8 }}>/ month</span>
                    </div>
                  )}
                </div>
              </div>

              {active && (
                <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3 py-3 px-4">
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#198754', display: 'inline-block' }} />
                      <span style={{ fontSize: 13 }} className="fw-semibold text-success">
                        Active
                      </span>
                    </div>
                    {active.startDate && (
                      <span className="text-muted" style={{ fontSize: 13 }}>
                        Started {fmt(active.startDate)}
                      </span>
                    )}
                    {active.autoRenew !== undefined && (
                      <span className="text-muted" style={{ fontSize: 13 }}>
                        Auto-renew: <strong>{active.autoRenew ? 'On' : 'Off'}</strong>
                      </span>
                    )}
                  </div>
                  <Button variant="outline-danger" size="sm" onClick={() => setShowCancel(true)} className="d-flex align-items-center gap-1">
                    <IconifyIcon icon="bx:x-circle" style={{ fontSize: 15 }} />
                    Cancel Subscription
                  </Button>
                </div>
              )}

              {!active && (
                <div className="card-body py-3 px-4">
                  <Link to="/pages/pricing" className="btn btn-primary btn-sm">
                    Browse Plans →
                  </Link>
                </div>
              )}
            </div>

            {/* Plan features (if active and features list exists) */}
            {active?.planId?.features?.length > 0 && (
              <div className="card mb-4" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3">What's included</h6>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '8px 16px' }}>
                    {active.planId.features.map((f, i) => (
                      <div key={i} className="d-flex align-items-start gap-2">
                        <IconifyIcon icon="bx:check-circle" className="text-success mt-1" style={{ fontSize: 15, flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subscription history */}
            <div className="card" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Subscription History</h6>
                {history.length === 0 ? (
                  <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                    No subscription history found.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, border: 'none' }}>
                            Plan
                          </th>
                          <th style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, border: 'none' }}>
                            Amount
                          </th>
                          <th style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, border: 'none' }}>
                            Start
                          </th>
                          <th style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, border: 'none' }}>
                            End
                          </th>
                          <th style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, border: 'none' }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((s) => (
                          <tr key={s._id}>
                            <td className="fw-semibold">{s.planName ?? s.planId?.name ?? '—'}</td>
                            <td>₹{Number(s.amount ?? s.planId?.amount ?? 0).toLocaleString()}</td>
                            <td>{s.startDate ? fmt(s.startDate) : '—'}</td>
                            <td>{s.endDate ? fmt(s.endDate) : '—'}</td>
                            <td>
                              <Badge bg={STATUS_VARIANTS[s.status] ?? 'secondary'} style={{ fontSize: 11 }}>
                                {s.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <CancelModal show={showCancel} onHide={() => setShowCancel(false)} onConfirm={handleCancel} cancelling={cancelling} />
    </>
  )
}

export default Billing
