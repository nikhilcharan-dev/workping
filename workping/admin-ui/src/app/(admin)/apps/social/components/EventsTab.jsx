import { useEffect, useState } from 'react'
import { Button, Card, CardBody, CardTitle, Col, Row, TabPane } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllEvents } from '@/helpers/data'
const EventCard = ({ image, startsAt, title, venue }) => {
  return (
    <Card>
      <img src={image} alt={title + '-event'} className="card-img-top img-fluid" />
      <CardBody>
        <h6>{new Date(startsAt).toLocaleString()}</h6>
        <CardTitle as={'h5'} className="fs-16 lh-base mb-1">
          {title}
        </CardTitle>
        <p className="card-text text-muted">{venue}</p>
        <div className="d-flex gap-1">
          <Button variant="primary" className="flex-centered w-100">
            <IconifyIcon icon="bxs:star" />
            Interested
          </Button>
          <Button variant="primary" className="flex-centered">
            <IconifyIcon icon="bxl:telegram" />
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
const EventsTab = () => {
  const [eventsList, setEventsList] = useState()
  useEffect(() => {
    const fetchEvents = async () => {
      const fetchedEvents = await getAllEvents()
      if (fetchedEvents) setEventsList(fetchedEvents)
    }
    fetchEvents()
  }, [])
  return (
    <TabPane eventKey="Events" className="fade">
      <Row>
        {eventsList ? (
          eventsList.map((event) => (
            <Col lg={6} key={event.id}>
              <EventCard {...event} />
            </Col>
          ))
        ) : (
          <h4 className="text-center">No Events coming soon</h4>
        )}
      </Row>
    </TabPane>
  )
}
export default EventsTab
