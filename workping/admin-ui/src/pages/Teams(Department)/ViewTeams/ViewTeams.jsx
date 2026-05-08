import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '@/helpers/httpClient'

const ViewTeams = () => {
  const navigate = useNavigate()
  const itemsPerPage = 10

  const [teams, setTeams] = useState([])
  const [organizations, setOrganizations] = useState([])

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [organization, setOrganization] = useState('')
  const [appliedOrganization, setAppliedOrganization] = useState('')

  const [loading, setLoading] = useState(false)

  // ✅ Fetch Organizations (YOUR ROUTE)
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await axiosClient.get('api/admin/organization/get-all-organization-ids', { silent: true })
        setOrganizations(res.data?.data || [])
      } catch (err) {
        // Error handled by interceptor
      }
    }

    fetchOrganizations()
  }, [])

  // ✅ Fetch Teams (YOUR ROUTE)
  const fetchTeams = async (page) => {
    setLoading(true)
    console.log('calling teams')
    try {
      const params = new URLSearchParams({
        page,
        limit: itemsPerPage,
      })

      if (appliedSearch) {
        params.append('search', appliedSearch)
      }

      if (appliedOrganization) {
        params.append('organizationId', appliedOrganization)
      }

      const res = await axiosClient.get(`api/admin/team/get-teams-filter?${params.toString()}`, { silent: true })
      setTeams(res.data?.data?.teamList || [])
      setTotalPages(res.data?.data?.totalPages || 0)
      setTotalRecords(res.data?.data?.totalRecords || 0)
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams(currentPage)
  }, [currentPage, appliedSearch, appliedOrganization])

  const handleApply = () => {
    setAppliedSearch(search.trim())
    setAppliedOrganization(organization)
    setCurrentPage(1)
  }

  // ✅ Convert organizationId → organization name
  const getOrganizationName = (orgId) => {
    const org = organizations.find((o) => o.organizationId === orgId)
    return org?.name || '--'
  }

  const getPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)

    if (currentPage <= 2) return [1, 2, 3, '...', totalPages]

    if (currentPage >= totalPages - 1) return [1, '...', totalPages - 2, totalPages - 1, totalPages]

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const start = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const end = Math.min(currentPage * itemsPerPage, totalRecords)

  const [jumpPage, setJumpPage] = useState('')
  const handleJumpGo = () => {
    const n = parseInt(jumpPage, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n)
    setJumpPage('')
  }

  return (
    <Row className="justify-content-center">
      <Col xs={12} xl={11}>
        <Card>
          <CardBody className="py-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search */}
              <input
                type="search"
                className="form-control"
                style={{ maxWidth: 220 }}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Organization Dropdown */}
              <select className="form-select" style={{ maxWidth: 200 }} value={organization} onChange={(e) => setOrganization(e.target.value)}>
                <option value="">Select Organization</option>

                {organizations.map((org) => (
                  <option key={org.organizationId} value={org.organizationId}>
                    {org.name}
                  </option>
                ))}
              </select>

              {/* Apply — pinned right */}
              <Button size="sm" className="ms-auto px-4" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </CardBody>

          {/* Table */}
          <div className="table-responsive">
            <table className="table text-nowrap mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Team Name</th>
                  <th>Team Manager ID</th>
                  <th>Organization</th>
                  <th>Team Leader ID</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/teams/team-members/team-members-view/${team._id}`)}>
                      <td>{team.teamName || '--'}</td>
                      <td>{team.manager ? `${team.manager.employeeId} (${team.manager.name})` : '--'}</td>
                      <td>{getOrganizationName(team.organizationId) || '--'}</td>
                      <td>{team.leaders?.[0] ? `${team.leaders[0].employeeId} (${team.leaders[0].name})` : '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
            <div className="text-muted small">
              Showing {start} to {end} of {totalRecords} records
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <ul className="pagination pagination-rounded m-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <Link
                    to="#"
                    className="page-link"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) setCurrentPage(currentPage - 1)
                    }}>
                    ‹
                  </Link>
                </li>
                {getPages().map((p, i) => (
                  <li key={i} className={`page-item ${currentPage === p ? 'active' : ''} ${p === '...' ? 'disabled' : ''}`}>
                    <Link
                      to="#"
                      className="page-link"
                      onClick={(e) => {
                        e.preventDefault()
                        if (typeof p === 'number') setCurrentPage(p)
                      }}>
                      {p}
                    </Link>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <Link
                    to="#"
                    className="page-link"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                    }}>
                    ›
                  </Link>
                </li>
              </ul>
              {totalPages > 1 && (
                <div className="d-flex align-items-center gap-1">
                  <span className="text-muted small text-nowrap">Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJumpGo()}
                    className="form-control form-control-sm text-center"
                    style={{ width: 60 }}
                    placeholder={`/${totalPages}`}
                  />
                  <Button size="sm" variant="primary" onClick={handleJumpGo}>
                    Go
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  )
}

export default ViewTeams
