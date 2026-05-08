import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, CardBody, CardHeader, Col, Form, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'

const STATUS_BADGE = { active: 'success', completed: 'primary', onHold: 'warning' }
const STATUS_LABEL = { active: 'Active', completed: 'Completed', onHold: 'On Hold' }
const STATUS_OPTIONS = ['active', 'completed', 'onHold']

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const MyProjectsPage = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await httpClient.get('/user/projects/my-projects', {
        params: { limit: 100 },
        silent: true,
      })
      setProjects(res.data?.data?.projects ?? [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const proj = p.project ?? p
      const q = search.trim().toLowerCase()
      const matchSearch = !q || (proj.name ?? '').toLowerCase().includes(q) || (proj.contractedBy ?? '').toLowerCase().includes(q)
      const matchStatus = !statusFilter || proj.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [projects, search, statusFilter])

  const stats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((p) => (p.project ?? p).status === 'active').length,
      completed: projects.filter((p) => (p.project ?? p).status === 'completed').length,
    }),
    [projects],
  )

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span> },
      {
        header: 'Project',
        id: 'project',
        cell: ({ row }) => {
          const p = row.original.project ?? row.original
          return (
            <div>
              <Link to={`/my-projects/${p._id}`} state={{ project: p }} className="fw-semibold text-decoration-none">
                {p.name ?? '—'}
              </Link>
              {p.contractedBy && <div className="text-muted fs-12">Client: {p.contractedBy}</div>}
              {p.description && (
                <div className="text-muted fs-12 mt-1" style={{ maxWidth: 260 }}>
                  {p.description}
                </div>
              )}
            </div>
          )
        },
      },
      {
        header: 'Status',
        id: 'status',
        cell: ({ row }) => {
          const s = (row.original.project ?? row.original).status
          return s ? (
            <Badge bg={STATUS_BADGE[s] ?? 'secondary'} className="px-2 py-1">
              {STATUS_LABEL[s] ?? s}
            </Badge>
          ) : (
            '—'
          )
        },
      },
      {
        header: 'Assigned Date',
        id: 'assigned',
        cell: ({ row }) => <span className="text-nowrap">{fmtDate((row.original.project ?? row.original).assignedDate)}</span>,
      },
      {
        header: 'Due Date',
        id: 'due',
        cell: ({ row }) => <span className="text-nowrap">{fmtDate((row.original.project ?? row.original).dueDate)}</span>,
      },
      {
        header: 'Manager',
        id: 'manager',
        cell: ({ row }) => {
          const p = row.original.project ?? row.original
          const name = p.projectManagerName ?? p.projectManager?.name
          return name ?? '—'
        },
      },
    ],
    [],
  )

  return (
    <>
      <PageMetaData title="My Projects" />

      {/* Stats */}
      <Row className="g-3 mb-3">
        {[
          { label: 'Total Projects', value: stats.total, color: 'primary', icon: 'bx:briefcase-alt-2' },
          { label: 'Active', value: stats.active, color: 'success', icon: 'bx:check-circle' },
          { label: 'Completed', value: stats.completed, color: 'info', icon: 'bx:trophy' },
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
                  <div className="fw-bold fs-4">{loading ? <Spinner size="sm" animation="border" /> : value}</div>
                  <div className="text-muted small">{label}</div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <CardHeader className="border-bottom">
          <Row className="g-2 align-items-end">
            <Col md={6}>
              <Form.Label className="fw-semibold">Search</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search by project name or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5 text-muted">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              Loading your projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <IconifyIcon icon="bx:briefcase-alt-2" className="fs-1 mb-2" />
              <p>You are not assigned to any projects yet.</p>
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

export default MyProjectsPage
