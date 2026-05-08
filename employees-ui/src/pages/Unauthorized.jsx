import { Link } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageMetaData from '@/components/PageTitle'

const Unauthorized = () => {
  return (
    <>
      <PageMetaData title="Access Denied" />
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <IconifyIcon icon="bx:lock-alt" className="text-warning mb-3" style={{ fontSize: '4rem' }} />
        <h2 className="fw-bold mb-2">Access Denied</h2>
        <p className="text-muted mb-4">You do not have permission to view this page.</p>
        <Link to="/dashboard">
          <Button variant="primary">
            <IconifyIcon icon="bx:home" className="me-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </>
  )
}

export default Unauthorized
