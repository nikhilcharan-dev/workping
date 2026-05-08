import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosClient from '@/helpers/httpClient'
import { setToken, clearToken } from '@/helpers/tokenStore'

const AuthContext = createContext(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [is2FAAuthnticator, setIs2FAAuthnticator] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState(null)

  const verifySession = async () => {
    try {
      const res = await axiosClient.get('/verify-cookie', { silent: true })
      const data = res.data?.data ?? {}
      if (data.twoFactorEnabled) {
        setIs2FAAuthnticator(false)
      }
      setUser(data)
      setIsAuthenticated(true)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    verifySession()
  }, [])

  const login = async (token) => {
    if (token) setToken(token)
    await verifySession()
  }

  const logout = () => {
    clearToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  const signUp = async (token) => {
    if (token) setToken(token)
    await verifySession()
  }

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
        is2FAAuthnticator,
        setIs2FAAuthnticator,
      }}>
      {children}
    </AuthContext.Provider>
  )
}
