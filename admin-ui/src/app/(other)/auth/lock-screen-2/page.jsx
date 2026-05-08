import { Card, CardBody, Col } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import LogoBox from '@/components/LogoBox'
import PageMetaData from '@/components/PageTitle'
import LockScreenForm from './components/LockScreenForm'
const LockScreen2 = () => {
  return (
    <>
      <PageMetaData title="Lock Screen 2" />

      <Col xl={5} className="mx-auto">
        <Card className="auth-card">
          <CardBody className="px-3 py-5">
            <LogoBox
              textLogo={{
                height: 24,
                width: 73,
              }}
              squareLogo={{
                className: 'me-1',
              }}
              containerClassName="mx-auto mb-4 text-center auth-logo"
            />
            <h2 className="fw-bold text-center fs-18">Hi ! Gaston</h2>
            <p className="text-muted text-center mt-1 mb-4">Enter your password to access the admin.</p>
            <div className="px-4">
              <LockScreenForm />
            </div>
          </CardBody>
        </Card>
        <p className="text-white mb-0 text-center">
          Not you? return{' '}
          <Link to="/auth/sign-in-2" className="text-white fw-bold ms-1">
            Sign In
          </Link>
        </p>
      </Col>
    </>
  )
}
export default LockScreen2
