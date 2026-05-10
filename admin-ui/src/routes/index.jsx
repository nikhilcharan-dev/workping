import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

// Dashboard
const Analytics = lazy(() => import('@/pages/dashboard/page'))

// Auth — WorkPing custom pages
const SignIn = lazy(() => import('@/pages/auth/signIn/page'))
const SignUp = lazy(() => import('@/pages/auth/signUp/page'))
const ResetPassword = lazy(() => import('@/pages/auth/reset-pass/page'))
const LockScreen = lazy(() => import('@/app/(other)/auth/lock-screen/page'))

// Error / utility
const NotFound = lazy(() => import('@/app/(other)/(error-pages)/error-404/page'))
const Maintenance = lazy(() => import('@/app/(other)/maintenance/page'))
const ComingSoon = lazy(() => import('@/app/(other)/coming-soon/page'))

// Profile & billing
const Welcome = lazy(() => import('@/app/(admin)/pages/welcome/page'))
const FAQs = lazy(() => import('@/app/(admin)/pages/faqs/page'))
const Profile = lazy(() => import('@/app/(admin)/pages/profile/page'))
const Pricing = lazy(() => import('@/app/(admin)/pages/pricing/page'))
const Billing = lazy(() => import('@/app/(admin)/pages/billing/page'))

// Teams (Departments)
const AddTeams = lazy(() => import('@/pages/Teams(Department)/EditTeams/AddTeams/AddTeams'))
const UpdateTeams = lazy(() => import('@/pages/Teams(Department)/EditTeams/UpdateTeams/Update/UpdateTeams'))
const UpdateTeamsView = lazy(() => import('@/pages/Teams(Department)/EditTeams/UpdateTeams/Update/UpdateTeamsView'))
const ViewTeams = lazy(() => import('@/pages/Teams(Department)/ViewTeams/ViewTeams'))
const TeamMembersView = lazy(() => import('@/pages/Teams(Department)/TeamMembers/TeamMembersView'))

// Organization
const OrganizationViews = lazy(() => import('@/pages/Organization/ViewOrganization/View'))
const OrganizationUpdateDetails = lazy(() => import('@/pages/Organization/EditOrganization/UpdateOrganization/OrganizationDetails'))
const AddOrganization = lazy(() => import('@/pages/Organization/EditOrganization/AddOrganization/OrganizationDetails'))
const OrganizationUpdateView = lazy(() => import('@/pages/Organization/EditOrganization/UpdateOrganization/View'))

// Employees
const EmployeesViews = lazy(() => import('@/pages/Employees/ViewEmployees/ViewEmployees'))
const EmployeesUpdate = lazy(() => import('@/pages/Employees/EditEmployees/UpdateEmployees/UpdateEmployees/UpdateEmployee'))
const EmployeesUpdateView = lazy(() => import('@/pages/Employees/EditEmployees/UpdateEmployees/UpdateEmployees/EmployeesUpdateView'))
const BulkEmployeeUpload = lazy(() => import('@/pages/Employees/EditEmployees/AddEmployee/BulkEmployeeUpload/BulkUpload'))
const SingleEmployeeAdd = lazy(() => import('@/pages/Employees/EditEmployees/AddEmployee/SingleEmployeeForm/SingleEmployeeForm'))

// Projects
const AddProjects = lazy(() => import('@/pages/Projects/EditProject-Teams/AddProjects/AddProjects'))
const UpdateProjectsView = lazy(() => import('@/pages/Projects/EditProject-Teams/UpdateProjects/UpdateProjectsView'))
const UpdateProjects = lazy(() => import('@/pages/Projects/EditProject-Teams/UpdateProjects/UpdateProjects'))
const ViewProjects = lazy(() => import('@/pages/Projects/ViewProject-Teams/ViewProjects/ViewProjects'))
const ProjectTeamMembers = lazy(() => import('@/pages/Projects/ViewProject-Teams/ProjectTeamMembers/ProjectTeamMembers'))

// Two-factor authentication
const TwoFactorAuthCard = lazy(() => import('@/pages/TwoFactorAuthentication/TwoFactorAuthentication'))
const QrCodeAuthentication = lazy(() => import('@/pages/TwoFactorAuthentication/QrcodeAuthentication'))

// Team member utility
const ButtonPage = lazy(() => import('@/pages/teamMember/ButtonPage'))

// Holidays
const ViewHolidays = lazy(() => import('@/pages/Holidays/ViewHolidays'))
const ManageHolidays = lazy(() => import('@/pages/Holidays/ManageHolidays'))

// Analytics
const OrganizationAnalytics = lazy(() => import('@/pages/Organization/Analytics/OrganizationAnalytics'))
const TeamsAnalytics = lazy(() => import('@/pages/Teams(Department)/Analytics/TeamsAnalytics'))
const EmployeesAnalytics = lazy(() => import('@/pages/Employees/Analytics/EmployeesAnalytics'))
const ProjectsAnalytics = lazy(() => import('@/pages/Projects/Analytics/ProjectsAnalytics'))
const HolidaysAnalytics = lazy(() => import('@/pages/Holidays/Analytics/HolidaysAnalytics'))

// Attendance
const AttendanceAnalytics = lazy(() => import('@/pages/Attendance/Analytics/AttendanceAnalytics'))
const LeaveApproval = lazy(() => import('@/pages/Attendance/LeaveApproval/LeaveApproval'))
const MyLeaveRequests = lazy(() => import('@/pages/Attendance/MyLeaveRequests/MyLeaveRequests'))
const AttendanceRecords = lazy(() => import('@/pages/Attendance/Records/AttendanceRecords'))

// Payment / order flow
const PhonePeTest = lazy(() => import('@/pages/test/PhonePeTest'))
const OrderStatus = lazy(() => import('@/pages/order/OrderStatus'))

// Public pages
const PrivacyPolicy = lazy(() => import('@/pages/public/PrivacyPolicy/page'))
const TermsAndConditions = lazy(() => import('@/pages/public/TermsAndConditions/page'))
const AboutPublic = lazy(() => import('@/pages/public/About/page'))
const ContactPublic = lazy(() => import('@/pages/public/Contact/page'))
const HomePublic = lazy(() => import('@/pages/public/Home/page'))

// ─── Route arrays ─────────────────────────────────────────────────────────────

export const authRoutes = [
  { path: '/auth/sign-in', name: 'Sign In', element: <SignIn /> },
  { path: '/auth/sign-up', name: 'Sign Up', element: <SignUp /> },
  { path: '/auth/reset-pass', name: 'Reset Password', element: <ResetPassword /> },
  { path: '/auth/lock-screen', name: 'Lock Screen', element: <LockScreen /> },
  { path: '/error-404', name: '404 Error', element: <NotFound /> },
  { path: '/maintenance', name: 'Maintenance', element: <Maintenance /> },
  { path: '/coming-soon', name: 'Coming Soon', element: <ComingSoon /> },
]

const dashboardRoutes = [
  { path: '/dashboard/analytics', name: 'Analytics', element: <Analytics /> },
]

const pagesRoutes = [
  { path: '/pages/welcome', name: 'Welcome', element: <Welcome /> },
  { path: '/pages/faqs', name: 'FAQs', element: <FAQs /> },
  { path: '/pages/profile', name: 'Profile', element: <Profile /> },
  { path: '/pages/pricing', name: 'Pricing', element: <Pricing /> },
  { path: '/pages/billing', name: 'Billing', element: <Billing /> },
]

const teamsRoutes = [
  { path: '/teams/edit-teams/add-teams', name: 'Teams', element: <AddTeams /> },
  { path: '/teams/edit-teams/update-teams/:id', name: 'UpdateTeams', element: <UpdateTeams /> },
  { path: '/teams/update-teams-view', name: 'UpdateTeamsView', element: <UpdateTeamsView /> },
  { path: '/teams/team-members/team-members-view/:teamId', name: 'TeamMembersView', element: <TeamMembersView /> },
  { path: '/teams/view-teams/', name: 'TeamsView', element: <ViewTeams /> },
]

const organizationRoutes = [
  { path: '/organization/organization-details', name: 'Organization Details', element: <AddOrganization /> },
  { path: '/organization/update-organization/:organizationId', name: 'UpdateOrganization', element: <OrganizationUpdateDetails /> },
  { path: '/organization/view-organizations', name: 'ViewOrganization', element: <OrganizationViews /> },
  { path: '/organization/update-view-organization', name: 'ViewOrganization', element: <OrganizationUpdateView /> },
]

const employeesRoutes = [
  { path: '/employees/view-employees', name: 'ViewEmployees', element: <EmployeesViews /> },
  { path: '/employees/employees-update-view', name: 'UpdateEmployeesView', element: <EmployeesUpdateView /> },
  { path: '/employees/update-employees/:employeeId', name: 'UpdateEmployees', element: <EmployeesUpdate /> },
  { path: '/employees/add-employees/bulk-upload', name: 'BulkEmployeeUpload', element: <BulkEmployeeUpload /> },
  { path: '/employees/add-employees/single-employee-form', name: 'SingleEmployeeAdd', element: <SingleEmployeeAdd /> },
]

const projectsRoutes = [
  { path: '/projects/add-projects', name: 'AddProjects', element: <AddProjects /> },
  { path: '/projects/update-projects', name: 'UpdateProjectsView', element: <UpdateProjectsView /> },
  { path: '/projects/update-projects-form/:projectId', name: 'UpdateProjects', element: <UpdateProjects /> },
  { path: '/projects/view-projects', name: 'ViewProjects', element: <ViewProjects /> },
  { path: '/projects/view-project-teams/project-team-members/:projectId', name: 'ViewProjectTeams', element: <ProjectTeamMembers /> },
]

const twoFactorAuthRoutes = [
  { path: '/two-factor-auth', name: 'TwoFactorAuthCard', element: <TwoFactorAuthCard /> },
  { path: '/2fa-authnticator', name: 'QrCodeAuthentication', element: <QrCodeAuthentication /> },
  { path: '/button-page', name: 'Button-page', element: <ButtonPage /> },
]

const holidaysRoutes = [
  { path: '/holidays/view-holidays', name: 'ViewHolidays', element: <ViewHolidays /> },
  { path: '/holidays/manage-holidays', name: 'ManageHolidays', element: <ManageHolidays /> },
]

const attendanceRoutes = [
  { path: '/attendance/analytics', name: 'AttendanceAnalytics', element: <AttendanceAnalytics /> },
  { path: '/attendance/leave-approval', name: 'LeaveApproval', element: <LeaveApproval /> },
  { path: '/attendance/my-leave-requests', name: 'MyLeaveRequests', element: <MyLeaveRequests /> },
  { path: '/attendance/records', name: 'AttendanceRecords', element: <AttendanceRecords /> },
]

const analyticsRoutes = [
  { path: '/organization/analytics', name: 'OrganizationAnalytics', element: <OrganizationAnalytics /> },
  { path: '/teams/analytics', name: 'TeamsAnalytics', element: <TeamsAnalytics /> },
  { path: '/employees/analytics', name: 'EmployeesAnalytics', element: <EmployeesAnalytics /> },
  { path: '/projects/analytics', name: 'ProjectsAnalytics', element: <ProjectsAnalytics /> },
  { path: '/holidays/analytics', name: 'HolidaysAnalytics', element: <HolidaysAnalytics /> },
]

const paymentRoutes = [
  { path: '/test/phonepe', name: 'PhonePe Test', element: <PhonePeTest /> },
  { path: '/order/:orderId', name: 'Order Status', element: <OrderStatus /> },
]

export const publicRoutes = [
  { path: '/', name: 'Home', element: <HomePublic /> },
  { path: '/home', name: 'Home Redirect', element: <Navigate to="/" replace /> },
  { path: '/privacy-policy', name: 'Privacy Policy', element: <PrivacyPolicy /> },
  { path: '/terms-and-conditions', name: 'Terms and Conditions', element: <TermsAndConditions /> },
  { path: '/about', name: 'About', element: <AboutPublic /> },
  { path: '/contact', name: 'Contact', element: <ContactPublic /> },
]

export const appRoutes = [
  { path: '/', name: 'root', element: <Navigate to="/dashboard/analytics" /> },
  ...dashboardRoutes,
  ...pagesRoutes,
  ...authRoutes,
  ...teamsRoutes,
  ...organizationRoutes,
  ...employeesRoutes,
  ...projectsRoutes,
  ...twoFactorAuthRoutes,
  ...holidaysRoutes,
  ...attendanceRoutes,
  ...analyticsRoutes,
  ...paymentRoutes,
]
