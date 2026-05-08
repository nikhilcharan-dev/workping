import { Link, Navigate } from 'react-router-dom'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import LogoBox from '@/components/LogoBox'
import LockScreenForm from './components/LockScreenForm'
import PageMetaData from '@/components/PageTitle'
import { useAuthContext } from '@/context/useAuthContext'
import { useLockContext } from '@/context/useLockContext'
import signInImg from '@/assets/images/sign-in.svg'
import avatar1 from '@/assets/images/users/avatar-1.jpg'

const LockScreen = () => {
  const { user } = useAuthContext()
  const { isLocked } = useLockContext()

  if (!isLocked) return <Navigate to="/dashboard/analytics" replace />

  return (
    <>
      <PageMetaData title="Screen Locked" />

      <Card className="auth-card">
        <CardBody className="p-0">
          <Row className="align-items-center g-0">
            <Col lg={6} className="d-none d-lg-inline-block border-end">
              <div className="auth-page-sidebar">
                <img src={signInImg} width={521} height={521} alt="auth" className="img-fluid" />
              </div>
            </Col>
            <Col lg={6}>
              <div className="p-4">
                <LogoBox
                  textLogo={{ height: 24, width: 73 }}
                  squareLogo={{ className: 'me-1' }}
                  containerClassName="mx-auto mb-4 text-center auth-logo"
                />

                <div className="text-center mb-3">
                  <img
                    src={user?.profileImage ?? avatar1}
                    alt="avatar"
                    width={64}
                    height={64}
                    className="rounded-circle"
                    style={{ objectFit: 'cover', border: '3px solid #e2e8f0' }}
                  />
                </div>

                <h2 className="fw-bold text-center fs-18">Hi, {user?.name ?? 'there'}!</h2>
                <p className="text-muted text-center mt-1 mb-4">Enter your password to continue.</p>

                <Row className="justify-content-center">
                  <Col xs={12} md={8}>
                    <LockScreenForm />
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <p className="text-white mb-0 text-center">
        Not you?{' '}
        <Link to="/auth/sign-in" className="text-white fw-bold ms-1">
          Sign In
        </Link>
      </p>
    </>
  )
}

export default LockScreen
