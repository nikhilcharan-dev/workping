import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Constants ──────────────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const STORAGE_KEY = 'wp_locked' // sessionStorage — lock state
const RETURN_KEY = 'wp_lock_return' // sessionStorage — URL to return to after unlock
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']

const LockContext = createContext(undefined)

export function useLockContext() {
  const context = useContext(LockContext)
  if (context === undefined) {
    throw new Error('useLockContext must be used within a LockProvider')
  }
  return context
}

export function LockProvider({ children }) {
  const navigate = useNavigate()
  const timerRef = useRef(null)

  // Initialise from sessionStorage so lock survives page refresh
  const [isLocked, setIsLocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'true')

  // ── lock() ─────────────────────────────────────────────────────────────────
  const lock = useCallback(() => {
    sessionStorage.setItem(RETURN_KEY, window.location.pathname)
    sessionStorage.setItem(STORAGE_KEY, 'true')
    setIsLocked(true)
    navigate('/auth/lock-screen')
  }, [navigate])

  // ── unlock() ───────────────────────────────────────────────────────────────
  const unlock = useCallback(() => {
    const returnPath = sessionStorage.getItem(RETURN_KEY) || '/dashboard'
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    setIsLocked(false)
    navigate(returnPath)
  }, [navigate])

  // ── resetTimer() ───────────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(lock, IDLE_TIMEOUT_MS)
  }, [lock])

  // ── Idle detection ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLocked) {
      // Stop the timer while locked — no point running it
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
