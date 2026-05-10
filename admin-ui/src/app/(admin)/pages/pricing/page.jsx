import { useEffect, useState } from 'react'
import { Button, Modal, Spinner, Badge } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'

const POPULAR = 'Pro'
const PLAN_ICONS = {
  Basic: 'bx:leaf',
  Standard: 'bx:rocket',
  Pro: 'bx:crown',
  Enterprise: 'bx:building-house',
}

// ── shared pay logic ───────────────────────────────────────────────────────────
function usePayment() {
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState(null)

  const confirm = async () => {
    if (!selectedPlan) return
    setPaying(true)
    setPayError(null)
    try {
      const res = await axiosClient.post('/api/admin/phonepe/initiate-payment', { planId: selectedPlan._id }, { silent: true })
      const url = res.data?.data?.redirectUrl
      if (url) window.location.href = url
    } catch (err) {
      setPayError(err?.response?.data?.message || 'Payment initiation failed.')
      setPaying(false)
    }
  }

  return { selectedPlan, setSelectedPlan, paying, payError, setPayError, confirm }
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
const ConfirmModal = ({ plan, show, onHide, onConfirm, loading, error }) => (
  <Modal show={show} onHide={onHide} centered size="sm">
    <Modal.Body className="p-4 text-center">
      <div
        className="mb-3"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(var(--bs-primary-rgb),.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}>
        <IconifyIcon icon="bx:lock-alt" className="text-primary fs-24" />
      </div>
      <h5 className="fw-bold mb-1">Confirm subscription</h5>
      {plan && (
        <p className="text-muted small mb-3">
          You're subscribing to <strong>{plan.name}</strong> for <strong>₹{Number(plan.amount).toLocaleString()}/mo</strong>.<br />
          You'll be redirected to PhonePe to complete payment.
        </p>
      )}
      {error && <p className="text-danger small mb-2">{error}</p>}
      <div className="d-grid gap-2">
        <Button variant="primary" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Redirecting…
            </>
          ) : (
            'Pay with PhonePe'
          )}
        </Button>
        <Button variant="link" className="text-muted p-0" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
      </div>
    </Modal.Body>
  </Modal>
)

// ── Plan Card ──────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, isCurrent, isPopular, onSelect }) => (
  <div
    className="pricing-plan-card"
    style={{
      position: 'relative',
      borderRadius: 16,
      padding: isPopular ? 2 : 1,
      background: isPopular ? 'linear-gradient(135deg,#0d6efd,#6f42c1)' : 'rgba(var(--bs-border-color-rgb,108,117,125),.25)',
      flex: '1 1 220px',
      maxWidth: 280,
      minWidth: 220,
    }}>
    {isPopular && (
      <div
        style={{
          position: 'absolute',
          top: -13,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg,#0d6efd,#6f42c1)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 16px',
          borderRadius: 20,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}>
        MOST POPULAR
      </div>
    )}
    <div
      style={{
        borderRadius: 14,
        background: 'var(--bs-body-bg)',
        padding: '28px 24px 24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isPopular ? 'linear-gradient(135deg,rgba(13,110,253,.18),rgba(111,66,193,.18))' : 'rgba(var(--bs-primary-rgb),.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <IconifyIcon icon={PLAN_ICONS[plan.name] ?? 'bx:cube'} className="text-primary" style={{ fontSize: 18 }} />
        </div>
        <span className="fw-semibold fs-15">{plan.name}</span>
        {isCurrent && (
          <Badge bg="success" className="ms-auto" style={{ fontSize: 10 }}>
            Active
          </Badge>
        )}
      </div>
      <div className="mb-1">
        <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>₹{plan.amount.toLocaleString()}</span>
        <span className="text-muted ms-1" style={{ fontSize: 13 }}>
          / month
        </span>
      </div>
      <p className="text-muted mb-3" style={{ fontSize: 13 }}>
        {plan.description}
      </p>
      <div
        className="d-flex align-items-center gap-1 mb-3 pb-3"
        style={{ borderBottom: '1px solid rgba(var(--bs-border-color-rgb,108,117,125),.15)' }}>
        <IconifyIcon icon="bx:group" className="text-muted" style={{ fontSize: 14 }} />
        <span style={{ fontSize: 13 }} className="text-muted">
          Up to <strong className="text-body">{plan.maxEmployees >= 9999 ? 'Unlimited' : plan.maxEmployees.toLocaleString()}</strong> employees
        </span>
      </div>
      <ul className="list-unstyled mb-4" style={{ fontSize: 13, flexGrow: 1 }}>
        {plan.features.map((f, i) => (
          <li key={i} className="d-flex align-items-start gap-2 mb-2">
            <IconifyIcon icon="bx:check" className="text-success mt-1" style={{ fontSize: 15, flexShrink: 0 }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        variant={isCurrent ? 'success' : isPopular ? 'primary' : 'outline-primary'}
        className="w-100"
        disabled={isCurrent}
        onClick={() => !isCurrent && onSelect(plan)}
        style={isPopular && !isCurrent ? { background: 'linear-gradient(90deg,#0d6efd,#6f42c1)', border: 'none' } : {}}>
        {isCurrent ? (
          <>
            <IconifyIcon icon="bx:check-circle" className="me-1" />
            Current Plan
          </>
        ) : (
          'Get Started →'
        )}
      </Button>
    </div>
  </div>
)

// ── Custom Plan Builder ────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, price }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      borderRadius: 10,
      cursor: 'pointer',
      border: `1px solid ${checked ? 'rgba(13,110,253,.4)' : 'rgba(var(--bs-border-color-rgb,108,117,125),.2)'}`,
      background: checked ? 'rgba(13,110,253,.06)' : 'transparent',
      transition: 'all .15s',
      userSelect: 'none',
    }}>
    <div className="d-flex align-items-center gap-2">
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          border: `2px solid ${checked ? '#0d6efd' : 'rgba(var(--bs-border-color-rgb,108,117,125),.5)'}`,
          background: checked ? '#0d6efd' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all .15s',
        }}>
        {checked && <IconifyIcon icon="bx:check" style={{ fontSize: 12, color: '#fff' }} />}
      </div>
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
    <span style={{ fontSize: 12, fontWeight: 600, color: checked ? '#0d6efd' : 'var(--bs-body-color)', opacity: 0.7 }}>+₹{price}/mo</span>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
  </label>
)

const CustomPlanBuilder = ({ catalogue, onBuild }) => {
  const [tierIdx, setTierIdx] = useState(0)
  const [addOns, setAddOns] = useState([])
  const [building, setBuilding] = useState(false)

  const { basePrice, employeeTiers = [], addOns: catalogue_addOns = [] } = catalogue

  const selectedTier = employeeTiers[tierIdx] ?? {}
  const selectedAddOns = catalogue_addOns.filter((a) => addOns.includes(a.id))
  const total = (basePrice ?? 199) + (selectedTier.price ?? 0) + selectedAddOns.reduce((s, a) => s + a.price, 0)

  const toggleAddOn = (id) => setAddOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleBuild = async () => {
    setBuilding(true)
    try {
      const res = await axiosClient.post(
        '/api/admin/plans/custom',
        {
          employeeTierIndex: tierIdx,
          selectedAddOnIds: addOns,
        },
        { silent: true },
      )
      onBuild(res.data?.data)
    } catch {
      setBuilding(false)
    }
  }

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 2,
        background: 'linear-gradient(135deg,#fd7e14,#dc3545,#6f42c1)',
        maxWidth: 900,
        margin: '0 auto',
      }}>
      <div className="pricing-builder-inner" style={{ borderRadius: 18, background: 'var(--bs-body-bg)', padding: '32px 28px' }}>
        {/* Header */}
        <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg,rgba(253,126,20,.15),rgba(111,66,193,.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <IconifyIcon icon="bx:slider-alt" style={{ fontSize: 22, color: '#fd7e14' }} />
          </div>
          <div style={{ minWidth: 0, flex: '1 1 180px' }}>
            <h5 className="mb-0 fw-bold" style={{ fontSize: 'clamp(16px,4vw,20px)' }}>
              Build Your Own Plan
            </h5>
            <span className="text-muted" style={{ fontSize: 13 }}>
              Pick only what you need — we calculate the bill
            </span>
          </div>
          <div className="text-end" style={{ flex: '0 0 auto' }}>
            <div style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 800, lineHeight: 1 }}>₹{total.toLocaleString()}</div>
            <span className="text-muted" style={{ fontSize: 12 }}>
              / month
            </span>
          </div>
        </div>

        <div className="pricing-builder-grid" style={{ display: 'grid', gap: 28 }}>
          {/* Left — employee tier */}
          <div>
            <p className="fw-semibold mb-3" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.6 }}>
              Employees
            </p>
            <div className="d-flex flex-column gap-2">
              {employeeTiers.map((t, i) => (
                <label
                  key={i}
                  onClick={() => setTierIdx(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: `1px solid ${tierIdx === i ? 'rgba(13,110,253,.4)' : 'rgba(var(--bs-border-color-rgb,108,117,125),.2)'}`,
                    background: tierIdx === i ? 'rgba(13,110,253,.06)' : 'transparent',
                    transition: 'all .15s',
                  }}>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: `2px solid ${tierIdx === i ? '#0d6efd' : 'rgba(var(--bs-border-color-rgb,108,117,125),.5)'}`,
                        background: tierIdx === i ? '#0d6efd' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {tierIdx === i && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <span style={{ fontSize: 13 }}>{t.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.65 }}>{t.price === 0 ? 'Included' : `+₹${t.price}/mo`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Right — add-ons + summary */}
          <div className="d-flex flex-column">
            <p className="fw-semibold mb-3" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.6 }}>
              Features
            </p>
            <div className="d-flex flex-column gap-2 mb-4">
              {catalogue_addOns.map((a) => (
                <Toggle key={a.id} checked={addOns.includes(a.id)} onChange={() => toggleAddOn(a.id)} label={a.label} price={a.price} />
              ))}
            </div>

            {/* Bill breakdown */}
            <div
              style={{
                borderRadius: 10,
                padding: '14px 16px',
                background: 'rgba(var(--bs-primary-rgb),.04)',
                border: '1px solid rgba(var(--bs-border-color-rgb,108,117,125),.15)',
                fontSize: 13,
                marginTop: 'auto',
              }}>
              <div className="d-flex justify-content-between mb-1 text-muted">
                <span>Base (attendance + leave)</span>
                <span>₹{basePrice}</span>
              </div>
              {selectedTier.price > 0 && (
                <div className="d-flex justify-content-between mb-1 text-muted">
                  <span>{selectedTier.label} employees</span>
                  <span>+₹{selectedTier.price}</span>
                </div>
              )}
              {selectedAddOns.map((a) => (
                <div key={a.id} className="d-flex justify-content-between mb-1 text-muted">
                  <span>{a.label}</span>
                  <span>+₹{a.price}</span>
                </div>
              ))}
              <div
                className="d-flex justify-content-between fw-bold pt-2 mt-1"
                style={{ borderTop: '1px solid rgba(var(--bs-border-color-rgb,108,117,125),.2)' }}>
                <span>Total</span>
                <span>₹{total.toLocaleString()}/mo</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="mt-3 w-100"
              onClick={handleBuild}
              disabled={building}
              style={{ background: 'linear-gradient(90deg,#fd7e14,#dc3545)', border: 'none' }}>
              {building ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Building…
                </>
              ) : (
                'Build & Proceed to Payment →'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
const Pricing = () => {
  const [plans, setPlans] = useState([])
  const [catalogue, setCatalogue] = useState(null)
  const [activeSubscription, setSub] = useState(null)
  const [loading, setLoading] = useState(true)

  const { selectedPlan, setSelectedPlan, paying, payError, setPayError, confirm } = usePayment()

  useEffect(() => {
    ;(async () => {
      const [plansRes, subRes, catRes] = await Promise.allSettled([
        axiosClient.get('/api/admin/plans', { silent: true }),
        axiosClient.get('/api/admin/subscriptions/active', { silent: true }),
        axiosClient.get('/api/admin/plans/custom-catalogue', { silent: true }),
      ])
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data?.data ?? [])
      if (subRes.status === 'fulfilled') setSub(subRes.value.data?.data ?? null)
      if (catRes.status === 'fulfilled') setCatalogue(catRes.value.data?.data ?? null)
      setLoading(false)
    })()
  }, [])

  const activePlanId = activeSubscription?.planId?._id ?? activeSubscription?.planId ?? null

  return (
    <>
      <PageMetaData title="Pricing" />
      <div className="pricing-page-wrapper" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className="text-center mb-5">
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#0d6efd',
              marginBottom: 12,
            }}>
            Pricing
          </span>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(28px,5vw,48px)', lineHeight: 1.15, marginBottom: 16 }}>Simple, transparent pricing</h1>
          <p className="text-muted mx-auto" style={{ maxWidth: 480, fontSize: 16 }}>
            Pick a ready-made plan or build your own — upgrade or cancel any time.
          </p>
          {activeSubscription && (
            <div className="d-flex justify-content-center mt-3">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '6px 16px',
                  borderRadius: 24,
                  background: 'rgba(25,135,84,.12)',
                  border: '1px solid rgba(25,135,84,.25)',
                  fontSize: 13,
                }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#198754', display: 'inline-block' }} />
                <span className="text-success fw-semibold">{activeSubscription.planName}</span>
                <span className="text-muted">
                  active · renews{' '}
                  {new Date(activeSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Standard plans */}
            <div
              className="pricing-plans-grid"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                justifyContent: 'center',
                alignItems: 'stretch',
                maxWidth: 1200,
                margin: '0 auto 64px',
              }}>
              {plans
                .filter((p) => p.name !== 'Custom')
                .map((plan) => (
                  <PlanCard
                    key={plan._id}
                    plan={plan}
                    isCurrent={activePlanId === plan._id}
                    isPopular={plan.name === POPULAR}
                    onSelect={setSelectedPlan}
                  />
                ))}
            </div>

            {/* Divider */}
            <div className="text-center mb-5">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 500, margin: '0 auto' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(var(--bs-border-color-rgb,108,117,125),.2)' }} />
                <span className="text-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                  or build your own
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(var(--bs-border-color-rgb,108,117,125),.2)' }} />
              </div>
            </div>

            {/* Custom plan builder */}
            {catalogue && <CustomPlanBuilder catalogue={catalogue} onBuild={(plan) => setSelectedPlan(plan)} />}
          </>
        )}

        <p className="text-center text-muted mt-5" style={{ fontSize: 13 }}>
          All prices in INR · Billed monthly · Payments via PhonePe
        </p>
      </div>

      {/* Responsive styles */}
      <style>{`
        .pricing-page-wrapper {
          padding: 48px 24px 80px;
        }
        .pricing-builder-grid {
          grid-template-columns: 1fr 1fr;
        }
        .pricing-builder-inner {
          padding: 32px 28px;
        }
        @media (max-width: 767.98px) {
          .pricing-page-wrapper {
            padding: 24px 12px 48px;
          }
          .pricing-plan-card {
            flex: 1 1 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
          .pricing-plans-grid {
            gap: 20px !important;
            margin-bottom: 40px !important;
          }
          .pricing-builder-grid {
            grid-template-columns: 1fr !important;
          }
          .pricing-builder-inner {
            padding: 20px 16px !important;
          }
        }
        @media (max-width: 575.98px) {
          .pricing-page-wrapper {
            padding: 16px 8px 40px;
          }
          .pricing-plan-card {
            margin-top: 8px;
          }
        }
      `}</style>

      <ConfirmModal
        plan={selectedPlan}
        show={!!selectedPlan}
        onHide={() => {
          setSelectedPlan(null)
          setPayError(null)
        }}
        onConfirm={confirm}
        loading={paying}
        error={payError}
      />
    </>
  )
}

export default Pricing
