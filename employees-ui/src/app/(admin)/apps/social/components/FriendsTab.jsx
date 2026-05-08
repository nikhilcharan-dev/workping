import { useEffect, useState } from 'react'
import {
  Card,
  CardBody,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Nav,
  NavItem,
  NavLink,
  TabContainer,
  TabContent,
  TabPane,
} from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllFriends, getAllPendingRequests } from '@/helpers/data'
const FriendListCard = ({ avatar, mutualCount, name }) => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <img src={avatar} className="img-fluid avatar-md rounded me-2" alt={name + '-avatar'} />
          </div>
          <div className="flex-grow-1">
            <h5 className="icons-center w-100">
              <span role="button" className="text-reset me-auto mb-0">
                {name}
              </span>
              <Dropdown className="float-end" align="end">
                <DropdownToggle as="span" role="button" className="arrow-none text-dark">
                  <IconifyIcon icon="bx:dots-vertical-rounded" className="fs-18" />
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem className="icons-center">
                    <IconifyIcon icon="bxs:user-detail" className="me-1" />
                    See Profile
                  </DropdownItem>
                  <DropdownItem className="icons-center">
                    <IconifyIcon icon="bxl:telegram" className="me-1" />
                    Message to {name}
                  </DropdownItem>
                  <DropdownItem className="icons-center">
                    <IconifyIcon icon="bx:user-x" className="me-1" />
                    Unfriend {name}
                  </DropdownItem>
                  <DropdownItem className="icons-center">
                    <IconifyIcon icon="bx:block" className="me-1" />
                    Block {name}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </h5>
            <p className="mb-0"> {mutualCount} mutual friends</p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
const AllFriendsList = () => {
  const [friendsList, setFriendsList] = useState()
  useEffect(() => {
    const fetchFriends = async () => {
      const list = await getAllFriends()
      if (list) setFriendsList(list)
    }
    fetchFriends()
  }, [])
  return (
    <TabPane eventKey="friends-list">
      {friendsList ? (
        friendsList.map((friend) => <FriendListCard key={friend.id} {...friend} />)
      ) : (
        <h4 className="text-center ">Guess who has no friends</h4>
      )}
    </TabPane>
  )
}
const PendingFriendRequests = () => {
  const [pendingRequests, setPendingRequests] = useState()
  useEffect(() => {
    const fetchRequests = async () => {
      const list = await getAllPendingRequests()
      if (list) setPendingRequests(list)
    }
    fetchRequests()
  }, [])
  return (
    <TabPane eventKey="pending-requests">
      {pendingRequests ? (
        pendingRequests.map((friend) => <FriendListCard key={friend.id} {...friend} />)
      ) : (
        <h4 className="text-center ">No Pending requests</h4>
      )}
    </TabPane>
  )
}
const FriendsTab = () => {
  return (
    <TabPane eventKey="Friends" className="fade" id="social-friends" role="tabpanel" aria-labelledby="social-friends-tab">
      <TabContainer defaultActiveKey="friends-list" mountOnEnter>
        <Nav variant="pills">
          <NavItem>
            <NavLink as="span" role="button" eventKey="friends-list" className="px-4 fw-semibold">
              <span>All Friends</span>
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink as="span" role="button" eventKey="pending-requests" className="px-4 fw-semibold">
              <span>Pending Requests (2)</span>
            </NavLink>
          </NavItem>
        </Nav>
        <TabContent className="mt-3 pt-0 text-muted">
          <AllFriendsList />

          <PendingFriendRequests />
        </TabContent>
      </TabContainer>
    </TabPane>
  )
}
export default FriendsTab
