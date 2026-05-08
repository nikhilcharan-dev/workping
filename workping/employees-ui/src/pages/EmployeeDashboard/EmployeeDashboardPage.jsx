import { useCallback, useEffect, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Alert, Badge, Card, CardBody, CardHeader, Col, Row, Spinner, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

// ─── tiny helpers ────────────────────────────────────────────────────────────

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—')

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const fmtHolidayDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—')

const workedHours = (mins) => {
  if (mins === null || mins === undefined) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

const statusBg = (s) => ({ present: 'success', late: 'warning', halfDay: 'info', absent: 'danger' })[s] ?? 'secondary'

const leaveStatusBg = (s) => ({ approved: 'success', rejected: 'danger', pending: 'warning' })[s] ?? 'secondary'

// ─── stat card ───────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, color, sub }) => (
  <Card className="h-100 border-0 shadow-sm">
    <CardBody>
      <div className="d-flex align-items-center gap-3">
        <div
          className={`bg-${color}-subtle rounded-3 d-flex align-items-center justify-content-center flex-shrink-0`}
          style={{ width: 52, height: 52 }}>
          <IconifyIcon icon={icon} className={`text-${color} fs-3`} />
        </div>
        <div>
          <div className="fw-bold fs-3 lh-1 mb-1">{value}</div>
          <div className="text-muted small fw-medium">{label}</div>
          {sub && (
            <div className="text-muted" style={{ fontSize: 11 }}>
              {sub}
            </div>
          )}
        </div>
      </div>
    </CardBody>
  </Card>
)

// ─── today card ──────────────────────────────────────────────────────────────

const TodayCard = ({ today }) => {
  const notMarked = !today.status
  return (
    <Card className="h-100 border-0 shadow-sm">
      <CardHeader className="border-bottom pb-2">
        <h6 className="mb-0 fw-semibold">
          <IconifyIcon icon="bx:time-five" className="me-2 text-primary" />
          Today's Attendance
        </h6>
      </CardHeader>
      <CardBody>
        {notMarked ? (
          <div className="text-center py-3">
            <IconifyIcon icon="bx:calendar-x" className="text-muted" style={{ fontSize: 40 }} />
            <p className="text-muted mt-2 mb-0 small">Not marked yet</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-3">
              <Badge bg={statusBg(today.status)} className="px-3 py-2 fs-13 text-capitalize">
                {today.status === 'halfDay' ? 'Half Day' : today.status}
              </Badge>
            </div>
            <div className="d-flex flex-column gap-2">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">Check-In</span>
                <span className="fw-semibold text-success">{fmtTime(today.checkIn)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
                <span className="text-muted small">Check-Out</span>
                <span className="fw-semibold text-danger">{fmtTime(today.checkOut)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Hours Worked</span>
                <span className="fw-semibold">{workedHours(today.workedMinutes)}</span>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

// ─── monthly attendance donut ─────────────────────────────────────────────────

const AttendanceChart = ({ summary }) => {
  const { present = 0, late = 0, halfDay = 0, absent = 0 } = summary
  const total = present + late + halfDay + absent

  const series = [present, late, halfDay, absent]
  const options = {
    chart: { type: 'donut', height: 200 },
    labels: ['Present', 'Late', 'Half Day', 'Absent'],
    colors: ['#0acf97', '#f7b731', '#4fc3f7', '#fa5c7c'],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Days',
              fontSize: '13px',
              color: '#6c757d',
              formatter: () => total,
            },
          },
        },
      },
    },
  }

  const items = [
    { label: 'Present', value: present, color: 'success' },
    { label: 'Late', value: late, color: 'warning' },
    { label: 'Half Day', value: halfDay, color: 'info' },
    { label: 'Absent', value: absent, color: 'danger' },
  ]

  return (
    <Card className="h-100 border-0 shadow-sm">
      <CardHeader className="border-bottom pb-2">
        <h6 className="mb-0 fw-semibold">
          <IconifyIcon icon="bx:bar-chart-alt-2" className="me-2 text-primary" />
          This Month
        </h6>
      </CardHeader>
      <CardBody>
        {total === 0 ? (
          <div className="text-center py-3 text-muted small">No attendance records this month</div>
        ) : (
          <>
            <ReactApexChart options={options} series={series} type="donut" height={180} />
            <Row className="g-2 mt-1">
              {items.map(({ label, value, color }) => (
                <Col xs={6} key={label}>
                  <div className={`border border-${color}-subtle rounded-2 p-2 text-center bg-${color}-subtle bg-opacity-25`}>
                    <div className={`fw-bold text-${color} fs-5`}>{value}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {label}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </>
        )}
      </CardBody>
    </Card>
  )
}

// ─── leave balance card ───────────────────────────────────────────────────────

const LeaveBalanceCard = ({ leaveBalance }) => {
  const { totalCLDays = 12, usedDays = 0, remainingDays = 12 } = leaveBalance
  const pct = Math.min(100, Math.round((usedDays / totalCLDays) * 100))

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-bottom pb-2">
        <h6 className="mb-0 fw-semibold">
          <IconifyIcon icon="bx:calendar-check" className="me-2 text-success" />
          Leave Balance
        </h6>
      </CardHeader>
      <CardBody>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">
            {usedDays} used of {totalCLDays} days
          </span>
          <span className="fw-semibold text-success">{remainingDays} left</span>
        </div>
        <div className="progress mb-3" style={{ height: 8 }}>
          <div className={`progress-bar ${pct >= 80 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="d-flex gap-2">
          <Link to="/leave" className="btn btn-sm btn-soft-primary w-100">
            Apply Leave
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}

// ─── recent leaves ────────────────────────────────────────────────────────────

const RecentLeaves = ({ leaves }) => (
  <Card className="h-100 border-0 shadow-sm">
    <CardHeader className="d-flex align-items-center justify-content-between border-bottom pb-2">
      <h6 className="mb-0 fw-semibold">
        <IconifyIcon icon="bx:notepad" className="me-2 text-primary" />
        My Recent Leaves
      </h6>
      <Link to="/leave" className="btn btn-xs btn-soft-primary py-0 px-2" style={{ fontSize: 12 }}>
        View All
      </Link>
    </CardHeader>
    <CardBody className="p-0">
      {leaves.length === 0 ? (
        <div className="text-center py-4 text-muted small">No leave requests yet</div>
      ) : (
        <Table responsive className="table-centered mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th className="ps-3">Type</th>
              <th>From</th>
              <th>Days</th>
              <th className="pe-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l._id}>
                <td className="ps-3">
                  <span className="fw-medium">{l.leaveType}</span>
                </td>
                <td className="text-muted small text-nowrap">{fmtDate(l.dates?.[0])}</td>
                <td className="text-muted small">{l.dates?.length ?? 0}d</td>
                <td className="pe-3">
                  <Badge bg={leaveStatusBg(l.status)} className="px-2 py-1 text-capitalize" style={{ fontSize: 11 }}>
                    {l.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CardBody>
  </Card>
)

// ─── upcoming holidays ────────────────────────────────────────────────────────

const UpcomingHolidays = ({ holidays }) => (
  <Card className="h-100 border-0 shadow-sm">
    <CardHeader className="d-flex align-items-center justify-content-between border-bottom pb-2">
      <h6 className="mb-0 fw-semibold">
        <IconifyIcon icon="bx:party" className="me-2 text-warning" />
        Upcoming Holidays
      </h6>
      <Link to="/holidays" className="btn btn-xs btn-soft-warning py-0 px-2" style={{ fontSize: 12 }}>
        View All
      </Link>
    </CardHeader>
    <CardBody className="p-0">
      {holidays.length === 0 ? (
        <div className="text-center py-4 text-muted small">No upcoming holidays</div>
      ) : (
        <div className="list-group list-group-flush">
          {holidays.map((h, i) => (
            <div key={h._id ?? i} className="list-group-item border-0 d-flex align-items-center gap-3 py-2 px-3">
              <div className="bg-warning-subtle rounded-2 text-center flex-shrink-0" style={{ width: 40, height: 40, paddingTop: 4 }}>
                <div className="fw-bold text-warning lh-1" style={{ fontSize: 15 }}>
                  {new Date(h.date).getDate()}
                </div>
                <div className="text-warning" style={{ fontSize: 10 }}>
                  {new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}
                </div>
              </div>
              <div className="flex-grow-1">
                <div className="fw-medium fs-13">{h.name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {fmtHolidayDate(h.date)}
                </div>
              </div>
              <Badge
                bg={h.type === 'public' ? 'primary-subtle' : 'success-subtle'}
                className={`text-${h.type === 'public' ? 'primary' : 'success'} px-2`}
                style={{ fontSize: 10 }}>
                {h.type === 'public' ? 'Public' : 'Org'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardBody>
  </Card>
)

// ─── team card ────────────────────────────────────────────────────────────────

const TeamCard = ({ team }) => {
  if (!team) return null
  return (
    <Card className="border-0 shadow-sm">
      <CardBody className="d-flex align-items-center gap-3">
        <div className="bg-primary-subtle rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48 }}>
          <IconifyIcon icon="bxs:group" className="text-primary fs-4" />
        </div>
        <div className="flex-grow-1">
          <div className="fw-semibold">{team.teamName}</div>
          {team.manager && (
            <div className="text-muted small">
              Manager: <span className="fw-medium text-body">{team.manager.name}</span>
            </div>
          )}
        </div>
        <Link to="/my-team" className="btn btn-sm btn-soft-primary">
          View <IconifyIcon icon="bx:chevron-right" />
        </Link>
      </CardBody>
    </Card>
  )
}

// ─── projects strip ───────────────────────────────────────────────────────────

const ProjectsStrip = ({ projects }) => {
  if (!projects.list?.length) return null
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="d-flex align-items-center justify-content-between border-bottom pb-2">
        <h6 className="mb-0 fw-semibold">
          <IconifyIcon icon="bx:briefcase-alt-2" className="me-2 text-info" />
          My Active Projects
        </h6>
        <Link to="/my-projects" className="btn btn-xs btn-soft-info py-0 px-2" style={{ fontSize: 12 }}>
          View All
        </Link>
      </CardHeader>
      <CardBody>
        <Row className="g-3">
          {projects.list.map((p) => (
            <Col key={p._id} md={6} xl={3}>
              <div className="border rounded-3 p-3 h-100">
                <div className="fw-semibold fs-13 mb-1">{p.name}</div>
                {p.contractedBy && (
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    Client: {p.contractedBy}
                  </div>
                )}
                {p.dueDate && (
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                    <IconifyIcon icon="bx:calendar" className="me-1" />
                    Due {fmtDate(p.dueDate)}
                  </div>
                )}
                <Badge bg="success-subtle" className="text-success mt-2 px-2" style={{ fontSize: 10 }}>
                  Active
                </Badge>
              </div>
            </Col>
          ))}
        </Row>
      </CardBody>
    </Card>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

const EmployeeDashboardPage = () => {
  const { user } = useAuthContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await httpClient.get('/user/dashboard', { silent: true })
      setData(res.data?.data ?? null)
    } catch {
      setError('Failed to load dashboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted small">Loading your workspace...</p>
      </div>
    )
  }

  const today = data?.today ?? {}
  const attendanceSummary = data?.attendanceSummary ?? {}
  const leaveBalance = data?.leaveBalance ?? {}
  const recentLeaves = data?.recentLeaves ?? []
  const upcomingHolidays = data?.upcomingHolidays ?? []
  const team = data?.team ?? null
  const projects = data?.projects ?? { total: 0, active: 0, list: [] }

  const presentPct =
    attendanceSummary.present && attendanceSummary.present + (attendanceSummary.absent ?? 0) > 0
      ? Math.round(
          (attendanceSummary.present /
            (attendanceSummary.present + (attendanceSummary.absent ?? 0) + (attendanceSummary.late ?? 0) + (attendanceSummary.halfDay ?? 0))) *
            100,
        )
      : 0

  return (
    <>
      <PageMetaData title="My Dashboard" />

      {/* Greeting */}
      <div className="pb-3">
        <h4 className="mb-1 fw-bold">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}
          !
        </h4>
        <p className="text-muted mb-0">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Stats row */}
      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <StatCard
            icon="bx:check-circle"
            label="Present This Month"
            value={attendanceSummary.present ?? 0}
            color="success"
            sub={presentPct ? `${presentPct}% attendance` : undefined}
          />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard
            icon="bx:calendar-heart"
            label="Leaves Remaining"
            value={leaveBalance.remainingDays ?? '—'}
            color="primary"
            sub={`of ${leaveBalance.totalCLDays ?? 12} CL days`}
          />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard
            icon="bx:briefcase-alt-2"
            label="Active Projects"
            value={projects.active ?? 0}
            color="info"
            sub={projects.total > 0 ? `${projects.total} total assigned` : undefined}
          />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard
            icon="bx:time-five"
            label="Today"
            value={
              today.status ? (today.status === 'halfDay' ? 'Half Day' : today.status.charAt(0).toUpperCase() + today.status.slice(1)) : 'Not Marked'
            }
            color={today.status ? statusBg(today.status) : 'secondary'}
            sub={today.checkIn ? `In: ${fmtTime(today.checkIn)}` : undefined}
          />
        </Col>
      </Row>

      {/* Row 2 — Today + monthly chart */}
      <Row className="g-3 mb-4">
        <Col lg={3} md={5}>
          <TodayCard today={today} />
        </Col>
        <Col lg={4} md={7}>
          <AttendanceChart summary={attendanceSummary} />
        </Col>
        <Col lg={5}>
          <LeaveBalanceCard leaveBalance={leaveBalance} />
        </Col>
      </Row>

      {/* Team strip (if assigned) */}
      {team && (
        <Row className="mb-4">
          <Col xs={12}>
            <TeamCard team={team} />
          </Col>
        </Row>
      )}

      {/* Row 3 — Recent leaves + upcoming holidays */}
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <RecentLeaves leaves={recentLeaves} />
        </Col>
        <Col lg={6}>
          <UpcomingHolidays holidays={upcomingHolidays} />
        </Col>
      </Row>

      {/* Row 4 — Active projects */}
      {projects.list.length > 0 && (
        <Row>
          <Col xs={12}>
            <ProjectsStrip projects={projects} />
          </Col>
        </Row>
      )}
    </>
  )
}

export default EmployeeDashboardPage
