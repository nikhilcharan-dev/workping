import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Form, Card, Spinner } from 'react-bootstrap'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import { use2FA } from '@/context/TwoFAContext'

const MODAL_OVERLAY_Z_INDEX = 99999
const MODAL_CONTENT_Z_INDEX = 100000

const TwoFactorAuthModal = () => {
  const { showModal, executeAction, cancel } = use2FA()

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isMounted = useRef(true)
  const inputRef = useRef(null)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (showModal) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      })
    }
  }, [showModal])

  const handleVerify = useCallback(async () => {
    if (code.length !== 6 || loading) return

    try {
      setLoading(true)
      setError('')

      const verifyResponse = await axiosClient.post('/api/auth/2fa/verify', { code }, { silent: true })

      if (!verifyResponse?.data?.verified) {
        setError('Invalid verification code')
        setCode('')
        return
      }

      try {
        await executeAction()
        setCode('')
      } catch (actionError) {
        const backendMessage = actionError?.response?.data?.message || actionError?.message || 'Operation failed'

        setError(backendMessage)
        toast.error(backendMessage)
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Verification failed. Please try again.'

      setError(message)
      setCode('')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [code, loading, executeAction])

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleVerify()
    }
  }, [code, handleVerify])

  const handleCancel = () => {
    if (loading) return

    setCode('')
    setError('')
    cancel()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  if (!showModal) return null

  return (
    <>
      {/* Background overlay */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
        style={{ zIndex: MODAL_OVERLAY_Z_INDEX }}
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ zIndex: MODAL_CONTENT_Z_INDEX }}
        tabIndex={-1}>
        <Card className="text-center shadow-lg border-0" style={{ width: 420, borderRadius: 16 }}>
          <Card.Body className="p-4">
            <div className="mb-3">
              <div
                className="mx-auto d-flex align-items-center justify-content-center rounded-circle border border-primary"
                style={{ width: 60, height: 60 }}>
                <span style={{ fontSize: 26 }}>🔐</span>
              </div>
            </div>

            <h4 className="mb-2">Two-Factor Authentication</h4>

            <p className="text-muted small mb-4">Enter the 6-digit code from your authenticator app.</p>

            <Form.Control
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder="XXXXXX"
              className="text-center mb-3"
              style={{
                height: 48,
                fontSize: 20,
                letterSpacing: 8,
                fontWeight: 500,
              }}
            />

            {error && <div className="text-danger small mb-3">{error}</div>}

            <div className="d-flex justify-content-center gap-3">
              <Button variant="outline-secondary" onClick={handleCancel} disabled={loading} className="px-4">
                Cancel
              </Button>

              <Button variant="primary" disabled={code.length !== 6 || loading} onClick={handleVerify} className="px-4">
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </>
  )
}

export default TwoFactorAuthModal
