import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center p-4">
          <div className="mb-4">
            <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '4rem' }}></i>
          </div>
          <h2 className="mb-3">Something went wrong</h2>
          <p className="text-muted mb-4">An unexpected error occurred. Please try again or contact support if the issue persists.</p>
          <button className="btn btn-primary" onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
