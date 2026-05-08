import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const STATUS_OPTIONS = ['active', 'completed', 'onHold']
const STATUS_BADGE = { active: 'success', completed: 'primary', onHold: 'warning' }
const STATUS_LABEL = { active: 'Active', completed: 'Completed', onHold: 'On Hold' }

const today = new Date().toISOString().split('T')[0]

const emptyForm = { name: '', contractedBy: '', dueDate: '', status: 'active', description: '' }

const ProjectsPage = () => {
  const { user } = useAuthContext()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const organizationId = user?.organizationId

  const fetchProjects = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const endpoint = user?.role === 'manager' ? '/admin/project/manager/all' : '/admin/project/get-projects'
      const res = await httpClient.get(endpoint, {
        params: { organizationId: user?.role === 'admin' ? organizationId : undefined, limit: 100 },
        silent: true,
      })
      const d = res.data?.data ?? {}
      setProjects(d.projects ?? [])
      setTotalRecords(d.totalRecords ?? 0)
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.trim().toLowerCase()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.contractedBy ?? '').toLowerCase().includes(q)
      const matchStatus = !statusFilter || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [projects, search, statusFilter])

  const summary = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    }),
    [projects],
  )

  const openAdd = () => {
    setEditId(null)
    setForm(emptyForm)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditId(p._id)
    setForm({
      name: p.name,
      contractedBy: p.contractedBy ?? '',
      dueDate: p.dueDate ?? '',
      status: p.status,
      description: p.description ?? '',
    })
    setErrors({})
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Project name is required.'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await httpClient.post('/admin/project/update-project', {
          id: editId,
          name: form.name,
          contractedBy: form.contractedBy || undefined,
          dueDate: form.dueDate || undefined,
          status: form.status,
          description: form.description || undefined,
        })
      } else {
        await httpClient.post('/admin/project/create-project', {
          name: form.name,
          organizationId,
          projectManager: user?._id,
          contractedBy: form.contractedBy || undefined,
          dueDate: form.dueDate || undefined,
          status: form.status,
          description: form.description || undefined,
          assignedDate: today,
        })
      }
      setShowModal(false)
      fetchProjects()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await httpClient.post('/admin/project/delete-projects', { data: [id] })
      fetchProjects()
    } finally {
      setDeleting(null)
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span> },
      {
        header: 'Project',
        id: 'project',
        cell: ({ row }) => (
          <div>
            <div className="fw-semibold">{row.original.name}</div>
            {row.original.contractedBy && <div className="text-muted fs-12">Client: {row.original.contractedBy}</div>}
          </div>
        ),
      },
      { header: 'Manager', id: 'mgr', cell: ({ row }) => row.original.projectManagerName ?? '—' },
      { header: 'Assigned', id: 'assigned', cell: ({ row }) => <span className="text-nowrap">{fmtDate(row.original.assignedDate)}</span> },
      { header: 'Due Date', id: 'due', cell: ({ row }) => <span className="text-nowrap">{fmtDate(row.original.dueDate)}</span> },
      { header: 'Members', id: 'members', cell: ({ row }) => <span className="fw-medium">{row.original.memberCount ?? 0}</span> },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const s = getValue()
          return (
            <Badge bg={STATUS_BADGE[s] ?? 'secondary'} className="px-2 py-1">
              {STATUS_LABEL[s] ?? s}
            </Badge>
          )
        },
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => {
          const id = row.original._id
          return (
            <div className="d-flex gap-1">
              <Button variant="outline-primary" size="sm" className="py-0" onClick={() => openEdit(row.original)}>
                <IconifyIcon icon="bx:edit" height={16} width={16} />
              </Button>
              <Button variant="outline-danger" size="sm" className="py-0" disabled={deleting === id} onClick={() => handleDelete(id)}>
                {deleting === id ? <Spinner size="sm" animation="border" /> : <IconifyIcon icon="bx:trash" height={16} width={16} />}
              </Button>
            </div>
          )
        },
      },
    ],
    [deleting],
  )

  return (
    <>
      <PageMetaData title="Projects" />

      <Row className="g-3 mb-3">
        {[
          { label: 'Total Projects', value: summary.total, color: 'primary', icon: 'bx:briefcase-alt-2' },
          { label: 'Active', value: summary.active, color: 'success', icon: 'bx:check-circle' },
          { label: 'Completed', value: summary.completed, color: 'info', icon: 'bx:trophy' },
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

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <Row className="g-2 align-items-end">
                <Col md={5}>
                  <Form.Label className="fw-semibold">Search</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by project name or client..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Col>
                <Col md={3}>
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
                <Col md={4} className="d-flex align-items-end">
                  <Button variant="primary" className="w-100" onClick={openAdd}>
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Add Project
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  Loading projects...
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

      {/* Add / Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <ModalHeader closeButton>
          <h5 className="mb-0">{editId ? 'Edit Project' : 'Add Project'}</h5>
        </ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Project Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control name="name" placeholder="e.g. Portal Redesign" value={form.name} onChange={handleChange} isInvalid={!!errors.name} />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Client / Contracted By</Form.Label>
                <Form.Control name="contractedBy" placeholder="e.g. Acme Corp" value={form.contractedBy} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Status</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Due Date</Form.Label>
                <Form.Control name="dueDate" type="date" min={today} value={form.dueDate} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  placeholder="Brief project description..."
                  value={form.description}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
            {saving ? <Spinner size="sm" animation="border" className="me-1" /> : <IconifyIcon icon="bx:check" className="me-1" />}
            {editId ? 'Save Changes' : 'Create Project'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default ProjectsPage
