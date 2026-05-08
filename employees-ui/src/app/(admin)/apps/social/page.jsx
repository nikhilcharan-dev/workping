import { Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import SocialView from './components/SocialView'
const Social = () => {
  return (
    <>
      <PageBreadcrumb title="Social" subName="Apps" />
      <PageMetaData title="Social" />

      <Row className="justify-content-center">
        <SocialView />
      </Row>
    </>
  )
}
export default Social
