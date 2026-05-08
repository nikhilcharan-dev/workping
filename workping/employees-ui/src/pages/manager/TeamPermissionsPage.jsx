import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const initialPermissions = []

const statusVariant = (s) => {
  switch (s) {
    case 'Approved':
      return 'success'
    case 'Rejected':
      return 'danger'
    case 'Pending':
      return 'warning'
    default:
      return 'secondary'
  }
}

const TeamPermissionsPage = () => {
  const [permissions, setPermissions] = useState(initialPermissions)

  const handleAction = (id, action) => {
    setPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status: action } : p)))
  }

  const summary = useMemo(
    () => ({
      pending: permissions.filter((p) => p.status === 'Pending').length,
      approved: permissions.filter((p) => p.status === 'Approved').length,
      rejected: permissions.filter((p) => p.status === 'Rejected').length,
    }),
    [permissions],
  )

  const columns = useMemo(
    () => [
      {
        header: 'S.No',
        accessorKey: 'id',
        cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span>,
      },
      {
        header: 'Employee',
        accessorKey: 'employee',
        cell: ({ getValue }) => (
          <div className="d-flex align-items-center gap-2">
            <span
              className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}>
              {getValue().charAt(0)}
            </span>
            <span className="fw-medium">{getValue()}</span>
          </div>
        ),
      },
      {
        header: 'Date',
        accessorKey: 'date',
        cell: ({ getValue }) => <span className="text-nowrap fw-medium">{getValue()}</span>,
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ getValue }) => <span className="text-nowrap">{getValue()}</span>,
      },
      {
        header: 'Reason',
        accessorKey: 'reason',
      },
      {
        header: 'Applied On',
        accessorKey: 'appliedOn',
        cell: ({ getValue }) => <span className="text-nowrap text-muted">{getValue()}</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => (
          <Badge bg={statusVariant(getValue())} className="px-2 py-1">
            {getValue()}
          </Badge>
        ),
      },
      {
        header: 'Action',
        id: 'action',
        cell: ({ row }) =>
          row.original.status === 'Pending' ? (
            <div className="d-flex gap-1">
              <Button variant="outline-success" size="sm" className="py-0" onClick={() => handleAction(row.original.id, 'Approved')} title="Approve">
                <IconifyIcon icon="bx:check" height={16} width={16} />
              </Button>
              <Button variant="outline-danger" size="sm" className="py-0" onClick={() => handleAction(row.original.id, 'Rejected')} title="Reject">
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
    [],
  )

  return (
    <>
      <PageMetaData title="Team Permissions" />

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
              <h5 className="mb-0">Team Permission Requests</h5>
            </CardHeader>
            <CardBody className="p-0">
              <ReactTable
                columns={columns}
                data={permissions}
                pageSize={10}
                showPagination
                rowsPerPageList={[5, 10, 25]}
                tableClass="table-centered text-nowrap mb-0"
                theadClass="table-light"
              />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default TeamPermissionsPage
