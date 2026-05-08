import { Fragment, useEffect, useState } from 'react'
import { CardBody, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Offcanvas } from 'react-bootstrap'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { getAllFriends, getAllPendingRequests } from '@/helpers/data'
import useViewPort from '@/hooks/useViewPort'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
export const FriendListItem = ({ avatar, mutualCount, name, hasRequested }) => {
  return (
    <div className="d-flex position-relative">
      <div className="flex-shrink-0">
        <img src={avatar} className="img-fluid avatar-sm rounded me-2" alt={name + '-avatar'} />
      </div>
      <div className={`flex-grow-1 ${hasRequested ? 'text-truncate' : 'text-nowrap'}`}>
        {!hasRequested && (
          <Dropdown placement="bottom-end" className="float-end">
            <DropdownToggle as="span" role="button" className="arrow-none text-dark">
              <IconifyIcon icon="bx:dots-vertical-rounded" className="fs-18" />
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
              <DropdownItem as="span" role="button">
                <IconifyIcon icon="bxs:user-detail" className="me-1" />
                See Profile
              </DropdownItem>
              <DropdownItem as="span" role="button">
                <IconifyIcon icon="bxl:telegram" className="me-1" />
                Message to {name}
              </DropdownItem>
              <DropdownItem as="span" role="button">
                <IconifyIcon icon="bx:user-x" className="me-1" />
                Unfriend {name}
              </DropdownItem>
              <DropdownItem as="span" role="button">
                <IconifyIcon icon="bx:block" className="me-1" />
                Block {name}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}

        <p className="mb-0">
          <span role="button" className="text-dark">
            <b>{name}</b>
            {hasRequested && ' sent you a request'}
          </span>
        </p>
        <small>{mutualCount} mutual friends</small>
        <br />
      </div>
    </div>
  )
}
const FriendsListView = ({ pendingRequests, friendsList }) => {
  return (
    <SimplebarReactClient className="card h-100">
      <CardBody>
        <CardTitle as={'h5'} className="mb-3">
          Friends
        </CardTitle>
        <form className="chat-search">
          <div className="chat-search-box">
            <input className="form-control" type="text" name="search" placeholder="Search ..." />
            <IconifyIcon icon="bx:search-alt" className="search-icon" />
          </div>
        </form>
        <h5 className="mb-3">Pending Requests ({pendingRequests ? pendingRequests.length : 0})</h5>

        {pendingRequests ? (
          pendingRequests.map((user, idx) => (
            <Fragment key={user.id}>
              <FriendListItem {...user} />
              {pendingRequests.length - 1 !== idx && <hr className="mb-3" />}
            </Fragment>
          ))
        ) : (
          <p className="text-center ">No Pending requests</p>
        )}
      </CardBody>
      <CardBody className="border-top">
        <CardTitle as={'h5'} className="mb-3">
          My Friends
        </CardTitle>

        {friendsList ? (
          friendsList.map((friend, idx) => (
            <Fragment key={friend.id}>
              <FriendListItem {...friend} />
              {friendsList.length - 1 !== idx && <hr className="mb-3" />}
            </Fragment>
          ))
        ) : (
          <p className="text-center">Guess who has no friends</p>
        )}
      </CardBody>
    </SimplebarReactClient>
  )
}
const MyFriendsList = ({ open, toggle }) => {
  const { width } = useViewPort()
  const [pendingRequests, setPendingRequests] = useState()
  const [friendsList, setFriendsList] = useState()
  useEffect(() => {
    const fetchPendingRequests = async () => {
      const requestsData = await getAllPendingRequests()
      if (requestsData) setPendingRequests(requestsData)
    }
    const fetchFriends = async () => {
      const friendsData = await getAllFriends()
      if (friendsData) setFriendsList(friendsData)
    }
    fetchPendingRequests()
    fetchFriends()
  }, [])
  return (
    <div className="sticky-bar">
      {width > 1400 ? (
        <FriendsListView friendsList={friendsList} pendingRequests={pendingRequests} />
      ) : (
        <Offcanvas
          show={open}
          onHide={toggle}
          placement="end"
          className="offcanvas-xxl"
          tabIndex={-1}
          style={{
            width: 300,
          }}>
          <FriendsListView friendsList={friendsList} pendingRequests={pendingRequests} />
        </Offcanvas>
      )}
    </div>
  )
}
export default MyFriendsList
