import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, FormCheck, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import axiosClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect } from 'react'

/* ─────────────────────────── OTP Input ─────────────────────────── */
const OtpInput = ({ length = 6, value, onChange }) => {
  const inputs = useRef([])
  const digits = value.split('')

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) {
      const next = [...digits]
      next[i] = ''
      onChange(next.join(''))
      return
    }
    const char = val[val.length - 1]
    const next = [...digits]
    next[i] = char
    onChange(next.join(''))
    if (i < length - 1) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const padded = pasted.padEnd(length, '').slice(0, length)
    onChange(padded)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
    e.preventDefault()
  }

  return (
    <div className="d-flex gap-2 justify-content-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="form-control text-center fw-bold fs-5"
          style={{ width: 48, height: 48 }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────── SignUpForm ─────────────────────────── */
const SignUpForm = () => {
  const navigate = useNavigate()
  const { signUp } = useAuthContext()

  const [step, setStep] = useState(1) // 1 = form, 2 = otp
  const [pendingPayload, setPendingPayload] = useState(null)
  const [pendingEmail, setPendingEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [otpTimer, setOtpTimer] = useState(60)
  const [isTimerActive, setIsTimerActive] = useState(false)

  /* OTP countdown */
  useEffect(() => {
    let interval
    if (isTimerActive && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((p) => p - 1), 1000)
    }
    if (otpTimer === 0) setIsTimerActive(false)
    return () => clearInterval(interval)
  }, [isTimerActive, otpTimer])

  const signUpSchema = yup.object({
    name: yup
      .string()
      .required('Please enter your name')
      .matches(/^[A-Za-z\s]+$/, 'Name must contain only alphabets'),
    number: yup
      .string()
      .required('Please enter your mobile number')
      .matches(/^\d+$/, 'Mobile number must contain only digits')
      .min(10, 'Mobile number must be at least 10 digits')
      .max(15, 'Mobile number must be at most 15 digits'),
    userEmail: yup.string().email('Please enter a valid email').required('Please enter your email'),
    password: yup
      .string()
      .required('Please enter your password')
      .min(8, 'Password must be at least 8 characters')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[0-9]/, 'Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password'),
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: yupResolver(signUpSchema),
  })

  /* Step 1 — validate form then send OTP */
  const onSubmit = async (values) => {
    try {
      const payload = {
        name: values.name,
        number: values.number,
        email: values.userEmail,
        password: values.password,
      }

      await axiosClient.post('/api/admin/otp/send-email-otp', { email: values.userEmail }, { silent: true })

      setPendingPayload(payload)
      setPendingEmail(values.userEmail)
      setOtp('')
      setOtpError('')
      setOtpTimer(60)
      setIsTimerActive(true)
      setStep(2)
    } catch (error) {
      // Error toast handled by interceptor
    }
  }

  /* Step 2 — verify OTP then register */
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP')
      return
    }

    setIsVerifying(true)
    setOtpError('')

    try {
      // Verify OTP first
      await axiosClient.post('/api/admin/otp/verify-email-otp', { email: pendingEmail, otp }, { silent: true })

      // OTP verified — now register with full payload
      const res = await axiosClient.post('/api/admin/auth/register', { ...pendingPayload }, { silent: true })

      await signUp(res.data?.data?.token)
      toast.success('Signup successful!')
      reset()
      navigate('/2fa-authnticator', {
        state: { action: 'SIGN-UP', path: '/' },
      })
    } catch (error) {
      setOtpError(error?.response?.data?.message || 'Invalid OTP. Please try again.')
      setOtp('')
    } finally {
      setIsVerifying(false)
    }
  }

  /* Resend OTP */
  const handleResend = async () => {
    if (otpTimer > 0 || isResending) return
    setIsResending(true)
    setOtpError('')
    try {
      await axiosClient.post('/api/admin/auth/send-signup-otp', { email: pendingEmail }, { silent: true })
      toast.success('OTP resent successfully!')
      setOtp('')
      setOtpTimer(60)
      setIsTimerActive(true)
    } catch (error) {
      // Error toast handled by interceptor
    } finally {
      setIsResending(false)
    }
  }

  /* ── OTP Step ── */
  if (step === 2) {
    return (
      <div className="authentication-form">
        <div className="text-center mb-4">
          <h5 className="mb-1">Verify your email</h5>
          <p className="text-muted small mb-0">
            We sent a 6-digit OTP to <strong>{pendingEmail}</strong>
          </p>
        </div>

        <div className="mb-4">
          <OtpInput
            value={otp}
            onChange={(val) => {
              setOtp(val)
              setOtpError('')
            }}
          />
          {otpError && <p className="text-danger text-center small mt-2 mb-0">{otpError}</p>}
        </div>

        <div className="mb-3 text-center d-grid">
          <Button variant="primary" onClick={handleVerifyOtp} disabled={isVerifying || otp.length !== 6}>
            {isVerifying ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Verifying...
              </>
            ) : (
              'Verify & Sign Up'
            )}
          </Button>
        </div>

        <div className="text-center">
          <Button variant="link" className="p-0 text-decoration-none small" disabled={otpTimer > 0 || isResending} onClick={handleResend}>
            {isResending ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-1" />
                Resending...
              </>
            ) : otpTimer > 0 ? (
              `Resend OTP in ${otpTimer}s`
            ) : (
              'Resend OTP'
            )}
          </Button>
        </div>

        <div className="text-center mt-2">
          <Button
            variant="link"
            className="p-0 text-decoration-none small text-muted"
            onClick={() => {
              setStep(1)
              setOtp('')
              setOtpError('')
            }}>
            ← Back to form
          </Button>
        </div>
      </div>
    )
  }

  /* ── Form Step ── */
  return (
    <form className="authentication-form" onSubmit={handleSubmit(onSubmit)}>
      <TextFormInput
        control={control}
        name="name"
        containerClassName="mb-3"
        label="Name"
        id="name"
        placeholder="Enter your name"
        required
        onKeyDown={(e) => {
          if (!/^[A-Za-z ]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) {
            e.preventDefault()
          }
        }}
      />

      <TextFormInput
        name="number"
        label="Mobile Number"
        placeholder="Enter your number"
        containerClassName="mb-3"
        control={control}
        required
        inputMode="numeric"
        pattern="\d*"
        onKeyDown={(e) => {
          if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) {
            e.preventDefault()
          }
        }}
      />

      <TextFormInput
        control={control}
        name="userEmail"
        containerClassName="mb-3"
        label="Email"
        id="email-id"
        placeholder="Enter your email"
        required
      />

      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3"
        placeholder="Enter your password"
        id="password-id"
        label="Password"
        required
      />

      <PasswordFormInput
        control={control}
        name="confirmPassword"
        containerClassName="mb-3"
        placeholder="Confirm your password"
        id="password-id-2"
        label="Confirm Password"
        required
      />

      <div className="mb-3">
        <FormCheck label="I accept Terms and Condition" id="termAndCondition" required />
      </div>

      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Sending OTP...
            </>
          ) : (
            'Sign Up'
          )}
        </Button>
      </div>
    </form>
  )
}

export default SignUpForm
