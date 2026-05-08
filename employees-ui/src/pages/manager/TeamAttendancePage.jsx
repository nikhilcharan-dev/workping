import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const today = new Date().toISOString().split('T')[0]

const formatTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

const statusVariant = (s) => {
  switch (s?.toLowerCase()) {
    case 'present':
      return 'success'
    case 'late':
      return 'warning'
    case 'absent':
      return 'danger'
    case 'halfday':
      return 'info'
    default:
      return 'secondary'
  }
}

const TeamAttendancePage = () => {
  const { user } = useAuthContext()
  const [date, setDate] = useState(today)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTeamId, setActiveTeamId] = useState(user?.teamId)

  useEffect(() => {
    // If no teamId in user profile (likely a manager), fetch their managed teams
    const loadDefaultTeam = async () => {
      if (!user?.teamId && user?.role === 'manager') {
        try {
          const res = await httpClient.get('/admin/team/manager/all', { params: { limit: 1 }, silent: true })
          const firstTeam = res.data?.data?.teamList?.[0]
          if (firstTeam) setActiveTeamId(firstTeam._id)
        } catch (err) {
          console.error('Failed to load managed teams', err)
        }
      }
    }
    loadDefaultTeam()
  }, [user])

  const fetchAttendance = async (selectedDate, teamId) => {
    const tid = teamId || activeTeamId
    if (!tid) return
    try {
      setLoading(true)
      const res = await httpClient.post(
        '/admin/attendance/by-team',
        {
          teamId: tid,
          date: selectedDate,
        },
        { silent: true },
      )
      setRecords(res.data?.data?.records ?? [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTeamId) fetchAttendance(date, activeTeamId)
  }, [activeTeamId])

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    return records.filter((r) => (r.user?.name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
  }, [records, search])

  const summary = useMemo(
    () => ({
      present: filtered.filter((r) => r.status === 'present').length,
      late: filtered.filter((r) => r.status === 'late').length,
      absent: filtered.filter((r) => r.status === 'absent').length,
    }),
    [filtered],
  )

  const handleFilter = () => fetchAttendance(date)

  const columns = useMemo(
    () => [
      {
        header: 'S.No',
        id: 'sno',
        cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span>,
      },
      {
        header: 'Employee',
        id: 'employee',
        cell: ({ row }) => {
          const name = row.original.user?.name ?? '—'
          return (
            <div className="d-flex align-items-center gap-2">
              <span
                className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}>
                {name.charAt(0)}
              </span>
              <span className="fw-medium">{name}</span>
            </div>
          )
        },
      },
      {
        header: 'Date',
        accessorKey: 'date',
        cell: ({ getValue }) => <span className="text-nowrap">{formatDate(getValue())}</span>,
      },
      {
        header: 'In Time',
        accessorKey: 'checkIn',
        cell: ({ getValue }) => <span className="text-nowrap">{formatTime(getValue())}</span>,
      },
      {
        header: 'Out Time',
        accessorKey: 'checkOut',
        cell: ({ getValue }) => <span className="text-nowrap">{formatTime(getValue())}</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => (
          <Badge bg={statusVariant(getValue())} className="px-2 py-1">
            {cap(getValue())}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageMetaData title="Team Attendance" />

      <Row>
        {/* Summary cards */}
        <Col xs={12} className="mb-3">
          <Row className="g-3">
            {[
              { label: 'Present', value: summary.present, color: 'success', icon: 'bx:check-circle' },
              { label: 'Late', value: summary.late, color: 'warning', icon: 'bx:time' },
              { label: 'Absent', value: summary.absent, color: 'danger', icon: 'bx:x-circle' },
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
                      <div className="fw-bold fs-4">{value}</div>
                      <div className="text-muted small">{label}</div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        {/* Filter */}
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <h5 className="mb-0">Team Attendance</h5>
            </CardHeader>
            <CardBody>
              <Row className="g-2 align-items-end">
                <Col md={4}>
                  <Form.Label className="fw-semibold">Employee</Form.Label>
                  <Form.Control type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </Col>
                <Col md={4}>
                  <Form.Label className="fw-semibold">Date</Form.Label>
                  <Form.Control type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Col>
                <Col md={4}>
                  <Button variant="primary" className="w-100" onClick={handleFilter}>
                    <IconifyIcon icon="bx:filter-alt" className="me-1" />
                    Apply Filter
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>

        {/* Table */}
        <Col xs={12}>
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  Loading...
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
    </>
  )
}

export default TeamAttendancePage
