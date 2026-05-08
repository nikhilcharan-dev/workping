import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const statusVariant = (s) => {
  switch (s?.toLowerCase()) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'pending':
      return 'warning'
    default:
      return 'secondary'
  }
}

const TeamLeavesPage = () => {
  const { user } = useAuthContext()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeaves = async () => {
    if (!user?.organizationId) return
    try {
      setLoading(true)
      const res = await httpClient.get('/admin/leaves/manager/team-leaves', {
        params: { limit: 100 },
        silent: true,
      })
      setLeaves(res.data?.data?.leaves ?? [])
    } catch {
      setLeaves([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaves()
  }, [user?.organizationId])

  const handleAction = async (leaveId, action) => {
    try {
      await httpClient.post(`/admin/leaves/${action}/${leaveId}`)
      setLeaves((prev) => prev.map((l) => (l._id === leaveId ? { ...l, status: action === 'approve' ? 'approved' : 'rejected' } : l)))
    } catch {
      // error toast fires automatically
    }
  }

  const summary = useMemo(
    () => ({
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      rejected: leaves.filter((l) => l.status === 'rejected').length,
    }),
    [leaves],
  )

  const columns = useMemo(
    () => [
      {
        header: 'S.No',
        id: 'sno',
        cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span>,
      },
      {
        header: 'Employee',
        accessorKey: 'employee',
        cell: ({ getValue }) => {
          const name = getValue()?.name ?? '—'
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
        header: 'From',
        id: 'from',
        cell: ({ row }) => <span className="text-nowrap">{formatDate(row.original.dates?.[0])}</span>,
      },
      {
        header: 'To',
        id: 'to',
        cell: ({ row }) => <span className="text-nowrap">{formatDate(row.original.dates?.at(-1))}</span>,
      },
      {
        header: 'Days',
        id: 'days',
        cell: ({ row }) => <span className="text-nowrap">{row.original.dates?.length ?? 0} WD</span>,
      },
      {
        header: 'Type',
        accessorKey: 'leaveType',
        cell: ({ getValue }) => (
          <Badge bg={getValue() === 'Sick' ? 'danger' : 'primary'} className="px-2 py-1">
            {getValue() ?? '—'}
          </Badge>
        ),
      },
      {
        header: 'Reason',
        accessorKey: 'reason',
        cell: ({ getValue }) => getValue() ?? '—',
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
      {
        header: 'Action',
        id: 'action',
        cell: ({ row }) =>
          row.original.status === 'pending' ? (
            <div className="d-flex gap-1">
              <Button variant="outline-success" size="sm" className="py-0" onClick={() => handleAction(row.original._id, 'approve')} title="Approve">
                <IconifyIcon icon="bx:check" height={16} width={16} />
              </Button>
              <Button variant="outline-danger" size="sm" className="py-0" onClick={() => handleAction(row.original._id, 'reject')} title="Reject">
                <IconifyIcon icon="bx:x" height={16} width={16} />
              </Button>
            </div>
          ) : (
            <Button variant="outline-info" size="sm" className="py-0" title="View">
              <IconifyIcon icon="bx:show" height={16} width={16} />
            </Button>
          ),
      },
    ],
    [leaves],
  )

  return (
    <>
      <PageMetaData title="Team Leaves" />

      <Row>
        {/* Summary */}
        <Col xs={12} className="mb-3">
          <Row className="g-3">
            {[
              { label: 'Pending', value: summary.pending, color: 'warning', icon: 'bx:time-five' },
              { label: 'Approved', value: summary.approved, color: 'success', icon: 'bx:check-circle' },
              { label: 'Rejected', value: summary.rejected, color: 'danger', icon: 'bx:x-circle' },
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

        {/* Table */}
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <h5 className="mb-0">Team Leave Requests</h5>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  Loading...
                </div>
              ) : (
                <ReactTable
                  columns={columns}
                  data={leaves}
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

export default TeamLeavesPage
