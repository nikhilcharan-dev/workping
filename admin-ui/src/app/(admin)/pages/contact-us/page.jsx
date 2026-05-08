import { Card, CardBody, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import ContactForm from './components/ContactForm'
const ContactUs = () => {
  return (
    <>
      <PageMetaData title="Contact Us" />

      <Row className="justify-content-center text-center mt-4">
        <Col lg={6}>
          <h3 className="fw-semibold">Contact Us with Our Team</h3>
          <p>
            Got any questions about the product or scaling on our platform? We&apos;re here to help. Chat to our friendly team 24/7 and get onboard in
            less than 5 minutes.
          </p>
        </Col>
      </Row>
      <Row className="justify-content-center mt-4">
        <Col lg={12}>
          <Card>
            <CardBody>
              <Row>
                <Col xxl={6}>
                  <ContactForm />
                </Col>
                <Col xxl={6}>
                  <div className="mapouter">
                    <div className="gmap_canvas">
                      <iframe
                        className="gmap_iframe"
                        width="100%"
                        frameBorder={0}
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src="https://maps.google.com/maps?width=600&height=400&hl=en&q=University of Oxford&t=&z=14&ie=UTF8&iwloc=B&output=embed"
                      />
                      <a href="https://strandsgame.net/">Strands</a>
                    </div>
                  </div>
                  <div className="my-4">
                    <h4 className="fw-medium">Do you need quick help with some general inquiries ?</h4>
                    <p>You can use any of the support systems below if your query is urgent, We will be happy to be of help.</p>
                    <Row className="g-4">
                      <Col xl={6}>
                        <div className="d-flex p-1">
                          <div className="avatar-md">
                            <span className="avatar-title bg-light text-dark fs-24 rounded-circle">
                              <IconifyIcon icon="iconamoon:location-pin-duotone" />
                            </span>
                          </div>
                          <div className="d-block align-self-center text-truncate ms-2">
                            <h5 className="fw-medium fs-14 text-uppercase">Office Address</h5>
                            <span>660 Courtright Bismarck, ND</span>
                          </div>
                        </div>
                      </Col>
                      <Col xl={6}>
                        <div className="d-flex p-1">
                          <div className="avatar-md">
                            <span className="avatar-title bg-light text-dark fs-24 rounded-circle">
                              <IconifyIcon icon="iconamoon:phone-duotone" />
                            </span>
                          </div>
                          <div className="d-block align-self-center text-truncate ms-2">
                            <h5 className="fw-medium fs-14 text-uppercase">Telephone number</h5>
                            <span>1-888-452-1505</span>
                          </div>
                        </div>
                      </Col>
                      <Col xl={6}>
                        <div className="d-flex p-1">
                          <div className="avatar-md">
                            <span className="avatar-title bg-light text-dark fs-24 rounded-circle">
                              <IconifyIcon icon="iconamoon:email-duotone" />
                            </span>
                          </div>
                          <div className="d-block align-self-center text-truncate ms-2">
                            <h5 className="fw-medium fs-14 text-uppercase">Email Address</h5>
                            <span>rachelmtrojano@armyspy.com</span>
                          </div>
                        </div>
                      </Col>
                      <Col xl={6}>
                        <div className="d-flex p-1">
                          <div className="avatar-md">
                            <span className="avatar-title bg-light text-dark fs-24 rounded-circle">
                              <IconifyIcon icon="iconamoon:link-external-duotone" />
                            </span>
                          </div>
                          <div className="d-block align-self-center text-truncate ms-2">
                            <h5 className="fw-medium fs-14 text-uppercase">Social Contact</h5>
                            <div className="d-flex justify-content-center gap-3">
                              <OverlayTrigger placement="bottom" overlay={<Tooltip className="primary-tooltip">Facebook</Tooltip>}>
                                <span role="button" className="btn fs-20 d-inline-flex align-items-center justify-content-center text-primary p-0">
                                  <IconifyIcon icon="bxl:facebook" />
                                </span>
                              </OverlayTrigger>
                              <OverlayTrigger placement="bottom" overlay={<Tooltip className="danger-tooltip">Instagram</Tooltip>}>
                                <span role="button" className="btn fs-20 d-inline-flex align-items-center justify-content-center text-danger p-0">
                                  <IconifyIcon icon="bxl:instagram-alt" />
                                </span>
                              </OverlayTrigger>
                              <OverlayTrigger placement="bottom" overlay={<Tooltip className="info-tooltip">Twitter</Tooltip>}>
                                <span role="button" className="btn fs-20 d-inline-flex align-items-center justify-content-center text-info p-0">
                                  <IconifyIcon icon="bxl:twitter" />
                                </span>
                              </OverlayTrigger>
                              <OverlayTrigger placement="bottom" overlay={<Tooltip className="primary-tooltip">Linkedin</Tooltip>}>
                                <span role="button" className="btn fs-20 d-inline-flex align-items-center justify-content-center text-primary p-0">
                                  <IconifyIcon icon="bxl:linkedin" />
                                </span>
                              </OverlayTrigger>
                            </div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default ContactUs
