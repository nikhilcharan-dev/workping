import { useEffect, useMemo, useState } from 'react'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'

const ViewEmployees = () => {
  const itemsPerPage = 10

  const [employees, setEmployees] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [orgData, setOrgData] = useState({})
  const [organization, setOrganization] = useState('')
  const [department, setDepartment] = useState('')

  const [appliedOrganization, setAppliedOrganization] = useState('')
  const [appliedDepartment, setAppliedDepartment] = useState('')

  // "Go to page" input state
  const [jumpPage, setJumpPage] = useState('')

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

  const fetchEmployees = async (page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: itemsPerPage })

      if (appliedOrganization) {
        const organizationId = orgData[appliedOrganization]?.organizationId
        if (organizationId) params.append('organizationId', organizationId)
      }
      if (appliedDepartment) params.append('teamId', appliedDepartment)
      if (appliedSearch) params.append('search', appliedSearch)

      const result = await axiosClient.get(`/api/admin/get-all-employees/get-all-employees-by-page-number?${params.toString()}`, { silent: true })

      setEmployees(result.data?.data?.data || [])
      setTotalPages(result.data?.data?.totalPages || 0)
      setTotalRecords(result.data?.data?.totalRecords || 0)
    } catch (e) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees(currentPage)
  }, [currentPage, appliedOrganization, appliedDepartment, appliedSearch])

  const handleApply = () => {
    setAppliedSearch(search)
    setAppliedOrganization(organization)
    setAppliedDepartment(department)
    setCurrentPage(1)
  }

  const handleJumpGo = () => {
    const n = parseInt(jumpPage, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      setCurrentPage(n)
    }
    setJumpPage('')
  }

  const getPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 2) return [1, 2, 3, '...', totalPages]
    if (currentPage >= totalPages - 1) return [1, '...', totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const start = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const end = Math.min(currentPage * itemsPerPage, totalRecords)
  const show = (val) => val || '--'

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
                    style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}
                  />
                  <input
                    type="search"
                    className="form-control ps-5"
                    placeholder="Search employees..."
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
                    setDepartment('')
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
                <select className="form-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Select Department</option>
                  {departmentList.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
              </Col>

              <Col xs={12} md={2}>
                <Button className="w-100" onClick={handleApply}>
                  Apply
                </Button>
              </Col>
            </Row>
          </CardBody>

          <div className="table-responsive">
            <table className="table text-nowrap mb-0">
              <thead className="bg-light">
                <tr>
                  <th>User_id</th>
                  <th>Name</th>
                  <th>Gmail</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Work Type</th>
                  <th>Organization</th>
                  <th>Department</th>
                  <th>Dob</th>
                  <th>Gender</th>
                  <th>Date of Joining</th>
                  <th>Salary</th>
                  <th>AADHAAR</th>
                  <th>PAN</th>
                  <th>Passport</th>
                  <th>BANK</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="16" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="16" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id}>
                      <td>{show(emp.employeeId)}</td>
                      <td>{show(emp.name)}</td>
                      <td>{show(emp.email)}</td>
                      <td>{show(emp.phone)}</td>
                      <td>{show(emp.role)}</td>
                      <td>{show(emp.workType)}</td>
                      <td>{show(emp.organizationName)}</td>
                      <td>{show(emp.departmentName)}</td>
                      <td>{show(emp.dob)}</td>
                      <td>{show(emp.gender)}</td>
                      <td>{show(emp.dateOfJoining)}</td>
                      <td>{show(emp.salary)}</td>
                      <td>{show(emp.aadhaarNumber)}</td>
                      <td>{show(emp.panNumber)}</td>
                      <td>{show(emp.passportNumber)}</td>
                      <td>{show(emp.bankAccount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination footer ── */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
            {/* Records info */}
            <div className="text-muted small">
              Showing {start} to {end} of {totalRecords} records
            </div>

            {/* Page buttons + jump-to-page */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              <ul className="pagination pagination-rounded m-0">
                {/* Prev */}
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

                {/* Page numbers */}
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

                {/* Next */}
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

              {/* Jump-to-page — only show when there are multiple pages */}
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

export default ViewEmployees
