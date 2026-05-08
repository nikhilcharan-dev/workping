import { Fragment, useEffect, useState } from 'react'
import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import { getAllTimeline } from '@/helpers/data'
const CenteredTimeline = ({ timeline }) => {
  return (
    <div className="timeline">
      {Object.keys(timeline).map((day, idx) => {
        return (
          <Fragment key={idx}>
            <article className="timeline-time">
              <div className="time-show d-flex align-items-center justify-content-center mt-0">
                <h5 className="mb-0 text-uppercase fs-14 fw-semibold">{day}</h5>
              </div>
            </article>
            {timeline[day].map((item, idx) => {
              return idx % 2 === 0 ? (
                <article className="timeline-item timeline-item-left" key={idx}>
                  <div className="timeline-desk">
                    <div className="timeline-box clearfix">
                      <span className="timeline-icon" />
                      <div className="overflow-hidden">
                        <Card className="d-inline-block">
                          <CardBody>
                            <h5 className="mt-0 fs-16">
                              {item.title}
                              {item.important && <span className="badge bg-secondary ms-1 align-items-center">important</span>}
                            </h5>
                            <p className="text-muted mb-0">{item.description}</p>
                          </CardBody>
                        </Card>
                      </div>
                    </div>
                  </div>
                </article>
              ) : (
                <article className="timeline-item" key={idx}>
                  <div className="timeline-desk">
                    <div className="timeline-box clearfix">
                      <span className="timeline-icon" />
                      <div className="overflow-hidden">
                        <Card className="d-inline-block">
                          <CardBody>
                            <h5 className="mt-0 fs-16">
                              {item.important && <span className="badge bg-secondary me-1 align-items-center">important</span>}
                              {item.title}
                            </h5>
                            <p className="text-muted mb-0">{item.description}</p>
                          </CardBody>
                        </Card>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </Fragment>
        )
      })}
    </div>
  )
}
const LeftTimeline = ({ timeline }) => {
  return (
    <>
      {Object.keys(timeline).map((day, idx) => {
        return (
          <Fragment key={idx}>
            <div className="d-flex flex-row fs-18 align-items-center mb-3">
              <h5 className="mb-0">{day}</h5>
            </div>
            <ul className="list-unstyled left-timeline">
              {timeline[day].map((item, idx) => {
                return (
                  <li className="left-timeline-list" key={idx}>
                    <Card className="d-inline-block">
                      <CardBody>
                        <h5 className="mt-0 fs-16">
                          {item.title}
                          {item.important && <span className="badge bg-secondary ms-1 align-items-center">important</span>}
                        </h5>
                        <p className="text-muted mb-0">{item.description}</p>
                      </CardBody>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </Fragment>
        )
      })}
    </>
  )
}
const Timeline = () => {
  const [timelineData, setTimelineData] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getAllTimeline()
      setTimelineData(data)
    })()
  }, [])
  return (
    <>
      <PageBreadcrumb subName="Pages" title="Timeline" />
      <PageMetaData title="Timeline" />

      <Row>
        <Col lg={12}>{timelineData && <CenteredTimeline timeline={timelineData} />}</Col>
      </Row>
      <Row>
        <Col xs={12}>
          <CardTitle as={'h5'} className="mb-3">
            Left Timeline
          </CardTitle>
          {timelineData && <LeftTimeline timeline={timelineData} />}
        </Col>
      </Row>
    </>
  )
}
export default Timeline
