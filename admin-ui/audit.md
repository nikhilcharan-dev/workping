# Toast Notification Audit

## Automatic Toasts (Axios Interceptor)

**File:** `src/helpers/httpClient.js`

| Line | Type | Trigger |
|------|------|---------|
| 44 | `toast.success(data.message)` | Any API response with `{ type: 'success' }` — suppressed if request has `{ silent: true }` |
| 46 | `toast.error(data.message)` | Any API response with `{ type: 'error' }` — suppressed if request has `{ silent: true }` |
| 64 | `toast.error(errorMessage)` | Any failed/rejected API request (uses `response.data.message` or `error.message` or `'Something went wrong.'`) |

> Requests with `{ silent: true }` skip the success/error auto-toast entirely.

---

## Auth Pages

**File:** `src/pages/auth/signIn/LoginForm.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 40 | `toast.success('Login successful!')` | Successful POST to `/api/admin/auth/login` |

**File:** `src/pages/auth/signUp/components/SignUpForm.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 68 | `toast.success('Signup successful!')` | Successful POST to `/api/admin/auth/register` |

**File:** `src/pages/auth/reset-pass/components/ResetPassForm.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 122 | `toast.success('Password changed successfully!')` | Successful password reset (step 3 complete) |
| 148 | `toast.success('OTP resent successfully!')` | Resend OTP button click — POST to `/api/admin/forgot-password/send-otp` |

---

## Two-Factor Authentication Pages

**File:** `src/pages/TwoFactorAuthentication/TwoFactorAuthentication.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 56 | `toast.error(backendMessage)` | 2FA verification fails — `executeAction()` throws |

**File:** `src/pages/TwoFactorAuthentication/QrcodeAuthentication.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 38 | `toast.error('Failed to load QR code. Please try again.')` | POST to `/api/auth/2fa/setup` fails during QR load |

---

## Organization Pages

**File:** `src/pages/Organization/EditOrganization/AddOrganization/OrganizationDetails.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 103 | `toast('Please set up Two-Factor Authentication first.', { icon: '🔐' })` | Submit pressed but 2FA not set up |
| 122 | `toast.success('Organization added successfully!')` | Successful POST to `/api/admin/organization/add-organization` |

**File:** `src/pages/Organization/EditOrganization/UpdateOrganization/OrganizationDetails.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 165 | `toast.success('Organization updated successfully!')` | Successful POST to `/api/admin/organization/update-organization` |

**File:** `src/pages/Organization/EditOrganization/UpdateOrganization/View.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 83 | `toast.success('Organization(s) deleted successfully!')` | Successful POST to `/api/admin/organization/delete-organizations` |

---

## Employee Pages

**File:** `src/pages/Employees/EditEmployees/AddEmployee/BulkEmployeeUpload/BulkUpload.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 54 | `toast.error('Please select a file')` | Upload button clicked with no file selected |

**File:** `src/pages/Employees/EditEmployees/UpdateEmployees/UpdateEmployees/EmployeesUpdateView.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 130 | `toast.success('Employee(s) deleted successfully!')` | Successful POST to `/api/admin/employees/delete-employees` |

---

## Teams / Department Pages

**File:** `src/pages/Teams(Department)/EditTeams/AddTeams/AddTeams.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 145 | `toast.success('Team created successfully!')` | Successful POST to `/api/admin/team/create-team` |

**File:** `src/pages/Teams(Department)/EditTeams/UpdateTeams/Update/UpdateTeams.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 190 | `toast.success('Team updated successfully!')` | Successful POST to `/api/admin/team/update-team` |

**File:** `src/pages/Teams(Department)/EditTeams/UpdateTeams/Update/UpdateTeamsView.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 117 | `toast.success('Team(s) deleted successfully!')` | Successful POST to `/api/admin/team/delete-team` |

---

## Project Pages

**File:** `src/pages/Projects/EditProject-Teams/AddProjects/AddProjects.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 102 | `toast.success('Project created successfully!')` | Successful POST to `/api/admin/project/create-project` (2FA already active path) |
| 118 | `toast.success('Project created successfully!')` | Successful POST to `/api/admin/project/create-project` (require2FA callback path) |

**File:** `src/pages/Projects/EditProject-Teams/UpdateProjects/UpdateProjectsView.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 111 | `toast.success('Project(s) deleted successfully!')` | Successful POST to `/api/admin/project/delete-projects` |

---

## UI Demo Components (react-toastify — different library)

**File:** `src/app/(admin)/forms/clipboard/components/AllClipboards.jsx`
| Line | Type | Trigger |
|------|------|---------|
| 14 | `toast.success('Copy To Clipboard')` | Clipboard copy succeeds |
| 41 | `toast.success('Cut')` | Clipboard cut succeeds |
| 77 | `toast.success('Copy To Clipboard')` | Copy from attribute succeeds |

---

## Summary

| Category | Count |
|----------|-------|
| Auto (interceptor) | 3 |
| Manual `toast.success` | 15 |
| Manual `toast.error` | 4 |
| Manual `toast` (generic) | 1 |
| **Total** | **23** |

**Silent requests (no auto-toast):**
- `/verify-cookie` — `useAuthContext.jsx`
- `/get-organization-info` — all forms
- `/get-organizations` — ViewOrganization, UpdateOrganization View
- `/get-organization-by-id/:id` — UpdateOrganization form
- `/get-all-employees-by-page-number` — ViewEmployees, UpdateEmployees view
- `/get-project` — (project fetch in UpdateProjects)
- `/get-projects` — ViewProjects, UpdateProjectsView
