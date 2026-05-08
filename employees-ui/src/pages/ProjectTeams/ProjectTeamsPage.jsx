import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const STATUS_BADGE = { active: 'success', completed: 'primary', onHold: 'warning' }
const STATUS_LABEL = { active: 'Active', completed: 'Completed', onHold: 'On Hold' }

const ProjectTeamsPage = () => {
  const { user } = useAuthContext()

  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([]) // flat: { project, member, membershipId }
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('')
  const [memberFilter, setMemberFilter] = useState('')

  // Assign modal
  const [showAssign, setShowAssign] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState('')
  const [eligible, setEligible] = useState([])
  const [eligLoading, setEligLoading] = useState(false)
  const [eligSearch, setEligSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  // Remove
  const [removing, setRemoving] = useState(null)

  const organizationId = user?.organizationId

  // ── load all projects, then members for each ─────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const endpoint = user?.role === 'manager' ? '/admin/project/manager/all' : '/admin/project/get-projects'
      const projRes = await httpClient.get(endpoint, {
        params: { organizationId: user?.role === 'admin' ? organizationId : undefined, limit: 100 },
        silent: true,
      })
      const projectList = projRes.data?.data?.projects ?? []
      setProjects(projectList)

      if (projectList.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const memberResults = await Promise.all(
        projectList.map((p) =>
          httpClient
            .get('/admin/project/get-members', { params: { projectId: p._id, limit: 200 }, silent: true })
            .then((r) => ({ projectId: p._id, members: r.data?.data?.members ?? [] }))
            .catch(() => ({ projectId: p._id, members: [] })),
        ),
      )

      const flat = []
      memberResults.forEach(({ projectId, members }) => {
        const project = projectList.find((p) => p._id === projectId)
        members.forEach((m) => flat.push({ project, member: m, membershipId: m._id }))
      })
      setRows(flat)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── unique members list for filter dropdown ───────────────────────────────
  const uniqueMembers = useMemo(() => {
    const seen = new Set()
    return rows
      .filter((r) => {
        const id = r.member?.userId
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map((r) => ({ userId: r.member?.userId, name: r.member?.userName }))
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchProject = !projectFilter || r.project?._id === projectFilter
      const matchMember = !memberFilter || r.member?.userId === memberFilter
      return matchProject && matchMember
    })
  }, [rows, projectFilter, memberFilter])

  const summary = useMemo(
    () => ({
      total: rows.length,
      projects: new Set(rows.map((r) => r.project?._id)).size,
      members: new Set(rows.map((r) => r.member?.userId)).size,
    }),
    [rows],
  )

  // ── eligible employees for assign modal ──────────────────────────────────
  const fetchEligible = useCallback(
    async (projectId, q = '') => {
      if (!projectId || !organizationId) return
      setEligLoading(true)
      try {
        const res = await httpClient.get('/admin/project/eligible-members', {
          params: { projectId, organizationId, search: q, limit: 50 },
          silent: true,
        })
        setEligible(res.data?.data?.users ?? [])
      } catch {
        setEligible([])
      } finally {
        setEligLoading(false)
      }
    },
    [organizationId],
  )

  const openAssign = () => {
    setAssignProjectId('')
    setEligible([])
    setEligSearch('')
    setSelectedIds([])
    setFormErrors({})
    setShowAssign(true)
  }

  // refetch eligible when project or search changes
  useEffect(() => {
    if (!showAssign || !assignProjectId) return
    const t = setTimeout(() => fetchEligible(assignProjectId, eligSearch), 300)
    return () => clearTimeout(t)
  }, [assignProjectId, eligSearch, showAssign, fetchEligible])

  const handleProjectSelect = (pid) => {
    setAssignProjectId(pid)
    setSelectedIds([])
    setEligible([])
    if (pid) fetchEligible(pid, '')
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const validateAssign = () => {
    const errs = {}
    if (!assignProjectId) errs.project = 'Select a project.'
    if (selectedIds.length === 0) errs.members = 'Select at least one member.'
    return errs
  }

  const handleAssign = async () => {
    const errs = validateAssign()
    if (Object.keys(errs).length) {
      setFormErrors(errs)
      return
    }
    setAssigning(true)
    try {
      await httpClient.post('/admin/project/add-member', {
        projectId: assignProjectId,
        employeeIds: selectedIds,
        organizationId,
      })
      setShowAssign(false)
      fetchAll()
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async (membershipId) => {
    setRemoving(membershipId)
    try {
      await httpClient.post('/admin/project/remove-members', { data: [membershipId] })
      fetchAll()
    } finally {
      setRemoving(null)
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span> },
      {
        header: 'Project',
        id: 'project',
        cell: ({ row }) => {
          const p = row.original.project
          return (
            <div>
              <div className="fw-semibold">{p?.name ?? '—'}</div>
              {p?.contractedBy && <div className="text-muted fs-12">Client: {p.contractedBy}</div>}
            </div>
          )
        },
      },
      {
        header: 'Status',
        id: 'pstatus',
        cell: ({ row }) => {
          const s = row.original.project?.status
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
        header: 'Member',
        id: 'member',
        cell: ({ row }) => {
          const m = row.original.member
          return (
            <div className="d-flex align-items-center gap-2">
              <span className="avatar-sm rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-16 flex-shrink-0">
                {(m?.userName ?? '?').charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="fw-semibold">{m?.userName ?? '—'}</div>
                <div className="text-muted fs-12">{m?.userEmail ?? '—'}</div>
              </div>
            </div>
          )
        },
      },
      { header: 'Employee ID', id: 'empId', cell: ({ row }) => row.original.member?.employeeId ?? '—' },
      {
        header: 'Work Type',
        id: 'workType',
        cell: ({ row }) => {
          const w = row.original.member?.workType
          const bg = w === 'remote' ? 'info' : w === 'onsite' ? 'success' : 'warning'
          return w ? (
            <Badge bg={bg} className="px-2 py-1 text-capitalize">
              {w}
            </Badge>
          ) : (
            '—'
          )
        },
      },
      { header: 'Assigned', id: 'assigned', cell: ({ row }) => <span className="text-nowrap">{fmtDate(row.original.member?.assignedDate)}</span> },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => {
          const mid = row.original.membershipId
          return (
            <Button variant="outline-danger" size="sm" className="py-0" disabled={removing === mid} onClick={() => handleRemove(mid)}>
              {removing === mid ? <Spinner size="sm" animation="border" /> : <IconifyIcon icon="bx:user-minus" height={16} width={16} />}
            </Button>
          )
        },
      },
    ],
    [removing],
  )

  return (
    <>
      <PageMetaData title="Project Teams" />

      {/* Summary */}
      <Row className="g-3 mb-3">
        {[
          { label: 'Total Assignments', value: summary.total, color: 'primary', icon: 'bx:network-chart' },
          { label: 'Projects', value: summary.projects, color: 'warning', icon: 'bx:briefcase-alt-2' },
          { label: 'Members Assigned', value: summary.members, color: 'success', icon: 'bxs:group' },
        ].map(({ label, value, color, icon }) => (
          <Col key={label} xs={6} md={4}>
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

      {/* Filters + Table */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <Row className="g-2 align-items-end">
                <Col md={4}>
                  <Form.Label className="fw-semibold">Filter by Project</Form.Label>
                  <Form.Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                    <option value="">All Projects</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label className="fw-semibold">Filter by Member</Form.Label>
                  <Form.Select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                    <option value="">All Members</option>
                    {uniqueMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button variant="primary" className="w-100" onClick={openAssign}>
                    <IconifyIcon icon="bx:user-plus" className="me-1" />
                    Assign Member
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  Loading assignments...
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
        </Col>
      </Row>

      {/* Assign Modal */}
      <Modal show={showAssign} onHide={() => setShowAssign(false)} centered size="lg">
        <ModalHeader closeButton>
          <h5 className="mb-0">Assign Members to Project</h5>
        </ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Project <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select value={assignProjectId} onChange={(e) => handleProjectSelect(e.target.value)} isInvalid={!!formErrors.project}>
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} {p.contractedBy ? `(${p.contractedBy})` : ''}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{formErrors.project}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {assignProjectId && (
              <>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Search Employees</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search by name or email..."
                      value={eligSearch}
                      onChange={(e) => setEligSearch(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Label className="fw-semibold d-flex align-items-center gap-2">
                    Eligible Employees
                    {selectedIds.length > 0 && (
                      <Badge bg="primary" className="fs-12">
                        {selectedIds.length} selected
                      </Badge>
                    )}
                  </Form.Label>
                  {eligLoading ? (
                    <div className="text-center py-3">
                      <Spinner size="sm" animation="border" />
                    </div>
                  ) : eligible.length === 0 ? (
                    <p className="text-muted fs-13 mb-0">No eligible employees found for this project.</p>
                  ) : (
                    <div className="border rounded" style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {eligible.map((e) => {
                        const checked = selectedIds.includes(e._id)
                        return (
                          <div
                            key={e._id}
                            className={`d-flex align-items-center gap-3 px-3 py-2 border-bottom cursor-pointer ${checked ? 'bg-primary-subtle' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleSelect(e._id)}>
                            <Form.Check
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(e._id)}
                              onClick={(ev) => ev.stopPropagation()}
                            />
                            <span
                              className="avatar-xs rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                              style={{ width: 28, height: 28 }}>
                              {e.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="fw-semibold fs-13">{e.name}</div>
                              <div className="text-muted fs-12">
                                {e.email} · {e.employeeId}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {formErrors.members && <div className="text-danger fs-12 mt-1">{formErrors.members}</div>}
                </Col>
              </>
            )}
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAssign(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={assigning || selectedIds.length === 0} onClick={handleAssign}>
            {assigning ? <Spinner size="sm" animation="border" className="me-1" /> : <IconifyIcon icon="bx:check" className="me-1" />}
            Assign {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default ProjectTeamsPage
