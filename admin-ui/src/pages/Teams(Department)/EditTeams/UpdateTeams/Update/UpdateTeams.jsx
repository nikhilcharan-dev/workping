import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Button, Form, Dropdown } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

import { use2FA } from '@/context/TwoFAContext'
import { useAuthContext } from '@/context/useAuthContext'

const schema = yup.object({
  teamName: yup.string().required('Team Name is required'),

  organizationId: yup.string().required('Organization ID is required'),

  teamManagerId: yup
    .string()
    .nullable()
    .test('not-same', 'Manager and Team Leader cannot be the same', function (value) {
      const { teamLeaderId } = this.parent

      if (!value || !teamLeaderId) return true // allow empty
      return value !== teamLeaderId
    }),

  teamLeaderId: yup
    .string()
    .nullable()
    .test('not-same', 'Manager and Team Leader cannot be the same', function (value) {
      const { teamManagerId } = this.parent

      if (!value || !teamManagerId) return true // allow empty
      return value !== teamManagerId
    }),

  description: yup.string().nullable(),
})

const UpdateTeam = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [organizations, setOrganizations] = useState([])
  const [employees, setEmployees] = useState([])

  const [search, setSearch] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [leaderSearch, setLeaderSearch] = useState('')

  const [selectedOrg, setSelectedOrg] = useState('')
  const [selectedManager, setSelectedManager] = useState('')
  const [selectedLeader, setSelectedLeader] = useState('')

  const { require2FA } = use2FA()
  const { is2FAAuthnticator } = useAuthContext()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  })

  const managerId = watch('teamManagerId')
  const leaderId = watch('teamLeaderId')

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

  const fetchEmployees = async (orgId) => {
    try {
      const res = await axiosClient.get(`/api/admin/get-all-employees/get-all-employees-by-page-number?organizationId=${orgId}`, { silent: true })

      setEmployees(res.data?.data?.data || [])
    } catch (error) {
      // Error handled by interceptor
    }
  }

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await axiosClient.get(`/api/admin/team/get-team/${id}`, { silent: true })

        const team = res.data?.data

        reset({
          teamName: team.teamName,
          organizationId: team.organizationId,
          teamManagerId: team.managerId || '',
          teamLeaderId: team.leaderIds?.[0] || '',
          description: team.description || '',
        })

        const org = organizations.find((o) => o.organizationId === team.organizationId)

        if (org) setSelectedOrg(org.name)

        fetchEmployees(team.organizationId)

        if (team.manager) {
          setSelectedManager(`${team.manager.employeeId} (${team.manager.name})`)
          setValue('teamManagerId', team.managerId)
        }

        if (team.leaders?.length) {
          setSelectedLeader(`${team.leaders[0].employeeId} (${team.leaders[0].name})`)
          setValue('teamLeaderId', team.leaderIds[0])
        }
      } catch (error) {
        // Error handled by interceptor
      }
    }

    if (id && organizations.length) fetchTeam()
  }, [id, organizations, reset, setValue])

  const updateTeamApi = async (payload) => {
    await axiosClient.post('/api/admin/team/update-team', payload, { silent: true })

    toast.success('Team updated successfully!')

    navigate('/teams/update-teams-view')
  }

  const onSubmit = async (data) => {
    const payload = {
      teamId: id,
      teamName: data.teamName,
      description: data.description,
      organizationId: data.organizationId,
      managerId: data.teamManagerId || null,
      leaderIds: data.teamLeaderId ? [data.teamLeaderId] : [],
    }

    {
      require2FA(async () => {
        try {
          await updateTeamApi(payload)
        } catch (error) {
          throw new Error(error?.response?.data?.message || 'Failed to update team')
        }
      })
    }
  }

  return (
    <ComponentContainerCard id="basic" title="Update Team">
      <Form className="row g-4" onSubmit={handleSubmit(onSubmit)}>
        {/* TEAM NAME */}

        <div className="col-md-6">
          <Form.Label>
            Team Name <span className="text-danger">*</span>
          </Form.Label>

          <Form.Control placeholder="Enter Team Name" {...register('teamName')} />

          <small className="text-danger">{errors.teamName?.message}</small>
        </div>

        {/* ORGANIZATION */}

        <div className="col-md-6">
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
              <Form.Control placeholder="Search organization" className="mb-2" value={search} onChange={(e) => setSearch(e.target.value)} />

              {organizations
                .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
                .map((o) => (
                  <Dropdown.Item
                    key={o.organizationId}
                    onClick={() => {
                      setSelectedOrg(o.name)
                      setValue('organizationId', o.organizationId)
                      setSearch('')
                      fetchEmployees(o.organizationId)
                    }}>
                    {o.name}
                  </Dropdown.Item>
                ))}
            </Dropdown.Menu>
          </Dropdown>

          <input type="hidden" {...register('organizationId')} />

          <small className="text-danger">{errors.organizationId?.message}</small>
        </div>

        {/* MANAGER */}

        <div className="col-md-6">
          <Form.Label>Team Manager ID</Form.Label>

          <Dropdown className="w-100">
            <Dropdown.Toggle as="div" className="form-control d-flex justify-content-between align-items-center arrow-none">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {selectedManager || 'Select Manager'}
              </span>
              <IconifyIcon icon="bx:chevron-down" />
            </Dropdown.Toggle>

            <Dropdown.Menu className="w-100 p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <Form.Control placeholder="Search manager" className="mb-2" value={managerSearch} onChange={(e) => setManagerSearch(e.target.value)} />

              {employees
                .filter((e) => e._id !== leaderId)
                .filter(
                  (e) =>
                    e.name.toLowerCase().includes(managerSearch.toLowerCase()) || e.employeeId.toLowerCase().includes(managerSearch.toLowerCase()),
                )
                .map((emp) => (
                  <Dropdown.Item
                    key={emp._id}
                    onClick={() => {
                      setSelectedManager(emp.employeeId)
                      setValue('teamManagerId', emp._id)
                      setManagerSearch('')
                    }}>
                    {emp.employeeId}
                  </Dropdown.Item>
                ))}
            </Dropdown.Menu>
          </Dropdown>

          <input type="hidden" {...register('teamManagerId')} />

          <small className="text-danger">{errors.teamManagerId?.message}</small>
        </div>

        {/* LEADER */}

        <div className="col-md-6">
          <Form.Label>Team Leader ID</Form.Label>

          <Dropdown className="w-100">
            <Dropdown.Toggle as="div" className="form-control d-flex justify-content-between align-items-center arrow-none">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {selectedLeader || 'Select Leader'}
              </span>
              <IconifyIcon icon="bx:chevron-down" />
            </Dropdown.Toggle>

            <Dropdown.Menu className="w-100 p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <Form.Control placeholder="Search leader" className="mb-2" value={leaderSearch} onChange={(e) => setLeaderSearch(e.target.value)} />

              {employees
                .filter((e) => e._id !== managerId)
                .filter(
                  (e) => e.name.toLowerCase().includes(leaderSearch.toLowerCase()) || e.employeeId.toLowerCase().includes(leaderSearch.toLowerCase()),
                )
                .map((emp) => (
                  <Dropdown.Item
                    key={emp._id}
                    onClick={() => {
                      setSelectedLeader(emp.employeeId)
                      setValue('teamLeaderId', emp._id)
                      setLeaderSearch('')
                    }}>
                    {emp.employeeId}
                  </Dropdown.Item>
                ))}
            </Dropdown.Menu>
          </Dropdown>

          <input type="hidden" {...register('teamLeaderId')} />

          <small className="text-danger">{errors.teamLeaderId?.message}</small>
        </div>

        {/* DESCRIPTION */}

        <div className="col-12">
          <Form.Label>Description</Form.Label>

          <Form.Control as="textarea" rows={5} {...register('description')} />
        </div>

        {/* BUTTONS */}

        <div className="col-12 d-flex justify-content-center gap-4 mt-3">
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              reset()
              setSelectedOrg('')
              setSelectedManager('')
              setSelectedLeader('')
            }}>
            Clear
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            Update
          </Button>
        </div>
      </Form>
    </ComponentContainerCard>
  )
}

export default UpdateTeam
