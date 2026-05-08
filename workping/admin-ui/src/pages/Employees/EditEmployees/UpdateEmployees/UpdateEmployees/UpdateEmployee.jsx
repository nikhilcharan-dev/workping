import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Form } from 'react-bootstrap'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import countryCodes from 'country-calling-code'
import FaceEmbeddings from './FaceEmbeddings'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import axiosClient from '@/helpers/httpClient'

import { use2FA } from '@/context/TwoFAContext'
import { useAuthContext } from '@/context/useAuthContext'
const schema = yup.object({
  userId: yup.string().trim().required('User Id is required'),

  userName: yup
    .string()
    .trim()
    .matches(/^[A-Za-z\s]+$/, 'User Name must contain only letters and spaces')
    .required('User Name is required'),

  email: yup.string().email('Invalid email').required('Email is required'),

  phone: yup
    .string()
    .matches(/^[0-9]{10}$/, 'Phone must be exactly 10 digits')
    .required('Phone is required'),

  dob: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be in dd-mm-yyyy format')
    .required('Date of Birth is required'),

  gender: yup.string().required('Gender is required'),

  doj: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date of Joining must be in dd-mm-yyyy format')
    .required('Date of Joining is required'),

  aadhaar: yup
    .string()
    .matches(/^[0-9]{12}$/, 'Aadhaar must be exactly 12 digits')
    .required('Aadhaar is required'),

  organizationName: yup.string().required('Organization Name is required'),
  workType: yup.string().required('Work Type is required'),
  address: yup.string().required('Address is required'),

  passport: yup.string().nullable(),

  bankId: yup.string().nullable(),

  pan: yup
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v))
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
})

const UpdateEmployee = () => {
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState([])
  const [orgSearch, setOrgSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [step, setStep] = useState(0)
  const [countryCode, setCountryCode] = useState('+91')
  const [search, setSearch] = useState('')
  const [faceEmbedding, setFaceEmbedding] = useState(null)
  const { employeeId } = useParams()
  const [currency, setCurrency] = useState('₹')
  const [id, setId] = useState('')
  const { require2FA } = use2FA()
  const { is2FAAuthnticator } = useAuthContext()
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
  })

  const goNext = handleSubmit(() => {
    setStep(1)
  })

  const submitForm = async () => {
    const v = getValues()

    const data = {
      employeeId: id,
      userName: v.userName,
      email: v.email,
      phone: v.phone,
      userId: v.userId,
      organizationName: v.organizationName,
      doj: v.doj,

      gender: v.gender,
      salary: v.salary,
      dob: v.dob,
      address: v.address,
      isActive: true,

      aadhaar: v.aadhaar,
      pan: v.pan,
      passport: v.passport,
      bankId: v.bankId,
    }

    try {
      {
        require2FA(async () => {
          try {
            const response = await axiosClient.post('/api/admin/employee/update', data, { silent: true })

            navigate('/employees/employees-update-view')
          } catch (error) {
            throw new Error(error?.response?.data?.message || 'Failed to add Employee')
          }
        })
      }
    } catch (error) {
      // Error handled by interceptor
    }
  }
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true })

        const formatted = Object.entries(res.data?.data || {}).map(([name, obj]) => ({
          name,
          organizationId: obj.organizationId,
        }))

        setOrganizations(formatted)
      } catch (error) {
        // Error handled by interceptor
      }
    }

    fetchOrganizations()
  }, [])
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await axiosClient.get(`/api/admin/employee/get-employee/${employeeId}`, { silent: true })

        const emp = res.data?.data
        setId(emp._id)
        setValue('userId', emp.employeeId)
        setValue('userName', emp.name)
        setValue('email', emp.email)
        const workTypeMap = { onsite: 'onSite', remote: 'Remote', hybrid: 'Hybrid' }
        setValue('workType', workTypeMap[emp.workType?.toLowerCase()] || emp.workType)
        const phone = emp.phone?.replace(/^\+\d{1,3}/, '')
        setValue('phone', phone)

        setValue('dob', emp.dob?.split('T')[0])
        setValue('address', emp.address)
        setValue('gender', emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : '')

        setValue('doj', emp.dateOfJoining?.split('T')[0])

        setValue('role', emp.roleInTeam ? emp.roleInTeam.charAt(0).toUpperCase() + emp.roleInTeam.slice(1) : '')

        setValue('organizationName', emp.organizationId?.name)
        setValue('aadhaar', emp.aadhaarNumber)
        setValue('salary', emp.salary)
        setValue('pan', emp.panNumber)
        setValue('passport', emp.passportNumber)
        setValue('bankId', emp.bankAccount)

        setSelectedOrg(emp.organizationId?.name)
      } catch (error) {
        // Error handled by interceptor
      }
    }

    if (employeeId) fetchEmployee()
  }, [employeeId])

  return (
    <>
      {step === 0 && (
        <ComponentContainerCard
          title={
            <div className="d-flex justify-content-between align-items-center">
              <span>Update Employee Details</span>
            </div>
          }>
          <Form className="row g-3">
            {/* Row 1 */}
            <div className="col-md-4">
              <Form.Label>
                User ID <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control placeholder="Enter User Id" {...register('userId')} />
              <small className="text-danger">{errors.userId?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>
                User Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                placeholder="Enter Full Name"
                {...register('userName')}
                onKeyDown={(e) => {
                  if (!/^[A-Za-z ]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
              />
              <small className="text-danger">{errors.userName?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>
                Email <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control placeholder="Enter Email" {...register('email')} />
              <small className="text-danger">{errors.email?.message}</small>
            </div>

            {/* Row 2 */}
            <div className="col-md-4">
              <Form.Label>
                Organization Name <span className="text-danger">*</span>
              </Form.Label>

              <Dropdown className="w-100">
                <Dropdown.Toggle
                  as="div"
                  className="form-control d-flex justify-content-between align-items-center arrow-none"
                  style={{ cursor: 'pointer' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {selectedOrg || 'Select Organization'}
                  </span>
                  <IconifyIcon icon="bx:chevron-down" className="fs-4" />
                </Dropdown.Toggle>

                <Dropdown.Menu className="w-100 p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <Form.Control placeholder="Search organization" className="mb-2" value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} />

                  {organizations
                    .filter((o) => o.name.toLowerCase().includes(orgSearch.toLowerCase()))
                    .map((o) => (
                      <Dropdown.Item
                        key={o.organizationId}
                        onClick={() => {
                          setSelectedOrg(o.name)
                          setValue('organizationName', o.name)
                          setOrgSearch('')
                        }}>
                        {o.name}
                      </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
              </Dropdown>

              <input type="hidden" {...register('organizationName')} />
              <small className="text-danger">{errors.organizationName?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>
                Contact Number <span className="text-danger">*</span>
              </Form.Label>

              <div className="d-flex gap-2">
                <Dropdown>
                  <DropdownToggle className="btn btn-light border arrow-none" style={{ minWidth: 90 }}>
                    {countryCode}
                    <IconifyIcon icon="bx:chevron-down" className="ms-2" />
                  </DropdownToggle>

                  <DropdownMenu style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <Form.Control placeholder="Search country" className="m-2" value={search} onChange={(e) => setSearch(e.target.value)} />

                    {countryCodes
                      .filter((c) => c.country.toLowerCase().includes(search.toLowerCase()))
                      .map((c) => (
                        <DropdownItem
                          key={c.isoCode2}
                          onClick={() => {
                            setCountryCode('+' + c.countryCodes[0])
                            setSearch('')
                          }}>
                          {c.country} (+{c.countryCodes[0]})
                        </DropdownItem>
                      ))}
                  </DropdownMenu>
                </Dropdown>

                <Form.Control
                  placeholder="10-digit phone number"
                  maxLength={10}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '')
                  }}
                  {...register('phone')}
                />
              </div>

              <small className="text-danger">{errors.phone?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>
                Date of Birth <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control type="date" max={new Date().toISOString().split('T')[0]} {...register('dob')} />
              <small className="text-danger">{errors.dob?.message}</small>
            </div>

            {/* Row 3 : Gender + WorkType | Address */}

            <div className="col-md-4">
              <Form.Label>
                Gender <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select {...register('gender')}>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </Form.Select>
              <small className="text-danger">{errors.gender?.message}</small>

              <Form.Label className="mt-3">
                Work Type <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select {...register('workType')}>
                <option value="onSite">On-Site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </Form.Select>
              <small className="text-danger">{errors.workType?.message}</small>
            </div>

            <div className="col-md-8">
              <Form.Label>
                Address <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control as="textarea" rows={5} placeholder="Enter the user address here..." {...register('address')} />
              <small className="text-danger">{errors.address?.message}</small>
            </div>

            {/* Row 4 */}

            <div className="col-md-4">
              <Form.Label>
                Date of Joining <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control type="date" max={new Date().toISOString().split('T')[0]} {...register('doj')} />
              <small className="text-danger">{errors.doj?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>
                Aadhaar <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                placeholder="12-digit Aadhaar number"
                maxLength={12}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, '')
                }}
                {...register('aadhaar')}
              />
              <small className="text-danger">{errors.aadhaar?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>Salary</Form.Label>

              <div className="d-flex gap-2">
                <Dropdown>
                  <DropdownToggle className="btn btn-light border arrow-none" style={{ minWidth: 90 }}>
                    {currency}
                    <IconifyIcon icon="bx:chevron-down" className="ms-2" />
                  </DropdownToggle>

                  <DropdownMenu>
                    <DropdownItem onClick={() => setCurrency('₹')}>₹ INR</DropdownItem>
                    <DropdownItem onClick={() => setCurrency('$')}>$ USD</DropdownItem>
                    <DropdownItem onClick={() => setCurrency('€')}>€ EUR</DropdownItem>
                    <DropdownItem onClick={() => setCurrency('£')}>£ GBP</DropdownItem>
                  </DropdownMenu>
                </Dropdown>

                <Form.Control
                  placeholder="Enter salary"
                  inputMode="numeric"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '')
                  }}
                  {...register('salary')}
                />
              </div>

              <small className="text-danger">{errors.salary?.message}</small>
            </div>

            {/* Row 5 */}

            <div className="col-md-4">
              <Form.Label>
                Passport <small className="text-muted">(Optional)</small>
              </Form.Label>
              <Form.Control placeholder="Enter passport number" {...register('passport')} />
            </div>

            <div className="col-md-4">
              <Form.Label>
                PAN <small className="text-muted">(Optional)</small>
              </Form.Label>
              <Form.Control
                placeholder="ABCDE1234F"
                maxLength={10}
                onInput={(e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                }}
                {...register('pan')}
              />
              <small className="text-danger">{errors.pan?.message}</small>
            </div>

            <div className="col-md-4">
              <Form.Label>
                Bank ID <small className="text-muted">(Optional)</small>
              </Form.Label>
              <Form.Control placeholder="Enter bank account number" {...register('bankId')} />
            </div>

            {/* Submit */}

            <div className="col-12 d-flex justify-content-center mt-3">
              <Button onClick={handleSubmit(submitForm)}>Submit</Button>
            </div>
          </Form>
        </ComponentContainerCard>
      )}
    </>
  )
}

export default UpdateEmployee
