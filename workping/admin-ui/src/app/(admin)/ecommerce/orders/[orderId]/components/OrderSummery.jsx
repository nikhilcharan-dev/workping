import { Card, CardBody, CardTitle, Table } from 'react-bootstrap'
import { currency } from '@/context/constants'
const OrderSummery = ({ order }) => {
  return (
    <Card>
      <CardBody>
        <CardTitle as={'h5'} className="mb-3">
          Products From Order #{order.id}
        </CardTitle>
        <div className="table-responsive text-nowrap table-centered">
          <Table className="mb-0">
            <thead>
              <tr>
                <th>Description</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Grand Total :</td>
                <td>{currency}2201.59</td>
              </tr>
              <tr>
                <td>Shipping Charge :</td>
                <td>FREE</td>
              </tr>
              <tr>
                <td>Estimated tax :</td>
                <td>{currency}15</td>
              </tr>
              <tr>
                <td className="fw-semibold">Total :</td>
                <td className="fw-semibold">{currency}2266.59</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )
}
export default OrderSummery
