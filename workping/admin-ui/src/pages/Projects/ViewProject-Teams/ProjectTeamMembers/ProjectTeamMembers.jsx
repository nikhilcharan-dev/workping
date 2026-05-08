import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Button } from 'react-bootstrap'
import { Link, useParams, useLocation } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import { use2FA } from '@/context/TwoFAContext'
import EmployeesWindow from './../../ProjectMember/EmployeesWindow'
import UploadUsersFromExcel from './../../ProjectMember/UploadUsersFromExcel'

const ProjectTeamMembers = () => {
  const { projectId } = useParams()
  const { state } = useLocation()
  const orgId = state?.orgId
  const itemsPerPage = 10

  const [employees, setEmployees] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const { require2FA } = use2FA()

  const [activeModal, setActiveModal] = useState(null)
  const openEmployees = () => setActiveModal('employees')
  const openExcel = () => setActiveModal('excel')
  const closeModal = () => setActiveModal(null)

  const fetchEmployees = async (page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: itemsPerPage, projectId })
      if (appliedSearch) params.append('search', appliedSearch)

      const res = await axiosClient.get(`/api/admin/project/get-members?${params.toString()}`, { silent: true })

      setEmployees(res.data?.data?.members || [])
      setTotalPages(res.data?.data?.totalPages || 0)
      setTotalRecords(res.data?.data?.totalRecords || 0)
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) fetchEmployees(currentPage)
  }, [currentPage, appliedSearch, projectId])

  const handleApply = () => {
    setAppliedSearch(search.trim())
    setCurrentPage(1)
  }

  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const deleteEmployees = () => {
    require2FA(async () => {
      try {
        await axiosClient.post('/api/admin/project/delete-project-members', { data: [...selectedIds] }, { silent: true })
        toast.success('Member(s) removed successfully!')
        setSelectedIds(new Set())
        fetchEmployees(currentPage)
      } catch (error) {
        throw new Error(error?.response?.data?.message || 'Failed to remove members')
      }
    })
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
            <Row className="g-2 align-items-center">
              <Col xs={12} md={5}>
                <div className="position-relative">
                  <IconifyIcon
                    icon="bx:search-alt"
                    className="position-absolute"
                    style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}
                  />
                  <input
                    type="search"
                    className="form-control ps-5"
                    placeholder="Search members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </Col>

              <Col xs={12} md={7}>
                <div className="d-flex gap-2 justify-content-md-end">
                  <Button onClick={handleApply}>Apply</Button>
                  <Button onClick={openEmployees}>Add</Button>
                  <Button variant="danger" disabled={selectedIds.size === 0} onClick={deleteEmployees}>
                    Delete
                  </Button>
                </div>

                {activeModal === 'employees' && (
                  <EmployeesWindow
                    show={true}
                    handleClose={closeModal}
                    openExcel={openExcel}
                    projectId={projectId}
                    organizationId={orgId}
                    onSuccess={() => fetchEmployees(currentPage)}
                  />
                )}

                {activeModal === 'excel' && (
                  <UploadUsersFromExcel
                    show={true}
                    handleClose={closeModal}
                    openEmployees={openEmployees}
                    projectId={projectId}
                    organizationId={orgId}
                    onSuccess={() => fetchEmployees(currentPage)}
                  />
                )}
              </Col>
            </Row>
          </CardBody>

          <div className="table-responsive table-centered">
            <table className="table text-nowrap mb-0">
              <thead className="bg-light bg-opacity-50">
                <tr>
                  <th>Select</th>
                  <th>User ID</th>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Work Type</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No members found
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(emp.userId)} onChange={(e) => handleSelect(emp.userId, e.target.checked)} />
                      </td>
                      <td>{emp.employeeId || '--'}</td>
                      <td>{emp.userName || '--'}</td>
                      <td>{emp.userEmail || '--'}</td>
                      <td>{emp.organizationId || '--'}</td>
                      <td>--</td>
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

export default ProjectTeamMembers
