import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'

const SidebarBilling = () => {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosClient
      .get('/api/admin/subscriptions/active', { silent: true })
      .then((res) => setSubscription(res.data?.data ?? null))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(var(--bs-border-color-rgb,108,117,125),.15)',
        flexShrink: 0,
      }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <IconifyIcon icon="bx:credit-card" style={{ fontSize: 14, color: 'var(--bs-primary)' }} />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.65 }}>Billing</span>
      </div>

      {loading ? (
        <div className="text-center py-1">
          <Spinner animation="border" size="sm" />
        </div>
      ) : subscription ? (
        <>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#198754', display: 'inline-block', flexShrink: 0 }} />
            <span className="text-truncate fw-semibold" style={{ fontSize: 12 }}>
              {subscription.planName}
            </span>
          </div>
          {subscription.endDate && (
            <p className="text-muted mb-2" style={{ fontSize: 11 }}>
              Renews {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted mb-2" style={{ fontSize: 11 }}>
          No active plan
        </p>
      )}

      <Link to="/pages/billing" className="btn btn-outline-primary btn-sm w-100" style={{ fontSize: 11, padding: '3px 8px' }}>
        Manage
      </Link>
    </div>
  )
}

export default SidebarBilling
