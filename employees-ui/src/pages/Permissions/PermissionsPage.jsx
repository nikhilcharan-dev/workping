import { useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Row } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const initialPermissions = []

const statusVariant = (status) => {
  switch (status) {
    case 'Approved':
      return 'success'
    case 'Pending':
      return 'warning'
    case 'Rejected':
      return 'danger'
    default:
      return 'secondary'
  }
}

const today = new Date().toISOString().split('T')[0]

const PermissionsPage = () => {
  const [permissions, setPermissions] = useState(initialPermissions)
  const [form, setForm] = useState({ date: '', type: '', reason: '' })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.date) newErrors.date = 'Date is required.'
    if (!form.type) newErrors.type = 'Type is required.'
    if (!form.reason.trim()) newErrors.reason = 'Reason is required.'
    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    const now = new Date()
    const appliedOn = `${form.date} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    const newEntry = {
      id: permissions.length + 1,
      date: form.date,
      type: form.type,
      reason: form.reason,
      appliedOn,
      status: 'Pending',
    }
    setPermissions((prev) => [newEntry, ...prev])
    setForm({ date: '', type: '', reason: '' })
  }

  const columns = useMemo(
    () => [
      {
        header: 'S.No',
        accessorKey: 'id',
        cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span>,
      },
      {
        header: 'Date',
        accessorKey: 'date',
        cell: ({ getValue }) => <span className="text-nowrap fw-medium">{getValue()}</span>,
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ getValue }) => <span className="text-nowrap">{getValue()}</span>,
      },
      {
        header: 'Reason',
        accessorKey: 'reason',
      },
      {
        header: 'Applied On',
        accessorKey: 'appliedOn',
        cell: ({ getValue }) => <span className="text-nowrap text-muted">{getValue()}</span>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => (
          <Badge bg={statusVariant(getValue())} className="px-2 py-1">
            {getValue()}
          </Badge>
        ),
      },
      {
        header: 'Action',
        id: 'action',
        cell: ({ row }) =>
          row.original.status === 'Approved' ? (
            <Button variant="outline-info" size="sm" className="py-0">
              <IconifyIcon icon="bx:show" height={16} width={16} />
            </Button>
          ) : (
            <Button variant="outline-danger" size="sm" className="py-0">
              <IconifyIcon icon="bx:trash" height={16} width={16} />
            </Button>
          ),
      },
    ],
    [],
  )

  return (
    <>
      <PageMetaData title="Permission" />

      <Row>
        {/* Apply Permission Form */}
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <div className="d-flex align-items-center gap-2">
                <IconifyIcon icon="bx:cycling" className="text-primary fs-4" />
                <h5 className="mb-0">Permission</h5>
              </div>
            </CardHeader>
            <CardBody>
              <Form onSubmit={handleSubmit} noValidate>
                <Row className="g-3 align-items-start">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Date</Form.Label>
                      <Form.Control type="date" name="date" value={form.date} min={today} onChange={handleChange} isInvalid={!!errors.date} />
                      <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Type</Form.Label>
                      <Form.Control
                        type="text"
                        name="type"
                        placeholder="Enter type..."
                        value={form.type}
                        onChange={handleChange}
                        isInvalid={!!errors.type}
                      />
                      <Form.Control.Feedback type="invalid">{errors.type}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">Reason For Permission</Form.Label>
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

                  <Col md={2} className="d-flex flex-column justify-content-end">
                    <Form.Label className="invisible">.</Form.Label>
                    <Button type="submit" variant="primary" className="w-100">
                      <IconifyIcon icon="bx:check" className="me-1" />
                      Apply Permission
                    </Button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>

        {/* Permissions List Table */}
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <h5 className="mb-0 text-center">List of Permission</h5>
            </CardHeader>
            <CardBody className="p-0">
              <ReactTable
                columns={columns}
                data={permissions}
                pageSize={10}
                showPagination
                rowsPerPageList={[5, 10, 25, 50]}
                tableClass="table-centered text-nowrap mb-0"
                theadClass="table-light"
              />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default PermissionsPage
