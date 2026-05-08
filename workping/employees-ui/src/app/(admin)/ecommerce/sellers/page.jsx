import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { getAllSellers } from '@/helpers/data'
import SellersList from './components/SellersList'
import { useEffect, useState } from 'react'
const Sellers = () => {
  const [sellers, setSellers] = useState()
  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllSellers()
      setSellers(data)
    }
    fetchData()
  }, [])
  return (
    <>
      <PageBreadcrumb subName="Ecommerce" title="Sellers List" />
      <PageMetaData title="Sellers" />
      {sellers && <SellersList sellers={sellers} />}
    </>
  )
}
export default Sellers
