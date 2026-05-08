import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { getAllCustomers } from '@/helpers/data'
import CustomersList from './components/CustomersList'
import { useEffect, useState } from 'react'
const Customers = () => {
  const [customers, setCustomers] = useState()
  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllCustomers()
      setCustomers(data)
    }
    fetchData()
  }, [])
  return (
    <>
      <PageBreadcrumb subName="Ecommerce" title="Customers List" />
      <PageMetaData title="Customers" />
      {customers && <CustomersList customers={customers} />}
    </>
  )
}
export default Customers
