import { Component } from 'react'

/**
 * Last-resort catch for render-time exceptions anywhere in the tree.
 *
 * Without this, a single throw in a lazy-loaded route white-screens the whole
 * portal — the user is left staring at a blank page with no way to recover
 * short of a full reload. The boundary surfaces a recoverable error UI and
 * logs the error so it can be wired into Sentry/Datadog later.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    window.location.assign('/')
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#f8fafc',
            color: '#0f172a',
          }}>
          <div
            style={{
              maxWidth: 480,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0, marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ color: '#64748b', marginTop: 0 }}>
              An unexpected error broke this page. Reload to recover. If it keeps happening, contact your admin.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                marginTop: '1rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0.6rem 1.2rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              Reload the app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
