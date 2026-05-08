import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import Accounts from './components/Accounts'
import OverviewChart from './components/OverviewChart'
import RecentOrders from './components/RecentOrders'
import SalesByCategory from './components/SalesByCategory'
import Stats from './components/Stats'
import Transactions from './components/Transactions'
import PageMetaData from '@/components/PageTitle'
const SalesPage = () => {
  return (
    <>
      <PageBreadcrumb subName="Dashboards" title="Sales" />
      <PageMetaData title="Sales" />

      <Stats />
      <Row>
        <Col xxl={8}>
          <OverviewChart />
        </Col>
        <Col xxl={4}>
          <SalesByCategory />
        </Col>
      </Row>
      <Row>
        <Col xl={6}>
          <Accounts />
        </Col>
        <Col xl={6}>
          <Transactions />
        </Col>
      </Row>
      <Row>
        <Col>
          <RecentOrders />
        </Col>
      </Row>
    </>
  )
}
export default SalesPage
