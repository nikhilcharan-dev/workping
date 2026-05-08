import { useState, useEffect } from 'react'
import { Card, CardBody, Row, Col, Button, Form, Spinner } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const toYmd = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const buildDefaultSundayHolidays = (year = new Date().getFullYear()) => {
  const list = []
  const cursor = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)

  while (cursor <= end) {
    if (cursor.getDay() === 0) {
      const date = toYmd(cursor)
      list.push({
        _id: `default-sunday-${date}`,
        name: 'Weekly Off (Sunday)',
        type: 'public',
        date,
        description: 'Default weekly holiday',
        isDefaultSunday: true,
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return list
}

const mergeWithSundayDefaults = (apiHolidays) => {
  const normalized = (apiHolidays || []).map((h) => ({ ...h, date: toYmd(h.date) || h.date }))
  const existingDates = new Set(normalized.map((h) => h.date))
  const defaults = buildDefaultSundayHolidays().filter((h) => !existingDates.has(h.date))

  return [...normalized, ...defaults].sort((a, b) => new Date(a.date) - new Date(b.date))
}

const schema = yup.object({
  organizationId: yup.string().required('Organization is required'),
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .required('Holiday name is required'),
  date: yup.string().required('Date is required'),
  type: yup.string().oneOf(['public', 'organization'], 'Select a valid type').required('Type is required'),
  description: yup.string(),
})

const ManageHolidays = () => {
  const [holidays, setHolidays] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) })

  const selectedOrganizationId = watch('organizationId')

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    if (selectedOrganizationId) {
      fetchHolidays(selectedOrganizationId)
    }
  }, [selectedOrganizationId])

  const fetchOrganizations = async () => {
    try {
      const res = await axiosClient.get('/api/admin/organization/get-all-organization-ids', { silent: true })
      const orgs = res.data?.data || []
      setOrganizations(orgs)

      if (orgs.length > 0 && !selectedOrganizationId) {
        setValue('organizationId', orgs[0].organizationId, { shouldValidate: true })
      }
    } catch {}
  }

  const fetchHolidays = async (organizationId) => {
    if (!organizationId) return

    setLoading(true)
    try {
      const res = await axiosClient.get('/api/admin/holiday/get-holidays', {
        params: { organizationId },
        silent: true,
      })
      setHolidays(mergeWithSundayDefaults(res.data?.data || []))
    } catch {
      // interceptor handles error toast
    } finally {
      setLoading(false)
    }
  }

  const onAdd = async (values) => {
    setAdding(true)
    try {
      await axiosClient.post('/api/admin/holiday/add-holiday', values, { silent: true })
      toast.success('Holiday added successfully')
      reset()
      setValue('organizationId', values.organizationId, { shouldValidate: true })
      fetchHolidays(values.organizationId)
    } catch {
      // interceptor handles error toast
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    if (String(id).startsWith('default-sunday-')) {
      toast('Default Sunday holidays cannot be deleted')
      return
    }

    setDeletingId(id)
    try {
      await axiosClient.post('/api/admin/holiday/delete-holidays', { ids: [id] }, { silent: true })
      toast.success('Holiday deleted')
      setHolidays((prev) => prev.filter((h) => h._id !== id))
    } catch {
      // interceptor handles error toast
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Row>
      <Col>
        <Card>
          <CardBody>
            <h5 className="mb-4">Manage Holidays</h5>

            {/* ── Add Form ── */}
            <Form onSubmit={handleSubmit(onAdd)}>
              <Row className="g-3 mb-2">
                {/* Left: 4 fields in 2x2 grid */}
                <Col md={8}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>
                          Organization <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select {...register('organizationId')} isInvalid={!!errors.organizationId}>
                          <option value="">Select Organization</option>
                          {organizations.map((o) => (
                            <option key={o.organizationId} value={o.organizationId}>
                              {o.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.organizationId?.message}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>
                          Holiday Name <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control {...register('name')} placeholder="Enter holiday name" isInvalid={!!errors.name} />
                        <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>
                          Date <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control type="date" {...register('date')} isInvalid={!!errors.date} />
                        <Form.Control.Feedback type="invalid">{errors.date?.message}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>
                          Type <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select {...register('type')} isInvalid={!!errors.type}>
                          <option value="">Select Type</option>
                          <option value="public">Public</option>
                          <option value="organization">Organization</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.type?.message}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </Col>

                {/* Right: Description spanning full height */}
                <Col md={4} className="d-flex flex-column">
                  <Form.Group className="flex-fill d-flex flex-column">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      {...register('description')}
                      placeholder="Enter description (optional)"
                      className="flex-fill"
                      style={{ resize: 'none' }}
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} className="d-flex justify-content-center">
                  <Button type="submit" variant="primary" disabled={adding}>
                    {adding ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-1" />
                        Adding...
                      </>
                    ) : (
                      'Add Holiday'
                    )}
                  </Button>
                </Col>
              </Row>
            </Form>

            <hr className="my-4" />

            {/* ── Holiday List ── */}
            <h6 className="mb-3">All Holidays</h6>
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-3">
                          No holidays found
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h, i) => (
                        <tr key={h._id ?? `${h.name}-${h.date}-${i}`}>
                          <td>{i + 1}</td>
                          <td>{h.name || '--'}</td>
                          <td>
                            <span className={`badge bg-${h.type === 'public' ? 'primary' : 'info'}`}>{h.type || '--'}</span>
                          </td>
                          <td>{h.date ? new Date(h.date).toLocaleDateString() : '--'}</td>
                          <td>{h.description || '--'}</td>
                          <td>
                            {h.isDefaultSunday ? (
                              <span className="text-muted small">Default</span>
                            ) : (
                              <Button variant="outline-danger" size="sm" disabled={deletingId === h._id} onClick={() => handleDelete(h._id)}>
                                {deletingId === h._id ? (
                                  <Spinner as="span" animation="border" size="sm" />
                                ) : (
                                  <IconifyIcon icon="mdi:trash-can-outline" />
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default ManageHolidays
