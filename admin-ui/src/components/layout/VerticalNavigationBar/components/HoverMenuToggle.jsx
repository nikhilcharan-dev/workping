import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLayoutContext } from '@/context/useLayoutContext'
import useViewPort from '@/hooks/useViewPort'

const HoverMenuToggle = () => {
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
  } = useLayoutContext()

  const { width } = useViewPort()
  const { pathname } = useLocation()

  // Auto-hide on mobile, restore to default on desktop/tablet
  // Runs on viewport resize AND on route change / page reload
  useEffect(() => {
    if (width <= 768) {
      if (size !== 'hidden') changeMenuSize('hidden')
    } else {
      if (size === 'hidden') changeMenuSize('default')
    }
  }, [width, pathname])

  return null
}

export default HoverMenuToggle
