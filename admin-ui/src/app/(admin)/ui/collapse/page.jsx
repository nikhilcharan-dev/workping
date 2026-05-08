import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import UIExamplesList from '@/components/UIExamplesList'
import AllCollapse from './components/AllCollapse'
const Collapse = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Collapse" />
      <PageMetaData title="Collapse" />

      <Row>
        <Col xl={9}>
          <AllCollapse />
        </Col>
        <Col xl={3}>
          <UIExamplesList
            examples={[
              {
                label: 'Default Example',
                link: '#default',
              },
              {
                label: 'Horizontal Collapse',
                link: '#horizontal',
              },
              {
                label: 'Multiple Targets',
                link: '#multiple-targets',
              },
            ]}
          />
        </Col>
      </Row>
    </>
  )
}
export default Collapse
