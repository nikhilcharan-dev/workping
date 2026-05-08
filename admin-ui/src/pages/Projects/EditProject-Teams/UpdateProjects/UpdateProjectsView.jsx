import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'

import { use2FA } from '@/context/TwoFAContext'
import { useAuthContext } from '@/context/useAuthContext'

const Viewprojects = () => {
  const itemsPerPage = 10
  const [projects, setProjects] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [orgData, setOrgData] = useState({})
  const [organization, setOrganization] = useState('')
  const [appliedOrganization, setAppliedOrganization] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())

  const navigate = useNavigate()

  const { require2FA } = use2FA()
  const { is2FAAuthnticator } = useAuthContext()

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true })
        setOrgData(res.data?.data || {})
      } catch (err) {
        // Error handled by interceptor
      }
    }

    fetchOrganizations()
  }, [])

  const organizationList = useMemo(() => Object.keys(orgData), [orgData])

  const fetchprojects = async (page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page,
        limit: itemsPerPage,
      })

      if (appliedOrganization) {
        const organizationId = orgData[appliedOrganization]?.organizationId

        if (organizationId) {
          params.append('organizationId', organizationId)
        }
      }

      if (appliedSearch) {
        params.append('search', appliedSearch)
      }

      const result = await axiosClient.get(`/api/admin/project/get-projects?${params.toString()}`)

      setProjects(result.data?.data?.projects || [])
      setTotalPages(result.data?.data?.totalPages || 0)
      setTotalRecords(result.data?.data?.totalRecords || 0)
    } catch (e) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchprojects(currentPage)
  }, [currentPage, appliedOrganization, appliedSearch])

  const handleApply = () => {
    setAppliedSearch(search)
    setAppliedOrganization(organization)
    setCurrentPage(1)
  }

  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)

      if (checked) newSet.add(id)
      else newSet.delete(id)

      return newSet
    })
  }

  const performDelete = async () => {
    try {
      await axiosClient.post(
        '/api/admin/project/delete-projects',
        {
          data: [...selectedIds],
        },
        { silent: true },
      )

      toast.success('Project(s) deleted successfully!')
      setSelectedIds(new Set())
      fetchprojects(currentPage)
    } catch (e) {
      // Error handled by interceptor
    }
  }

  const deleteProjects = async () => {
    if (is2FAAuthnticator) {
      await performDelete()
    } else {
      require2FA(async () => {
        await performDelete()
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
                <div className="position-relative">
                  <IconifyIcon
                    icon="bx:search-alt"
                    className="position-absolute"
                    style={{
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 18,
                    }}
                  />
                  <input
                    type="search"
                    className="form-control ps-5"
                    placeholder="Search projects..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </Col>

              <Col xs={12} md={3}>
                <select
                  className="form-select"
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value)
                  }}>
                  <option value="">Select Organization</option>

                  {organizationList.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </Col>

              <Col xs={12} md={3}>
                <div className="d-flex gap-2">
                  <Button className="flex-fill" onClick={handleApply}>
                    Apply
                  </Button>

                  <Button variant="danger" className="flex-fill" disabled={selectedIds.size === 0} onClick={deleteProjects}>
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
                  <th>Name</th>
                  <th>Assigned Date</th>
                  <th>Due Date</th>
                  <th>Contracted By</th>
                  <th>Project Manager</th>
                  <th>Organization Name</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="15" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project._id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(project._id)} onChange={(e) => handleSelect(project._id, e.target.checked)} />
                      </td>

                      <td>
                        <Button
                          variant="soft-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => navigate(`/projects/update-projects-form/${project._id}`)}>
                          <IconifyIcon icon="bx:edit" />
                        </Button>
                        <Button
                          variant="soft-info"
                          size="sm"
                          onClick={() =>
                            navigate(`/projects/view-project-teams/project-team-members/${project._id}`, {
                              state: { orgId: project.organizationId || orgData[project.organizationName]?.organizationId },
                            })
                          }>
                          <IconifyIcon icon="bx:group" />
                        </Button>
                      </td>

                      <td>{project.name || '--'}</td>
                      <td>{project.assignedDate || '--'}</td>
                      <td>{project.dueDate || '--'}</td>
                      <td>{project.contractedBy || '--'}</td>
                      <td>
                        {project.manager?.[0]?.employeeId
                          ? `${project.manager[0].employeeId} (${project.projectManagerName})`
                          : project.projectManagerName || '--'}
                      </td>
                      <td>{project.organizationName || '--'}</td>
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

export default Viewprojects
