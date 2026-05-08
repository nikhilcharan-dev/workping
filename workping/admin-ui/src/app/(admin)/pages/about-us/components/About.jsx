import IconifyIcon from '@/components/wrappers/IconifyIcon'
import small7 from '@/assets/images/small/img-7.jpg'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
const About = () => {
  return (
    <Card>
      <CardBody>
        <div
          className="position-relative rounded-2 overflow-hidden"
          style={{
            backgroundImage: `url(${small7})`,
          }}>
          <div className="bg-overlay bg-black" />
          <div className="position-relative p-3 p-lg-4">
            <h4 className="fs-18 fw-bold text-white text-uppercase mb-2">About Us</h4>
            <p className="text-white text-opacity-75 mb-3">
              Over the past decade, we&apos;ve distributed more than 45,000 copies of our administrative themes, all of which have been effectively{' '}
              <br />
              utilized by businesses ranging from small-scale enterprises to multinational corporations.
            </p>
            <div className="mb-3">
              <Button variant="success" className="bg-gradient">
                Join US
              </Button>
            </div>
            <Row>
              <Col xxl={5} xl={8} lg={10} xs={12}>
                <div className="overflow-hidden rounded">
                  <Row className="g-0">
                    <Col sm={4}>
                      <div className="bg-body border-end">
                        <div className="text-center p-3">
                          <div className="avatar-sm mx-auto mb-2">
                            <span className="avatar-title bg-primary-subtle text-primary rounded-circle">
                              <IconifyIcon icon="iconamoon:category-duotone" className="fs-18" />
                            </span>
                          </div>
                          <h4 className="fw-semibold fs-20 mb-1">1,994+</h4>
                          <h5 className="fs-14 mb-0">Projects</h5>
                        </div>
                      </div>
                    </Col>
                    <Col sm={4}>
                      <div className="bg-body border-end">
                        <div className="text-center p-3">
                          <div className="avatar-sm mx-auto mb-2">
                            <span className="avatar-title bg-success-subtle text-success rounded-circle">
                              <IconifyIcon icon="iconamoon:check-circle-1-duotone" className="fs-18" />
                            </span>
                          </div>
                          <h4 className="fw-semibold fs-20 mb-1">1,962</h4>
                          <h5 className="fs-14 mb-0">Complated</h5>
                        </div>
                      </div>
                    </Col>
                    <Col sm={4}>
                      <div className="bg-body">
                        <div className="text-center p-3">
                          <div className="avatar-sm mx-auto mb-2">
                            <span className="avatar-title bg-danger-subtle text-danger rounded-circle">
                              <IconifyIcon icon="iconamoon:credit-card-duotone" className="fs-18" />
                            </span>
                          </div>
                          <h4 className="fw-semibold fs-20 mb-1">98M+</h4>
                          <h5 className="fs-14 mb-0">Payment</h5>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
export default About
