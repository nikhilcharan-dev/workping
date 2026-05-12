const ENDPOINT = `${import.meta.env.VITE_BASE_URL ?? import.meta.env.VITE_API_BASE_URL}/api/client-errors`
const DEDUP_MS = 60_000
const recent = new Map()

const trim = (s, n) => (typeof s === 'string' ? s.slice(0, n) : undefined)

export function reportError(error, info = {}) {
  try {
    const message = error?.message ?? String(error ?? 'Unknown error')
    const now = Date.now()
    const last = recent.get(message)
    if (last && now - last < DEDUP_MS) return
    recent.set(message, now)

    const payload = {
      source: 'employees-ui',
      kind: info.kind ?? 'error',
      message: trim(message, 1000),
      stack: trim(error?.stack, 4000),
      componentStack: trim(info.componentStack, 4000),
      url: trim(typeof window !== 'undefined' ? window.location?.href : '', 500),
    }

    // keepalive lets the report survive page navigation/unload.
    fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch {
    // never throw from the reporter
  }
}

export function installGlobalErrorListeners() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (event) => {
    reportError(event.error ?? new Error(event.message), { kind: 'window.error' })
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const err = reason instanceof Error ? reason : new Error(String(reason))
    reportError(err, { kind: 'unhandledrejection' })
  })
}
