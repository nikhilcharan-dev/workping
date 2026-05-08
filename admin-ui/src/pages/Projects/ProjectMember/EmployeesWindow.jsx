import { useEffect, useState } from 'react'
import { Modal, Card, CardBody, Row, Col, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import { use2FA } from '@/context/TwoFAContext'

const EmployeesWindow = ({ show, handleClose, openExcel, projectId, organizationId, onSuccess }) => {
  const { require2FA } = use2FA()

  const itemsPerPage = 10

  const [employees, setEmployees] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())

  const fetchEmployees = async (page) => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page,
        limit: itemsPerPage,
      })

      if (appliedSearch) {
        params.append('search', appliedSearch)
      }

      const res = await axiosClient.get(`/api/admin/get-all-employees/get-all-employees-by-page-number?${params}`, { silent: true })

      setEmployees(res.data?.data?.data || [])
      setTotalPages(res.data?.data?.totalPages || 0)
      setTotalRecords(res.data?.data?.totalRecords || 0)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees(currentPage)
  }, [currentPage, appliedSearch])

  const handleApply = () => {
    setAppliedSearch(search)
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

  const handleSubmit = () => {
    if (selectedIds.size === 0) return
    require2FA(async () => {
      setSubmitting(true)
      try {
        await axiosClient.post('/api/admin/project/add-member', { projectId, organizationId, employeeIds: [...selectedIds] }, { silent: true })
        toast.success('Member(s) added to team successfully!')
        setSelectedIds(new Set())
        if (onSuccess) onSuccess()
        handleClose()
      } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to add members')
      } finally {
        setSubmitting(false)
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

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered scrollable enforceFocus={false}>
      {/* Header */}

      <Modal.Header closeButton>
        <div className="d-flex align-items-center justify-content-between w-100">
          <Modal.Title>Employees List</Modal.Title>

          <Button onClick={openExcel}>Upload Excel Users</Button>
        </div>
      </Modal.Header>

      <Modal.Body>
        <Card>
          <CardBody>
            {/* Search */}
            <Row className="g-2 mb-3">
              <Col xs={12} md={9}>
                <div className="position-relative" style={{ maxWidth: '400px' }}>
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
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </Col>
              <Col xs={12} md={3}>
                <Button className="w-100" onClick={handleApply}>
                  Search{' '}
                </Button>
              </Col>
            </Row>

            {/* Table */}

            <div className="table-responsive">
              <table className="table text-nowrap">
                <thead className="bg-light">
                  <tr>
                    <th>Select</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">
                        No Records
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp._id}>
                        <td>
                          <input type="checkbox" checked={selectedIds.has(emp._id)} onChange={(e) => handleSelect(emp._id, e.target.checked)} />
                        </td>
                        <td>{emp.employeeId || '--'}</td>
                        <td>{emp.name || '--'}</td>
                        <td>{emp.email || '--'}</td>
                        <td>{emp.phone || '--'}</td>
                        <td>{emp.department || '--'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}

            <Row className="align-items-center mt-3">
              <Col>
                Showing {start} to {end} of {totalRecords}
              </Col>

              <Col xs="auto">
                <ul className="pagination m-0">
                  <li className={`page-item ${currentPage === 1 && 'disabled'}`}>
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
                    <li key={i} className={`page-item ${currentPage === p ? 'active' : ''} ${p === '...' && 'disabled'}`}>
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

                  <li className={`page-item ${currentPage === totalPages && 'disabled'}`}>
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
              </Col>
            </Row>
          </CardBody>
        </Card>
      </Modal.Body>

      <Modal.Footer>
        <span className="text-muted small me-auto">
          {selectedIds.size > 0 ? `${selectedIds.size} employee(s) selected` : 'No employees selected'}
        </span>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={selectedIds.size === 0 || submitting} onClick={handleSubmit}>
          {submitting ? 'Adding...' : 'Add to Team'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default EmployeesWindow
