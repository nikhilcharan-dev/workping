import { lazy, Suspense, useMemo } from 'react'
import FallbackLoading from '@/components/FallbackLoading'
import LogoBox from '@/components/LogoBox'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { getMenuItems } from '@/helpers/menu'
import usePendingLeaveCount from '@/hooks/usePendingLeaveCount'
import HoverMenuToggle from './components/HoverMenuToggle'
import SidebarBilling from './components/SidebarBilling'
const AppMenu = lazy(() => import('./components/AppMenu'))

const VerticalNavigationBar = () => {
  const menuItems = getMenuItems()
  const { count } = usePendingLeaveCount()

  const enhancedMenuItems = useMemo(() => {
    if (!count) return menuItems
    return menuItems.map((item) => {
      if (item.key !== 'attendance') return item
      return {
        ...item,
        children: item.children?.map((child) => {
          if (child.key !== 'leave-approval') return child
          return {
            ...child,
            badge: { variant: 'danger', text: count > 99 ? '99+' : String(count) },
          }
        }),
      }
    })
  }, [menuItems, count])

  return (
    <div className="main-nav" id="leftside-menu-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <LogoBox
        containerClassName="logo-box"
        squareLogo={{
          className: 'logo-sm',
        }}
        textLogo={{
          className: 'logo-lg',
        }}
      />

      <HoverMenuToggle />
      <SimplebarReactClient className="scrollbar" style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={<FallbackLoading />}>
          <AppMenu menuItems={enhancedMenuItems} />
        </Suspense>
      </SimplebarReactClient>
      <SidebarBilling />
    </div>
  )
}
export default VerticalNavigationBar
