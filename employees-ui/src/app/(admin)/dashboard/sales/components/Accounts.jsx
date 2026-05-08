import { accountData } from '../data'
import { Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
const Accounts = () => {
  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle>New Accounts</CardTitle>
        <Button variant="light" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardBody className="pb-1">
        <div className="table-responsive">
          <table className="table table-hover mb-0 table-centered">
            <thead>
              <tr>
                <th className="py-1">ID</th>
                <th className="py-1">Date</th>
                <th className="py-1">User</th>
                <th className="py-1">Account</th>
                <th className="py-1">Username</th>
              </tr>
            </thead>
            <tbody>
              {accountData.map((account, idx) => {
                return (
                  <tr key={idx}>
                    <td>{account.id}</td>
                    <td>{account.date}</td>
                    <td>
                      <img src={account.user.avatar} alt="avatar-2" className="img-fluid avatar-xs rounded-circle" />
                      <span className="align-middle ms-1">{account.user.name}</span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-soft-${account.status === 'Blocked' ? 'danger' : account.status === 'Pending' ? 'warning' : 'success'}`}>
                        {account.status}
                      </span>
                    </td>
                    <td>{account.username}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}
export default Accounts
