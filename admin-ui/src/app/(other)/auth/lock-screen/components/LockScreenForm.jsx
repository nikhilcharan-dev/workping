import PasswordFormInput from '@/components/form/PasswordFormInput'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import axiosClient from '@/helpers/httpClient'
import { useLockContext } from '@/context/useLockContext'

const lockScreenSchema = yup.object({
  password: yup.string().required('Please enter your password'),
})

const LockScreenForm = () => {
  const { unlock } = useLockContext()
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: yupResolver(lockScreenSchema),
  })

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
    unlock()
    navigate('/auth/sign-in', { replace: true })
  }

  return (
    <form className="authentication-form" onSubmit={handleSubmit(onSubmit)}>
      <PasswordFormInput control={control} name="password" containerClassName="mb-3" placeholder="Enter your password" id="lock-password-id" />
      <div className="mb-2 text-center d-grid">
        <Button variant="primary" type="submit" disabled={isSubmitting}>
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
      <div className="text-center mt-1">
        <button type="button" className="btn btn-link btn-sm text-muted p-0" onClick={handleSwitchAccount}>
          Sign in as a different user
        </button>
      </div>
    </form>
  )
}

export default LockScreenForm
