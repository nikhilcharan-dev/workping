import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { currency } from '@/context/constants'
import { getRatingVariant } from '@/utils/other'
import { Link } from 'react-router-dom'
import { Button, Card, Col } from 'react-bootstrap'
const SellersListView = ({ sellers }) => {
  return (
    <Card className="overflow-hidden">
      <div className="table-responsive table-centered text-nowrap">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Seller</th>
              <th>Store Name</th>
              <th>Rating</th>
              <th>Products</th>
              <th>Wallet Balance</th>
              <th>Create Date</th>
              <th>Revenue</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller, idx) => (
              <tr key={idx}>
                <td>
                  <div className="d-flex align-items-center gap-1">
                    <img src={seller.image} alt="avatar-1" className="img-fluid avatar-sm rounded-circle avatar-border me-1" />
                    <Link to="">{seller.name}</Link>
                  </div>
                </td>
                <td>{seller.storeName}</td>
                <td>
                  <span className={`badge badge-soft-${getRatingVariant(seller.review.stars)} icons-center`}>
                    <IconifyIcon icon="bxs:star" className="me-1" />
                    {seller.review.stars}
                  </span>
                </td>
                <td>{seller.productsCount}</td>
                <td>
                  {currency}
                  {seller.walletBalance}
                </td>
                <td>{new Date(seller.createdAt).toLocaleDateString()}</td>
                <td>
                  {currency}
                  {seller.revenue}
                </td>
                <td>
                  <Button variant="soft-primary" size="sm" className=" me-2">
                    <IconifyIcon icon="bx:edit" className="fs-18" />
                  </Button>
                  <Button variant="soft-danger" size="sm">
                    <IconifyIcon icon="bx:trash" className="fs-18" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="align-items-center justify-content-between row g-0 text-center text-sm-start p-3 border-top">
        <div className="col-sm">
          <div className="text-muted">
            Showing&nbsp;
            <span className="fw-semibold">10</span>&nbsp; of&nbsp;
            <span className="fw-semibold">269</span>&nbsp; Results
          </div>
        </div>
        <Col sm="auto" className="mt-3 mt-sm-0">
          <ul className="pagination pagination-rounded m-0">
            <li className="page-item">
              <Link to="" className="page-link">
                <IconifyIcon icon="bx:left-arrow-alt" />
              </Link>
            </li>
            <li className="page-item active">
              <Link to="" className="page-link">
                1
              </Link>
            </li>
            <li className="page-item">
              <Link to="" className="page-link">
                2
              </Link>
            </li>
            <li className="page-item">
              <Link to="" className="page-link">
                3
              </Link>
            </li>
            <li className="page-item">
              <Link to="" className="page-link">
                <IconifyIcon icon="bx:right-arrow-alt" />
              </Link>
            </li>
          </ul>
        </Col>
      </div>
    </Card>
  )
}
export default SellersListView
