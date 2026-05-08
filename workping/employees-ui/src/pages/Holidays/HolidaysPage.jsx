import React, { useState, useEffect } from 'react'
import { Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const HolidaysPage = () => {
  const [holidaysList, setHolidaysList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true)
        const res = await httpClient.get('/user/holiday/get-holidays', { silent: true })
        setHolidaysList(res.data?.data ?? [])
      } catch (err) {
        setError('Failed to load holidays from the server.')
      } finally {
        setLoading(false)
      }
    }
    fetchHolidays()
  }, [])

  return (
    <>
      <PageMetaData title="Holidays" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody className="d-flex flex-column align-items-center py-5">
              <div className="d-flex mb-4 mt-2 shadow-sm rounded overflow-hidden border">
                <div className="text-white px-4 py-2 d-flex align-items-center justify-content-center bg-primary">
                  <IconifyIcon icon="mdi:calendar-month-outline" height={20} width={20} />
                </div>
                <div
                  className="bg-body-secondary text-body fw-semibold px-4 py-2 d-flex align-items-center justify-content-center"
                  style={{ fontSize: '15px' }}>
                  Holidays
                </div>
              </div>

              <h2 className="text-body fw-normal mb-4" style={{ fontSize: '26px' }}>
                List of Holidays
              </h2>

              <div className="text-muted mb-4 text-center fw-medium" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                <span
                  className="badge rounded px-2 py-1 me-2 align-middle text-uppercase bg-danger"
                  style={{ fontSize: '13px', paddingBottom: '4px' }}>
                  Note
                </span>
                <span className="align-middle text-body">
                  : In Case of any unforseen circumstances you will be notified
                  <br />
                  whether you need to work from home or not
                </span>
              </div>

              <div className="w-100" style={{ maxWidth: '900px' }}>
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0 text-start align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center py-3 fw-semibold text-body" style={{ width: '10%', fontSize: '16px' }}>
                          S.No
                        </th>
                        <th className="text-center py-3 fw-semibold text-body" style={{ width: '45%', fontSize: '16px' }}>
                          Date
                        </th>
                        <th className="text-center py-3 fw-semibold text-body" style={{ width: '45%', fontSize: '16px' }}>
                          Name of the Holiday
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-body">
                      {loading ? (
                        <tr>
                          <td colSpan="3" className="text-center py-5 text-muted">
                            <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                            Loading holidays...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan="3" className="text-center py-5 text-danger">
                            {error}
                          </td>
                        </tr>
                      ) : holidaysList.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-5 text-muted">
                            No holidays mapped.
                          </td>
                        </tr>
                      ) : (
                        holidaysList.map((holiday, index) => (
                          <tr key={holiday._id ?? index}>
                            <td className="fw-medium px-4 py-3 text-muted" style={{ fontSize: '14px' }}>
                              {index + 1}
                            </td>
                            <td className="fw-medium px-4 py-3 text-muted" style={{ fontSize: '14px' }}>
                              {formatDate(holiday.date)}
                            </td>
                            <td className="fw-bold px-4 py-3" style={{ fontSize: '14px' }}>
                              {holiday.name}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default HolidaysPage
