import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
const PersonalInfo = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle as={'h5'}>Personal Info</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="list-group">
          <li className="list-group-item border-0 border-bottom px-0 pt-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 fw-medium mb-0">Name :</h5>
              <span className="fs-14 text-muted">Jeannette C. Mullin</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 fw-medium mb-0">Email :</h5>
              <span className="fs-14 text-muted">jeannette@rhyta.com</span>
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
              <h5 className="me-2 mb-0 fw-medium">Designation :</h5>
              <span className="fs-14 text-muted">Full Stack Developer</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">Age :</h5>
              <span className="fs-14 text-muted">31 Year</span>
            </div>
          </li>
          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex flex-wrap align-items-center">
              <h5 className="me-2 mb-0 fw-medium">Links :</h5>
              <span className="fs-14">
                <a href="#!" className="text-primary">
                  https://myworkbench-portfolio.com
                </a>
              </span>
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
