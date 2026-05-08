import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import { getOrderById } from '@/helpers/data'
import { useEffect, useState } from 'react'
import { Col, Row } from 'react-bootstrap'
import { useNavigate, useParams } from 'react-router-dom'
import BillingInformation from './components/BillingInformation'
import DeliveryInformation from './components/DeliveryInformation'
import OrderProducts from './components/OrderProducts'
import OrderSummery from './components/OrderSummery'
import ShippingInformation from './components/ShippingInformation'
const OrderDetail = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState()
  useEffect(() => {
    ;(async () => {
      if (orderId) {
        const data = await getOrderById(orderId ?? '')
        if (data) setOrder(data)
        else navigate('/pages/error-404-alt')
      }
    })()
  }, [orderId])
  return (
    <>
      <PageBreadcrumb subName="Ecommerce" title="Order Details" />
      <Row className="justify-content-center">
        <Col lg={8} xl={7}>
          <ul className="progressbar ps-0 my-5 pb-5">
            <li className="active">Order Placed</li>
            <li>Packed</li>
            <li>Shipped</li>
            <li>Delivered</li>
          </ul>
        </Col>
      </Row>
      <Row>
        <Col xl={7}>{order && <OrderProducts order={order} />}</Col>
        <Col xl={5}>{order && <OrderSummery order={order} />}</Col>
      </Row>
      <Row>
        <Col lg={4}>{order && <ShippingInformation order={order} />}</Col>
        <Col lg={4}>{order && <BillingInformation order={order} />}</Col>
        <Col lg={4}>{order && <DeliveryInformation order={order} />}</Col>
      </Row>
    </>
  )
}
export default OrderDetail
