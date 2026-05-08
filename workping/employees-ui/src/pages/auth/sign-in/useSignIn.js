import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { useAuthContext } from '@/context/useAuthContext'
import httpClient from '@/helpers/httpClient'

const loginFormSchema = yup.object({
  email: yup.string().email('Please enter a valid email').required('Please enter your email'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Please enter your password'),
})

const useSignIn = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthContext()

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const redirectUser = () => {
    const redirectLink = searchParams.get('redirectTo')
    if (redirectLink) navigate(redirectLink)
    else navigate('/dashboard')
  }

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true)
    try {
      const res = await httpClient.post('/auth/login', { userEmail: values.email, password: values.password }, { silent: true })

      // Rehydrate auth state — token goes into in-memory store via context
      await login(res.data?.data?.token)

      toast.success('Login successful!')

      setTimeout(redirectUser, 500)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Invalid credentials, please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  })

  return { loading, login: onSubmit, control }
}

export default useSignIn
