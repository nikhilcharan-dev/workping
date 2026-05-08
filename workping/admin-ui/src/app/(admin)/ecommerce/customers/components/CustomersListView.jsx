import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Link } from 'react-router-dom'
import { Button, Card, Col } from 'react-bootstrap'
const CustomersListView = ({ customers }) => {
  return (
    <Card className="overflow-hidden">
      <div className="table-responsive table-centered">
        <table className="table text-nowrap mb-0">
          <thead className="teble-light">
            <tr>
              <th>Customer Name</th>
              <th>Date</th>
              <th>Email ID</th>
              <th>Phone No.</th>
              <th>Location</th>
              <th>Orders</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, idx) => (
              <tr key={idx}>
                <td>
                  <div className="d-flex align-items-center gap-1">
                    <img src={customer.image} alt="avatar-1" className="img-fluid avatar-xs rounded-circle avatar-border me-1" />
                    <Link to="">{customer.name}</Link>
                  </div>
                </td>
                <td>{new Date(customer.createdAt).toDateString()}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>{customer.address}</td>
                <td>{customer.ordersCount}</td>
                <td>
                  <Button variant="soft-secondary" size="sm" type="button" className="me-2">
                    <IconifyIcon icon="bx:edit" className="fs-16" />
                  </Button>
                  <Button variant="soft-danger" size="sm" type="button">
                    <IconifyIcon icon="bx:trash" className="fs-16" />
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
            <span className="fw-semibold">2,852</span>&nbsp; Results
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
export default CustomersListView
