import clsx from 'clsx'
import { useState } from 'react'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import product1 from '@/assets/images/products/product-1(1).png'
import product2 from '@/assets/images/products/product-1(2).png'
import product3 from '@/assets/images/products/product-1(3).png'
import product4 from '@/assets/images/products/product-1(4).png'
const ProductImages = ({ product }) => {
  const { name } = product

  // You can replace below static images with the above ↑ images coming as props from parent element
  const productImages = [product2, product1, product3, product4]
  const eventKeyPrefix = name + '-'
  const [activeImageTab, setActiveImageTab] = useState(eventKeyPrefix + 0)
  return (
    <TabContainer activeKey={activeImageTab}>
      <TabContent>
        {productImages.map((image, idx) => (
          <TabPane key={idx} eventKey={eventKeyPrefix + idx} className="fade">
            <img src={image} alt={name + idx} className="img-fluid mx-auto d-block rounded" />
          </TabPane>
        ))}
      </TabContent>
      <Nav variant="pills" justify>
        {productImages.map((image, idx) => (
          <NavItem onClick={() => setActiveImageTab(eventKeyPrefix + idx)} key={idx} className="nav-item">
            <NavLink
              as={'button'}
              className={clsx('product-thumb', {
                active: eventKeyPrefix + idx === activeImageTab,
              })}>
              <img src={image} alt={name + 2 + '-thumb'} className="img-fluid mx-auto rounded" />
            </NavLink>
          </NavItem>
        ))}
      </Nav>
    </TabContainer>
  )
}
export default ProductImages
