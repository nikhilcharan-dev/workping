import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Button, Card, CardBody, Col, Nav, NavItem, NavLink, Row, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import SellersGrid from './SellersGrid'
import SellersListView from './SellersListView'
const SellersList = ({ sellers }) => {
  return (
    <TabContainer defaultActiveKey={'1'}>
      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <form className="d-flex flex-wrap align-items-center gap-2">
                    <label htmlFor="inputPassword2" className="visually-hidden">
                      Search
                    </label>
                    <div className="search-bar me-3">
                      <span>
                        <IconifyIcon icon="bx:search-alt" className="mb-1" />
                      </span>
                      <input type="search" className="form-control" id="search" placeholder="Search ..." />
                    </div>
                    <label htmlFor="status-select" className="me-2">
                      Sort By
                    </label>
                    <div className="me-sm-3">
                      <select className="form-select my-1 my-md-0" id="status-select">
                        <option defaultChecked>All</option>
                        <option value={1}>Name</option>
                        <option value={2}>Joining Date</option>
                        <option value={3}>Phone</option>
                        <option value={4}>Orders</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div>
                  <div className="d-flex flex-wrap gap-2 justify-content-md-end align-items-center">
                    <Nav className="nav-pills g-transparent gap-1 p-0">
                      <NavItem>
                        <NavLink eventKey={'0'} title="Grid" className="flex-centered py-2">
                          <IconifyIcon icon="bx:grid-alt" height={18} width={18} />
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink eventKey={'1'} title="List" className="flex-centered py-2">
                          <IconifyIcon icon="bx:list-ul" height={18} width={18} />
                        </NavLink>
                      </NavItem>
                    </Nav>
                    <Button variant="danger" className="icons-center">
                      <IconifyIcon icon="bx:plus" className="me-1" />
                      Add Seller
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <TabContent className="pt-0">
        <TabPane eventKey={'1'} id="team-list">
          <SellersListView sellers={sellers} />
        </TabPane>
        <TabPane eventKey={'0'} id="team-grid">
          <SellersGrid sellers={sellers} />
        </TabPane>
      </TabContent>
    </TabContainer>
  )
}
export default SellersList
