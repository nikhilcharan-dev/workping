import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Row, Spinner } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'

const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid']

const today = new Date().toISOString().split('T')[0]

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
}

const buildDatesArray = (from, to) => {
  const dates = []
  const cur = new Date(from)
  const end = new Date(to)
  while (cur <= end) {
    dates.push(new Date(cur).toISOString())
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const LeavePage = () => {
  const [leaves, setLeaves] = useState([])
  const [balance, setBalance] = useState({ totalCLDays: 0, usedDays: 0, remainingDays: 0 })
  const [fetching, setFetching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ from: '', to: '', type: '', reason: '' })
  const [errors, setErrors] = useState({})

  const fetchLeaves = useCallback(async () => {
    setFetching(true)
    try {
      const [leavesRes, balanceRes] = await Promise.all([
        httpClient.get('/user/leaves/my-leaves', { params: { limit: 100 }, silent: true }),
        httpClient.get('/user/leaves/balance', { silent: true }),
      ])
      setLeaves(leavesRes.data?.data?.leaves ?? [])
      setBalance(balanceRes.data?.data ?? { totalCLDays: 0, usedDays: 0, remainingDays: 0 })
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.from) errs.from = 'From date is required.'
    if (!form.to) errs.to = 'To date is required.'
    if (form.from && form.to && form.to < form.from) errs.to = 'To date must be after From date.'
    if (!form.type) errs.type = 'Leave type is required.'
    if (!form.reason.trim()) errs.reason = 'Reason is required.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      await httpClient.post('/user/leaves/apply', {
        dates: buildDatesArray(form.from, form.to),
        leaveType: form.type,
        reason: form.reason,
      })
      setForm({ from: '', to: '', type: '', reason: '' })
      await fetchLeaves()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = useCallback(
    async (leaveId) => {
      try {
        await httpClient.delete(`/user/leaves/cancel/${leaveId}`)
        await fetchLeaves()
      } catch {
        // httpClient interceptor shows toast
      }
    },
    [fetchLeaves],
  )

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => row.index + 1 },
      {
        header: 'From',
        id: 'from',
        cell: ({ row }) => <span className="fw-medium text-nowrap">{fmtDate(row.original.dates?.[0])}</span>,
      },
      {
        header: 'To',
        id: 'to',
        cell: ({ row }) => <span className="text-nowrap">{fmtDate(row.original.dates?.[row.original.dates.length - 1])}</span>,
      },
      {
        header: 'Days',
        id: 'days',
        cell: ({ row }) => <span className="text-nowrap">{row.original.dates?.length ?? 1} WD</span>,
      },
      {
        header: 'Type',
        accessorKey: 'leaveType',
        cell: ({ getValue }) => (
          <Badge bg="primary" className="px-2 py-1">
            {getValue()}
          </Badge>
        ),
      },
      { header: 'Reason', accessorKey: 'reason', cell: ({ getValue }) => getValue() || '—' },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => (
          <Badge bg={getValue() === 'approved' ? 'success' : getValue() === 'rejected' ? 'danger' : 'warning'} className="px-2 py-1 text-capitalize">
            {getValue()}
          </Badge>
        ),
      },
      {
        header: 'Action',
        id: 'action',
        cell: ({ row }) =>
          row.original.status === 'pending' ? (
            <Button variant="outline-danger" size="sm" className="py-0" onClick={() => handleCancel(row.original._id)}>
              <IconifyIcon icon="bx:trash" height={16} width={16} />
            </Button>
          ) : (
            <Button variant="outline-info" size="sm" className="py-0">
              <IconifyIcon icon="bx:show" height={16} width={16} />
            </Button>
          ),
      },
    ],
    [handleCancel],
  )

  return (
    <>
      <PageMetaData title="Leaves" />

      <Row>
        {/* Summary */}
        <Col xs={12} className="mb-3">
          <Card className="border-0 bg-light">
            <CardBody className="py-3">
              <div className="d-flex flex-wrap gap-4 align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <IconifyIcon icon="bx:envelope" className="text-primary fs-4" />
                  <span className="fw-semibold text-muted">Leaves</span>
                </div>
                <div className="vr d-none d-sm-block" />
                <div>
                  <span className="text-muted">Total Leaves : </span>
                  <span className="fw-bold fs-5">{fetching ? '…' : balance.totalCLDays}</span>
                </div>
                <div className="vr d-none d-sm-block" />
                <div>
                  <span className="text-muted">Leaves Used : </span>
                  <span className="fw-bold fs-5 text-warning">{fetching ? '…' : balance.usedDays}</span>
                </div>
                <div className="vr d-none d-sm-block" />
                <div>
                  <span className="text-muted">Remaining Balance : </span>
                  <span className="fw-bold fs-5 text-success">{fetching ? '…' : balance.remainingDays}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Apply Form */}
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <h5 className="mb-0">Apply for Leave</h5>
            </CardHeader>
            <CardBody>
              <Form onSubmit={handleSubmit} noValidate>
                <Row className="g-3">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">From</Form.Label>
                      <Form.Control type="date" name="from" value={form.from} min={today} onChange={handleChange} isInvalid={!!errors.from} />
                      <Form.Control.Feedback type="invalid">{errors.from}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">To</Form.Label>
                      <Form.Control type="date" name="to" value={form.to} min={form.from || today} onChange={handleChange} isInvalid={!!errors.to} />
                      <Form.Control.Feedback type="invalid">{errors.to}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Leave Type</Form.Label>
                      <Form.Select name="type" value={form.type} onChange={handleChange} isInvalid={!!errors.type}>
                        <option value="">-- Select --</option>
                        {LEAVE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{errors.type}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Reason</Form.Label>
                      <Form.Control
                        type="text"
                        name="reason"
                        placeholder="Enter reason..."
                        value={form.reason}
                        onChange={handleChange}
                        isInvalid={!!errors.reason}
                      />
                      <Form.Control.Feedback type="invalid">{errors.reason}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="d-flex justify-content-end">
                    <Button type="submit" variant="primary" disabled={submitting}>
                      {submitting ? <Spinner size="sm" animation="border" className="me-1" /> : <IconifyIcon icon="bx:check" className="me-1" />}
                      Apply For Leave
                    </Button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>

        {/* Leaves Table */}
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <h5 className="mb-0 text-center">List of Leaves</h5>
            </CardHeader>
            <CardBody className="p-0">
              <ReactTable
                columns={columns}
                data={leaves}
                pageSize={10}
                showPagination
                rowsPerPageList={[5, 10, 25, 50]}
                tableClass="table-centered mb-0"
                theadClass="table-light"
              />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default LeavePage
