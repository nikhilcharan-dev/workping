import { useState } from 'react'
import { Button, Card, CardBody, Col, Form, Row } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { contactUs, developedBy } from '@/context/constants'

const contactItems = [
  {
    icon: 'iconamoon:email-duotone',
    label: 'Email',
    value: contactUs,
    href: `mailto:${contactUs}`,
  },
  {
    icon: 'iconamoon:location-pin-duotone',
    label: 'Office',
    value: 'India',
    href: null,
  },
  {
    icon: 'iconamoon:clock-duotone',
    label: 'Support Hours',
    value: 'Mon – Fri, 9 AM – 6 PM IST',
    href: null,
  },
]

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Placeholder: wire up to your backend/mailer microservice
    setSubmitted(true)
  }

  return (
    <>
      <PageMetaData title="Contact Us" />

      <div className="text-center mb-5">
        <h1 className="fw-bold">Contact Us</h1>
        <p className="text-muted fs-5 mt-2 mx-auto" style={{ maxWidth: 520 }}>
          Have a question or need help? We&apos;re here for you. Reach out and our team will respond promptly.
        </p>
      </div>

      <Row className="g-4 justify-content-center">
        {/* Contact Info */}
        <Col lg={4}>
          <Card className="h-100 shadow-sm border-0">
            <CardBody className="p-4">
              <h5 className="fw-semibold mb-4">Get in Touch</h5>
              <div className="d-flex flex-column gap-4">
                {contactItems.map((item, idx) => (
                  <div key={idx} className="d-flex align-items-start gap-3">
                    <div className="avatar-md flex-shrink-0">
                      <span className="avatar-title bg-primary bg-opacity-10 text-primary fs-22 rounded-circle">
                        <IconifyIcon icon={item.icon} />
                      </span>
                    </div>
                    <div>
                      <p className="fw-semibold mb-0 text-uppercase fs-12">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-muted text-decoration-none">
                          {item.value}
                        </a>
                      ) : (
                        <span className="text-muted">{item.value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <hr className="my-4" />

              <p className="fw-semibold mb-2 text-uppercase fs-12">Follow Us</p>
              <div className="d-flex gap-2">
                <a href="#" className="btn btn-sm btn-outline-secondary rounded-circle p-1 lh-1" aria-label="Twitter">
                  <IconifyIcon icon="bxl:twitter" className="fs-18" />
                </a>
                <a href="#" className="btn btn-sm btn-outline-secondary rounded-circle p-1 lh-1" aria-label="LinkedIn">
                  <IconifyIcon icon="bxl:linkedin" className="fs-18" />
                </a>
                <a href="#" className="btn btn-sm btn-outline-secondary rounded-circle p-1 lh-1" aria-label="Instagram">
                  <IconifyIcon icon="bxl:instagram-alt" className="fs-18" />
                </a>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Contact Form */}
        <Col lg={7}>
          <Card className="shadow-sm border-0">
            <CardBody className="p-4 p-lg-5">
              {submitted ? (
                <div className="text-center py-4">
                  <div className="avatar-lg mx-auto mb-3">
                    <span className="avatar-title bg-success bg-opacity-10 text-success fs-36 rounded-circle">
                      <IconifyIcon icon="iconamoon:check-circle-1-duotone" />
                    </span>
                  </div>
                  <h4 className="fw-semibold mb-2">Message Sent!</h4>
                  <p className="text-muted">Thanks for reaching out. The {developedBy} team will get back to you shortly.</p>
                  <Button variant="primary" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <h5 className="fw-semibold mb-4">Send Us a Message</h5>
                  <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                      <Col sm={6}>
                        <Form.Group>
                          <Form.Label>Full Name</Form.Label>
                          <Form.Control type="text" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
                        </Form.Group>
                      </Col>
                      <Col sm={6}>
                        <Form.Group>
                          <Form.Label>Email Address</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Subject</Form.Label>
                          <Form.Control
                            type="text"
                            name="subject"
                            placeholder="How can we help?"
                            value={form.subject}
                            onChange={handleChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label>Message</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={5}
                            name="message"
                            placeholder="Tell us more about your question or issue..."
                            value={form.message}
                            onChange={handleChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={12}>
                        <Button type="submit" variant="primary" className="px-4">
                          Send Message
                          <IconifyIcon icon="iconamoon:send-duotone" className="ms-2 fs-16" />
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Contact
