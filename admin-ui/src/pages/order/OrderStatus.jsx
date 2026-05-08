import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuthContext } from '@/context/useAuthContext'
import axiosClient from '@/helpers/httpClient'

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    // Pleasant ascending chime: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  } catch {
    // AudioContext blocked or unavailable — silent fail
  }
}

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Confirming ─────────────────────────────────────────────────────────────────

function StateConfirming() {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      {/* Spinner rings */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 120,
          height: 120,
          marginBottom: '2rem',
        }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#6366f1',
            borderRightColor: '#6366f1',
            animation: 'op-spin 1.1s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderBottomColor: '#a5b4fc',
            animation: 'op-spin 1.7s linear infinite reverse',
          }}
        />
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="#6366f1" strokeWidth="1.5" />
            <path d="M2 10h20" stroke="#6366f1" strokeWidth="1.5" />
            <path d="M6 15h4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem' }}>Confirming Your Payment</h4>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: '0.25rem' }}>Please wait while we verify your transaction with the payment gateway</p>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: '2.5rem' }}>Do not close or refresh this page</p>

      {/* Progress steps */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        {[
          { label: 'Payment Sent', state: 'done' },
          { label: 'Verifying', state: 'active' },
          { label: 'Activating Plan', state: 'pending' },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: step.state === 'done' ? '#6366f1' : step.state === 'active' ? 'rgba(99,102,241,0.1)' : '#f1f5f9',
                  border: step.state === 'active' ? '2px solid #6366f1' : step.state === 'done' ? 'none' : '2px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: step.state === 'active' ? 'op-pulse 1.5s ease-in-out infinite' : 'none',
                }}>
                {step.state === 'done' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {step.state === 'active' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />}
                {step.state === 'pending' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />}
              </div>
              <span
                style={{
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  fontWeight: step.state === 'active' ? 600 : 400,
                  color: step.state === 'pending' ? '#94a3b8' : '#6366f1',
                }}>
                {step.label}
              </span>
            </div>
            {i < 2 && (
              <div
                style={{
                  width: 44,
                  height: 2,
                  margin: '0 6px',
                  marginBottom: 22,
                  background: i === 0 ? '#6366f1' : '#e2e8f0',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Success ────────────────────────────────────────────────────────────────────

function StateSuccess({ data, orderId, countdown }) {
  const rows = [
    data?.planName && ['Plan', data.planName],
    data?.amount && ['Amount Paid', fmt(data.amount)],
    data?.billingCycle && ['Billing Cycle', data.billingCycle],
    data?.subscriptionEnds && ['Active Until', fmtDate(data.subscriptionEnds)],
    data?.transactionId && ['Transaction ID', data.transactionId],
    orderId && ['Order ID', orderId],
  ].filter(Boolean)

  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      {/* Success badge */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 100,
          height: 100,
          marginBottom: '1.5rem',
        }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)',
            animation: 'op-success-ring 2s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
          }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <animate attributeName="stroke-dasharray" from="0 40" to="40 0" dur="0.45s" fill="freeze" />
            </path>
          </svg>
        </div>
      </div>

      <h4 style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>Payment Successful!</h4>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: '1.5rem' }}>
        Your subscription is now active &mdash; redirecting in <strong style={{ color: '#6366f1' }}>{countdown}s</strong>
      </p>

      {/* Details */}
      {rows.length > 0 && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: '0.875rem 1.125rem',
            marginBottom: '1.25rem',
            textAlign: 'left',
            border: '1px solid #e2e8f0',
          }}>
          {rows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.45rem 0',
                borderBottom: '1px solid #f1f5f9',
              }}>
              <span style={{ color: '#64748b', fontSize: 13, flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all', maxWidth: '62%', textAlign: 'right', marginLeft: 8 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Countdown bar */}
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 99,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            width: `${(countdown / 5) * 100}%`,
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  )
}

// ── Failed ─────────────────────────────────────────────────────────────────────

function StateFailed({ data, orderId, onRetry, onDashboard }) {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
        }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <h4 style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>Payment Failed</h4>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: '1.5rem' }}>{data?.reason || 'Something went wrong. Your card was not charged.'}</p>

      {orderId && (
        <div
          style={{
            background: '#fef2f2',
            borderRadius: 8,
            padding: '0.6rem 1rem',
            marginBottom: '1.5rem',
            border: '1px solid #fecaca',
            display: 'inline-block',
          }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Order ID: </span>
          <span style={{ fontWeight: 600, fontSize: 12, wordBreak: 'break-all' }}>{orderId}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={onRetry}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '0.6rem 1.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>
          Try Again
        </button>
        <button
          onClick={onDashboard}
          style={{
            background: '#f8fafc',
            color: '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '0.6rem 1.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}>
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function OrderStatus() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { userId, authLoading } = useAuthContext()

  const [status, setStatus] = useState('confirming') // confirming | success | failed
  const [eventData, setEventData] = useState(null)
  const [countdown, setCountdown] = useState(5)

  // Socket.io — wait for webhook to push the result
  useEffect(() => {
    if (authLoading || !userId) return

    const socket = io(import.meta.env.VITE_BASE_URL?.replace(/\/$/, ''), {
      withCredentials: true,
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      socket.emit('payment:join', { userId })
    })

    // Redis replay on reconnect (status already determined before page load)
    socket.on('payment:status', (data) => {
      if (data?.status === 'Success') {
        setStatus('success')
        setEventData(data)
      } else if (data?.status === 'Failed') {
        setStatus('failed')
        setEventData(data)
      }
    })

    socket.on('payment:success', (data) => {
      setStatus('success')
      setEventData(data)
    })
    socket.on('payment:failed', (data) => {
      setStatus('failed')
      setEventData(data)
    })

    // Fallback: if webhook hasn't fired after 10s, poll the order directly
    const fallbackTimer = setTimeout(async () => {
      try {
        const res = await axiosClient.get(`/api/admin/orders/${orderId}`, { silent: true })
        const order = res.data?.data
        if (order?.orderStatus === 'Success') {
          setStatus('success')
          setEventData({ planName: order.planId?.name, amount: order.amount, transactionId: order.transactionId })
        } else if (order?.orderStatus === 'Failed') {
          setStatus('failed')
          setEventData({ reason: 'Payment was not completed.' })
        }
      } catch {
        /* leave on confirming if API also fails */
      }
    }, 10000)

    return () => {
      clearTimeout(fallbackTimer)
      socket.disconnect()
    }
  }, [userId, authLoading, orderId])

  // On success: play chime → count down → navigate to dashboard
  useEffect(() => {
    if (status !== 'success') return
    playSuccessSound()
    setCountdown(5)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          navigate('/dashboard/analytics', { replace: true })
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [status, navigate])

  return (
    <>
      <style>{`
        @keyframes op-spin        { to { transform: rotate(360deg); } }
        @keyframes op-pulse       { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.08); opacity:.7; } }
        @keyframes op-success-ring{ 0%,100% { transform: scale(1); opacity:.5; } 60% { transform: scale(1.35); opacity:0; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div
            style={{
              background: 'white',
              borderRadius: 18,
              padding: '2.5rem 2rem',
              boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
              border: '1px solid #f1f5f9',
            }}>
            {status === 'confirming' && <StateConfirming />}
            {status === 'success' && <StateSuccess data={eventData} orderId={orderId} countdown={countdown} />}
            {status === 'failed' && (
              <StateFailed
                data={eventData}
                orderId={orderId}
                onRetry={() => navigate('/pages/pricing')}
                onDashboard={() => navigate('/dashboard/analytics')}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
