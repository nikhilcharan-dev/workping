import { Link, useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import PasswordFormInput from '@/components/form/PasswordFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { Button } from 'react-bootstrap'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import axiosClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'
import toast from 'react-hot-toast'

const LoginForm = () => {
  const navigate = useNavigate()
  const { login } = useAuthContext()

  const loginSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('Please enter your email'),
    password: yup
      .string()
      .required('Please enter your password')
      .min(8, 'Password must be at least 8 characters')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[0-9]/, 'Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  })

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: yupResolver(loginSchema),
  })

  const onSubmit = async (values) => {
    try {
      const res = await axiosClient.post('/api/admin/auth/login', values, { silent: true })
      await login(res.data?.data?.token)
      toast.success('Login successful!')

      setTimeout(() => {
        navigate('/dashboard/analytics')
      }, 500)
    } catch (error) {
      // Error toast is handled by httpClient interceptor
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="authentication-form">
      <TextFormInput control={control} name="email" containerClassName="mb-3" label="Email" id="email-id" placeholder="Enter your email" />

      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3"
        placeholder="Enter your password"
        id="password-id"
        label={
          <>
            <Link to="/auth/reset-pass" className="float-end text-muted ms-1">
              Reset password
            </Link>
            <label className="form-label">Password</label>
          </>
        }
      />

      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          Sign In
        </Button>
      </div>
    </form>
  )
}

export default LoginForm
