import { lazy, Suspense } from 'react'
import LeftSideBarToggle from './components/LeftSideBarToggle'
import ProfileDropdown from './components/ProfileDropdown'
import SearchBox from './components/SearchBox'
import ThemeModeToggle from './components/ThemeModeToggle'
const Notifications = lazy(() => import('./components/Notifications'))
const TopNavigationBar = () => {
  return (
    <header className="topbar">
      <div className="container-xxl">
        <div className="navbar-header">
          <div className="d-flex align-items-center gap-2">
            <LeftSideBarToggle />
            <SearchBox />
          </div>
          <div className="d-flex align-items-center gap-1">
            {/* Toggle Theme Mode */}
            <ThemeModeToggle />

            {/* Notification Dropdown */}
            <Suspense>
              <Notifications />
            </Suspense>

            {/* Admin Profile Dropdown */}
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}
export default TopNavigationBar
