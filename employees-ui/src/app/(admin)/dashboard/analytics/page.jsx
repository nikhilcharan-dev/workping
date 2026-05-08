import { useEffect, useState, useCallback } from 'react'
import { Col, Row, Spinner, Alert } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

// Components
import ManagerStats from './components/ManagerStats'
import AttendanceHighlights from './components/AttendanceHighlights'
import AttendanceTrendChart from './components/AttendanceTrendChart'
import TeamVisibilityTable from './components/TeamVisibilityTable'
import RecentLeavesList from './components/RecentLeavesList'

export default function Home() {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Data States
  const [attendanceData, setAttendanceData] = useState({ today: {}, trend: {}, teamRates: [] })
  const [stats, setStats] = useState({ teamsCount: 0, totalMembers: 0, projectsCount: 0, pendingLeavesCount: 0 })
  const [leaves, setLeaves] = useState([])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch Attendance Summary
      const attendRes = await httpClient.get('/admin/attendance/manager/summary', { silent: true })
      const aData = attendRes.data?.data || {}
      setAttendanceData({
        today: aData.today || {},
        trend: aData.trend || {},
        teamRates: aData.teamRates || [],
      })

      // 2. Fetch Teams List (for stats)
      const teamsRes = await httpClient.get('/admin/team/manager/all', { params: { limit: 100 }, silent: true })
      const teamList = teamsRes.data?.data?.teamList || []
      const totalMembers = teamList.reduce((acc, t) => acc + (t.memberCount || 0), 0)

      // 3. Fetch Projects (for stats)
      const projectsRes = await httpClient.get('/admin/project/manager/all', { params: { limit: 100 }, silent: true })
      const projectsCount = projectsRes.data?.data?.totalRecords || 0

      // 4. Fetch Leaves (for stats & alerts)
      const leavesRes = await httpClient.get('/admin/leaves/manager/team-leaves', { params: { limit: 100 }, silent: true })
      const leavesList = leavesRes.data?.data?.leaves || []
      const pendingLeavesCount = leavesList.filter((l) => l.status === 'pending').length

      setStats({
        teamsCount: teamList.length,
        totalMembers,
        projectsCount,
        pendingLeavesCount,
      })
      setLeaves(leavesList)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to load real-time dashboard data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Building your real-time dashboard...</p>
      </div>
    )
  }

  return (
    <>
      <PageMetaData title="Manager Dashboard" />

      <div className="pb-4">
        <h4 className="mb-1 fw-bold text-dark">Welcome back, {user?.name || 'Manager'}!</h4>
        <p className="text-muted">Here is what's happening across your teams today.</p>
      </div>

      {error && (
        <Alert variant="danger" dismissible>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col xs={12}>
          <ManagerStats stats={stats} />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xxl={4} lg={5}>
          <AttendanceHighlights attendanceData={attendanceData} />
        </Col>
        <Col xxl={8} lg={7}>
          <AttendanceTrendChart trendData={attendanceData.trend} />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <TeamVisibilityTable teamRates={attendanceData.teamRates} />
        </Col>
        <Col lg={5}>
          <RecentLeavesList leaves={leaves} />
        </Col>
      </Row>
    </>
  )
}
