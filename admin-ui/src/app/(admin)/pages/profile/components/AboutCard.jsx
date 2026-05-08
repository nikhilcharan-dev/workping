import IconifyIcon from '@/components/wrappers/IconifyIcon'
import small6 from '@/assets/images/small/img-6.jpg'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
import { Button, Card, CardBody, CardFooter, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
const AboutCard = () => {
  return (
    <Card>
      <div className="position-relative">
        <img src={small6} alt="avatar" className="card-img rounded-bottom-0" height={200} />
        <img
          src={avatar1}
          alt="avatar"
          className="avatar-lg rounded-circle position-absolute top-100 start-0 translate-middle-y ms-3 border border-light border-3"
        />
      </div>
      <CardBody className="mt-4">
        <div>
          <div className="d-flex align-items-center">
            <div className="d-block">
              <h4 className="mb-1">Jeannette C. Mullin</h4>
              <p className="fs-14 mb-0">Front End Developer</p>
            </div>
            <div className="ms-auto">
              <Dropdown>
                <DropdownToggle as={'a'} role="button" className="arrow-none">
                  <IconifyIcon icon="bx:dots-vertical-rounded" className="fs-18 text-dark" />
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                  <DropdownItem>
                    <IconifyIcon icon="bx:edit-alt" className="me-2" />
                    Edit Profile
                  </DropdownItem>
                  <DropdownItem>
                    <IconifyIcon icon="bx:export" className="me-2" />
                    Export Profile
                  </DropdownItem>
                  <DropdownItem>
                    <IconifyIcon icon="bxs:hand-up" className="me-2" />
                    Action
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
          <Row className="mt-3">
            <Col xs={12}>
              <CardTitle as="h5" className="badge bg-light text-secondary py-1 px-2 fs-13 mb-3 border-start border-secondary border-2 rounded-1">
                About Me
              </CardTitle>
              <p className="fs-15 mb-0 text-muted">
                Hi I&apos;m Jeannette Mullin. I am user experience and user interface designer. I have been working on Full Stack Developer since last
                10 years.
              </p>
              <div className="mt-3">
                <div className="d-flex gap-2 flex-wrap">
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">Code</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">UX Researcher</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">Python</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">HTML</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">JavaScript</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">WordPress</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">App Development</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">SQL</span>
                  <span className="badge text-secondary py-1 px-2 fs-12 border rounded-1">MongoDB</span>
                </div>
              </div>
              <div className="mt-4">
                <h5 className="text-dark fw-medium">Links :</h5>
                <a href="#!" className="text-primary text-decoration-underline">
                  https://myworkbench-portfolio.com
                </a>
                <p className="mb-0 mt-1">
                  <a href="#!" className="text-primary text-decoration-underline">
                    https://scaly-paddock.biz//a.portfolio
                  </a>
                </p>
              </div>
            </Col>
          </Row>
        </div>
      </CardBody>
      <CardFooter className="bg-light-subtle">
        <Row className="g-2 mb-1">
          <Col lg={4}>
            <Button variant="primary" type="button" className="d-flex align-items-center justify-content-center gap-1 w-100">
              <IconifyIcon icon="iconamoon:profile-duotone" />
              Follow
            </Button>
          </Col>
          <Col lg={4}>
            <Button variant="success" type="button" className="d-flex align-items-center justify-content-center gap-1 w-100">
              <IconifyIcon icon="iconamoon:comment-dots-duotone" />
              Message
            </Button>
          </Col>
          <Col lg={4}>
            <Button variant="danger" type="button" className="d-flex align-items-center justify-content-center gap-1 w-100">
              <IconifyIcon icon="iconamoon:share-1-duotone" />
              Share
            </Button>
          </Col>
        </Row>
      </CardFooter>
    </Card>
  )
}
export default AboutCard
