import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'

const Viewprojects = () => {
  const itemsPerPage = 10
  const navigate = useNavigate()

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

  const departmentList = useMemo(() => (organization && orgData[organization] ? orgData[organization].teams || [] : []), [organization, orgData])

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

  const handleReset = () => {
    setSearch('')
    setOrganization('')
    setAppliedSearch('')
    setAppliedOrganization('')
    setCurrentPage(1)
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
              <div className="position-relative" style={{ maxWidth: 220 }}>
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

              <select
                className="form-select"
                style={{ maxWidth: 200 }}
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

              <div className="ms-auto d-flex gap-2">
                <Button size="sm" variant="outline-secondary" className="px-3" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" variant="primary" className="px-4" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </CardBody>

          <div className="table-responsive">
            <table className="table text-nowrap mb-0">
              <thead className="bg-light">
                <tr>
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
                    <td colSpan="11" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr
                      key={project._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        navigate(`/projects/view-project-teams/project-team-members/${project._id}`, {
                          state: { orgId: project.organizationId || orgData[project.organizationName]?.organizationId },
                        })
                      }>
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
