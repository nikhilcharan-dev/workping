import { useEffect, useRef } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useLayoutContext } from '@/context/useLayoutContext'
import useViewPort from '@/hooks/useViewPort'
import { useLocation } from 'react-router-dom'
const MOBILE_BREAKPOINT = 1280
const LeftSideBarToggle = () => {
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
    toggleBackdrop,
    showBackdrop,
  } = useLayoutContext()
  const { width } = useViewPort()
  const isMobile = width <= MOBILE_BREAKPOINT
  const { pathname } = useLocation()
  const prevIsMobile = useRef(isMobile)

  // On mount: clean up any stale sidebar-enable class and set correct state
  useEffect(() => {
    document.documentElement.classList.remove('sidebar-enable')
    if (isMobile) {
      changeMenuSize('hidden')
    } else {
      changeMenuSize('default')
    }
  }, [])

  // When viewport crosses the breakpoint: auto-adjust sidebar
  useEffect(() => {
    if (prevIsMobile.current === isMobile) return
    prevIsMobile.current = isMobile
    // Always clean the class when crossing breakpoints; toggleBackdrop handles state
    if (showBackdrop) toggleBackdrop()
    document.documentElement.classList.remove('sidebar-enable')
    if (isMobile) {
      changeMenuSize('hidden')
    } else {
      changeMenuSize('default')
    }
  }, [isMobile])

  // Close backdrop on route change (mobile overlay close)
  useEffect(() => {
    if (showBackdrop) {
      toggleBackdrop()
      changeMenuSize('hidden')
    }
  }, [pathname])

  const handleMenuSize = () => {
    if (size === 'hidden') {
      changeMenuSize('default')
      if (isMobile) toggleBackdrop()
    } else {
      if (showBackdrop) toggleBackdrop()
      changeMenuSize('hidden')
    }
  }

  return (
    <div className="topbar-item">
      <button onClick={handleMenuSize} type="button" className="button-toggle-menu">
        <IconifyIcon icon="iconamoon:menu-burger-horizontal" className="fs-22" />
      </button>
    </div>
  )
}
export default LeftSideBarToggle
