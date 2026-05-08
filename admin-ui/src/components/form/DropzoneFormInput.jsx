import { Button, Card, Col, FormLabel, FormText } from 'react-bootstrap'
import Dropzone from 'react-dropzone'
import useFileUploader from '@/hooks/useFileUploader'
import IconifyIcon from '../wrappers/IconifyIcon'

const DropzoneFormInput = ({ label, labelClassName, helpText, iconProps, showPreview, text, textClassName, onFileUpload }) => {
  const { selectedFiles, handleAcceptedFiles, removeFile } = useFileUploader(showPreview)

  return (
    <>
      {label && <FormLabel className={labelClassName}>{label}</FormLabel>}

      <Dropzone onDrop={(acceptedFiles) => handleAcceptedFiles(acceptedFiles, onFileUpload)} maxFiles={5}>
        {({ getRootProps, getInputProps }) => (
          <div className="dropzone dropzone-custom">
            <div className="dz-message" {...getRootProps()}>
              <input {...getInputProps()} />
              <IconifyIcon icon={iconProps?.icon ?? 'bx:cloud-upload'} {...iconProps} />
              <h3 className={textClassName}>{text}</h3>
              {helpText && typeof helpText === 'string' ? <FormText>{helpText}</FormText> : helpText}
            </div>

            {showPreview && selectedFiles.length > 0 && (
              <div className="dz-preview row g-3 mt-3">
                {selectedFiles.map((file) => {
                  const filename = file.name || file.path || 'Unknown file'
                  const ext = filename.split('.').pop()?.toUpperCase()

                  return (
                    <Col xl={3} md={4} sm={6} key={filename}>
                      <Card className="p-2 shadow-sm border position-relative h-100">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded bg-light d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                            <strong className="text-secondary">{ext}</strong>
                          </div>

                          <div className="flex-grow-1 overflow-hidden">
                            <div className="fw-semibold text-truncate">{filename}</div>
                            <small className="text-muted">{file.formattedSize}</small>
                          </div>
                        </div>

                        {removeFile && (
                          <Button
                            variant="light"
                            className="position-absolute top-0 end-0 m-1 p-0 d-flex align-items-center justify-content-center"
                            style={{ width: 22, height: 22 }}
                            onClick={() => {
                              const remaining = selectedFiles.filter((f) => f !== file)
                              removeFile(file)
                              onFileUpload?.(remaining)
                            }}>
                            ×
                          </Button>
                        )}
                      </Card>
                    </Col>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Dropzone>
    </>
  )
}

export default DropzoneFormInput
