import { Card, CardBody, CardTitle } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
const ShippingInformation = ({ order }) => {
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
          Shipping Information
        </CardTitle>
        <h5>{order.customer?.name}</h5>
        <address className="mb-0">
          4251 Private Lane, <br />
          Valdosta, GA 31601 <br />
          <abbr title="phone">Phone :</abbr>&nbsp; 229-269-1411 <br />
          <abbr title="mobile">Mobile :</abbr>&nbsp; 740-302-6656
        </address>
      </CardBody>
    </Card>
  )
}
export default ShippingInformation
