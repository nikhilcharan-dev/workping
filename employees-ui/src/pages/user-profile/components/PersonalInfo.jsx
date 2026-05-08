import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
import { useAuthContext } from '@/context/useAuthContext'

const PersonalInfo = () => {
  const { user } = useAuthContext()
  return (
    <Card className="h-100">
      <CardHeader>
        <CardTitle as={'h5'}>Personal Info</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="list-group">
          <li className="list-group-item border-0 border-bottom px-0 pt-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 fw-medium mb-0">Name :</h5>
              <span className="fs-14 text-muted">{user?.name ?? '—'}</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 fw-medium mb-0">UserID :</h5>
              <span className="fs-14 text-muted">23A91A05E1</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 fw-medium mb-0">Email :</h5>
              <span className="fs-14 text-muted">{user?.email ?? '—'}</span>
            </div>
          </li>

          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">Phone :</h5>
              <span className="fs-14 text-muted">+909 707-302-2110</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 fw-medium mb-0">UserID :</h5>
              <span className="fs-14 text-muted">23A91A05E1</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">Designation :</h5>
              <span className="fs-14 text-muted">Full Stack Developer</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">DOB :</h5>
              <span className="fs-14 text-muted">01-01-2002</span>
            </div>
          </li>

          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">Experience :</h5>
              <span className="fs-14 text-muted">10 Years</span>
            </div>
          </li>
          <li className="list-group-item border-0 px-0 pb-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">Language :</h5>
              <span className="fs-14 text-muted">English , Spanish , German , Japanese</span>
            </div>
          </li>
        </ul>
      </CardBody>
    </Card>
  )
}
export default PersonalInfo
