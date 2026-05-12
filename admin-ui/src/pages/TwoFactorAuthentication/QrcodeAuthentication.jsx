import { useEffect, useState, useRef, useCallback } from 'react'
import { Button, Card, Spinner, Form } from 'react-bootstrap'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'
import { safeInternalPath } from '@/helpers/safeNavigate'

const MODAL_OVERLAY_Z_INDEX = 99999
const MODAL_CONTENT_Z_INDEX = 100000

const QRAuthModal = () => {
  const [status, setStatus] = useState('Creating QR session...')
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState(null)
  const { setIs2FAAuthnticator } = useAuthContext()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()

  const navigationState = location.state
  const navigate = useNavigate()

  const pollRef = useRef(null)

  // Load QR
  const loadQrCode = async () => {
    try {
      setLoading(true)
      setError('')

      const setupResponse = await axiosClient.post('/api/auth/2fa/setup', {}, { silent: true })

      setQrCode(setupResponse.data.qrCode)
      setStatus('Scan this QR using your authenticator app')
    } catch (err) {
      setStatus('Failed to load QR')
      toast.error('Failed to load QR code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Verify code
  const handleVerify = useCallback(async () => {
    if (code.length !== 6 || verifying) return

    try {
      setVerifying(true)
      setError('')

      const verifyResponse = await axiosClient.post('/api/auth/2fa/verify', { code }, { silent: true })

      if (verifyResponse?.data?.verified) {
        setStatus('✅ Authentication successful')

        const cookieResponse = await axiosClient.get('/verify-cookie', { silent: true })

        if (cookieResponse.data?.data?.twoFactorEnabled) {
          setIs2FAAuthnticator(false)
        }

        if (navigationState?.action === 'ORG' || navigationState?.action === 'SIGN-UP') {
          navigate(safeInternalPath(navigationState.path), {
            state: { formData: navigationState?.formData },
          })
        } else {
          navigate('/')
        }
      } else {
        setError('Invalid verification code')
        setCode('')
      }
    } catch (err) {
      setError('Invalid code. Please try again.')
      setCode('')
    } finally {
      setVerifying(false)
    }
  }, [code, verifying, navigationState, navigate, setIs2FAAuthnticator])

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleVerify()
    }
  }, [code, handleVerify])

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  // Handle skip — mark 2FA as not completed so org flow redirects back to QR
  const handleSkip = () => {
    setIs2FAAuthnticator(true)
    if (navigationState?.path) {
      navigate(safeInternalPath(navigationState.path), {
        state: { formData: navigationState?.formData },
      })
    } else {
      navigate('/')
    }
  }

  useEffect(() => {
    loadQrCode()

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  return (
    <>
      {/* Background */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 bg-body-secondary bg-opacity-75"
        style={{ backdropFilter: 'blur(4px)', zIndex: MODAL_OVERLAY_Z_INDEX }}
      />

      {/* Modal */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
        style={{ zIndex: MODAL_CONTENT_Z_INDEX }}>
        <Card className="text-center shadow-lg border-0 bg-body text-body" style={{ width: 420 }}>
          <Card.Body className="p-4">
            {/* Icon */}
            <div className="mb-3">
              <div
                className="mx-auto d-flex align-items-center justify-content-center rounded-circle border border-secondary"
                style={{ width: 64, height: 64 }}>
                <span style={{ fontSize: 32 }}>🔐</span>
              </div>
            </div>

            <h4 className="mb-2">Scan QR to Login</h4>

            <p className="small mb-3 text-body-secondary">Scan using Google Authenticator / Microsoft Authenticator</p>

            {/* QR Section */}
            <div className="d-flex align-items-center justify-content-center mb-3 bg-body-secondary rounded border" style={{ minHeight: 220 }}>
              {loading ? (
                <Spinner animation="border" />
              ) : qrCode ? (
                <img src={qrCode} alt="QR Code" width={200} height={200} />
              ) : (
                <span className="text-body">Failed to load QR</span>
              )}
            </div>

            {/* Code Input */}
            <Form.Control
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder="Enter 6 digit code"
              autoFocus
              className="text-center mb-3"
              style={{
                height: 48,
                fontSize: 20,
                letterSpacing: 8,
                fontWeight: 500,
              }}
            />

            {error && <div className="text-danger small mb-2">{error}</div>}

            <p className="small mb-4 text-body-secondary">{status}</p>

            {/* Buttons */}
            <div className="d-flex justify-content-center gap-3">
              <Button variant="secondary" onClick={handleSkip} className="px-4">
                Skip
              </Button>

              <Button variant="primary" disabled={code.length !== 6 || verifying} onClick={handleVerify} className="px-4">
                {verifying ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              <Button variant="outline-primary" onClick={loadQrCode} className="px-4">
                Refresh QR
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </>
  )
}

export default QRAuthModal
