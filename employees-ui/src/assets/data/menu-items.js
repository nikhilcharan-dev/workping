// roles: which roles can see this item. Omit or [] means all authenticated users.
export const MENU_ITEMS = [
  // ── Team Lead (non-employee, non-manager) ───────────────────────────────────
  {
    key: 'organisation',
    icon: 'bx:building-house',
    label: 'My Organisation',
    url: '/organisation',
    roles: ['teamLead'],
  },

  // ── Shared ──────────────────────────────────────────────────────────────────
  {
    key: 'dashboard',
    icon: 'iconamoon:home-duotone',
    label: 'Dashboard',
    url: '/dashboard',
    roles: ['employee', 'manager'],
  },

  // ── Employee-only ───────────────────────────────────────────────────────────
  {
    key: 'attendance',
    icon: 'iconamoon:profile-circle-duotone',
    label: 'Attendance',
    roles: ['employee'],
    children: [
      { key: 'my-attendance', label: 'My Attendance', url: '/attendance', parentKey: 'attendance' },
      { key: 'leave', label: 'Leave', url: '/leave', parentKey: 'attendance' },
      { key: 'permissions', label: 'Permissions', url: '/permissions', parentKey: 'attendance' },
    ],
  },

  {
    key: 'my-workspace',
    icon: 'bxs:grid-alt',
    label: 'My Workspace',
    roles: ['employee'],
    children: [
      { key: 'my-team', label: 'My Team', url: '/my-team', parentKey: 'my-workspace' },
      { key: 'my-projects', label: 'My Projects', url: '/my-projects', parentKey: 'my-workspace' },
    ],
  },

  // ── Manager-only ────────────────────────────────────────────────────────────
  {
    key: 'team-attendance-group',
    icon: 'iconamoon:profile-circle-duotone',
    label: 'Attendance',
    roles: ['manager'],
    children: [
      { key: 'team-attendance', label: 'Team Attendance', url: '/team-attendance', parentKey: 'team-attendance-group' },
      { key: 'team-leaves', label: 'Team Leaves', url: '/team-leaves', parentKey: 'team-attendance-group' },
      { key: 'team-permissions', label: 'Team Permissions', url: '/team-permissions', parentKey: 'team-attendance-group' },
    ],
  },

  {
    key: 'teams-group',
    icon: 'bxs:group',
    label: 'Teams',
    roles: ['manager'],
    children: [
      { key: 'teams', label: 'View All', url: '/teams', parentKey: 'teams-group' },
      { key: 'project-teams', label: 'Project Teams', url: '/project-teams', parentKey: 'teams-group' },
    ],
  },

  {
    key: 'projects-group',
    icon: 'iconamoon:folder-duotone',
    label: 'Projects',
    roles: ['manager'],
    children: [{ key: 'projects', label: 'View All', url: '/projects', parentKey: 'projects-group' }],
  },

  // ── Shared ──────────────────────────────────────────────────────────────────
  {
    key: 'holidays',
    icon: 'iconamoon:calendar-1-duotone',
    label: 'Holidays',
    url: '/holidays',
    roles: ['employee', 'manager', 'teamLead'],
  },
]
