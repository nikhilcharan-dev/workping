import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap'
const Services = () => {
  return (
    <Card>
      <CardBody className="p-4">
        <CardTitle className="fw-bold text-uppercase mb-2">Our Services</CardTitle>
        <p className="mb-4">
          Our work stands as a testament to dedication, innovation, and excellence. With meticulous attention to detail and a passion for surpassing
          expectations, we strive to deliver solutions that inspire and empower.
        </p>
        <Row>
          <Col md={4}>
            <div className="d-flex flex-wrap flex-md-nowrap gap-2 p-3 mb-3">
              <div className="flex-shrink-0 avatar-sm">
                <div className="avatar-title bg-primary bg-gradient text-white rounded-circle">
                  <IconifyIcon icon="bxl:react" className="fs-20" />
                </div>
              </div>
              <div className="flex-grow-1 d-flex flex-grow-1 flex-column">
                <h5 className="fs-16 fw-semibold lh-base">
                  <Link to="" className="text-reset">
                    Creative React Bootstrap Admin
                  </Link>
                </h5>
                <span className="flex-grow-1 text-muted">
                  Introducing our Creative React Bootstrap Admin, a dynamic solution merging versatility with sleek design. Unlock seamless management
                  and intuitive user experiences with our innovative toolkit.
                </span>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="d-flex flex-wrap flex-md-nowrap gap-2 p-3 mb-3">
              <div className="flex-shrink-0 avatar-sm">
                <div className="avatar-title bg-purple bg-gradient text-white rounded-circle">
                  <IconifyIcon icon="bxl:bootstrap" className="fs-20" />
                </div>
              </div>
              <div className="flex-grow-1 d-flex flex-grow-1 flex-column">
                <h5 className="fs-16 fw-semibold lh-base">
                  <Link to="">Bootstrap Saas Admin</Link>
                </h5>
                <span className="flex-grow-1 text-muted">
                  Introducing our Bootstrap SaaS Admin, a cutting-edge platform tailored for streamlined management. Harness the power of
                  Bootstrap&apos;s robust framework infused with SaaS capabilities for scalable solutions.
                </span>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="d-flex flex-wrap flex-md-nowrap gap-2 p-3 mb-3">
              <div className="flex-shrink-0 avatar-sm">
                <div className="avatar-title bg-cyan bg-gradient text-white rounded-circle">
                  <IconifyIcon icon="bxl:vuejs" className="fs-20" />
                </div>
              </div>
              <div className="flex-grow-1 d-flex flex-grow-1 flex-column">
                <h5 className="fs-16 fw-semibold lh-base">
                  <Link to="">VueJS Client Project</Link>
                </h5>
                <span className="flex-grow-1 text-muted">
                  Introducing our VueJS Client Project, a dynamic and responsive web application powered by Vue.js. Seamlessly blending functionality
                  with elegance, this project delivers an immersive user experience.
                </span>
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col md={4}>
            <div className="d-flex flex-wrap flex-md-nowrap gap-2 p-3 mb-3">
              <div className="flex-shrink-0 avatar-sm">
                <div className="avatar-title bg-danger bg-gradient text-white rounded-circle">
                  <IconifyIcon icon="bxl:html5" className="fs-20" />
                </div>
              </div>
              <div className="flex-grow-1 d-flex flex-grow-1 flex-column">
                <h5 className="fs-16 fw-semibold lh-base">
                  <Link to="">Pure Html Css Landing</Link>
                </h5>
                <span className="flex-grow-1 text-muted">
                  Introducing our Pure HTML CSS Landing, a minimalist yet impactful landing page solution. Crafted with precision using HTML and CSS,
                  it embodies simplicity and elegance.
                </span>
              </div>
            </div>
          </Col>
          <Col md={4}>
            <div className="d-flex flex-wrap flex-md-nowrap gap-2 p-3 mb-3">
              <div className="flex-shrink-0 avatar-sm">
                <div className="avatar-title bg-green bg-gradient text-white rounded-circle">
                  <IconifyIcon icon="bxl:nodejs" className="fs-20" />
                </div>
              </div>
              <div className="flex-grow-1 d-flex flex-grow-1 flex-column">
                <h5 className="fs-16 fw-semibold lh-base">
                  <Link to="">Nodejs Backend Project</Link>
                </h5>
                <span className="flex-grow-1 text-muted">
                  Introducing our Node.js Backend Project, a robust and scalable solution for powering your applications. Leveraging the power of
                  Node.js, we deliver efficient and high-performance backend systems.
                </span>
              </div>
            </div>
          </Col>
        </Row>
        <div className="mt-3 text-center">
          <span role="button" className="text-primary">
            <IconifyIcon icon="bx:loader-circle" className="spin-icon fs-22 align-middle me-1" />
            Loading
          </span>
        </div>
      </CardBody>
    </Card>
  )
}
export default Services
