import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Col,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  OverlayTrigger,
  Row,
  Tooltip,
} from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllTeamMembers } from '@/helpers/data'
import PageMetaData from '@/components/PageTitle'
import profileBg from '@/assets/images/profile-bg.jpg'
import { useEffect, useState } from 'react'
const TeamMemberCard = ({ teamMember }) => {
  const { duration, projects, role, tasks, member } = teamMember
  return (
    <Card>
      <div className="position-relative">
        <img src={profileBg} height={104} alt="avatar-bg" className="card-img rounded-bottom-0" />
        {member?.avatar && (
          <img
            src={member?.avatar}
            alt="user-avatar"
            className="avatar-lg rounded-circle position-absolute top-100 start-50 translate-middle border border-light border-3"
          />
        )}
      </div>
      <CardBody className="text-center mt-4 mb-3 pt-3">
        <Link to="" className="text-dark fw-medium fs-18">
          {member?.name}
        </Link>
        <br />
        <p className="mb-2 mt-1 icons-center gap-1">
          <IconifyIcon icon="bxs:envelope" className="text-warning align-middle" />
          {member?.email}
        </p>
        <div className="mb-2">
          <p className="badge bg-light text-dark px-2 py-1 mb-2 fs-14">{role}</p>
        </div>
        <div className="d-flex justify-content-center gap-2">
          <OverlayTrigger placement="bottom" overlay={<Tooltip className="primary-tooltip">Facebook</Tooltip>}>
            <Button variant="soft-primary" className="avatar-sm fs-20 d-inline-flex align-items-center justify-content-center p-0">
              <IconifyIcon icon="bxl:facebook" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip className="danger-tooltip">Instagram</Tooltip>}>
            <Button variant="soft-danger" className="avatar-sm fs-20 d-inline-flex align-items-center justify-content-center p-0">
              <IconifyIcon icon="bxl:instagram-alt" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip className="info-tooltip">Twitter</Tooltip>}>
            <Button variant="soft-info" className="avatar-sm fs-20 d-inline-flex align-items-center justify-content-center p-0">
              <IconifyIcon icon="bxl:twitter" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip className="primary-tooltip">LinkedIn</Tooltip>}>
            <Button variant="soft-primary" className="avatar-sm fs-20 d-inline-flex align-items-center justify-content-center p-0">
              <IconifyIcon icon="bxl:linkedin" />
            </Button>
          </OverlayTrigger>
        </div>
      </CardBody>
      <CardFooter className="text-center border-top">
        <Row>
          <Col lg={4} xs={4} className="border-end">
            <h4 className="text-dark fw-medium">{projects}</h4>
            <h5 className="mb-0 d-flex align-items-center justify-content-center gap-1 text-muted fs-14">
              <IconifyIcon icon="bx:briefcase-alt-2" className="text-muted" />
              Projects
            </h5>
          </Col>
          <Col lg={4} xs={4} className="border-end">
            <h4 className="text-dark fw-medium">{duration}</h4>
            <h5 className="mb-0 d-flex align-items-center justify-content-center gap-1 text-muted fs-14">
              <IconifyIcon icon="bx:calendar-event" className="text-muted" />
              Duration
            </h5>
          </Col>
          <Col lg={4} xs={4}>
            <h4 className="text-dark fw-medium">{tasks}</h4>
            <h5 className="mb-0 d-flex align-items-center justify-content-center gap-1 text-muted fs-14">
              <IconifyIcon icon="bx:task" className="text-muted" />
              Tasks
            </h5>
          </Col>
        </Row>
      </CardFooter>
    </Card>
  )
}
const OurTeam = () => {
  const [allTeamMembers, setAllTeamMembers] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getAllTeamMembers()
      setAllTeamMembers(data)
    })()
  }, [])
  return (
    <>
      <PageBreadcrumb subName="Pages" title="Our Team" />
      <PageMetaData title="Our Team" />

      <Row>
        <Col lg={12}>
          <Card>
            <CardHeader>
              <Row className="g-2">
                <Col sm={4}>
                  <div className="search-bar">
                    <span>
                      <IconifyIcon icon="bx:search-alt" className="mb-1" />
                    </span>
                    <input type="search" className="form-control" id="search" placeholder="Search ..." />
                  </div>
                </Col>
                <Col sm="auto" className="ms-auto">
                  <div className="d-flex gap-1">
                    <Button variant="danger">
                      <IconifyIcon icon="bx:plus" className="me-1 align-middle" />
                      Add Members
                    </Button>
                    <Button variant="soft-primary" type="button" className="fs-14">
                      <IconifyIcon icon="bxs:grid" />
                    </Button>
                    <Button type="button" variant="soft-primary" className="fs-14">
                      <IconifyIcon icon="bx:list-ul" />
                    </Button>
                    <Dropdown>
                      <DropdownToggle variant="soft-secondary" type="button" className="fs-14 arrow-none">
                        <IconifyIcon icon="bx:dots-vertical-rounded" className="bx bx-dots-vertical-rounded" />
                      </DropdownToggle>
                      <DropdownMenu className="dropdown-menu-end" aria-labelledby="dropdownMenuLink1">
                        <li>
                          <DropdownItem href="#">All</DropdownItem>
                        </li>
                        <li>
                          <DropdownItem href="#">Last Week</DropdownItem>
                        </li>
                        <li>
                          <DropdownItem href="#">Last Month</DropdownItem>
                        </li>
                        <li>
                          <DropdownItem href="#">Last Year</DropdownItem>
                        </li>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </Col>
              </Row>
            </CardHeader>
          </Card>
          <Row>
            {allTeamMembers &&
              allTeamMembers.map((member) => (
                <Col xxl={4} md={6} key={member.id}>
                  <TeamMemberCard teamMember={member} />
                </Col>
              ))}
          </Row>
        </Col>
      </Row>
    </>
  )
}
export default OurTeam
