import { useEffect, useState } from 'react'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'

import { use2FA } from '@/context/TwoFAContext'
import { useAuthContext } from '@/context/useAuthContext'

const ViewOrganization = () => {
  const navigate = useNavigate()
  const itemsPerPage = 10

  const [organizations, setorganizations] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())

  const { require2FA } = use2FA()
  const { is2FAAuthnticator } = useAuthContext()

  const fetchorganizations = async (page, q) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page,
        limit: itemsPerPage,
      })

      if (q && q.trim() !== '') {
        params.append('search', q.trim())
      }

      const response = await axiosClient.get(`/api/admin/organization/get-organizations?${params.toString()}`, { silent: true })

      setorganizations(response.data?.data?.organizations || [])
      setTotalPages(response.data?.data?.totalPages || 0)
      setTotalRecords(response.data?.data?.totalRecords || 0)
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchorganizations(currentPage, search)
  }, [currentPage, search])

  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)

      if (checked) newSet.add(id)
      else newSet.delete(id)

      return newSet
    })
  }

  const deleteOrganizations = async () => {
    {
      require2FA(async () => {
        try {
          await axiosClient.post(
            '/api/admin/organization/delete-organizations',
            {
              data: [...selectedIds],
            },
            { silent: true },
          )

          toast.success('Organization(s) deleted successfully!')
          setSelectedIds(new Set())
          fetchorganizations(currentPage, search)
        } catch (error) {
          throw new Error(error?.response?.data?.message || 'Failed to delete organizations')
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
            <Row className="align-items-center g-2">
              {/* Search */}
              <Col xs={12} md={6} lg={4}>
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
                    placeholder="Search by name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </Col>

              {/* Buttons */}
              <Col xs={12} md={6} lg={8} className="d-flex gap-2 justify-content-md-end flex-wrap">
                <Button
                  variant="primary"
                  className="flex-grow-1 flex-md-grow-0 px-4"
                  onClick={() => {
                    setCurrentPage(1)
                    setSearch(searchInput)
                  }}>
                  Apply
                </Button>

                <Button variant="danger" className="flex-grow-1 flex-md-grow-0 px-4" disabled={selectedIds.size === 0} onClick={deleteOrganizations}>
                  Delete
                </Button>
              </Col>
            </Row>
          </CardBody>

          <div className="table-responsive table-centered">
            <table className="table text-nowrap mb-0">
              <thead className="bg-light bg-opacity-50">
                <tr>
                  <th>Select</th>
                  <th>Actions</th>
                  <th>Name</th>
                  <th>CL Days</th>
                  <th>Type</th>
                  <th>IP Address</th>
                  <th>Founded At</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  organizations.map((organization) => (
                    <tr key={organization._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(organization._id)}
                          onChange={(e) => handleSelect(organization._id, e.target.checked)}
                        />
                      </td>

                      <td>
                        <Button
                          variant="soft-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => navigate(`/organization/update-organization/${organization._id}`)}>
                          <IconifyIcon icon="bx:edit" />
                        </Button>
                      </td>

                      <td>{organization.name || '--'}</td>
                      <td>{organization.clDays || '--'}</td>
                      <td>{organization.type || '--'}</td>
                      <td>{organization.IPWhitelist?.[0] || '--'}</td>
                      <td>{organization.foundedAt || '--'}</td>
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

export default ViewOrganization
