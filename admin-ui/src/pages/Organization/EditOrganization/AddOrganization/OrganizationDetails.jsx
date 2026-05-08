import ComponentContainerCard from '@/components/ComponentContainerCard'
import { Button, Form, Row, Col } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import AreaPinPicker from '@/components/maps/AreaPinPicker'

import { use2FA } from '@/context/TwoFAContext'
import { useAuthContext } from '@/context/useAuthContext'

const schema = yup.object({
  organizationName: yup.string().required('Organization Name is required'),
  organizationType: yup.string().required('Organization Type is required'),
  foundedAt: yup.date().max(new Date(), 'Founded Date cannot be in the future').required('Founded Date is required'),
  casualLeaves: yup
    .number()
    .typeError('Casual Leaves must be a number')
    .min(0, 'Minimum 0')
    .max(15, 'Maximum 15')
    .required('Casual Leaves is required'),
  ipAddress: yup
    .string()
    .required('IP Address is required')
    .matches(/^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/, 'Invalid IP Address'),
  latitude: yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .nullable()
    .typeError('Latitude must be a number')
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .test('latitude-pair', 'Latitude and Longitude must both be provided together', function (value) {
      const { longitude } = this.parent
      const latitudeProvided = value !== undefined && value !== null
      const longitudeProvided = longitude !== undefined && longitude !== null && longitude !== ''
      return latitudeProvided === longitudeProvided
    }),
  longitude: yup
    .number()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .nullable()
    .typeError('Longitude must be a number')
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .test('longitude-pair', 'Latitude and Longitude must both be provided together', function (value) {
      const { latitude } = this.parent
      const latitudeProvided = latitude !== undefined && latitude !== null && latitude !== ''
      const longitudeProvided = value !== undefined && value !== null
      return latitudeProvided === longitudeProvided
    }),
  msl: yup.string().optional(),
})

const handleIpKeyDown = (e) => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (allowedKeys.includes(e.key)) return
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return
  if (!/^[0-9.]$/.test(e.key)) {
    e.preventDefault()
  }
}

const handleIpPaste = (e) => {
  const pasted = e.clipboardData.getData('text')
  if (!/^[0-9.]+$/.test(pasted)) {
    e.preventDefault()
  }
}

const OrganizationDetailsForm = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [areaPins, setAreaPins] = useState([])

  const { require2FA } = use2FA()
  const { is2FAAuthnticator } = useAuthContext()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    shouldFocusError: false,
  })

  const handleAreaPinsChange = (pins) => {
    setAreaPins(pins)

    if (pins.length > 0) {
      setValue('latitude', pins[0].lat, { shouldDirty: true, shouldValidate: true })
      setValue('longitude', pins[0].lng, { shouldDirty: true, shouldValidate: true })
      return
    }

    setValue('latitude', '', { shouldDirty: true, shouldValidate: true })
    setValue('longitude', '', { shouldDirty: true, shouldValidate: true })
  }

  // Restore form data passed back via location.state (after QR redirect)
  useEffect(() => {
    const formData = location.state?.formData
    if (formData) {
      // Convert date to YYYY-MM-DD for the date input
      if (formData.foundedAt) {
        const d = new Date(formData.foundedAt)
        if (!isNaN(d.getTime())) {
          formData.foundedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
      }
      formData.latitude = formData.latitude ?? formData.coordinates?.[0] ?? ''
      formData.longitude = formData.longitude ?? formData.coordinates?.[1] ?? ''
      formData.msl = formData.msl ?? ''

      const restoredPins = Array.isArray(formData.areaPins)
        ? formData.areaPins
        : formData.latitude !== '' && formData.longitude !== ''
          ? [{ lat: Number(formData.latitude), lng: Number(formData.longitude) }]
          : []

      setAreaPins(restoredPins)
      reset(formData)
    }
  }, [location.state, reset])

  const onSubmit = async (data) => {
    const newData = {
      name: data.organizationName,
      type: data.organizationType,
      foundedAt: data.foundedAt,
      clDays: Number(data.casualLeaves),
      description: data.description?.trim() || undefined,
      IPWhitelist: data.ipAddress ? [data.ipAddress.trim()] : [],
    }

    const latitude = data.latitude === '' || data.latitude === undefined ? undefined : Number(data.latitude)
    const longitude = data.longitude === '' || data.longitude === undefined ? undefined : Number(data.longitude)

    if (latitude !== undefined && longitude !== undefined) {
      newData.coordinates = [latitude, longitude]
    }

    if (data.msl?.trim()) {
      newData.msl = data.msl.trim()
    }

    if (Array.isArray(areaPins) && areaPins.length > 0) {
      newData.areaPins = areaPins.map((pin) => ({ lat: Number(pin.lat), lng: Number(pin.lng) }))
    }

    if (is2FAAuthnticator) {
      // Pass form data along to QR page so it can send it back
      toast('Please set up Two-Factor Authentication first.', { icon: '🔐' })
      navigate('/2fa-authnticator', {
        state: {
          action: 'ORG',
          path: '/organization/organization-details',
          formData: {
            ...data,
            areaPins,
          },
        },
      })
      return
    }

    // 2FA is set up — use verification modal and create org
    require2FA(async () => {
      try {
        await axiosClient.post('/api/admin/organization/add-organization', newData, { silent: true })

        toast.success('Organization added successfully!')
        reset()
        navigate('/organization/view-organizations')
      } catch (error) {
        throw new Error(error?.response?.data?.message || 'Failed to add organization')
      }
    })
  }

  return (
    <Row className="justify-content-center mt-4">
      <Col xs={12} md={10} lg={8} xl={7}>
        <ComponentContainerCard id="basic" title="Organization Details">
          <Form noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>
                  Organization Name <span className="text-danger">*</span>
                </Form.Label>

                <Form.Control placeholder="Enter Organization Name" {...register('organizationName')} />

                <small className="text-danger">{errors.organizationName?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  Organization Type <span className="text-danger">*</span>
                </Form.Label>

                <Form.Control placeholder="Enter Organization Type" {...register('organizationType')} />

                <small className="text-danger">{errors.organizationType?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  Founded At <span className="text-danger">*</span>
                </Form.Label>

                <Form.Control type="date" max={new Date().toISOString().split('T')[0]} {...register('foundedAt')} />

                <small className="text-danger">{errors.foundedAt?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  Organization IP Address <span className="text-danger">*</span>
                </Form.Label>

                <Form.Control
                  type="text"
                  placeholder="Enter IP Address (e.g., 192.168.1.1)"
                  {...register('ipAddress')}
                  maxLength={15}
                  onKeyDown={handleIpKeyDown}
                  onPaste={handleIpPaste}
                />

                <small className="text-danger">{errors.ipAddress?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  Casual Leaves <span className="text-danger">*</span>
                </Form.Label>

                <Form.Control type="number" placeholder="Enter Casual Leaves" {...register('casualLeaves')} />

                <small className="text-danger">{errors.casualLeaves?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  Latitude <small className="text-muted">(Optional)</small>
                </Form.Label>

                <Form.Control type="number" step="any" placeholder="Enter Latitude" {...register('latitude')} />

                <small className="text-danger">{errors.latitude?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  Longitude <small className="text-muted">(Optional)</small>
                </Form.Label>

                <Form.Control type="number" step="any" placeholder="Enter Longitude" {...register('longitude')} />

                <small className="text-danger">{errors.longitude?.message}</small>
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>
                  MSL <small className="text-muted">(Optional)</small>
                </Form.Label>

                <Form.Control type="text" placeholder="Enter MSL" {...register('msl')} />

                <small className="text-danger">{errors.msl?.message}</small>
              </div>

              <div className="col-12 mb-3">
                <Form.Label>
                  Area Coverage <small className="text-muted">(Optional)</small>
                </Form.Label>

                <AreaPinPicker pins={areaPins} onPinsChange={handleAreaPinsChange} initialCenter={{ lat: 20.5937, lng: 78.9629 }} />
              </div>

              <div className="col-12 mb-3">
                <Form.Label>
                  Description <small className="text-muted">(Optional)</small>
                </Form.Label>

                <Form.Control as="textarea" rows={4} {...register('description')} />
              </div>

              <div className="col-12 text-center mt-3">
                <Button type="submit" variant="primary">
                  Submit
                </Button>
              </div>
            </div>
          </Form>
        </ComponentContainerCard>
      </Col>
    </Row>
  )
}

export default OrganizationDetailsForm
