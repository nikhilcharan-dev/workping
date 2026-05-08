import { useState } from 'react'
import { Modal, Button, Form, Alert } from 'react-bootstrap'
import { useLockContext } from '@/context/useLockContext'
import { useAuthContext } from '@/context/useAuthContext'
import httpClient from '@/helpers/httpClient'
import logoDark from '@/assets/images/logo-dark.png'

const LockScreenOverlay = () => {
  const { isLocked, unlock } = useLockContext()
  const { user, logout } = useAuthContext()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isLocked) return null

  // ── Verify password and unlock ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await httpClient.post('/auth/verify-password', { password }, { silent: true })
      setPassword('')
      unlock()
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Incorrect password, please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Sign in as a different user ────────────────────────────────────────────
  const handleSwitch = async () => {
    try {
      await httpClient.post('/auth/logout', {}, { silent: true })
    } catch {
      /* ignore */
    }
    logout()
    unlock()
  }

  const avatarSrc = user?.profileImage || logoDark

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <div
        style={{
          background: 'var(--bs-body-bg, #fff)',
          borderRadius: '1rem',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
        {/* Avatar */}
        <img
          src={avatarSrc}
          alt={user?.name ?? 'User'}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            objectFit: 'cover',
            marginBottom: '1rem',
            border: '3px solid var(--bs-primary)',
          }}
        />

        <h5 className="fw-bold mb-1">{user?.name ?? 'Your Session'}</h5>
        <p className="text-muted small mb-3">{user?.email ?? ''}</p>
        <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
          Your session was locked after 15 minutes of inactivity.
          <br />
          Enter your password to continue.
        </p>

        {error && (
          <Alert variant="danger" className="py-2 text-start" style={{ fontSize: '0.85rem' }}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3 text-start">
            <Form.Label className="fw-semibold">Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </Form.Group>

          <div className="d-grid mb-2">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Verifying…' : 'Unlock'}
            </Button>
          </div>
        </Form>

        <Button variant="link" size="sm" className="text-muted" onClick={handleSwitch}>
          Sign in as a different user
        </Button>
      </div>
    </div>
  )
}

export default LockScreenOverlay
