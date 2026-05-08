import { useEffect, useState } from 'react'
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'

// ─── Admin View Modal ────────────────────────────────────────────────────────

const AdminViewModal = ({ organization, onClose }) => {
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)

  // invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [userFound, setUserFound] = useState(false)

  const fetchAdmins = async () => {
    setLoadingAdmins(true)
    try {
      const res = await axiosClient.get(`/api/admin/organization/get-org-admins?organizationId=${organization._id}`, { silent: true })
      setAdmins(res.data?.data || [])
    } catch {
      // handled by interceptor
    } finally {
      setLoadingAdmins(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [organization._id])

  const handleDelete = async (userId) => {
    try {
      await axiosClient.post('/api/admin/organization/remove-admin', { organizationId: organization._id, userId }, { silent: true })
      toast.success('Admin removed successfully')
      setAdmins((prev) => prev.filter((a) => a.userId !== userId))
    } catch {
      // handled by interceptor
    }
  }

  // Step 1: lookup user by email
  const handleLookup = async () => {
    if (!inviteEmail.trim()) return
    setLookingUp(true)
    setUserFound(false)
    setInviteUserId('')
    setInviteName('')
    try {
      const res = await axiosClient.post('/api/admin/organization/find-admin-by-email', { email: inviteEmail.trim() }, { silent: true })
      const user = res.data?.data
      setInviteUserId(user?.userId || user?._id || '')
      setInviteName(user?.name || user?.userName || '')
      setUserFound(true)
    } catch {
      // handled by interceptor
    } finally {
      setLookingUp(false)
    }
  }

  // Step 2: final invite
  const handleInvite = async () => {
    if (!userFound) return
    setInviting(true)
    try {
      await axiosClient.post(
        '/api/admin/organization/invite-admin',
        {
          organizationId: organization._id,
          email: inviteEmail.trim(),
          userId: inviteUserId,
          name: inviteName,
        },
        { silent: true },
      )
      toast.success('Admin invited successfully')
      setInviteEmail('')
      setInviteUserId('')
      setInviteName('')
      setUserFound(false)
      fetchAdmins()
    } catch {
      // handled by interceptor
    } finally {
      setInviting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(var(--bs-dark-rgb), 0.5)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Window box — uses theme card colors so it works in dark mode */}
      <div
        className="card mb-0"
        style={{
          width: '100%',
          maxWidth: 660,
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 'var(--bs-card-border-radius)',
          boxShadow: '0 10px 40px rgba(var(--bs-dark-rgb), 0.2)',
        }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ borderBottom: '1px solid var(--bs-border-color)' }}>
          <div>
            <h5 className="mb-0 fw-semibold">Admin View</h5>
            <small className="text-muted">{organization.name}</small>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <div className="px-4 py-3">
          {/* Current admins table */}
          <div className="table-responsive mb-4">
            <table className="table table-sm text-nowrap mb-0">
              <thead className="bg-light bg-opacity-50">
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {loadingAdmins ? (
                  <tr>
                    <td colSpan="4" className="text-center py-3">
                      Loading...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-3 text-muted">
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.userId || admin._id}>
                      <td className="text-muted" style={{ fontSize: 12 }}>
                        {admin.userId || admin._id || '--'}
                      </td>
                      <td>{admin.name || admin.userName || '--'}</td>
                      <td>{admin.email || '--'}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="soft-danger"
                          className="p-1"
                          title="Remove admin"
                          onClick={() => handleDelete(admin.userId || admin._id)}>
                          <IconifyIcon icon="bx:trash" style={{ fontSize: 15 }} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Invite new admin */}
          <div style={{ borderTop: '1px solid var(--bs-border-color)', paddingTop: 20 }}>
            <h6 className="fw-semibold mb-3">Invite New Admin</h6>

            {/* Email + Find User */}
            <div className="d-flex gap-2 mb-2">
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="Enter email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value)
                  if (userFound) {
                    setUserFound(false)
                    setInviteUserId('')
                    setInviteName('')
                  }
                }}
              />
              <Button
                size="sm"
                variant="soft-secondary"
                style={{ whiteSpace: 'nowrap' }}
                onClick={handleLookup}
                disabled={lookingUp || !inviteEmail.trim()}>
                {lookingUp ? 'Searching...' : 'Find User'}
              </Button>
            </div>

            {/* Auto-filled User ID & Name */}
            <div className="d-flex gap-2 mb-3">
              <input type="text" className="form-control form-control-sm" placeholder="User ID" value={inviteUserId} readOnly />
              <input type="text" className="form-control form-control-sm" placeholder="Name" value={inviteName} readOnly />
            </div>

            <div className="d-flex justify-content-end">
              <Button size="sm" variant="primary" onClick={handleInvite} disabled={!userFound || inviting}>
                {inviting ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main View ───────────────────────────────────────────────────────────────

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

  const [adminModalOrg, setAdminModalOrg] = useState(null)

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
    <>
      {adminModalOrg && <AdminViewModal organization={adminModalOrg} onClose={() => setAdminModalOrg(null)} />}

      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center gap-2">
                <div style={{ width: 300 }}>
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
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    setCurrentPage(1)
                    setSearch(searchInput)
                  }}>
                  Apply
                </Button>
              </div>
            </CardBody>

            <div className="table-responsive table-centered">
              <table className="table text-nowrap mb-0">
                <thead className="bg-light bg-opacity-50">
                  <tr>
                    <th>Name</th>
                    <th>CL Days</th>
                    <th>Type</th>
                    <th>IP Address</th>
                    <th>Founded At</th>
                    <th>Admin</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        Loading...
                      </td>
                    </tr>
                  ) : organizations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    organizations.map((organization) => (
                      <tr key={organization._id}>
                        <td>{organization.name || '--'}</td>
                        <td>{organization.clDays || '--'}</td>
                        <td>{organization.type || '--'}</td>
                        <td>{organization.IPWhitelist?.[0] || '--'}</td>
                        <td>{organization.foundedAt || '--'}</td>
                        <td>
                          <Button variant="soft-secondary" size="sm" onClick={() => setAdminModalOrg(organization)}>
                            <IconifyIcon icon="bx:user-circle" className="me-1" style={{ fontSize: 14 }} />
                            Admin View
                          </Button>
                        </td>
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
    </>
  )
}

export default ViewOrganization
