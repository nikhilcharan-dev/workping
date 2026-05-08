import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import TextAreaFormInput from '@/components/form/TextAreaFormInput'
import TextFormInput from '@/components/form/TextFormInput'
import { Col, Row } from 'react-bootstrap'
const metaDataFormSchema = yup.object({
  title: yup.string().required(),
  keywords: yup.string().required(),
  description: yup.string().required(),
})
const MetaDataForm = () => {
  const { control } = useForm({
    resolver: yupResolver(metaDataFormSchema),
  })
  return (
    <form>
      <h5 className="mb-3 mt-0">Fill all information below</h5>
      <Row>
        <Col md={6}>
          <TextFormInput control={control} name="title" containerClassName="mb-3" label="Meta Title" placeholder="Enter Meta Title" />
        </Col>
        <Col md={6}>
          <TextFormInput control={control} name="title" containerClassName="mb-3" label="Meta Keywords" placeholder="Enter Meta Keywords" />
        </Col>
      </Row>

      <TextAreaFormInput
        control={control}
        name="description"
        label="Meta Description"
        containerClassName="mb-3"
        placeholder="Enter Meta Description"
      />
    </form>
  )
}
export default MetaDataForm
