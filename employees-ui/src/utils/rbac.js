export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  TEAM_LEAD: 'teamLead',
}

/**
 * Returns true if the given userRole is allowed by allowedRoles.
 * Admin bypasses all role checks. Empty/null allowedRoles means public.
 */
export const hasAccess = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true
  if (userRole === ROLES.ADMIN) return true
  return allowedRoles.includes(userRole)
}
