import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import UIExamplesList from '@/components/UIExamplesList'
import AllBubbleCharts from './components/AllBubbleCharts'
const BubbleCharts = () => {
  return (
    <>
      <PageBreadcrumb title="Bubble Charts" subName="Charts" />
      <PageMetaData title="Bubble Charts" />

      <Row>
        <Col xl={9}>
          <AllBubbleCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList
            examples={[
              {
                link: '#simple',
                label: 'Simple Bubble Chart',
              },
              {
                link: '#3d-bubble',
                label: '3D Bubble Chart',
              },
            ]}
          />
        </Col>
      </Row>
    </>
  )
}
export default BubbleCharts
