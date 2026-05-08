import { useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import axiosClient from '@/helpers/httpClient'
import { useLockContext } from '@/context/useLockContext'
import { useAuthContext } from '@/context/useAuthContext'
import PasswordFormInput from '@/components/form/PasswordFormInput'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
import logoDark from '@/assets/images/logo-dark.png'
import logoLight from '@/assets/images/logo-light.png'
import { developedBy } from '@/context/constants'

const schema = yup.object({
  password: yup.string().required('Password is required'),
})

const LockScreenOverlay = () => {
  const { isLocked, unlock } = useLockContext()
  const { user, logout } = useAuthContext()
  const [showForgot, setShowForgot] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setError,
  } = useForm({
    resolver: yupResolver(schema),
  })

  if (!isLocked) return null

  const onSubmit = async ({ password }) => {
    try {
      await axiosClient.post('/api/admin/auth/verify-password', { password }, { silent: true })
      unlock()
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Incorrect password'
      setError('password', { message: msg })
    }
  }

  const handleSwitchAccount = async () => {
    try {
      await axiosClient.post('/api/admin/auth/logout', {}, { silent: true })
    } catch (_) {}
    logout()
    unlock()
    window.location.href = '/auth/sign-in'
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          margin: '0 16px',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        }}
        className="bg-white">
        {/* Top accent bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)' }} />

        <div className="p-4 pt-4">
          {/* Logo */}
          <div className="text-center mb-4">
            <img src={logoDark} alt={developedBy} height={22} className="logo-dark" />
            <img src={logoLight} alt={developedBy} height={22} className="logo-light" />
          </div>

          {/* Avatar + name */}
          <div className="text-center mb-4">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={user?.profileImage ?? avatar1}
                alt="avatar"
                width={72}
                height={72}
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  border: '2px solid #fff',
                }}
              />
            </div>
            <h5 className="fw-bold mt-3 mb-0">{user?.name ?? 'Welcome back'}</h5>
            <p className="text-muted small mb-0">{user?.email}</p>
          </div>

          {/* Lock icon badge */}
          <div className="text-center mb-3">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: 20,
                padding: '4px 14px',
                fontSize: 12,
                fontWeight: 600,
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              Screen locked
            </span>
          </div>

          {!showForgot ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <PasswordFormInput control={control} name="password" containerClassName="mb-3" placeholder="Enter your password" id="lock-password" />
              <div className="d-grid mb-2">
                <Button type="submit" variant="primary" disabled={isSubmitting} style={{ borderRadius: 10, fontWeight: 600 }}>
                  {isSubmitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Verifying…
                    </>
                  ) : (
                    'Unlock'
                  )}
                </Button>
              </div>
              <div className="text-center">
                <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={() => setShowForgot(true)}>
                  Forgot password?
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-2">
              <p className="text-muted small mb-3">To reset your password you'll need to sign in again.</p>
              <Button variant="outline-primary" size="sm" className="px-4" style={{ borderRadius: 10 }} onClick={() => setShowForgot(false)}>
                Go back
              </Button>
            </div>
          )}
        </div>

        <div className="border-top px-4 py-3 text-center" style={{ background: '#f8fafc' }}>
          <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={handleSwitchAccount}>
            Sign in as a different user
          </button>
        </div>
      </div>
    </div>
  )
}

export default LockScreenOverlay
