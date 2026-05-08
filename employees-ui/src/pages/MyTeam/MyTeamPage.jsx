import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const Avatar = ({ name, size = 36, className = '' }) => (
  <span
    className={`rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0 ${className}`}
    style={{ width: size, height: size, fontSize: size * 0.38 }}>
    {(name ?? '?').charAt(0).toUpperCase()}
  </span>
)

const workTypeBg = (w) => (w === 'remote' ? 'info' : w === 'onsite' ? 'success' : 'warning')

const MyTeamPage = () => {
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [teamRes, membersRes] = await Promise.all([
        httpClient.get('/user/organisation/my-team', { silent: true }),
        httpClient.get('/user/organisation/my-team-members', { silent: true }),
      ])
      setTeam(teamRes.data?.data ?? null)
      setMembers(membersRes.data?.data ?? [])
    } catch {
      setTeam(null)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

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
      active: members.filter((m) => m.user?.isActive).length,
      remote: members.filter((m) => m.user?.workType === 'remote').length,
    }),
    [members],
  )

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span> },
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
      { header: 'Employee ID', id: 'empId', cell: ({ row }) => row.original.user?.employeeId ?? '—' },
      {
        header: 'Role',
        id: 'role',
        cell: ({ row }) => {
          const r = row.original.user?.role
          const map = { employee: 'secondary', manager: 'primary', teamLead: 'warning' }
          return r ? (
            <Badge bg={map[r] ?? 'secondary'} className="px-2 py-1 text-capitalize">
              {r}
            </Badge>
          ) : (
            '—'
          )
        },
      },
      {
        header: 'Work Type',
        id: 'workType',
        cell: ({ row }) => {
          const w = row.original.user?.workType
          return w ? (
            <Badge bg={workTypeBg(w)} className="px-2 py-1 text-capitalize">
              {w}
            </Badge>
          ) : (
            '—'
          )
        },
      },
      {
        header: 'Status',
        id: 'status',
        cell: ({ row }) => {
          const active = row.original.user?.isActive
          return (
            <Badge bg={active ? 'success' : 'danger'} className="px-2 py-1">
              {active ? 'Active' : 'Inactive'}
            </Badge>
          )
        },
      },
      { header: 'Joined', id: 'joined', cell: ({ row }) => <span className="text-nowrap">{fmtDate(row.original.joinedAt)}</span> },
    ],
    [],
  )

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (!team) {
    return (
      <>
        <PageMetaData title="My Team" />
        <Card className="mt-4">
          <CardBody className="text-center py-5 text-muted">
            <IconifyIcon icon="bxs:group" className="fs-1 mb-2" />
            <p>You have not been assigned to any team yet.</p>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageMetaData title="My Team" />

      {/* Team overview */}
      <Card className="border-0 shadow-sm mb-4">
        <CardBody>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="bg-primary-subtle rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 56, height: 56 }}>
              <IconifyIcon icon="bxs:group" className="text-primary" style={{ fontSize: 28 }} />
            </div>
            <div>
              <h4 className="mb-0 fw-bold">{team.teamName}</h4>
              {team.organizationName && (
                <span className="text-muted fs-13">
                  <IconifyIcon icon="bx:buildings" className="me-1" />
                  {team.organizationName}
                </span>
              )}
            </div>
          </div>

          {team.description && <p className="text-muted fs-14 mb-3">{team.description}</p>}

          <Row className="g-3">
            {team.manager && (
              <Col sm={6} md={4}>
                <div className="border rounded-3 p-3">
                  <div className="text-muted fs-12 text-uppercase fw-semibold mb-2">Manager</div>
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={team.manager.name} size={32} />
                    <div>
                      <div className="fw-semibold fs-13">{team.manager.name}</div>
                      <div className="text-muted fs-12">{team.manager.email}</div>
                    </div>
                  </div>
                </div>
              </Col>
            )}

            {team.leaders?.length > 0 && (
              <Col sm={6} md={8}>
                <div className="border rounded-3 p-3">
                  <div className="text-muted fs-12 text-uppercase fw-semibold mb-2">Team Leaders</div>
                  <div className="d-flex flex-wrap gap-2">
                    {team.leaders.map((l) => (
                      <div key={l._id} className="d-flex align-items-center gap-1 bg-light rounded-pill px-2 py-1">
                        <Avatar name={l.name} size={22} />
                        <span className="fs-12 fw-medium">{l.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </CardBody>
      </Card>

      {/* Stats */}
      <Row className="g-3 mb-3">
        {[
          { label: 'Total Members', value: stats.total, color: 'primary', icon: 'bxs:group' },
          { label: 'Active', value: stats.active, color: 'success', icon: 'bx:check-circle' },
          { label: 'Remote', value: stats.remote, color: 'info', icon: 'bx:wifi' },
        ].map(({ label, value, color, icon }) => (
          <Col key={label} xs={4}>
            <Card className="border-0 shadow-sm">
              <CardBody className="d-flex align-items-center gap-3 py-3">
                <div
                  className={`bg-${color}-subtle rounded-circle d-flex align-items-center justify-content-center`}
                  style={{ width: 44, height: 44, flexShrink: 0 }}>
                  <IconifyIcon icon={icon} className={`text-${color} fs-4`} />
                </div>
                <div>
                  <div className="fw-bold fs-4">{value}</div>
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
          <div className="d-flex align-items-center gap-3">
            <h5 className="mb-0 fw-semibold">Team Members</h5>
            <Badge bg="primary-subtle" className="text-primary">
              {stats.total}
            </Badge>
          </div>
          <div className="mt-2">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 340 }}
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {members.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <IconifyIcon icon="bxs:group" className="fs-1 mb-2" />
              <p>No members in this team yet.</p>
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

export default MyTeamPage
