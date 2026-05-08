import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Link } from 'react-router-dom'
import { Button, Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
const SellerCard = ({ seller }) => {
  const { image, name, productsCount, storeName } = seller
  return (
    <Card>
      <CardBody>
        <Dropdown className="float-end">
          <DropdownToggle as={'a'} role="button" className="arrow-none text-dark" data-bs-toggle="dropdown" aria-expanded="false">
            <IconifyIcon icon="bx:dots-vertical-rounded" className="fs-18" />
          </DropdownToggle>
          <DropdownMenu className="dropdown-menu-end">
            <DropdownItem href="">
              <IconifyIcon icon="bx:phone-call" className="me-2" />
              Direct Call
            </DropdownItem>
            <DropdownItem href="">
              <IconifyIcon icon="bx:envelope-open" className="me-2" />E mail
            </DropdownItem>
            <DropdownItem href="">
              <IconifyIcon icon="bxl:linkedin" className="me-2" />
              Linkedin
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <div className="text-center mb-3">
          <Link to="">
            <img src={image} alt="avatar-1" className="img-fluid img-thumbnail avatar-xxl rounded-circle avatar-border" />
          </Link>
        </div>
        <div className="text-center">
          <h4 className="mb-4 fw-bold">{name}</h4>
        </div>
        <div className="mt-1 border-bottom">
          <p className="float-end mb-1">{storeName}</p>
          <p className="mb-1">Store Name</p>
        </div>
        <div className="mt-1 mb-2 border-bottom">
          <p className="float-end mb-1">{productsCount}</p>
          <p className="mb-1">Products</p>
        </div>
        <Button variant="soft-primary" className="w-100">
          View All Detail
        </Button>
      </CardBody>
    </Card>
  )
}
const SellersGrid = ({ sellers }) => {
  return (
    <Row className="row-cols-1 row-cols-md-2 row-cols-xl-5 gx-3">
      {sellers.map((seller, idx) => (
        <div className="col" key={idx}>
          <SellerCard seller={seller} />
        </div>
      ))}
    </Row>
  )
}
export default SellersGrid
