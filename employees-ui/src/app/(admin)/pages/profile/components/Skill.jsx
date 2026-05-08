import { Card, CardBody, CardHeader, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap'
import { skillData } from '../data'
import { Fragment } from 'react'
const Skill = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle as={'h5'}>Skill</CardTitle>
      </CardHeader>
      <CardBody>
        <Row>
          <Col xs={12}>
            {skillData.map((item, idx) => (
              <Fragment key={idx}>
                <p className="fs-15 mb-1 float-end">{item.progressValue}%</p>
                <p className="fs-15 mb-1">{item.title}</p>
                <ProgressBar
                  variant="primary"
                  striped
                  animated
                  now={item.progressValue}
                  className={`progress-sm ${skillData.length - 1 === idx ? 'mb-2' : 'mb-3'}`}
                />
              </Fragment>
            ))}
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}
export default Skill
