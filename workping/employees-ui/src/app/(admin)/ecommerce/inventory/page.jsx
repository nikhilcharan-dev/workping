import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import FilterProducts from './components/FilterProducts'
import InventoryProducts from './components/InventoryProducts'
const Inventory = () => {
  return (
    <>
      <PageBreadcrumb subName="Ecommerce" title="Inventory" />
      <PageMetaData title="Inventory" />

      <Row>
        <Col xl={3}>
          <FilterProducts />
        </Col>
        <Col xl={9}>
          <InventoryProducts />
        </Col>
      </Row>
    </>
  )
}
export default Inventory
