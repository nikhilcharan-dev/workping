import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { getActivityStream } from '@/helpers/data'
import { toSentenceCase } from '@/utils/change-casing'
import { getActivityIcon, getFileExtensionIcon } from '@/utils/get-icons'
const ActivityItem = ({ title, icon, time, content, files, status, type, variant }) => {
  return (
    <div className="position-relative ps-5">
      <div className="mb-4">
        <span
          className={clsx(
            `position-absolute start-0 ms-3 translate-middle-x d-inline-flex align-items-center justify-content-center rounded-circle text-light fs-20 bg-${variant}`,
            {
              'avatar-sm': !icon,
            },
          )}>
          {icon ? (
            <img src={icon} height={36} width={36} alt="avatar" className="avatar-sm rounded-circle" />
          ) : type ? (
            <IconifyIcon icon={getActivityIcon(type)} />
          ) : (
            title.charAt(0).toUpperCase()
          )}
        </span>
        <div className="ms-2">
          <h5 className="mb-1 text-dark fw-semibold fs-15 lh-base">
            {title} {status && <span className={`badge px-2 py-1 ms-1 bg-${variant}-subtle text-${variant}`}> {toSentenceCase(status)}</span>}{' '}
          </h5>
          {files && type && (
            <p className="d-flex align-items-center">
              Added {files.length} files to{' '}
              <span className=" d-flex align-items-center text-primary ms-1">
                <IconifyIcon icon="iconamoon:file-light" /> {toSentenceCase(type)}{' '}
              </span>
            </p>
          )}
          {content && <p>{content}</p>}
          {files && (
            <div className="bg-light bg-opacity-50 rounded-2 p-2">
              <Row>
                {files.map((file, idx) => {
                  return file.preview ? (
                    <Col key={(file.name ?? '') + idx} xs={4} className="px-1">
                      <img width={107} height={71} src={file.preview} alt="" className="img-fluid rounded" />
                    </Col>
                  ) : (
                    <div
                      key={(file.name ?? '') + idx}
                      className={clsx('border-end border-light', {
                        'col-lg-6': files.length > 1,
                      })}>
                      <div className="d-flex align-items-center gap-2">
                        {file.name && (
                          <>
                            <IconifyIcon height={20} width={20} icon={getFileExtensionIcon(file.name)} />
                            <span role="button" className="text-dark fw-medium">
                              {file.name}
                            </span>
                            <div className="ms-auto">
                              <OverlayTrigger placement="bottom" overlay={<Tooltip className="fw-medium">Download</Tooltip>}>
                                <span>
                                  <IconifyIcon height={18} width={18} icon="iconamoon:cloud-download-duotone" className="text-primary" />
                                </span>
                              </OverlayTrigger>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </Row>
            </div>
          )}
          <h6 className="mt-2 text-muted">{new Date(time).toDateString()}</h6>
        </div>
      </div>
    </div>
  )
}
const Activity = () => {
  const [allActivity, setAllActivity] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getActivityStream()
      setAllActivity(data)
    })()
  }, [])
  return (
    <Card>
      <CardHeader className="d-flex align-items-center">
        <CardTitle as={'h5'}>Activities</CardTitle>
        <div className="ms-auto">
          <span className="text-primary icons-center" role="button">
            Export
            <IconifyIcon icon="bx:export" className="ms-1" />
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <SimplebarReactClient
          style={{
            height: 380,
          }}>
          {allActivity && allActivity.map((activity, idx) => <ActivityItem {...activity} key={idx} />)}
        </SimplebarReactClient>
      </CardBody>
    </Card>
  )
}
export default Activity
