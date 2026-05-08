import DropzoneFormInput from '@/components/form/DropzoneFormInput'
const ProductGalleryForm = () => {
  return (
    <DropzoneFormInput
      label="Product Gallery"
      labelClassName="fs-14 mb-1"
      iconProps={{
        icon: 'bx:cloud-upload',
        height: 36,
        width: 36,
      }}
      text="Drop files here or click to browse"
      helpText={
        <span className="text-muted fs-13">
          (This is just a demo dropzone. Selected files are <strong>not</strong> actually uploaded.)
        </span>
      }
      showPreview
    />
  )
}
export default ProductGalleryForm
