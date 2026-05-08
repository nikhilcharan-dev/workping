import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import AllWizard from './components/AllWizard'
const Wizard = () => {
  return (
    <>
      <PageBreadcrumb subName="Form" title="Wizard" />
      <PageMetaData title="Wizard" />
      <AllWizard />
    </>
  )
}
export default Wizard
