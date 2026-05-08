import clsx from 'clsx'
import { Link } from 'react-router-dom'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { currency } from '@/context/constants'
import { getCalculatedPrice } from '@/helpers/product'
import { getStockStatus } from '@/utils/other'
const columns = [
  {
    header: 'Product Name',
    cell: ({
      row: {
        original: { id, images, name, description },
      },
    }) => (
      <div className="d-flex align-items-center">
        <div className="flex-shrink-0 me-3">
          <Link to={`/ecommerce/products/${id}`}>
            <img src={images[0]} alt={name} className="img-fluid avatar-sm" />
          </Link>
        </div>
        <div className="flex-grow-1">
          <h5 className="mt-0 mb-1">
            <Link to={`/ecommerce/products/${id}`} className="text-reset">
              {name}
            </Link>
          </h5>
          <span className="fs-13">{description}</span>
        </div>
      </div>
    ),
  },
  {
    header: 'Category',
    accessorKey: 'category.name',
  },
  {
    header: 'Price',
    cell: ({ row: { original } }) => currency + getCalculatedPrice(original),
  },
  {
    header: 'Inventory',
    cell: ({
      row: {
        original: { quantity },
      },
    }) => {
      const stockStatus = getStockStatus(quantity)
      return (
        <div className={'text-' + stockStatus.variant}>
          <IconifyIcon icon="bxs:circle" className={clsx('me-1', 'text-' + stockStatus.variant)} />
          {stockStatus.text}
        </div>
      )
    },
  },
  {
    header: 'Action',
    cell: () => (
      <>
        <button type="button" className="btn btn-sm btn-soft-secondary me-1">
          <IconifyIcon icon="bx:edit" className="fs-18" />
        </button>
        <button type="button" className="btn btn-sm btn-soft-danger">
          <IconifyIcon icon="bx:trash" className="fs-18" />
        </button>
      </>
    ),
  },
]
const ProductsListTable = ({ products }) => {
  const pageSizeList = [2, 5, 10, 20, 50]
  return (
    <ReactTable
      columns={columns}
      data={products}
      rowsPerPageList={pageSizeList}
      pageSize={10}
      tableClass="text-nowrap mb-0"
      theadClass="bg-light bg-opacity-50"
      showPagination
    />
  )
}
export default ProductsListTable
