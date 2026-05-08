import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import UIExamplesList from '@/components/UIExamplesList'
import AllBoxPlotCharts from './components/AllBoxPlotCharts'
const BoxPlotCharts = () => {
  return (
    <>
      <PageBreadcrumb subName="Charts" title="Boxplot Charts" />
      <PageMetaData title="Boxplot Charts" />

      <Row>
        <Col xl={9}>
          <AllBoxPlotCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList
            examples={[
              {
                link: '#basic',
                label: 'Basic Boxplot',
              },
              {
                link: '#scatter',
                label: 'Scatter Boxplot',
              },
            ]}
          />
        </Col>
      </Row>
    </>
  )
}
export default BoxPlotCharts
