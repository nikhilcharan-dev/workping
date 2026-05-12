import { useRef } from 'react'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'

const UploadImage = ({ onCapture }) => {
  const canvasRef = useRef(null)

  const handleImage = async (files) => {
    const file = files?.[0]
    if (!file) return

    const img = new Image()
    img.src = file.preview

    img.onload = async () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const pixels = new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data)

      const hashBuffer = await crypto.subtle.digest('SHA-256', pixels)
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      onCapture?.({
        source: 'upload',
        hash,
      })
    }
  }

  return (
    <>
      <DropzoneFormInput
        onFileUpload={handleImage}
        iconProps={{
          icon: 'bx:cloud-upload',
          height: 36,
          width: 36,
        }}
        text="Drop face image here or click to upload."
        helpText={
          <span className="text-muted fs-13">
            Supported formats: <strong>.jpg, .jpeg, .png</strong>
            <br />
            (Image is used only to generate face embedding.)
          </span>
        }
        showPreview
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  )
}

export default UploadImage
