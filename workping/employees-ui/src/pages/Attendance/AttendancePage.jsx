import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, CardBody, Col, Form, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import httpClient from '@/helpers/httpClient'

const legendItems = [
  { code: 'present', label: 'Present', colorClass: 'text-success' },
  { code: 'absent', label: 'Absent', colorClass: 'text-danger' },
  { code: 'late', label: 'Late', colorClass: 'text-warning' },
  { code: 'halfDay', label: 'Half Day', colorClass: 'text-info' },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const fmtTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
}

const workingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return '—'
  const ms = new Date(checkOut) - new Date(checkIn)
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

const monthRange = (monthName) => {
  const year = new Date().getFullYear()
  const m = new Date(`${monthName} 1, ${year}`).getMonth()
  return {
    startDate: new Date(year, m, 1).toISOString().split('T')[0],
    endDate: new Date(year, m + 1, 0).toISOString().split('T')[0],
  }
}

const weekRange = (monthName, weekLabel) => {
  const year = new Date().getFullYear()
  const m = new Date(`${monthName} 1, ${year}`).getMonth()
  const num = parseInt(weekLabel.replace('Week ', ''))
  const starts = [1, 8, 15, 22]
  const ends = [7, 14, 21, 31]
  const lastDay = new Date(year, m + 1, 0).getDate()
  return {
    startDate: new Date(year, m, starts[num - 1] ?? 1).toISOString().split('T')[0],
    endDate: new Date(year, m, Math.min(ends[num - 1] ?? 31, lastDay)).toISOString().split('T')[0],
  }
}

const AttendancePage = () => {
  const [reportType, setReportType] = useState('monthly')
  const [formData, setFormData] = useState({
    month: new Date().toLocaleString('en-US', { month: 'long' }),
    week: 'Week 1',
    fromDate: '',
    toDate: '',
  })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const buildRange = useCallback(() => {
    if (reportType === 'monthly') return monthRange(formData.month)
    if (reportType === 'weekly') return weekRange(formData.month, formData.week)
    return { startDate: formData.fromDate, endDate: formData.toDate }
  }, [reportType, formData])

  const fetchAttendance = useCallback(async () => {
    const { startDate, endDate } = buildRange()
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const res = await httpClient.get('/user/attendance/my-attendance', {
        params: { startDate, endDate, limit: 200 },
        silent: true,
      })
      setRows(res.data?.data?.attendance ?? [])
    } finally {
      setLoading(false)
    }
  }, [buildRange])

  useEffect(() => {
    fetchAttendance()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => row.index + 1 },
      { header: 'Date', accessorKey: 'date', cell: ({ getValue }) => <span className="text-nowrap">{fmtDate(getValue())}</span> },
      { header: 'Status', accessorKey: 'status', cell: ({ getValue }) => <span className="text-capitalize">{getValue() ?? '—'}</span> },
      { header: 'Check In', accessorKey: 'checkIn', cell: ({ getValue }) => <span className="text-nowrap">{fmtTime(getValue())}</span> },
      { header: 'Check Out', accessorKey: 'checkOut', cell: ({ getValue }) => <span className="text-nowrap">{fmtTime(getValue())}</span> },
      { header: 'Working Hours', id: 'wh', cell: ({ row }) => workingHours(row.original.checkIn, row.original.checkOut) },
      { header: 'Remarks', accessorKey: 'remarks', cell: ({ getValue }) => getValue() || '—' },
    ],
    [],
  )

  return (
    <>
      <PageMetaData title="Attendance" />

      <Row>
        <Col xs={12}>
          <Card className="border-0 bg-light mb-3">
            <CardBody className="py-3">
              <div className="d-flex flex-column align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center gap-4 w-100">
                  {[
                    ['monthly', 'Monthly'],
                    ['weekly', 'Weekly'],
                    ['period', 'Day Wise'],
                  ].map(([val, label]) => (
                    <Form.Check
                      key={val}
                      type="radio"
                      id={`${val}-radio`}
                      label={label}
                      name="reportType"
                      checked={reportType === val}
                      onChange={() => setReportType(val)}
                      className="fs-6"
                    />
                  ))}
                </div>

                <div className="d-flex flex-wrap align-items-center justify-content-center gap-3 w-100">
                  {(reportType === 'monthly' || reportType === 'weekly') && (
                    <div className="d-flex align-items-center gap-2">
                      <Form.Label className="mb-0 fw-semibold text-nowrap">Month :</Form.Label>
                      <Form.Select name="month" value={formData.month} onChange={handleChange} className="w-auto">
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  )}

                  {reportType === 'weekly' && (
                    <div className="d-flex align-items-center gap-2">
                      <Form.Label className="mb-0 fw-semibold text-nowrap">Week :</Form.Label>
                      <Form.Select name="week" value={formData.week} onChange={handleChange} className="w-auto">
                        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  )}

                  {reportType === 'period' && (
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2">
                        <Form.Label className="mb-0 fw-semibold text-nowrap">Dates :</Form.Label>
                        <Form.Control type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} className="w-auto" />
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold">To</span>
                        <Form.Control type="date" name="toDate" value={formData.toDate} onChange={handleChange} className="w-auto" />
                      </div>
                    </div>
                  )}

                  <Button variant="primary" className="px-4 text-white ms-2" onClick={fetchAttendance} disabled={loading}>
                    {loading ? <Spinner size="sm" animation="border" /> : 'Submit'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12}>
          <Card className="border-0 mb-3" style={{ borderTop: '2px solid #fd7e14' }}>
            <CardBody className="py-3">
              <ReactTable
                columns={columns}
                data={rows}
                pageSize={10}
                showPagination
                rowsPerPageList={[10, 25, 50]}
                tableClass="table-centered table-bordered mb-0"
                theadClass="table-light"
              />

              <div className="mt-4 p-3 bg-light rounded d-flex flex-wrap justify-content-center gap-4">
                {legendItems.map((item, i) => (
                  <div key={i} className="d-flex" style={{ fontSize: '1rem' }}>
                    <span className={`fw-bold ${item.colorClass}`}>{item.code}</span>
                    <span className="text-secondary">: {item.label}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AttendancePage
