import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import httpClient from '@/helpers/httpClient'
import { setToken, clearToken } from '@/helpers/tokenStore'

const AuthContext = createContext(undefined)

// /verify-cookie is mounted at root (not under /api), so strip the /api suffix
const AUTH_ROOT = (import.meta.env.VITE_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/api\/?$/, '')

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState(null)

  const verifySession = useCallback(async () => {
    try {
      const res = await httpClient.get('/verify-cookie', { silent: true, baseURL: AUTH_ROOT })
      const data = res.data?.data ?? {}
      setUser(data)
      setIsAuthenticated(true)
    } catch {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    verifySession()
  }, [verifySession])

  const login = useCallback(
    (token) => {
      if (token) setToken(token)
      return verifySession()
    },
    [verifySession],
  )
  const signUp = useCallback(
    (token) => {
      if (token) setToken(token)
      return verifySession()
    },
    [verifySession],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        user,
        userId: user?._id ?? null,
        role: user?.role ?? null,
        login,
        signUp,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  )
}
