import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllEcommerceProducts } from '@/helpers/data'
import ProductsListTable from './components/ProductsListTable'
const Products = () => {
  const [productsList, setProductsList] = useState()
  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllEcommerceProducts()
      setProductsList(data)
    }
    fetchData()
  }, [])
  return (
    <>
      <PageMetaData title="Products List" />
      <PageBreadcrumb title="Products List" subName="Ecommerce" />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between gap-3">
                <div className="search-bar">
                  <span>
                    <IconifyIcon icon="bx:search-alt" className="mb-1" />
                  </span>
                  <input type="search" className="form-control" id="search" placeholder="Search ..." />
                </div>
                <div>
                  <Link to="/ecommerce/products/create" className="btn btn-primary d-flex align-items-center">
                    <IconifyIcon icon="bx:plus" className="me-1" />
                    Add Product
                  </Link>
                </div>
              </div>
            </CardBody>
            <div>{productsList && <ProductsListTable products={productsList} />}</div>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default Products
