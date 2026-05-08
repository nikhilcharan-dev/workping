import { useState, useEffect, useCallback, useMemo } from 'react'
import { Badge, Button, Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import axiosClient from '@/helpers/httpClient'

const toYmd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtTime = (iso) => {
  if (!iso) return '--'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  halfDay: 'info',
}

const PAGE_SIZE = 10

const AttendanceRecords = () => {
  const [organizations, setOrganizations] = useState([])
  const [orgId, setOrgId] = useState('')
  const [orgInfo, setOrgInfo] = useState({})
  const [teamId, setTeamId] = useState('all')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('all')
  const [date, setDate] = useState(toYmd())
  const [statusFilter, setStatusFilter] = useState('all')
  const [records, setRecords] = useState([])
  const [meta, setMeta] = useState({ totalUsers: 0, attendanceCount: 0 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchInit()
  }, [])
  useEffect(() => {
    if (orgId) {
      fetchProjects(orgId)
      fetchRecords()
    }
  }, [orgId, teamId, projectId, date])

  const fetchInit = async () => {
    try {
      const [orgIdsRes, orgInfoRes] = await Promise.allSettled([
        axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true }),
        axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true }),
      ])
      const orgs = orgIdsRes.status === 'fulfilled' ? (orgIdsRes.value?.data?.data ?? []) : []
      const info = orgInfoRes.status === 'fulfilled' ? (orgInfoRes.value?.data?.data ?? {}) : {}
      setOrganizations(orgs)
      setOrgInfo(info)
      if (orgs.length > 0) setOrgId(orgs[0].organizationId)
    } catch {}
  }

  const fetchProjects = async (selectedOrgId) => {
    try {
      const res = await axiosClient.get('/api/admin/projects/get-projects', {
        params: { organizationId: selectedOrgId, limit: 100 },
        silent: true,
      })
      setProjects(res.data?.data?.projects ?? res.data?.data ?? [])
    } catch {
      setProjects([])
    }
  }

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setRecords([])
    setPage(1)
    try {
      let res
      if (teamId !== 'all') {
        res = await axiosClient.post('/api/admin/attendance/by-team', { teamId, date }, { silent: true })
        const data = res.data?.data ?? {}
        setRecords(data.records ?? [])
        setMeta({ totalUsers: data.totalMembers ?? 0, attendanceCount: data.attendanceCount ?? 0 })
      } else {
        const body = { organizationId: orgId, date }
        if (projectId !== 'all') body.projectId = projectId
        res = await axiosClient.post('/api/admin/attendance/by-organization', body, { silent: true })
        const data = res.data?.data ?? {}
        setRecords(data.records ?? [])
        setMeta({ totalUsers: data.totalUsers ?? 0, attendanceCount: data.attendanceCount ?? 0 })
      }
    } catch {
      setRecords([])
      setMeta({ totalUsers: 0, attendanceCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [orgId, teamId, date])

  const selectedOrgName = useMemo(() => organizations.find((o) => o.organizationId === orgId)?.name ?? '', [organizations, orgId])

  const teams = useMemo(() => {
    const entry = Object.entries(orgInfo).find(([name]) => name === selectedOrgName)
    return entry ? (entry[1]?.teams ?? []) : []
  }, [orgInfo, selectedOrgName])

  const filtered = useMemo(() => (statusFilter === 'all' ? records : records.filter((r) => r.status === statusFilter)), [records, statusFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = useMemo(
    () => ({
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      halfDay: records.filter((r) => r.status === 'halfDay').length,
    }),
    [records],
  )

  return (
    <>
      <PageBreadcrumb title="Attendance Records" subName="Attendance" />
      <PageMetaData title="Attendance Records" />

      <Row className="g-3 mb-3">
        {[
          { label: 'Present', key: 'present', color: '#22c55e', icon: 'mdi:account-check-outline' },
          { label: 'Absent', key: 'absent', color: '#ef4444', icon: 'mdi:account-off-outline' },
          { label: 'Late', key: 'late', color: '#f59e0b', icon: 'mdi:account-clock-outline' },
          { label: 'Half Day', key: 'halfDay', color: '#0ea5e9', icon: 'mdi:account-arrow-right-outline' },
        ].map(({ label, key, color, icon }) => (
          <Col md={6} xl={3} key={key}>
            <Card
              className="border-0 h-100"
              style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.07)', cursor: 'pointer' }}
              onClick={() => {
                setStatusFilter(statusFilter === key ? 'all' : key)
                setPage(1)
              }}>
              <CardBody className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 50, height: 50, background: color + '20' }}>
                  <IconifyIcon icon={icon} style={{ fontSize: 26, color }} />
                </div>
                <div>
                  <p className="mb-0 text-muted small fw-semibold text-uppercase">{label}</p>
                  <h3 className="mb-0 fw-bold" style={{ color }}>
                    {summary[key]}
                  </h3>
                </div>
                {statusFilter === key && (
                  <Badge bg="primary" pill className="ms-auto">
                    Active
                  </Badge>
                )}
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0" style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
        <CardBody>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h5 className="mb-0 me-auto">
              Daily Records
              {meta.attendanceCount > 0 && (
                <span className="text-muted fw-normal fs-6 ms-2">
                  ({meta.attendanceCount} of {meta.totalUsers} recorded)
                </span>
              )}
            </h5>

            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 'auto' }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={toYmd()}
            />

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 190 }}
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value)
                setTeamId('all')
                setProjectId('all')
              }}>
              {organizations.map((o) => (
                <option key={o.organizationId} value={o.organizationId}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 160 }}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                setTeamId('all')
                setPage(1)
              }}>
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 160 }}
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value)
                setProjectId('all')
                setPage(1)
              }}>
              <option value="all">All Teams</option>
              {teams.map((t) => (
                <option key={t._id ?? t.teamId} value={t._id ?? t.teamId}>
                  {t.teamName ?? t.name}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: 130 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}>
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="halfDay">Half Day</option>
            </select>

            <Button variant="outline-secondary" size="sm" onClick={fetchRecords} disabled={loading}>
              <IconifyIcon icon="mdi:refresh" />
            </Button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" />
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-5">
                      No attendance records for {new Date(date + 'T00:00:00').toLocaleDateString()}
                    </td>
                  </tr>
                ) : (
                  paginated.map((rec, i) => (
                    <tr key={rec._id}>
                      <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <div className="fw-semibold">{rec.user?.name ?? '--'}</div>
                        <div className="text-muted small">{rec.user?.email ?? ''}</div>
                      </td>
                      <td>{rec.teamName ?? '--'}</td>
                      <td>
                        <Badge bg={STATUS_COLOR[rec.status] ?? 'secondary'}>{rec.status === 'halfDay' ? 'Half Day' : rec.status}</Badge>
                      </td>
                      <td>{fmtTime(rec.checkIn)}</td>
                      <td>{fmtTime(rec.checkOut)}</td>
                      <td className="text-muted small">{rec.remarks ?? '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted small">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="d-flex gap-1">
                <Button variant="outline-secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <IconifyIcon icon="mdi:chevron-left" />
                </Button>
                {Array.from({ length: totalPages }, (_, idx) => (
                  <Button key={idx + 1} variant={page === idx + 1 ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setPage(idx + 1)}>
                    {idx + 1}
                  </Button>
                ))}
                <Button variant="outline-secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  <IconifyIcon icon="mdi:chevron-right" />
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default AttendanceRecords
