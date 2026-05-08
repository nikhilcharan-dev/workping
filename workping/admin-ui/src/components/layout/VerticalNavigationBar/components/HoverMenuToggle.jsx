import { useEffect } from 'react'
import { useLayoutContext } from '@/context/useLayoutContext'
import useViewPort from '@/hooks/useViewPort'

const HoverMenuToggle = () => {
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
  } = useLayoutContext()

  const { width } = useViewPort()

  // Auto-hide on mobile, restore to default on desktop/tablet
  useEffect(() => {
    if (width <= 768) {
      if (size !== 'hidden') changeMenuSize('hidden')
    } else {
      if (size === 'hidden') changeMenuSize('default')
    }
  }, [width])

  return null
}

export default HoverMenuToggle
