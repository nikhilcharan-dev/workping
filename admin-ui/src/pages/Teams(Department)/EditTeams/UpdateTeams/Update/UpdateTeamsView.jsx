import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'

import { use2FA } from '@/context/TwoFAContext'
import { useAuthContext } from '@/context/useAuthContext'

const ViewTeams = () => {
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

  const [selectedIds, setSelectedIds] = useState(new Set())

  const navigate = useNavigate()

  const { require2FA } = use2FA()
  const { is2FAAuthnticator } = useAuthContext()

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

  const fetchTeams = async (page) => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page,
        limit: itemsPerPage,
      })

      if (appliedSearch) params.append('search', appliedSearch)

      if (appliedOrganization) params.append('organizationId', appliedOrganization)

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

  const getOrganizationName = (orgId) => {
    const org = organizations.find((o) => o.organizationId === orgId)
    return org?.name || '--'
  }

  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)

      if (checked) newSet.add(id)
      else newSet.delete(id)

      return newSet
    })
  }

  const deleteTeams = async () => {
    {
      require2FA(async () => {
        try {
          await axiosClient.post(
            '/api/admin/team/delete-team',
            {
              data: [...selectedIds],
            },
            { silent: true },
          )

          toast.success('Team(s) deleted successfully!')
          setSelectedIds(new Set())
          fetchTeams(currentPage)
        } catch (error) {
          throw new Error(error?.response?.data?.message || 'Failed to delete teams')
        }
      })
    }
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
    <Row>
      <Col>
        <Card>
          <CardBody>
            <Row className="g-2">
              <Col xs={12} md={4}>
                <input type="search" className="form-control" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </Col>

              <Col xs={12} md={4}>
                <select className="form-select" value={organization} onChange={(e) => setOrganization(e.target.value)}>
                  <option value="">Select Organization</option>

                  {organizations.map((org) => (
                    <option key={org.organizationId} value={org.organizationId}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </Col>

              <Col xs={12} md={4}>
                <div className="d-flex gap-2">
                  <Button className="flex-fill" onClick={handleApply}>
                    Apply
                  </Button>

                  <Button variant="danger" className="flex-fill" disabled={selectedIds.size === 0} onClick={deleteTeams}>
                    Delete
                  </Button>
                </div>
              </Col>
            </Row>
          </CardBody>

          <div className="table-responsive">
            <table className="table text-nowrap mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Select</th>
                  <th>Actions</th>
                  <th>Team Name</th>
                  <th>Team Manager ID</th>
                  <th>Organization</th>
                  <th>Team Leader ID</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team._id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(team._id)} onChange={(e) => handleSelect(team._id, e.target.checked)} />
                      </td>

                      <td>
                        <Button
                          variant="soft-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => navigate(`/teams/edit-teams/update-teams/${team._id}`)}>
                          <IconifyIcon icon="bx:edit" />
                        </Button>
                        <Button
                          variant="soft-info"
                          size="sm"
                          onClick={() => navigate(`/teams/team-members/team-members-view/${team._id}`, { state: { orgId: team.organizationId } })}>
                          <IconifyIcon icon="bx:group" />
                        </Button>
                      </td>

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
                    <IconifyIcon icon="bx:left-arrow-alt" />
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
                    <IconifyIcon icon="bx:right-arrow-alt" />
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
