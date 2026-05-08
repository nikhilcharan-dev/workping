import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { EmailProvider } from '@/context/useEmailContext'
import { Row } from 'react-bootstrap'
import EmailView from './components/EmailView'
const Email = () => {
  return (
    <>
      <PageBreadcrumb subName="Email" title="Inbox" />
      <PageMetaData title="Inbox" />
      <Row className="g-1 mb-3">
        <EmailProvider>
          <EmailView />
        </EmailProvider>
      </Row>
    </>
  )
}
export default Email
