import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllCustomers } from '@/helpers/data'
const ContactCard = ({ contact }) => {
  const { address, name, image, phone } = contact
  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <img src={image} alt="avatar-1" className="img-fluid avatar-xl img-thumbnail rounded-circle avatar-border" />
          <h4 className="mt-3 fs-18">
            <span role="button" className="text-dark">
              {name}
            </span>
          </h4>
          <span role="button" className="mb-1 d-inline-block icons-center">
            <IconifyIcon icon="bx:location-plus" className="text-danger fs-14 me-1" />
            {address}
          </span>
          <br />
          <span role="button">
            <IconifyIcon icon="bx:phone-call" className="text-success fs-14 me-1" />
            {phone}
          </span>
          <br />
          <Link to="/pages/profile" className="btn btn-sm btn-outline-primary mt-3">
            View Profile
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
const Contacts = () => {
  const [contactData, setContactData] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getAllCustomers()
      setContactData(data)
    })()
  }, [])
  return (
    <>
      <PageBreadcrumb subName="Apps" title="Contacts" />
      <PageMetaData title="Contacts" />

      <Row className="row-cols-1 row-cols-md-2 row-cols-xl-4 gx-3">
        {contactData?.map((contact, idx) => (
          <Col key={idx}>
            <ContactCard contact={contact} />
          </Col>
        ))}
      </Row>
    </>
  )
}
export default Contacts
