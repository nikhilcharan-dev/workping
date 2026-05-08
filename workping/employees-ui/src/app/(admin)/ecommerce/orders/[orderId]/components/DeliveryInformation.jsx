import { Card, CardBody, CardTitle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
const DeliveryInformation = ({ order }) => {
  return (
    <Card className="card-height-100">
      <CardBody>
        <div className="float-end">
          <span role="button" className="text-primary">
            View All Detail
          </span>
        </div>
        <CardTitle as={'h5'} className="mb-3">
          Delivery Information
        </CardTitle>
        <div className="text-center">
          <IconifyIcon icon="bx:cart" className="h2" />
          <h5>UPS Delivery</h5>
          <p className="mb-1">
            Order ID :
            <span className="text-muted me-2" />
            <b>#{order.id}</b>
          </p>
          <p className="mb-0">
            Payment Mode :
            <span className="text-muted me-2" />
            <b>COD</b>
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
export default DeliveryInformation
