import { Card, CardBody, CardTitle, Table } from 'react-bootstrap'
import { currency } from '@/context/constants'
const OrderProducts = ({ order }) => {
  return (
    <Card>
      <CardBody>
        <CardTitle as={'h5'} className="mb-3">
          Products From Order #{order.id}
        </CardTitle>
        <div className="table-responsive">
          <Table className="table table-centered table-dashed mb-0">
            <thead className="table-">
              <tr>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>G15 Gaming Laptop</td>
                <td>3</td>
                <td>{currency}240.59</td>
                <td>{currency}721.77</td>
              </tr>
              <tr>
                <td>Sony Alpha ILCE 6000Y 24.3 MP Mirrorless Digital SLR Camera</td>
                <td>5</td>
                <td>{currency}135.99</td>
                <td>{currency}679.95</td>
              </tr>
              <tr>
                <td>Sony Over-Ear Wireless Headphone with Mic</td>
                <td>1</td>
                <td>{currency}99.49</td>
                <td>{currency}99.49</td>
              </tr>
              <tr>
                <td>Adam ROMA USB-C / USB-A 3.1 (2-in-1 Flash Drive) – 128GB</td>
                <td>2</td>
                <td>{currency}350.19</td>
                <td>700.38</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )
}
export default OrderProducts
