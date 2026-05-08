import { useEffect, useState } from 'react'
import { CardBody, Nav, NavLink, Offcanvas } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { getAllEvents } from '@/helpers/data'
import useViewPort from '@/hooks/useViewPort'
import { getEventIcon } from '@/utils/get-icons'
import profileAvatar from '@/assets/images/users/avatar-1.jpg'
const EventsList = () => {
  const [eventsList, setEventsList] = useState()
  useEffect(() => {
    const fetchEvents = async () => {
      const data = await getAllEvents()
      setEventsList(data)
    }
    fetchEvents()
  }, [])
  return (
    <div className="border-top">
      <h6 className="text-uppercase px-3 py-2 mb-0">Events</h6>
      <div className="list-group list-group-flush">
        {eventsList ? (
          eventsList.map(({ title, type, id }) => (
            <span key={id} role="button" className="list-group-item list-group-item-action border-0 icons-center">
              <IconifyIcon icon={getEventIcon(type)} className="align-middle me-1" />
              {title}
            </span>
          ))
        ) : (
          <h6 className="text-center">No Upcoming Events</h6>
        )}
      </div>
    </div>
  )
}
const ProfileNavbar = () => {
  return (
    <SimplebarReactClient className="card h-100">
      <CardBody className="pb-2">
        <div className="d-flex flex-column text-center justify-content-center mb-3">
          <div className="mx-auto border border-2 border-primary rounded-circle">
            <img src={profileAvatar} className="avatar-md rounded-circle border border-2 border-transparent" alt="profile-avatar" />
          </div>
          <h5 className="mt-2 mb-1">Gatson Keller</h5>
          <p className="text-muted">California, USA</p>
          <p className="text-muted fst-italic">Hi I&apos;m Cynthia Price,has been the industry&apos;s standard dummy text To an English person.</p>
        </div>
        <div className="hstack gap-3 text-center justify-content-evenly">
          <div>
            <h5 className="mb-0">389</h5>
            <small>Post</small>
          </div>
          <div>
            <h5 className="mb-0">5K</h5>
            <small>Followers</small>
          </div>
          <div>
            <h5 className="mb-0">210</h5>
            <small>Following</small>
          </div>
        </div>
        <hr />
        <Nav className="flex-column mt-3" role="tablist" aria-orientation="vertical">
          <NavLink as="span" role="button" eventKey="Feed" className="px-0 fs-14 fw-medium icons-center">
            <IconifyIcon icon="bx:rss" className="align-middle fs-15 me-2" />
            Feed
          </NavLink>
          <NavLink as="span" role="button" eventKey="Friends" className="px-0 fs-14 fw-medium icons-center">
            <IconifyIcon icon="bx:user-circle" className="align-middle fs-15 me-2" />
            Friends
          </NavLink>
          <NavLink as="span" role="button" eventKey="Events" className="px-0 fs-14 fw-medium icons-center">
            <IconifyIcon icon="bx:calendar-heart" className="align-middle fs-15 me-2" />
            Events
          </NavLink>
          <NavLink as="span" role="button" eventKey="Groups" className="px-0 fs-14 fw-medium icons-center">
            <IconifyIcon icon="bx:group" className="align-middle fs-15 me-2" />
            Groups
          </NavLink>
          <NavLink as="span" role="button" eventKey="Saved" className="px-0 fs-14 fw-medium icons-center">
            <IconifyIcon icon="bx:save" className="align-middle fs-15 me-2" />
            Saved
          </NavLink>
          <NavLink as="span" role="button" eventKey="Memories" className="px-0 fs-14 fw-medium icons-center">
            <IconifyIcon icon="bx:history" className="align-middle fs-15 me-2" />
            Memories
          </NavLink>
        </Nav>
      </CardBody>

      <EventsList />
    </SimplebarReactClient>
  )
}
const NavigationMenu = ({ open, toggle }) => {
  const { width } = useViewPort()
  return (
    <div className="sticky-bar">
      {width > 1400 ? (
        <ProfileNavbar />
      ) : (
        <Offcanvas show={open} onHide={toggle} placement="start" className="offcanvas-xxl" tabIndex={-1}>
          <ProfileNavbar />
        </Offcanvas>
      )}
    </div>
  )
}
export default NavigationMenu
