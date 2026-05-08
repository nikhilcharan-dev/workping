import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'

const PersonalInfo = () => {
  return (
    <Card className="h-100">
      <CardHeader>
        <CardTitle as="h5">Card details</CardTitle>
      </CardHeader>

      <CardBody className="d-flex flex-column">
        <ul className="list-group flex-grow-1">
          <li className="list-group-item border-0 border-bottom px-0 pt-0">
            <div className="d-flex align-items-center">
              <h5 className="me-2 fw-medium mb-0">Aadhaar :</h5>
              <span className="fs-14 text-muted">XXXX XXXX 1234</span>
            </div>
          </li>

          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex align-items-center">
              <h5 className="me-2 fw-medium mb-0">PAN :</h5>
              <span className="fs-14 text-muted">ABCDE1234F</span>
            </div>
          </li>

          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex align-items-center">
              <h5 className="me-2 fw-medium mb-0">Bank :</h5>
              <span className="fs-14 text-muted">State Bank of India</span>
            </div>
          </li>

          <li className="list-group-item border-0 border-bottom px-0">
            <div className="d-flex align-items-center">
              <h5 className="me-2 fw-medium mb-0">Passport :</h5>
              <span className="fs-14 text-muted">P1234567</span>
            </div>
          </li>

          <li className="list-group-item border-0 px-0 pb-0">
            <div className="d-flex align-items-center">
              <h5 className="me-2 fw-medium mb-0">Country :</h5>
              <span className="fs-14 text-muted">India</span>
            </div>
          </li>
        </ul>
      </CardBody>
    </Card>
  )
}

export default PersonalInfo
