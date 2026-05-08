import { useEffect, useState } from 'react'
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { currency } from '@/context/constants'
import { getAllTransactions } from '@/helpers/data'
const Transactions = () => {
  const [transactionData, setTransactionData] = useState()
  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllTransactions()
      setTransactionData(data)
    }
    fetchData()
  }, [])
  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle>Transactions</CardTitle>
        <div className="flex-shrink-0">
          <div className="d-flex gap-2">
            <select className="form-select form-select-sm">
              <option defaultChecked>All</option>
              <option value={0}>Paid</option>
              <option value={1}>Cancelled</option>
              <option value={2}>Failed</option>
              <option value={2}>Onhold</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="table-responsive table-card">
          <Table borderless hover className="table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50 thead-sm">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">Amount</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactionData?.slice(0, 5).map((item, idx) => (
                <tr key={idx}>
                  <td className="icons-center gap-1 w-100">
                    {item.customer && <img src={item.customer?.image} alt="avatar" className="avatar-xs rounded-circle me-1" />}
                    <span role="button" className="text-reset">
                      {item.customer?.name}
                    </span>
                  </td>
                  <td>{item.description}</td>
                  <td className={item.status === 'Dr.' ? 'text-danger' : 'text-success'}>
                    {currency}
                    {item.amount}
                  </td>
                  <td>{new Date(item.date).toDateString()}&nbsp;</td>
                  <td>
                    <span className={`badge ${item.status === 'Dr.' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}  p-1`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </CardBody>
      <CardFooter className="border-top border-light">
        <div className="align-items-center justify-content-between row text-center text-sm-start">
          <div className="col-sm">
            <div className="text-muted">
              Showing&nbsp;
              <span className="fw-semibold text-body">5</span>&nbsp; of&nbsp;
              <span className="fw-semibold">15&nbsp;</span>
              Transactions
            </div>
          </div>
          <Col sm="auto" className="mt-3 mt-sm-0">
            <ul className="pagination pagination-boxed pagination-sm mb-0 justify-content-center">
              <li className="page-item disabled">
                <Link to="" className="page-link">
                  <IconifyIcon icon={'bxs:chevron-left'} />
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
                  <IconifyIcon icon={'bxs:chevron-right'} />
                </Link>
              </li>
            </ul>
          </Col>
        </div>
      </CardFooter>
    </Card>
  )
}
export default Transactions
