import { yupResolver } from '@hookform/resolvers/yup'
import { Button, Card, CardBody, CardHeader, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, FormCheck, Row } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import TextAreaFormInput from '@/components/form/TextAreaFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
const ContactForm = () => {
  const contactFormSchema = yup.object({
    fName: yup.string().required('please enter your first name'),
    lName: yup.string().required('please enter your last name'),
    email: yup.string().email('please enter valid email').required('please enter your last name'),
    message: yup.string().required('please enter your message'),
  })
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(contactFormSchema),
  })
  return (
    <Card className="mb-0 shadow-none border-0">
      <CardHeader className="bg-light-subtle border-0">
        <h4 className="mb-0">Ask your different questions</h4>
      </CardHeader>
      <CardBody>
        <form className="authentication-form" onSubmit={handleSubmit(() => {})}>
          <Row className="mb-3">
            <TextFormInput name="fName" label="First Name" containerClassName="col-lg-6" placeholder="First name" control={control} />
            <TextFormInput name="lName" label="Last Name" containerClassName="col-lg-6" placeholder="Last name" control={control} />
          </Row>
          <TextFormInput name="email" type="email" label="Email" containerClassName="mb-3" placeholder="Enter your email" control={control} />
          <div className="mb-3">
            <label className="form-label" htmlFor="contactnumber">
              Contact Number
            </label>
            <Dropdown className="form-group input-group">
              <DropdownToggle className="btn btn-light rounded-end-0 border arrow-none" type="button">
                <div className="icons-center">
                  U.S.A <IconifyIcon icon="bx:chevron-down" className="ms-2" />
                </div>
              </DropdownToggle>
              <DropdownMenu>
                <li>
                  <DropdownItem href="#">U.S.A</DropdownItem>
                </li>
                <li>
                  <DropdownItem href="#">India</DropdownItem>
                </li>
                <li>
                  <DropdownItem href="#">Iraq</DropdownItem>
                </li>
                <li>
                  <DropdownItem href="#">South Africa</DropdownItem>
                </li>
                <li>
                  <DropdownItem href="#">France</DropdownItem>
                </li>
              </DropdownMenu>
              <input type="number" className="form-control" id="contactnumber" placeholder="+0(222)000-0000" />
            </Dropdown>
          </div>
          <TextAreaFormInput name="message" label="Message" control={control} rows={5} containerClassName="mb-3" placeholder="Max 150 words" />
          <div className="mb-3">
            <h5 className="my-3">Services</h5>
            <Row>
              <Col xxl={6}>
                <FormCheck label="Website Design" id="check1" className="mb-2" />
                <FormCheck label="UX Design" id="check2" className="mb-2" />
                <FormCheck label="User Research" id="check3" className="mb-2" />
              </Col>
              <Col xxl={6}>
                <FormCheck label="Content Creation" id="check4" className="mb-2" />
                <FormCheck label="Strategy & Consulting" id="check5" className="mb-2" />
                <FormCheck label="Other" id="check6" className="mb-2" />
              </Col>
            </Row>
          </div>
          <div className="text-center d-grid">
            <Button variant="primary" type="submit">
              Send Message
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
export default ContactForm
