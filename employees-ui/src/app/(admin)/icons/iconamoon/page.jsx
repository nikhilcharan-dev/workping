import { Card, CardBody } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
const IconMoon = () => {
  return (
    <>
      <PageBreadcrumb subName="Icons" title="IconaMoon Icons" />
      <PageMetaData title="IconaMoon Icons" />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:3d-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">3d</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:apps-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Apps bold</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:arrow-bottom-left-1-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Arrow bottom</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:arrow-bottom-left-2-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Arrow bottom</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:attachment" className="fs-2" />
            <h5 className="mt-2 mb-0">Attachment</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:attention-circle-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Attention</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:backspace-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Backspace</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:badge-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Badge</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:bluetooth-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Bluetooth</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:bookmark-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Bookmark</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:bookmark-off" className="fs-2" />
            <h5 className="mt-2 mb-0">Bookmark Off</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:box-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Box</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:briefcase-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Briefcase</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:calculator-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Calculator</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:calendar-1-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Calendar</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:camera-image" className="fs-2" />
            <h5 className="mt-2 mb-0">Camera</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:camera-video-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">CameraVideo</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:category-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Category</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:certificate-badge-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Certificate</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:check-circle-1-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Check Circle</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:cheque-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Cheque</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:clock" className="fs-2" />
            <h5 className="mt-2 mb-0">Clock</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:close-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Close</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:cloud-add-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Cloud</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:cloud-clock-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Cloud Clock</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:cloud-download-light" className="fs-2" />
            <h5 className="mt-2 mb-0">CloudDownload</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:cloud-error-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Cloud Error</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:comment" className="fs-2" />
            <h5 className="mt-2 mb-0">Comment</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:compare-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Compare</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:component-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Component</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:confused-face-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Confused</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:copy-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Copy</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:credit-card-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Credit Card</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:cursor" className="fs-2" />
            <h5 className="mt-2 mb-0">Cursor</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:delivery-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Delivery</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:disappointed-face-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Disappointed</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:discount-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Discount</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:discover-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Discover</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:dislike-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Dislike</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:do-redo" className="fs-2" />
            <h5 className="mt-2 mb-0">Do Redo</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:do-undo-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Do Undo</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:download-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Download</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:edit-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Edit Duotone</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:email-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Email</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:enter-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Enter</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:exit" className="fs-2" />
            <h5 className="mt-2 mb-0">Exit</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:expressionless-face-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Expressionless</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:eye-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Eye</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:eye-off-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Eye Off</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:face-with-open-mouth" className="fs-2" />
            <h5 className="mt-2 mb-0">Face Open</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:face-without-mouth-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Face Without</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:file-add-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">File Add</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:file-audio-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">File Audio</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:flag-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Flag</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:frame" className="fs-2" />
            <h5 className="mt-2 mb-0">Frame</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:frowning-face-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Frowning</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:funnel-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Funnel</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:gift-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Gift</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:headphone-light" className="fs-2" />
            <h5 className="mt-2 mb-0">Headphone</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:heart-thin" className="fs-2" />
            <h5 className="mt-2 mb-0">Heart</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:history" className="fs-2" />
            <h5 className="mt-2 mb-0">History</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:home-bold" className="fs-2" />
            <h5 className="mt-2 mb-0">Home</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:information-circle-duotone" className="fs-2" />
            <h5 className="mt-2 mb-0">Information</h5>
          </CardBody>
        </Card>
        <Card className="icon-box">
          <CardBody className="d-flex flex-column align-items-center justify-content-center">
            <IconifyIcon icon="iconamoon:invoice-fill" className="fs-2" />
            <h5 className="mt-2 mb-0">Invoice</h5>
          </CardBody>
        </Card>
      </div>

      <div className="my-4 text-center">
        <Link to="https://icon-sets.iconify.design/iconamoon/" target="_blank" className="btn btn-primary">
          View All Icons
        </Link>
      </div>
    </>
  )
}
export default IconMoon
