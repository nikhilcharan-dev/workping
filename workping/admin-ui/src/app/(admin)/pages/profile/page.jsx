import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
import axiosClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const StatCard = ({ title, value, hint }) => {
  return (
    <Card className="h-100">
      <CardBody>
        <p className="text-muted mb-1">{title}</p>
        <h3 className="mb-1">{value}</h3>
        {hint ? <small className="text-muted">{hint}</small> : null}
      </CardBody>
    </Card>
  )
}

const Profile = () => {
  const navigate = useNavigate()
  const { user, login } = useAuthContext()
  const [profile, setProfile] = useState(user ?? null)
  const [editForm, setEditForm] = useState({
    name: user?.name ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  })
  const [stats, setStats] = useState({
    organizations: 0,
    teams: 0,
    employees: 0,
    projects: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [organizationNames, setOrganizationNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting2fa, setResetting2fa] = useState(false)
  const [passwordStep, setPasswordStep] = useState(1)
  const [passwordOtp, setPasswordOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeSubscription, setActiveSubscription] = useState(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [cancellingPlan, setCancellingPlan] = useState(false)

  const formatDate = (value) => {
    if (!value) return '--'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '--'
    return date.toLocaleString()
  }

  const fetchProfileData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [profileRes, orgRes, employeeRes, projectRes] = await Promise.allSettled([
      axiosClient.get('/api/admin/profile', { silent: true }),
      axiosClient.get('/api/admin/get-all-employees/get-organization-info', { silent: true }),
      axiosClient.get('/api/admin/get-all-employees/get-all-employees-by-page-number?page=1&limit=1', { silent: true }),
      axiosClient.get('/api/admin/project/get-projects?page=1&limit=1', { silent: true }),
    ])

    if (profileRes.status === 'fulfilled') {
      const profileData = profileRes.value?.data?.data ?? null
      setProfile(profileData)
      setEditForm({
        name: profileData?.name ?? '',
        phoneNumber: profileData?.phoneNumber ?? '',
      })
    }

    let orgCount = 0
    let teamCount = 0
    let orgList = []

    if (orgRes.status === 'fulfilled') {
      const orgData = orgRes.value?.data?.data ?? {}
      const entries = Object.entries(orgData)
      orgCount = entries.length
      teamCount = entries.reduce((total, [, value]) => total + (Array.isArray(value?.teams) ? value.teams.length : 0), 0)
      orgList = entries.map(([name]) => name)
    }

    const employeeCount = employeeRes.status === 'fulfilled' ? Number(employeeRes.value?.data?.data?.totalRecords ?? 0) : 0
    const projectCount = projectRes.status === 'fulfilled' ? Number(projectRes.value?.data?.data?.totalRecords ?? 0) : 0

    setStats({
      organizations: orgCount,
      teams: teamCount,
      employees: employeeCount,
      projects: projectCount,
    })
    setOrganizationNames(orgList)

    if (profileRes.status === 'rejected' && orgRes.status === 'rejected' && employeeRes.status === 'rejected' && projectRes.status === 'rejected') {
      setError('Unable to load profile data from backend. Please try again.')
    }

    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  useEffect(() => {
    axiosClient
      .get('/api/admin/subscriptions/active', { silent: true })
      .then((res) => setActiveSubscription(res.data?.data ?? null))
      .catch(() => setActiveSubscription(null))
      .finally(() => setBillingLoading(false))
  }, [])

  const handleCancelPlan = async () => {
    if (!window.confirm('Cancel your current subscription? You will lose access at the end of the billing period.')) return
    setCancellingPlan(true)
    try {
      await axiosClient.patch('/api/admin/subscriptions/cancel', {}, { silent: true })
      setActiveSubscription(null)
      setNotice('Subscription cancelled successfully.')
    } catch {
      // error toast handled by interceptor
    } finally {
      setCancellingPlan(false)
    }
  }

  useEffect(() => {
    if (otpTimer <= 0) return
    const timer = window.setTimeout(() => {
      setOtpTimer((prev) => prev - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [otpTimer])

  const handleEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleToggleEdit = () => {
    if (isEditing) {
      setEditForm({
        name: profile?.name ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
      })
      setIsEditing(false)
      return
    }
    setError('')
    setNotice('')
    setIsEditing(true)
  }

  const handleSaveDetails = async () => {
    const payload = {
      name: editForm.name.trim(),
      phoneNumber: editForm.phoneNumber.trim(),
    }

    if (!payload.name) {
      setError('Name is required to update profile.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await axiosClient.post('/api/admin/update-profile', payload)
      await fetchProfileData()
      await login()
      setNotice('Profile details updated successfully.')
      setIsEditing(false)
    } catch (_) {
      // Error toast handled by interceptor.
    } finally {
      setSaving(false)
    }
  }

  const handleReset2FA = async () => {
    const ok = window.confirm('This will disable your current 2FA setup. Continue?')
    if (!ok) return

    setResetting2fa(true)
    setError('')
    setNotice('')

    try {
      await axiosClient.post('/api/auth/2fa/reset')
      await fetchProfileData()
      await login()
      setNotice('2FA has been reset. Please set it up again to keep your account secure.')
    } catch (_) {
      // Error toast handled by interceptor.
    } finally {
      setResetting2fa(false)
    }
  }

  const handleReconfigure2FA = () => {
    navigate('/2fa-authnticator', {
      state: {
        action: 'PROFILE_2FA_SETUP',
        path: '/pages/profile',
      },
    })
  }

  const handleSendPasswordOtp = async () => {
    if (!profile?.email) {
      setError('Email is not available for password reset.')
      return
    }

    setPasswordBusy(true)
    setError('')
    setNotice('')

    try {
      await axiosClient.post('/api/admin/forgot-password/send-otp', { email: profile.email }, { silent: true })
      setPasswordStep(2)
      setOtpTimer(60)
      setNotice('OTP sent to your registered email.')
    } catch (_) {
      // Error toast handled by interceptor.
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleVerifyPasswordOtp = async () => {
    if (!passwordOtp || passwordOtp.length < 4) {
      setError('Please enter the OTP sent to your email.')
      return
    }

    setPasswordBusy(true)
    setError('')
    setNotice('')

    try {
      await axiosClient.post('/api/admin/forgot-password/verify-otp', { email: profile.email, otp: passwordOtp }, { silent: true })
      setPasswordStep(3)
      setNotice('OTP verified. You can now set a new password.')
    } catch (_) {
      // Error toast handled by interceptor.
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match.')
      return
    }

    setPasswordBusy(true)
    setError('')
    setNotice('')

    try {
      await axiosClient.post(
        '/api/admin/forgot-password/verify-and-change',
        {
          email: profile.email,
          otp: passwordOtp,
          newPassword,
        },
        { silent: true },
      )
      setPasswordStep(1)
      setPasswordOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setOtpTimer(0)
      setNotice('Password changed successfully.')
    } catch (_) {
      // Error toast handled by interceptor.
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleResendPasswordOtp = async () => {
    if (otpTimer > 0 || passwordBusy) return
    await handleSendPasswordOtp()
  }

  return (
    <>
      <PageBreadcrumb subName="Pages" title="Profile" />
      <PageMetaData title="Profile" />

      {error ? (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <Button size="sm" variant="outline-danger" onClick={fetchProfileData}>
            Retry
          </Button>
        </Alert>
      ) : null}

      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <Row className="g-3">
        <Col xxl={4}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center gap-3">
                <img
                  src={profile?.profileImage || user?.profileImage || avatar1}
                  alt="admin-avatar"
                  className="rounded-circle border"
                  width={76}
                  height={76}
                />
                <div>
                  <h4 className="mb-1">{profile?.name || user?.name || 'Admin'}</h4>
                  <p className="mb-1 text-muted">{profile?.email || user?.email || '--'}</p>
                  <Badge bg={profile?.twoFactorEnabled ? 'success' : 'warning'}>2FA {profile?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="d-flex align-items-center justify-content-between">
              <CardTitle as="h5" className="mb-0">
                Organizations
              </CardTitle>
              <span className="text-muted small">{stats.organizations} total</span>
            </CardHeader>
            <CardBody>
              {organizationNames.length === 0 ? (
                <p className="text-muted mb-0">No organizations linked yet.</p>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {organizationNames.map((name) => (
                    <Badge key={name} bg="light" text="dark" className="border">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                Billing &amp; Plan
              </CardTitle>
            </CardHeader>
            <CardBody>
              {billingLoading ? (
                <div className="text-center py-2">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : activeSubscription ? (
                <>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#198754', display: 'inline-block', flexShrink: 0 }} />
                    <span className="fw-semibold">{activeSubscription.planName}</span>
                    <Badge bg="success" className="ms-auto">
                      Active
                    </Badge>
                  </div>
                  {activeSubscription.endDate && (
                    <p className="text-muted small mb-3">
                      Renews on{' '}
                      {new Date(activeSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted small mb-3">No active subscription.</p>
              )}
              <div className="d-flex gap-2">
                <Button as={Link} to="/pages/pricing" variant="primary" size="sm">
                  {activeSubscription ? 'Upgrade Plan' : 'View Plans'}
                </Button>
                {activeSubscription && (
                  <Button variant="outline-danger" size="sm" onClick={handleCancelPlan} disabled={cancellingPlan}>
                    {cancellingPlan ? <Spinner animation="border" size="sm" /> : 'Cancel Plan'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h5" className="mb-0">
                Security
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="mb-3">
                <Form.Label>Reset Password Via Email OTP</Form.Label>
                <Form.Control value={profile?.email ?? user?.email ?? '--'} disabled readOnly className="mb-2" />

                {passwordStep === 1 ? (
                  <Button onClick={handleSendPasswordOtp} disabled={passwordBusy}>
                    {passwordBusy ? <Spinner animation="border" size="sm" /> : 'Send OTP'}
                  </Button>
                ) : null}

                {passwordStep >= 2 ? (
                  <>
                    <Form.Control
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.trim())}
                      placeholder="Enter OTP"
                      className="mb-2"
                    />
                    {passwordStep === 2 ? (
                      <div className="d-flex gap-2">
                        <Button onClick={handleVerifyPasswordOtp} disabled={passwordBusy}>
                          {passwordBusy ? <Spinner animation="border" size="sm" /> : 'Verify OTP'}
                        </Button>
                        <Button variant="outline-secondary" onClick={handleResendPasswordOtp} disabled={otpTimer > 0 || passwordBusy}>
                          {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {passwordStep === 3 ? (
                  <>
                    <Form.Control
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="mt-2"
                    />
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="mt-2"
                    />
                    <div className="d-flex gap-2 mt-2">
                      <Button onClick={handleUpdatePassword} disabled={passwordBusy}>
                        {passwordBusy ? <Spinner animation="border" size="sm" /> : 'Update Password'}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          setPasswordStep(1)
                          setPasswordOtp('')
                          setNewPassword('')
                          setConfirmPassword('')
                          setOtpTimer(0)
                        }}
                        disabled={passwordBusy}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xxl={8}>
          <Row className="g-3">
            <Col sm={6} xl={3}>
              <StatCard title="Organizations" value={stats.organizations} hint="Managed entities" />
            </Col>
            <Col sm={6} xl={3}>
              <StatCard title="Teams" value={stats.teams} hint="Departments available" />
            </Col>
            <Col sm={6} xl={3}>
              <StatCard title="Employees" value={stats.employees} hint="Current records" />
            </Col>
            <Col sm={6} xl={3}>
              <StatCard title="Projects" value={stats.projects} hint="Tracked projects" />
            </Col>
          </Row>

          <Row className="mt-1">
            <Col xs={12}>
              <Card>
                <CardHeader className="d-flex align-items-center justify-content-between">
                  <CardTitle as="h5" className="mb-0">
                    Admin Details
                  </CardTitle>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant={isEditing ? 'secondary' : 'primary'} onClick={handleToggleEdit} disabled={saving}>
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                    <Button size="sm" variant="outline-primary" onClick={fetchProfileData} disabled={loading || saving}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Refresh'}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={isEditing ? editForm.name : (profile?.name ?? '--')}
                        onChange={(e) => handleEditField('name', e.target.value)}
                        placeholder="Enter full name"
                        disabled={!isEditing}
                        readOnly={!isEditing}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Email (read-only)</Form.Label>
                      <Form.Control value={profile?.email ?? user?.email ?? '--'} disabled readOnly />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        value={isEditing ? editForm.phoneNumber : (profile?.phoneNumber ?? '--')}
                        onChange={(e) => handleEditField('phoneNumber', e.target.value)}
                        placeholder="Enter phone number"
                        disabled={!isEditing}
                        readOnly={!isEditing}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Role</Form.Label>
                      <Form.Control value={profile?.role ?? '--'} disabled readOnly />
                    </Col>
                    <Col md={6}>
                      <Form.Label>2FA Status</Form.Label>
                      <Form.Control value={profile?.twoFactorEnabled ? 'Enabled' : 'Disabled'} disabled readOnly />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Created</Form.Label>
                      <Form.Control value={formatDate(profile?.createdAt)} disabled readOnly />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Updated</Form.Label>
                      <Form.Control value={formatDate(profile?.updatedAt)} disabled readOnly />
                    </Col>
                    <Col md={6}>
                      <Form.Label>2FA Management</Form.Label>
                      <div className="d-flex gap-2">
                        <Button variant="outline-danger" onClick={handleReset2FA} disabled={resetting2fa || saving}>
                          {resetting2fa ? 'Resetting...' : 'Reset 2FA'}
                        </Button>
                        <Button variant="outline-primary" onClick={handleReconfigure2FA} disabled={saving}>
                          Setup 2FA
                        </Button>
                      </div>
                    </Col>
                  </Row>

                  <div className="mt-3 d-flex align-items-center justify-content-between gap-2">
                    <div className="text-muted small">Last synced: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}</div>
                    {isEditing ? (
                      <Button onClick={handleSaveDetails} disabled={saving}>
                        {saving ? <Spinner animation="border" size="sm" /> : 'Update Details'}
                      </Button>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  )
}
export default Profile
