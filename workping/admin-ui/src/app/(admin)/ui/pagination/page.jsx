import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import UIExamplesList from '@/components/UIExamplesList'
import AllPagination from './components/AllPagination'
const Pagination = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Pagination" />
      <PageMetaData title="Pagination" />

      <Row>
        <Col xl={9}>
          <AllPagination />
        </Col>
        <Col xl={3}>
          <UIExamplesList
            examples={[
              {
                link: '#default-buttons',
                label: 'Default Pagination',
              },
              {
                link: '#rounded-pagination',
                label: 'Rounded Pagination',
              },
              {
                link: '#alignment',
                label: 'Alignment',
              },
              {
                link: '#sizing',
                label: 'Sizing',
              },
            ]}
          />
        </Col>
      </Row>
    </>
  )
}
export default Pagination
