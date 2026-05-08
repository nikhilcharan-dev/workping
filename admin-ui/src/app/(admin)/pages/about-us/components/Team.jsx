import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllTeamMembers } from '@/helpers/data'
import { Link } from 'react-router-dom'
import { Button, Card, CardBody, CardTitle, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { useEffect, useState } from 'react'
const TeamMemberCard = ({ teamMember }) => {
  const { member } = teamMember
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center gap-2">
          <div className="avatar-md">
            {member?.avatar && <img src={member.avatar} alt="avatar" className="img-fluid rounded-circle border border-light border-3" />}
          </div>
          <div>
            <Link to="" className="text-reset fw-semibold fs-16">
              {member?.name}
            </Link>
            <p className="fs-13 mb-0">{member?.email}</p>
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
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
    </Card>
  )
}
const Team = () => {
  const [allTeamMembers, setAllTeamMembers] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getAllTeamMembers()
      setAllTeamMembers(data)
    })()
  }, [])
  return (
    <Card>
      <CardBody>
        <CardTitle className="fw-bold text-uppercase mb-2">Our Creative Team</CardTitle>
        <p className="mb-4">
          A dedicated group of experts committed to crafting visually stunning and highly functional user interfaces. With a keen eye for design and a
          passion for innovation, our team transforms concepts into captivating HTML-based interfaces. From sleek layouts to seamless interactions, we
          deliver UI solutions that elevate user experiences and exceed expectations.
        </p>
        <Row>
          {allTeamMembers &&
            allTeamMembers.slice(0, 4).map((member) => (
              <Col xxl={3} md={6} key={member.id}>
                <TeamMemberCard teamMember={member} />
              </Col>
            ))}
        </Row>
        <div className="mt-3 text-center">
          <Link to="/pages/our-team" className="btn btn-link link-primary text-decoration-underline">
            View All
            <IconifyIcon icon="bx:right-arrow-alt" className="fs-16 align-middle ms-1" />
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
export default Team
