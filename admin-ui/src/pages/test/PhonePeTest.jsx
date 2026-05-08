import { useState, useEffect } from 'react'
import { Card, CardBody, Col, Row, Button, Badge, Spinner, Alert, Table } from 'react-bootstrap'
import axiosClient from '@/helpers/httpClient'

const BILLING_LABELS = { MONTHLY: '/mo', YEARLY: '/yr' }

const PlanCard = ({ plan, selected, onSelect }) => (
  <Card
    onClick={() => onSelect(plan)}
    className="h-100"
    style={{
      cursor: 'pointer',
      border: selected ? '2px solid #0d6efd' : '1px solid #dee2e6',
      boxShadow: selected ? '0 0 0 3px rgba(13,110,253,.15)' : undefined,
      transition: 'all .15s',
    }}>
    <CardBody className="d-flex flex-column">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h6 className="mb-0 fw-bold">{plan.name}</h6>
        <Badge bg={selected ? 'primary' : 'light'} text={selected ? 'white' : 'dark'}>
          {plan.billingCycle}
        </Badge>
      </div>
      <div className="mb-2">
        <span className="fs-4 fw-bold">₹{plan.amount.toLocaleString()}</span>
        <span className="text-muted small">{BILLING_LABELS[plan.billingCycle]}</span>
      </div>
      <p className="text-muted small mb-2">{plan.description}</p>
      <div className="mb-3">
        <small className="text-muted">👥 Up to {plan.maxEmployees >= 9999 ? 'Unlimited' : plan.maxEmployees} employees</small>
      </div>
      <ul className="list-unstyled mt-auto mb-0" style={{ fontSize: 13 }}>
        {plan.features.map((f, i) => (
          <li key={i} className="mb-1">
            <span className="text-success me-1">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </CardBody>
  </Card>
)

export default function PhonePeTest() {
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState(null)

  const [selectedPlan, setSelectedPlan] = useState(null)
  const [payLoading, setPayLoading] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState(null)
  const [payError, setPayError] = useState(null)

  const [seeding, setSeeding] = useState(false)

  const [orders, setOrders] = useState(null)
  const [ordersLoading, setOrdersLoading] = useState(false)

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await axiosClient.get('/api/admin/orders', { silent: true })
      setOrders(res.data?.data ?? [])
    } catch {
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadPlans = async () => {
    setPlansLoading(true)
    setPlansError(null)
    try {
      const res = await axiosClient.get('/api/admin/plans', { silent: true })
      setPlans(res.data?.data ?? res.data)
    } catch (err) {
      setPlansError(err?.response?.data?.message || 'Failed to load plans')
    } finally {
      setPlansLoading(false)
    }
  }

  const seedPlans = async () => {
    setSeeding(true)
    try {
      await axiosClient.post('/api/admin/plans/seed', {}, { silent: true })
      await loadPlans()
    } catch (err) {
      setPlansError(err?.response?.data?.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  const initiatePayment = async () => {
    if (!selectedPlan) return
    setPayLoading(true)
    setRedirectUrl(null)
    setPayError(null)
    try {
      const res = await axiosClient.post('/api/admin/phonepe/initiate-payment', { planId: selectedPlan._id }, { silent: true })
      setRedirectUrl(res.data?.data?.redirectUrl)
    } catch (err) {
      setPayError(err?.response?.data?.message || 'Payment initiation failed')
    } finally {
      setPayLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
    loadOrders()
  }, [])

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="d-flex align-items-center gap-2 mb-1">
        <h4 className="mb-0">PhonePe — Test Checkout</h4>
        <Badge bg="warning" text="dark">
          Sandbox
        </Badge>
      </div>
      <p className="text-muted small mb-4">
        Select a plan below, then click <strong>Proceed to Payment</strong>
      </p>

      {/* Plans */}
      {plansLoading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : plansError ? (
        <Alert variant="danger">{plansError}</Alert>
      ) : plans.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-muted mb-3">No plans found. Seed the default plans to get started.</p>
          <Button variant="outline-primary" size="sm" onClick={seedPlans} disabled={seeding}>
            {seeding ? (
              <>
                <Spinner size="sm" className="me-1" />
                Seeding...
              </>
            ) : (
              'Seed Default Plans'
            )}
          </Button>
        </div>
      ) : (
        <>
          <Row className="g-3 mb-4">
            {plans.map((plan) => (
              <Col key={plan._id} xs={12} sm={6} lg={3}>
                <PlanCard plan={plan} selected={selectedPlan?._id === plan._id} onSelect={setSelectedPlan} />
              </Col>
            ))}
          </Row>

          {/* Action bar */}
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <Button variant="primary" onClick={initiatePayment} disabled={!selectedPlan || payLoading}>
              {payLoading ? (
                <>
                  <Spinner size="sm" className="me-1" />
                  Initiating...
                </>
              ) : selectedPlan ? (
                `Pay ₹${selectedPlan.amount.toLocaleString()} — ${selectedPlan.name}`
              ) : (
                'Select a plan'
              )}
            </Button>

            {redirectUrl && (
              <a href={redirectUrl} target="_blank" rel="noreferrer" className="btn btn-success">
                Open PhonePe Checkout ↗
              </a>
            )}

            <Button variant="link" size="sm" className="ms-auto text-muted" onClick={seedPlans} disabled={seeding}>
              {seeding ? 'Re-seeding...' : 'Re-seed plans'}
            </Button>
          </div>

          {payError && (
            <Alert variant="danger" className="mt-3">
              {payError}
            </Alert>
          )}

          {redirectUrl && (
            <Alert variant="success" className="mt-3">
              Checkout URL ready —{' '}
              <a href={redirectUrl} target="_blank" rel="noreferrer" className="alert-link">
                {redirectUrl}
              </a>
            </Alert>
          )}

          {/* Orders */}
          <hr className="my-4" />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 className="mb-0">Orders</h6>
            <Button variant="outline-secondary" size="sm" onClick={loadOrders} disabled={ordersLoading}>
              {ordersLoading ? <Spinner size="sm" /> : '↻ Refresh'}
            </Button>
          </div>
          {ordersLoading ? (
            <div className="text-center py-3">
              <Spinner />
            </div>
          ) : !orders || orders.length === 0 ? (
            <p className="text-muted small">No orders yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table size="sm" bordered hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>PhonePe Order ID</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <code style={{ fontSize: 11 }}>{order._id}</code>
                      </td>
                      <td>{order.planId?.name ?? '—'}</td>
                      <td>₹{order.amount?.toLocaleString()}</td>
                      <td>
                        <Badge
                          bg={order.orderStatus === 'Success' ? 'success' : order.orderStatus === 'Failed' ? 'danger' : 'warning'}
                          text={order.orderStatus === 'Pending' ? 'dark' : undefined}>
                          {order.orderStatus}
                        </Badge>
                      </td>
                      <td>
                        <code style={{ fontSize: 11 }}>{order.phonepeOrderId ?? '—'}</code>
                      </td>
                      <td style={{ fontSize: 12 }}>{new Date(order.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
