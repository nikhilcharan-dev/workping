import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/context/useAuthContext'

// Public Pages
const AboutPage = lazy(() => import('@/pages/public/About/page'))
const ContactPage = lazy(() => import('@/pages/public/Contact/page'))
const PrivacyPolicyPage = lazy(() => import('@/pages/public/PrivacyPolicy/page'))
const TermsAndConditionsPage = lazy(() => import('@/pages/public/TermsAndConditions/page'))

// Auth Pages
const AuthSignIn = lazy(() => import('@/pages/auth/sign-in/page'))
const NotFound = lazy(() => import('@/app/(other)/(error-pages)/error-404/page'))
const Maintenance = lazy(() => import('@/app/(other)/maintenance/page'))

// Shared App Pages
const ManagerDashboard = lazy(() => import('@/app/(admin)/dashboard/analytics/page'))
const EmployeeDashboard = lazy(() => import('@/pages/EmployeeDashboard/EmployeeDashboardPage'))
const HolidaysPage = lazy(() => import('@/pages/Holidays/HolidaysPage'))
const UserProfile = lazy(() => import('@/pages/user-profile/UserProfile'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))

// Employee-only Pages
const AttendancePage = lazy(() => import('@/pages/Attendance/AttendancePage'))
const PermissionsPage = lazy(() => import('@/pages/Permissions/PermissionsPage'))
const LeavePage = lazy(() => import('@/pages/Leave/LeavePage'))
const MyTeamPage = lazy(() => import('@/pages/MyTeam/MyTeamPage'))
const MyProjectsPage = lazy(() => import('@/pages/MyProjects/MyProjectsPage'))
const MyProjectDetailPage = lazy(() => import('@/pages/MyProjects/MyProjectDetailPage'))

// Role-aware dashboard: same URL /dashboard, different component per role
const DashboardRouter = () => {
  const { role } = useAuthContext()
  return role === 'manager' ? <ManagerDashboard /> : <EmployeeDashboard />
}

// Manager-only Pages
const TeamAttendancePage = lazy(() => import('@/pages/manager/TeamAttendancePage'))
const TeamLeavesPage = lazy(() => import('@/pages/manager/TeamLeavesPage'))
const TeamPermissionsPage = lazy(() => import('@/pages/manager/TeamPermissionsPage'))

// Project & Team Management Pages
const TeamsPage = lazy(() => import('@/pages/Teams/TeamsPage'))
const ManagerTeamsPage = lazy(() => import('@/pages/Teams/ManagerTeamsPage'))
const ProjectsPage = lazy(() => import('@/pages/Projects/ProjectsPage'))
const ProjectTeamsPage = lazy(() => import('@/pages/ProjectTeams/ProjectTeamsPage'))

// Team Lead Pages
const OrganisationPage = lazy(() => import('@/pages/Organisation/OrganisationPage'))

// Redirects authenticated users to their home page based on role
const RootRedirect = () => {
  const { role } = useAuthContext()
  if (role === 'employee' || role === 'manager') return <Navigate to="/dashboard" replace />
  return <Navigate to="/organisation" replace />
}

// roles: which roles can access this route. Omit = all authenticated. Admin bypasses all.
export const userRoutes = [
  // ── Dashboard (role-aware: employee → EmployeeDashboard, manager → ManagerDashboard)
  {
    name: 'Dashboard',
    path: '/dashboard',
    element: <DashboardRouter />,
    roles: ['employee', 'manager'],
  },
  {
    name: 'Holidays',
    path: '/holidays',
    element: <HolidaysPage />,
    roles: ['employee', 'manager', 'teamLead'],
  },
  {
    name: 'User Profile',
    path: '/user-profile',
    element: <UserProfile />,
    roles: ['employee', 'manager', 'teamLead'],
  },

  // ── Employee-only ──────────────────────────────────────────────────────────
  {
    name: 'Attendance',
    path: '/attendance',
    element: <AttendancePage />,
    roles: ['employee'],
  },
  {
    name: 'Permissions',
    path: '/permissions',
    element: <PermissionsPage />,
    roles: ['employee'],
  },
  {
    name: 'Leave',
    path: '/leave',
    element: <LeavePage />,
    roles: ['employee'],
  },
  {
    name: 'My Team',
    path: '/my-team',
    element: <MyTeamPage />,
    roles: ['employee'],
  },
  {
    name: 'My Projects',
    path: '/my-projects',
    element: <MyProjectsPage />,
    roles: ['employee'],
  },
  {
    name: 'My Project Detail',
    path: '/my-projects/:projectId',
    element: <MyProjectDetailPage />,
    roles: ['employee'],
  },

  // ── Manager-only ──────────────────────────────────────────────────────────
  {
    name: 'Team Attendance',
    path: '/team-attendance',
    element: <TeamAttendancePage />,
    roles: ['manager'],
  },
  {
    name: 'Team Leaves',
    path: '/team-leaves',
    element: <TeamLeavesPage />,
    roles: ['manager'],
  },
  {
    name: 'Team Permissions',
    path: '/team-permissions',
    element: <TeamPermissionsPage />,
    roles: ['manager'],
  },

  // ── Project & Team Management ──────────────────────────────────────────────
  {
    name: 'Teams',
    path: '/teams',
    element: <ManagerTeamsPage />,
    roles: ['manager'],
  },
  {
    name: 'Team Details',
    path: '/teams/:teamId',
    element: <TeamsPage />,
    roles: ['manager'],
  },
  {
    name: 'Projects',
    path: '/projects',
    element: <ProjectsPage />,
    roles: ['manager'],
  },
  {
    name: 'Project Teams',
    path: '/project-teams',
    element: <ProjectTeamsPage />,
    roles: ['manager'],
  },

  // ── Team Lead ─────────────────────────────────────────────────────────────
  {
    name: 'Organisation',
    path: '/organisation',
    element: <OrganisationPage />,
    roles: ['teamLead'],
  },
]

// Public Routes — no auth required, uses PublicLayout
export const publicRoutes = [
  { name: 'About', path: '/about', element: <AboutPage /> },
  { name: 'Contact', path: '/contact', element: <ContactPage /> },
  { name: 'Privacy Policy', path: '/privacy-policy', element: <PrivacyPolicyPage /> },
  { name: 'Terms and Conditions', path: '/terms-and-conditions', element: <TermsAndConditionsPage /> },
]

// Auth Routes
export const authRoutes = [
  { name: 'Sign In', path: '/auth/sign-in', element: <AuthSignIn /> },
  { name: 'Maintenance', path: '/maintenance', element: <Maintenance /> },
  { name: '404 Error', path: '/error-404', element: <NotFound /> },
]

// Root + catch-all
const initialRoutes = [
  { path: '/', name: 'root', element: <RootRedirect /> },
  { path: '/unauthorized', name: 'unauth', element: <Unauthorized />, roles: [] },
  { path: '*', name: 'not-found', element: <NotFound /> },
]

export const appRoutes = [...initialRoutes, ...userRoutes]
