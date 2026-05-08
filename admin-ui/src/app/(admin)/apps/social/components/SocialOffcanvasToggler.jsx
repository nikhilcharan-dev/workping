import { Button, Card } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
const SocialOffcanvasToggler = ({ toggleFriendsOffcanvas, toggleNavigationOffcanvas }) => {
  return (
    <Card className="d-xxl-none d-flex">
      <div className="d-flex gap-2 align-items-center p-2">
        <Button variant="light" onClick={toggleNavigationOffcanvas} className="px-2 d-inline-flex align-items-center">
          <IconifyIcon icon="bx:menu" className="fs-18" />
        </Button>

        <h5 className="me-auto mb-0">Gatson Keller</h5>

        <Button variant="light" onClick={toggleFriendsOffcanvas} className="px-2 d-inline-flex align-items-center">
          <IconifyIcon icon="bx:menu" className="fs-18" />
        </Button>
      </div>
    </Card>
  )
}
export default SocialOffcanvasToggler
