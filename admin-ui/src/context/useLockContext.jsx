import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const STORAGE_KEY = 'wp_locked'
const RETURN_KEY = 'wp_lock_return'
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']

const LockContext = createContext(undefined)

export function useLockContext() {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLockContext must be used within LockProvider')
  return ctx
}

export function LockProvider({ children }) {
  const [isLocked, setIsLocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'true')
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const lock = useCallback(() => {
    // Save where the user was so we can return them after unlock
    const current = location.pathname + location.search
    if (!current.startsWith('/auth/lock-screen')) {
      sessionStorage.setItem(RETURN_KEY, current)
    }
    sessionStorage.setItem(STORAGE_KEY, 'true')
    setIsLocked(true)
    navigate('/auth/lock-screen', { replace: true })
  }, [navigate, location])

  const unlock = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setIsLocked(false)
    const returnTo = sessionStorage.getItem(RETURN_KEY) ?? '/dashboard/analytics'
    sessionStorage.removeItem(RETURN_KEY)
    navigate(returnTo, { replace: true })
  }, [navigate])

  // Reset idle timer on activity
  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(lock, IDLE_TIMEOUT_MS)
  }, [lock])

  useEffect(() => {
    if (isLocked) {
      clearTimeout(timerRef.current)
      IDLE_EVENTS.forEach((e) => document.removeEventListener(e, resetTimer))
      return
    }

    resetTimer()
    IDLE_EVENTS.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }))

    return () => {
      clearTimeout(timerRef.current)
      IDLE_EVENTS.forEach((e) => document.removeEventListener(e, resetTimer))
    }
  }, [isLocked, resetTimer])

  return <LockContext.Provider value={{ isLocked, lock, unlock }}>{children}</LockContext.Provider>
}
