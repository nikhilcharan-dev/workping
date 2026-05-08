import { Card, CardBody, CardTitle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
const BillingInformation = ({ order }) => {
  return (
    <Card className="card-height-100">
      <CardBody>
        <div className="float-end">
          <span role="button" className="text-primary">
            <IconifyIcon icon="bx:edit" className="me-1" />
            Change
          </span>
        </div>
        <CardTitle as={'h5'} className="mb-3">
          Billing Information
        </CardTitle>
        <p className="mb-1">
          Payment Type :
          <span className="text-muted me-2" />
          <b>{order.paymentMethod}</b>
        </p>
        <p className="mb-1">
          Provider :
          <span className="text-muted me-2" />
          <b>Visa ending in 4589</b>
        </p>
        <p className="mb-1">
          Valid Date :
          <span className="text-muted me-2" />
          <b>21/05</b>
        </p>
        <p className="mb-0">
          CVV :
          <span className="text-muted me-2" />
          <b>xxx</b>
        </p>
      </CardBody>
    </Card>
  )
}
export default BillingInformation
