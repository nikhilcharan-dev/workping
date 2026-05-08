import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import ExpensesChart from './components/ExpensesChart'
import RevenueChart from './components/RevenueChart'
import RevenueSources from './components/RevenueSources'
import Stats from './components/Stats'
import Transactions from './components/Transactions'
import PageMetaData from '@/components/PageTitle'
const FinancePage = () => {
  return (
    <>
      <PageBreadcrumb title="Finance" subName="Dashboards" />
      <PageMetaData title="Finance" />

      <Stats />
      <Row>
        <Col xxl={6}>
          <RevenueChart />
        </Col>
        <Col xxl={6}>
          <ExpensesChart />
        </Col>
      </Row>
      <Row>
        <Col xxl={8}>
          <Transactions />
        </Col>
        <Col xxl={4}>
          <RevenueSources />
        </Col>
      </Row>
    </>
  )
}
export default FinancePage
