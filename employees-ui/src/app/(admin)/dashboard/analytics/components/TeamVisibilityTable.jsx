import { Badge, Card, CardBody, CardHeader, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'

const TeamVisibilityTable = ({ teamRates }) => {
  return (
    <Card className="h-100">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Team Performance</h5>
        <Link to="/team-attendance" className="btn btn-sm btn-soft-primary">
          View Full
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <Table responsive className="table-centered table-nowrap mb-0">
          <thead className="table-light">
            <tr>
              <th>Team Name</th>
              <th>Attendance Rate</th>
              <th>Presence</th>
            </tr>
          </thead>
          <tbody>
            {(teamRates || []).map((t, idx) => (
              <tr key={idx}>
                <td>
                  <h6 className="mb-0 fw-semibold">{t.teamName}</h6>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className="progress w-100" style={{ height: '5px' }}>
                      <div
                        className={`progress-bar bg-${t.rate > 80 ? 'success' : t.rate > 50 ? 'warning' : 'danger'}`}
                        style={{ width: `${t.rate}%` }}></div>
                    </div>
                    <span className="small fw-bold">{t.rate}%</span>
                  </div>
                </td>
                <td>
                  <Badge bg="light" className="text-dark border">
                    {t.present} / {t.total}
                  </Badge>
                </td>
              </tr>
            ))}
            {(!teamRates || teamRates.length === 0) && (
              <tr>
                <td colSpan="3" className="text-center py-4 text-muted">
                  No team data available
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </CardBody>
    </Card>
  )
}

export default TeamVisibilityTable
