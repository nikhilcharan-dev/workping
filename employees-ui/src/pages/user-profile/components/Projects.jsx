import IconifyIcon from '@/components/wrappers/IconifyIcon'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  OverlayTrigger,
  ProgressBar,
  Tooltip,
} from 'react-bootstrap'
import { projectData } from '../data'

const ProjectCard = ({ project }) => {
  const { days, file, icon, iconColor, progressVariant, progressValue, team, teamMembers, title, task } = project

  return (
    <Card className="shadow-none mb-0" style={{ minWidth: '420px' }}>
      <CardBody className="p-lg-3 p-2">
        <div className="d-flex align-items-center gap-3">
          <div className="avatar-md flex-shrink-0">
            <span className="avatar-title bg-light rounded-circle">
              <IconifyIcon icon={icon} className={`text-${iconColor} fs-28`} />
            </span>
          </div>

          <span role="button" className="fw-medium text-dark">
            {title}
          </span>

          <div className="ms-auto">
            <OverlayTrigger overlay={<Tooltip>Download</Tooltip>} placement="bottom">
              <span role="button" className="fw-medium text-muted fs-18">
                <IconifyIcon icon="iconamoon:cloud-download-duotone" />
              </span>
            </OverlayTrigger>
          </div>
        </div>

        <div className="d-flex gap-2 mt-2">
          <CardTitle as="h5" className="badge text-secondary d-flex gap-1 align-items-center py-1 px-2 fs-13 mb-3 border rounded-1">
            <IconifyIcon icon="iconamoon:clock-duotone" />
            {days} day left
          </CardTitle>

          <CardTitle as="h5" className="badge text-secondary d-flex gap-1 align-items-center py-1 px-2 fs-13 mb-3 border rounded-1">
            <IconifyIcon icon="iconamoon:file-duotone" />
            {file} Files
          </CardTitle>
        </div>

        <div>
          <p className="fs-15 mb-1 float-end">{task}</p>
          <p className="fs-15 mb-1">{progressValue}%</p>
          <ProgressBar variant={progressVariant} striped animated now={progressValue} className="progress-sm mb-3" />
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="avatar-group">
            {teamMembers.map((member, idx) => (
              <div className="avatar-group-item" key={idx}>
                <img src={member} alt="avatar" className="rounded-circle avatar-sm" />
              </div>
            ))}
          </div>

          <h5 className="mb-0">{team}+ Team Work</h5>
        </div>
      </CardBody>
    </Card>
  )
}

const Projects = () => {
  return (
    <Card className="h-80">
      <CardHeader className="d-flex align-items-center">
        <CardTitle as="h5">Projects</CardTitle>

        <div className="ms-auto">
          <Dropdown>
            <DropdownToggle as="a" role="button" className="arrow-none">
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
      </CardHeader>

      {/* ✅ FLEX COLUMN so scroll stretches */}
      <CardBody className="d-flex flex-column">
        <div
          className="d-flex gap-3 flex-grow-1"
          style={{
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollBehavior: 'smooth',
          }}>
          {projectData.map((project, idx) => (
            <div key={idx} style={{ flexShrink: 0 }}>
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

export default Projects
