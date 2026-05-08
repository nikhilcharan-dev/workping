import axios from 'axios'
import toast from 'react-hot-toast'
import { getToken } from './tokenStore'

// ── Global in-flight request counter for the loading bar ─────────────────────
let activeRequests = 0

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL ?? import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // sends HttpOnly cookies on every request
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — show loader + attach Bearer token ──────────────────
httpClient.interceptors.request.use((config) => {
  activeRequests++
  window.dispatchEvent(new Event('SHOW_LOADER'))
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor — hide loader + auto-toast ───────────────────────────
httpClient.interceptors.response.use(
  (response) => {
    activeRequests--
    if (activeRequests === 0) window.dispatchEvent(new Event('HIDE_LOADER'))

    // Auto success toast unless { silent: true } was passed
    if (!response.config.silent) {
      const msg = response.data?.message
      if (msg) toast.success(msg)
    }

    return response
  },
  (error) => {
    activeRequests--
    if (activeRequests === 0) window.dispatchEvent(new Event('HIDE_LOADER'))

    // Auto error toast unless silent
    if (!error.config?.silent) {
      const msg = error.response?.data?.message ?? error.response?.data?.error ?? 'Something went wrong.'
      toast.error(msg)
    }

    return Promise.reject(error)
  },
)

export default httpClient
