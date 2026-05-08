import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  TabPane,
} from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { getFriendsGroups, getJoinedGroups, getSuggestedGroups } from '@/helpers/data'
import { toAlphaNumber } from '@/utils/change-casing'
import GroupCard from './GroupCard'
const JoinedGroupsListItem = ({ membersCount, image, name }) => {
  return (
    <div className="d-flex align-items-center position-relative mb-3">
      <div className="flex-shrink-0">
        <img src={image} className="img-fluid avatar-md rounded-circle me-2" alt="group-9" />
      </div>
      <div className="flex-grow-1">
        <p className="mb-0 fw-medium">
          <span className="stretched-link">{name}</span>
        </p>
        <small>{toAlphaNumber(membersCount)} members</small>
        <br />
      </div>
    </div>
  )
}
const JoinedGroups = () => {
  const [joinedGroups, setJoinedGroups] = useState()
  useEffect(() => {
    const fetchJoinedGroups = async () => {
      const fetchedGroups = await getJoinedGroups()
      if (fetchedGroups) setJoinedGroups(fetchedGroups)
    }
    fetchJoinedGroups()
  }, [])
  return (
    <Card>
      <CardBody className="px-0">
        <div className="px-3 mb-3 icons-center w-100">
          <CardTitle className="me-auto">Groups</CardTitle>
          <Dropdown className="float-end" align="end">
            <DropdownToggle as="span" role="button" className="arrow-none text-dark">
              <IconifyIcon icon="bx:cog" className="fs-18" />
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
              <DropdownHeader className="fs-14 fw-medium">Notification Setting</DropdownHeader>
              <DropdownItem className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <IconifyIcon icon="bx:notification" className="me-2" />
                </div>
                <div className="flex-grow-1">
                  <div className="form-check form-switch mb-0 float-end">
                    <input className="form-check-input" type="checkbox" defaultChecked />
                  </div>
                  <p className="mb-0">Show Notification Dots</p>
                </div>
              </DropdownItem>
              <DropdownDivider />
              <DropdownHeader className="fs-14 fw-medium">Manage Groups</DropdownHeader>
              <DropdownItem className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <IconifyIcon icon="bx:pin" className="me-2 fs-18" />
                </div>
                <div className="flex-grow-1">
                  <p className="mb-0">Pins</p>
                  <small className="text-muted">Pins your favorite groups for quick access.</small>
                </div>
              </DropdownItem>
              <DropdownItem className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <IconifyIcon icon="bx:user-plus" className="me-2 fs-18" />
                </div>
                <div className="flex-grow-1">
                  <p className="mb-0">Following</p>
                  <small className="text-muted">Follow or unfollow groups to control what you see in Newsfeed</small>
                </div>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="chat-search px-3">
          <div className="chat-search-box">
            <input className="form-control" type="text" name="search" placeholder="Search ..." />
            <IconifyIcon icon="bx:search-alt" className="search-icon" />
          </div>
        </div>

        {joinedGroups ? (
          <>
            <h5 className="px-3 mb-3">Groups you have joined</h5>
            <SimplebarReactClient
              className="px-3 mb-2"
              style={{
                maxHeight: 215,
              }}>
              {joinedGroups.map((group) => (
                <JoinedGroupsListItem key={group.id} {...group} />
              ))}
            </SimplebarReactClient>
          </>
        ) : (
          <h4 className="text-center ">You have not joined any groups yet</h4>
        )}

        <div className="d-grid">
          <Button variant="soft-primary" className="mx-3">
            <IconifyIcon icon="bx:plus" className="me-1" />
            Create New Group
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
const FriendsGroups = () => {
  const [friendsGroups, setFriendsGroups] = useState()
  useEffect(() => {
    const fetchFriendsGroups = async () => {
      const fetchedGroups = await getFriendsGroups()
      if (fetchedGroups) setFriendsGroups(fetchedGroups)
    }
    fetchFriendsGroups()
  }, [])
  return (
    <>
      <CardTitle as={'h5'} className="mb-3">
        Friends Group
      </CardTitle>
      <Row>
        {friendsGroups ? (
          friendsGroups.map((group) => (
            <Col lg={6} key={group.id}>
              <GroupCard {...group} />
            </Col>
          ))
        ) : (
          <h4 className="text-center ">Loading friends groups...</h4>
        )}
      </Row>
    </>
  )
}
const SuggestedGroups = () => {
  const [suggestedGroups, setSuggestedGroups] = useState()
  useEffect(() => {
    const fetchSuggestedGroups = async () => {
      const fetchedGroups = await getSuggestedGroups()
      if (fetchedGroups) setSuggestedGroups(fetchedGroups)
    }
    fetchSuggestedGroups()
  }, [])
  return (
    <>
      <CardTitle as={'h5'} className="mb-3">
        Suggested For You
      </CardTitle>
      <Row>
        {suggestedGroups ? (
          suggestedGroups.map((group) => (
            <Col lg={6} key={group.id}>
              <GroupCard {...group} />
            </Col>
          ))
        ) : (
          <h4 className="text-center ">Loading Suggested groups...</h4>
        )}
      </Row>
    </>
  )
}
const GroupsTab = () => {
  return (
    <TabPane eventKey="Groups" className="fade">
      <JoinedGroups />

      <FriendsGroups />

      <SuggestedGroups />
    </TabPane>
  )
}
export default GroupsTab
