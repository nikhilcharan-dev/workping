import {
  Button,
  Card,
  CardBody,
  Col,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Nav,
  NavItem,
  NavLink,
  Row,
  TabContainer,
  TabContent,
  TabPane,
} from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import CustomersListView from './CustomersListView'
import CustomersGrid from './CustomersGrid'
const CustomersList = ({ customers }) => {
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
                        <NavLink eventKey={'0'} title="Grid" className="flex-centred py-2">
                          <IconifyIcon icon="bx:grid-alt" height={18} width={18} />
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink eventKey={'1'} title="List" className="flex-centred py-2">
                          <IconifyIcon icon="bx:list-ul" height={18} width={18} />
                        </NavLink>
                      </NavItem>
                    </Nav>
                    <Dropdown>
                      <DropdownToggle as={'a'} role="button" className="btn btn-soft-success arrow-none">
                        <IconifyIcon icon="bx:sort" className="me-1" />
                        Filter
                      </DropdownToggle>
                      <DropdownMenu className="dropdown-menu-end">
                        <DropdownItem href="">By Date</DropdownItem>
                        <DropdownItem href="">By Order ID</DropdownItem>
                        <DropdownItem href="">By City</DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                    <Button variant="danger" className="icons-center">
                      <IconifyIcon icon="bi:plus" className="me-1" height={18} width={18} />
                      Add Customer
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
          <CustomersListView customers={customers} />
        </TabPane>
        <TabPane eventKey={'0'} id="team-grid">
          <CustomersGrid customers={customers} />
        </TabPane>
      </TabContent>
    </TabContainer>
  )
}
export default CustomersList
