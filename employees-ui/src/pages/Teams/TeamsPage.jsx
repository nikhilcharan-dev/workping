import { useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const WORK_TYPES = ['remote', 'onsite', 'hybrid']

const TeamsPage = () => {
  const { user } = useAuthContext()
  const { teamId: urlTeamId } = useParams()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)

  // Add-member modal
  const [showAdd, setShowAdd] = useState(false)
  const [eligible, setEligible] = useState([])
  const [eligLoading, setEligLoading] = useState(false)
  const [eligSearch, setEligSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [adding, setAdding] = useState(false)

  // Remove
  const [removing, setRemoving] = useState(null)

  const teamId = urlTeamId || user?.teamId
  const organizationId = user?.organizationId

  const fetchMembers = useCallback(async () => {
    if (!teamId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await httpClient.get('/admin/team/get-team-members', {
        params: { teamId, limit: 100 },
        silent: true,
      })
      const d = res.data?.data ?? {}
      setMembers(d.members ?? [])
      setTotalRecords(d.totalRecords ?? 0)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const fetchEligible = useCallback(
    async (q = '') => {
      if (!organizationId) return
      setEligLoading(true)
      try {
        const res = await httpClient.get('/admin/team/eligible-members', {
          params: { organizationId, search: q, limit: 50 },
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

  const openAdd = () => {
    setSelectedId('')
    setEligSearch('')
    setShowAdd(true)
    fetchEligible('')
  }

  useEffect(() => {
    if (!showAdd) return
    const t = setTimeout(() => fetchEligible(eligSearch), 300)
    return () => clearTimeout(t)
  }, [eligSearch, showAdd, fetchEligible])

  const handleAdd = async () => {
    if (!selectedId || !teamId) return
    setAdding(true)
    try {
      await httpClient.post('/admin/team/add-team-member', {
        teamId,
        members: [selectedId],
        orgId: organizationId,
      })
      setShowAdd(false)
      fetchMembers()
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (membershipId) => {
    setRemoving(membershipId)
    try {
      await httpClient.post('/admin/team/remove-team-member', { membershipIds: [membershipId] })
      fetchMembers()
    } finally {
      setRemoving(null)
    }
  }

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

  const summary = useMemo(
    () => ({
      total: members.length,
      active: members.filter((m) => m.user?.isActive).length,
      remote: members.filter((m) => m.user?.workType === 'remote').length,
    }),
    [members],
  )

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

  const workTypeBg = (w) => (w === 'remote' ? 'info' : w === 'onsite' ? 'success' : 'warning')

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
              <span className="avatar-sm rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-16 flex-shrink-0">
                {(u?.name ?? '?').charAt(0).toUpperCase()}
              </span>
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
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => {
          const mid = row.original._id
          return (
            <Button variant="outline-danger" size="sm" className="py-0" disabled={removing === mid} onClick={() => handleRemove(mid)}>
              {removing === mid ? <Spinner size="sm" animation="border" /> : <IconifyIcon icon="bx:trash" height={16} width={16} />}
            </Button>
          )
        },
      },
    ],
    [removing],
  )

  if (!teamId) {
    return (
      <>
        <PageMetaData title="Teams" />
        <Card className="mt-4">
          <CardBody className="text-center py-5 text-muted">
            <IconifyIcon icon="bxs:group" className="fs-1 mb-2" />
            <p>No team is assigned to your account yet.</p>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageMetaData title="Teams" />

      <Row className="g-3 mb-3">
        {[
          { label: 'Total Members', value: summary.total, color: 'primary', icon: 'bxs:group' },
          { label: 'Active', value: summary.active, color: 'success', icon: 'bx:check-circle' },
          { label: 'Remote', value: summary.remote, color: 'info', icon: 'bx:wifi' },
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
                <Col md={8}>
                  <Form.Label className="fw-semibold">Search</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, email or employee ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button variant="primary" className="w-100" onClick={openAdd}>
                    <IconifyIcon icon="bx:user-plus" className="me-1" />
                    Add Member
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  Loading team members...
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

      {/* Add Member Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <ModalHeader closeButton>
          <h5 className="mb-0">Add Member to Team</h5>
        </ModalHeader>
        <ModalBody>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Search Employee</Form.Label>
            <Form.Control type="text" placeholder="Search by name or email..." value={eligSearch} onChange={(e) => setEligSearch(e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-semibold">Select Employee</Form.Label>
            {eligLoading ? (
              <div className="text-center py-2">
                <Spinner size="sm" animation="border" />
              </div>
            ) : eligible.length === 0 ? (
              <p className="text-muted fs-13 mb-0">No eligible employees found.</p>
            ) : (
              <Form.Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">-- Select --</option>
                {eligible.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.employeeId}) — {e.email}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selectedId || adding} onClick={handleAdd}>
            {adding ? <Spinner size="sm" animation="border" className="me-1" /> : <IconifyIcon icon="bx:check" className="me-1" />}
            Add to Team
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default TeamsPage
