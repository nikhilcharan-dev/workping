import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import { getProductById } from '@/helpers/data'
import ProductDetailView from './components/ProductDetailView'
import ProductImages from './components/ProductImages'
import PageMetaData from '@/components/PageTitle'
const ProductDetail = () => {
  const [product, setProduct] = useState()
  const { productId } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    ;(async () => {
      if (productId) {
        const data = await getProductById(productId)
        if (data) setProduct(data)
        else navigate('/pages/error-404-alt')
      }
    })()
  }, [productId])
  return (
    <>
      <PageBreadcrumb title="Product Details" subName="Ecommerce" />
      <PageMetaData title={product?.name ?? 'Product Details'} />
      <Row>
        <Col>
          <Card>
            <CardBody>
              <Row>
                <Col lg={4}>{product && <ProductImages product={product} />}</Col>
                <Col lg={8}>{product && <ProductDetailView product={product} />}</Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}
export default ProductDetail
