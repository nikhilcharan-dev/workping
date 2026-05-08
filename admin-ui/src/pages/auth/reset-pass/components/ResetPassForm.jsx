import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useForm, Controller } from 'react-hook-form'
import axiosClient from '@/helpers/httpClient'
import * as yup from 'yup'
import 'bootstrap-icons/font/bootstrap-icons.css'
import toast from 'react-hot-toast'

const ResetPassForm = () => {
  const [step, setStep] = useState(1) // 1=email, 2=otp, 3=password
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [otpTimer, setOtpTimer] = useState(60)
  const [isTimerActive, setIsTimerActive] = useState(false)

  // loading state for resending OTP specifically
  const [isResending, setIsResending] = useState(false)

  const navigate = useNavigate()

  /* ---------------- Validation Schema ---------------- */
  const schema = yup.object().shape({
    email: yup.string().email('Please enter a valid email').required('Please enter your email'),

    otp: yup.string().when([], {
      is: () => step >= 2,
      then: (schema) => schema.required('Please enter OTP'),
      otherwise: (schema) => schema.notRequired(),
    }),

    newPassword: yup.string().when([], {
      is: () => step === 3,
      then: (schema) =>
        schema
          .required('Please enter new password')
          .min(6, 'Password must be at least 6 characters')
          .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number'),
      otherwise: (schema) => schema.notRequired(),
    }),

    confirmPassword: yup.string().when([], {
      is: () => step === 3,
      then: (schema) => schema.required('Please confirm password').oneOf([yup.ref('newPassword')], 'Passwords must match'),
      otherwise: (schema) => schema.notRequired(),
    }),
  })

  /* ---------------- React Hook Form ---------------- */
  const {
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  /* ---------------- OTP Timer ---------------- */
  useEffect(() => {
    let interval

    if (isTimerActive && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1)
      }, 1000)
    }

    if (otpTimer === 0) {
      setIsTimerActive(false)
    }

    return () => clearInterval(interval)
  }, [isTimerActive, otpTimer])

  /* ---------------- Submit Handler ---------------- */
  const onSubmit = async (data) => {
    try {
      if (step === 1) {
        await axiosClient.post('/api/admin/forgot-password/send-otp', { email: data.email }, { silent: true })

        setStep(2)
        setOtpTimer(60)
        setIsTimerActive(true)
      } else if (step === 2) {
        setIsTimerActive(false)
        await axiosClient.post('/api/admin/forgot-password/verify-otp', { email: data.email, otp: data.otp }, { silent: true })

        setStep(3)
      } else if (step === 3) {
        await axiosClient.post(
          '/api/admin/forgot-password/verify-and-change',
          {
            email: data.email,
            otp: data.otp,
            newPassword: data.newPassword,
          },
          { silent: true },
        )

        toast.success('Password changed successfully!')
        navigate('/auth/sign-in')
      }
    } catch (error) {
      // Show error on the relevant field for the current step
      const targetField = step === 1 ? 'email' : step === 2 ? 'otp' : 'newPassword'

      setError(targetField, {
        message: error?.response?.data?.message || 'Something went wrong. Please try again.',
      })
    }
  }

  /* ---------------- Resend OTP Handler ---------------- */
  const handleResendOTP = async () => {
    if (otpTimer > 0 || isResending) return

    try {
      setIsResending(true)
      await axiosClient.post('/api/admin/forgot-password/send-otp', { email: getValues('email') }, { silent: true })
      toast.success('OTP resent successfully!')
      setOtpTimer(60)
      setIsTimerActive(true)
    } catch (error) {
      // Error toast handled by interceptor
    } finally {
      setIsResending(false)
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <form className="authentication-form" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
      {/* Email */}
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control {...field} placeholder="Enter your email" isInvalid={!!error} disabled={step > 1 || isSubmitting} />
            <Form.Control.Feedback type="invalid">{error?.message}</Form.Control.Feedback>
          </Form.Group>
        )}
      />

      {/* OTP */}
      {step >= 2 && (
        <Controller
          name="otp"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Form.Group className="mb-3">
              <Form.Label>OTP</Form.Label>
              <InputGroup>
                <Form.Control {...field} placeholder="Enter OTP" isInvalid={!!error} disabled={step > 2 || isSubmitting} />

                {step === 2 && (
                  <Button
                    variant={otpTimer > 0 ? 'secondary' : 'primary'}
                    disabled={otpTimer > 0 || isResending || isSubmitting}
                    onClick={handleResendOTP}>
                    {isResending ? <Spinner size="sm" /> : otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                  </Button>
                )}

                <Form.Control.Feedback type="invalid" className="d-block">
                  {error?.message}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          )}
        />
      )}

      {/* Password Step */}
      {step === 3 && (
        <>
          {/* New Password */}
          <Controller
            name="newPassword"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    isInvalid={!!error}
                    disabled={isSubmitting}
                  />
                  <InputGroup.Text
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    role="button">
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </InputGroup.Text>
                  <Form.Control.Feedback type="invalid" className="d-block">
                    {error?.message}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            )}
          />

          {/* Confirm Password */}
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Form.Group className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    {...field}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    isInvalid={!!error}
                    disabled={isSubmitting}
                  />
                  <InputGroup.Text
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    role="button">
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </InputGroup.Text>
                  <Form.Control.Feedback type="invalid" className="d-block">
                    {error?.message}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            )}
          />
        </>
      )}

      <div className="d-grid">
        <Button type="submit" variant="primary" disabled={isSubmitting || isResending}>
          {isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Processing...
            </>
          ) : step === 1 ? (
            'Send OTP'
          ) : step === 2 ? (
            'Verify OTP'
          ) : (
            'Change Password'
          )}
        </Button>
      </div>
    </form>
  )
}

export default ResetPassForm
