import SelectFormInput from '@/components/form/SelectFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { yupResolver } from '@hookform/resolvers/yup'
import { Button, CardBody, CardTitle, Col, Form, Row } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
const FilterProducts = () => {
  const filterProductSchema = yup.object({
    productId: yup.string().required('please enter your product Id'),
    condition: yup.string().required('please select condition'),
    category: yup.string().required('please select category'),
    location: yup.string().required('please select location'),
  })
  const { control, handleSubmit, reset } = useForm({
    resolver: yupResolver(filterProductSchema),
  })
  return (
    <Form onSubmit={handleSubmit(() => {})} className="card">
      <CardBody>
        <CardTitle as="h5" className="mb-3">
          Filter Products
        </CardTitle>
        <div className="search-bar mb-3">
          <span>
            <IconifyIcon icon="bx:search-alt" />
          </span>
          <input type="email" className="form-control" id="search" placeholder="Search by name ......." />
        </div>
        <TextFormInput name="productId" label="Product Id" placeholder="Filter by Product Id" containerClassName="mb-3" control={control} />
        <SelectFormInput
          name="condition"
          label="Condition"
          control={control}
          containerClassName="mb-3"
          options={[
            {
              value: 'All Conditions',
              label: 'All Conditions',
            },
            {
              value: 'New',
              label: 'New',
            },
            {
              value: 'Return',
              label: 'Return',
            },
            {
              value: 'Damaged',
              label: 'Damaged',
            },
          ]}
        />
        <SelectFormInput
          name="category"
          label="Category"
          control={control}
          containerClassName="mb-3"
          options={[
            {
              value: 'All Categories',
              label: 'All Categories',
            },
            {
              value: 'Electronics & Accessories',
              label: 'Electronics & Accessories',
            },
            {
              value: 'Home & Kitchen',
              label: 'Home & Kitchen',
            },
            {
              value: 'Cloth',
              label: 'Cloth',
            },
          ]}
        />
        <SelectFormInput
          name="location"
          label="Location"
          control={control}
          containerClassName="mb-3"
          options={[
            {
              value: 'All Locations',
              label: 'All Locations',
            },
            {
              value: 'WareHouse 1',
              label: 'WareHouse 1',
            },
            {
              value: 'WareHouse 2',
              label: 'WareHouse 2',
            },
            {
              value: 'WareHouse 3',
              label: 'WareHouse 3',
            },
            {
              value: 'WareHouse 4',
              label: 'WareHouse 4',
            },
          ]}
        />
        <Row>
          <Col xs={6}>
            <Button variant="outline-primary" onClick={() => reset()} type="button" className="w-100">
              Clear
            </Button>
          </Col>
          <Col xs={6}>
            <Button variant="primary" type="submit" className="w-100">
              Apply Filters
            </Button>
          </Col>
        </Row>
      </CardBody>
    </Form>
  )
}
export default FilterProducts
