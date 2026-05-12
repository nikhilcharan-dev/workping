/**
 * Validate a path before handing it to react-router's `navigate()`.
 *
 * react-router treats anything starting with `//` or `\\` as protocol-relative
 * and (depending on history mode) can leak users to external origins. Even
 * when the SPA stays on-origin, an attacker-controlled path can phish via a
 * deceptive in-app route. Pinning the path to "starts with single slash"
 * closes both shapes.
 */
export function isInternalPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false
  if (path.length > 1024) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//') || path.startsWith('/\\')) return false
  if (/[\r\n ]/.test(path)) return false
  return true
}

/**
 * Return `path` if it is internal, otherwise `fallback` (default: "/dashboard").
 * Use as: `navigate(safeInternalPath(searchParams.get('redirectTo')))`.
 */
export function safeInternalPath(path, fallback = '/dashboard') {
  return isInternalPath(path) ? path : fallback
}
