import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'

const STATUS_BADGE = { active: 'success', completed: 'primary', onHold: 'warning' }
const STATUS_LABEL = { active: 'Active', completed: 'Completed', onHold: 'On Hold' }
const ROLE_BADGE = { employee: 'secondary', manager: 'primary', teamLead: 'warning' }
const WORK_BADGE = (w) => (w === 'remote' ? 'info' : w === 'onsite' ? 'success' : 'warning')

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const Avatar = ({ name, size = 36 }) => (
  <span
    className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.38 }}>
    {(name ?? '?').charAt(0).toUpperCase()}
  </span>
)

const InfoBox = ({ label, children }) => (
  <div className="border rounded-3 p-3 h-100">
    <div className="text-muted fs-12 text-uppercase fw-semibold mb-1">{label}</div>
    <div className="fw-semibold">{children}</div>
  </div>
)

const MyProjectDetailPage = () => {
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // project passed via Link state as a fast preview; we'll replace with full data
  const [project, setProject] = useState(location.state?.project ?? null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      // Single call: returns { project, members } with shift populated and projectRole per member
      const res = await httpClient.get(`/user/projects/${projectId}`, { silent: true })
      const { project: proj, members: mems } = res.data?.data ?? {}
      if (proj) setProject(proj)
      setMembers(mems ?? [])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        (m.user?.name ?? '').toLowerCase().includes(q) ||
        (m.user?.email ?? '').toLowerCase().includes(q) ||
        (m.user?.employeeId ?? '').toLowerCase().includes(q),
    )
  }, [members, search])

  const stats = useMemo(
    () => ({
      total: members.length,
      remote: members.filter((m) => m.user?.workType === 'remote').length,
      onsite: members.filter((m) => m.user?.workType === 'onsite').length,
      managers: members.filter((m) => m.projectRole === 'manager').length,
    }),
    [members],
  )

  const columns = useMemo(
    () => [
      {
        header: 'S.No',
        id: 'sno',
        cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span>,
      },
      {
        header: 'Member',
        id: 'member',
        cell: ({ row }) => {
          const u = row.original.user
          return (
            <div className="d-flex align-items-center gap-2">
              <Avatar name={u?.name} size={36} />
              <div>
                <div className="fw-semibold">{u?.name ?? '—'}</div>
                <div className="text-muted fs-12">{u?.email ?? '—'}</div>
              </div>
            </div>
          )
        },
      },
      {
        header: 'Employee ID',
        id: 'empId',
        cell: ({ row }) => row.original.user?.employeeId ?? '—',
      },
      {
        header: 'Project Role',
        id: 'role',
        cell: ({ row }) => {
          const r = row.original.projectRole
          return r ? (
            <Badge bg={ROLE_BADGE[r] ?? 'secondary'} className="px-2 py-1 text-capitalize">
              {r === 'teamLead' ? 'Team Lead' : r}
            </Badge>
          ) : (
            '—'
          )
        },
      },
      {
        header: 'Shift / Work Type',
        id: 'workType',
        cell: ({ row }) => {
          const w = row.original.user?.workType
          return w ? (
            <Badge bg={WORK_BADGE(w)} className="px-2 py-1 text-capitalize">
              {w}
            </Badge>
          ) : (
            '—'
          )
        },
      },
      {
        header: 'Assigned',
        id: 'assigned',
        cell: ({ row }) => <span className="text-nowrap">{fmtDate(row.original.assignedDate)}</span>,
      },
    ],
    [],
  )

  if (loading && !project) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (!loading && !project) {
    return (
      <>
        <PageMetaData title="Project Detail" />
        <Card className="mt-4">
          <CardBody className="text-center py-5 text-muted">
            <IconifyIcon icon="bx:error" className="fs-1 mb-2" />
            <p>Project not found or you do not have access.</p>
            <button className="btn btn-primary mt-2" onClick={() => navigate('/my-projects')}>
              Back to My Projects
            </button>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageMetaData title={project?.name ?? 'Project Detail'} />

      <div className="mb-3">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/my-projects')}>
          <IconifyIcon icon="bx:arrow-back" className="me-1" />
          Back to My Projects
        </button>
      </div>

      {/* Project hero card */}
      <Card className="border-0 shadow-sm mb-4">
        <CardBody>
          <div className="d-flex align-items-start gap-3 mb-3">
            <div
              className="bg-primary-subtle rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 56, height: 56 }}>
              <IconifyIcon icon="bx:briefcase-alt-2" className="text-primary" style={{ fontSize: 28 }} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h4 className="mb-0 fw-bold">{project?.name}</h4>
                {project?.status && (
                  <Badge bg={STATUS_BADGE[project.status] ?? 'secondary'} className="px-2 py-1">
                    {STATUS_LABEL[project.status] ?? project.status}
                  </Badge>
                )}
              </div>
              {project?.contractedBy && (
                <span className="text-muted fs-13">
                  <IconifyIcon icon="bx:buildings" className="me-1" />
                  Client: {project.contractedBy}
                </span>
              )}
              {project?.organization?.name && (
                <span className="text-muted fs-13 ms-3">
                  <IconifyIcon icon="bx:sitemap" className="me-1" />
                  {project.organization.name}
                </span>
              )}
            </div>
          </div>

          {project?.description && <p className="text-muted fs-14 mb-3">{project.description}</p>}

          <Row className="g-3">
            <Col xs={6} md={3}>
              <InfoBox label="Assigned Date">{fmtDate(project?.assignedDate)}</InfoBox>
            </Col>
            <Col xs={6} md={3}>
              <InfoBox label="Due Date">{fmtDate(project?.dueDate)}</InfoBox>
            </Col>
            {project?.shift && (
              <Col xs={6} md={3}>
                <InfoBox label="Shift">
                  <div>{project.shift.name}</div>
                  <div className="text-muted fs-12 fw-normal">
                    {project.shift.startTime} – {project.shift.endTime}
                    {project.shift.breakMinutes ? ` · ${project.shift.breakMinutes}m break` : ''}
                  </div>
                </InfoBox>
              </Col>
            )}
            {project?.projectManager?.name && (
              <Col xs={6} md={3}>
                <InfoBox label="Project Manager">
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={project.projectManager.name} size={28} />
                    <div>
                      <div>{project.projectManager.name}</div>
                      {project.projectManager.email && <div className="text-muted fs-12 fw-normal">{project.projectManager.email}</div>}
                    </div>
                  </div>
                </InfoBox>
              </Col>
            )}
          </Row>
        </CardBody>
      </Card>

      {/* Member stats */}
      <Row className="g-3 mb-3">
        {[
          { label: 'Total Members', value: stats.total, color: 'primary', icon: 'bxs:group' },
          { label: 'Remote', value: stats.remote, color: 'info', icon: 'bx:wifi' },
          { label: 'Onsite', value: stats.onsite, color: 'success', icon: 'bx:buildings' },
          { label: 'Managers', value: stats.managers, color: 'warning', icon: 'bx:crown' },
        ].map(({ label, value, color, icon }) => (
          <Col key={label} xs={6} md={3}>
            <Card className="border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3 py-3">
                <div
                  className={`bg-${color}-subtle rounded-circle d-flex align-items-center justify-content-center`}
                  style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <IconifyIcon icon={icon} className={`text-${color} fs-4`} />
                </div>
                <div>
                  <div className="fw-bold fs-4">{loading ? <Spinner size="sm" animation="border" /> : value}</div>
                  <div className="text-muted small">{label}</div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Members table */}
      <Card>
        <CardHeader className="border-bottom">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0 fw-semibold">Project Members</h5>
            {!loading && (
              <Badge bg="primary-subtle" text="primary">
                {members.length}
              </Badge>
            )}
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <IconifyIcon icon="bxs:group" className="fs-1 mb-2" />
              <p>No members assigned to this project yet.</p>
            </div>
          ) : (
            <ReactTable
              columns={columns}
              data={filtered}
              pageSize={10}
              showPagination
              rowsPerPageList={[5, 10, 25]}
              tableClass="table-centered mb-0"
              theadClass="table-light"
            />
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default MyProjectDetailPage
