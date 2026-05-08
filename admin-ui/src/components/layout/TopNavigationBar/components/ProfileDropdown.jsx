import { Link } from 'react-router-dom'
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
import { useNavigate } from 'react-router-dom'
import axiosClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'
import { useLockContext } from '@/context/useLockContext'

const ProfileDropdown = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuthContext()
  const { lock } = useLockContext()

  const handleLogout = async () => {
    try {
      const res = await axiosClient.post('/api/admin/auth/logout')

      if (res.status === 200) {
        logout()
        navigate('/auth/sign-in')
      }
    } catch (error) {
      // Error toast handled by interceptor
    }
  }

  return (
    <Dropdown className="topbar-item" align={'end'}>
      <DropdownToggle
        as="button"
        type="button"
        className="topbar-button content-none"
        id="page-header-user-dropdown"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false">
        <span className="d-flex align-items-center">
          <img className="rounded-circle" width={32} height={32} src={user?.profileImage ?? avatar1} alt="avatar-3" />
        </span>
      </DropdownToggle>
      <DropdownMenu>
        <DropdownHeader as="h6">
          <div>{user?.name ?? 'Welcome!'}</div>
          {user?.email && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.65 }}>{user.email}</div>}
        </DropdownHeader>
        <DropdownItem as={Link} to="/pages/profile">
          <IconifyIcon icon="bx:user-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Profile</span>
        </DropdownItem>

        <DropdownItem onClick={lock}>
          <IconifyIcon icon="bx:lock" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Lock screen</span>
        </DropdownItem>
        <DropdownDivider className="dropdown-divider my-1" />
        <DropdownItem className="text-danger" onClick={handleLogout}>
          <IconifyIcon icon="bx:log-out" className="fs-18 align-middle me-1" />
          <span className="align-middle">Logout</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
export default ProfileDropdown
