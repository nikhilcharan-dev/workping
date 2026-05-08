import { memo } from 'react'
import { Col, TabContainer } from 'react-bootstrap'
import useToggle from '@/hooks/useToggle'
import MyFriendsList from './MyFriendsList'
import NavigationMenu from './NavigationMenu'
import SocialOffcanvasToggler from './SocialOffcanvasToggler'
import SocialTabsList from './SocialTabsList'
const MemoNavigationMenu = memo(NavigationMenu)
const MemoMyFriendsList = memo(MyFriendsList)
const MemoSocialTabsList = memo(SocialTabsList)
const SocialView = () => {
  const { isTrue: openFriendsOffcanvas, toggle: toggleFriendsOffcanvas } = useToggle()
  const { isTrue: openNavigationOffcanvas, toggle: toggleNavigationOffcanvas } = useToggle()
  return (
    <>
      <TabContainer defaultActiveKey="Feed" mountOnEnter>
        <Col xxl={3} className="mb-5 d-none d-xxl-block">
          <MemoNavigationMenu open={openNavigationOffcanvas} toggle={toggleNavigationOffcanvas} />
        </Col>

        <Col xxl={6}>
          <SocialOffcanvasToggler toggleFriendsOffcanvas={toggleFriendsOffcanvas} toggleNavigationOffcanvas={toggleNavigationOffcanvas} />

          <MemoSocialTabsList />
        </Col>
      </TabContainer>

      <Col xxl={3} className="mb-5">
        <MemoMyFriendsList open={openFriendsOffcanvas} toggle={toggleFriendsOffcanvas} />
      </Col>
    </>
  )
}
export default SocialView
