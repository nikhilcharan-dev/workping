import { Badge, Button, Card, CardBody, CardHeader, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const RecentLeavesList = ({ leaves }) => {
  const pending = (leaves || []).filter((l) => l.status === 'pending').slice(0, 5)

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  return (
    <Card className="h-100">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Recent Pending Leaves</h5>
        <Link to="/team-leaves" className="btn btn-sm btn-soft-primary">
          View All
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <Table responsive className="table-centered mb-0">
          <tbody>
            {pending.map((l, idx) => (
              <tr key={idx}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold">
                      {l.employee?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h6 className="mb-0 fs-13">{l.employee?.name}</h6>
                      <span className="text-muted small">{l.leaveType}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="text-muted small">
                    {formatDate(l.dates?.[0])} - {formatDate(l.dates?.at(-1))}
                  </span>
                </td>
                <td className="text-end">
                  <Button variant="link" className="p-0 text-primary" as={Link} to="/team-leaves">
                    <IconifyIcon icon="bx:chevron-right" height={20} />
                  </Button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td className="text-center py-4 text-muted">No pending requests</td>
              </tr>
            )}
          </tbody>
        </Table>
      </CardBody>
    </Card>
  )
}

export default RecentLeavesList
