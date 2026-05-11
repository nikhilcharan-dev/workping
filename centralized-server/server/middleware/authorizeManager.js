import { errorResponse } from "../utils/response.helper.js";

/**
 * Middleware to prevent privilege escalation by enforcing organization-level access.
 * Admins are allowed bypass. Managers are restricted to their own organization.
 */
const authorizeManager = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, "Unauthorized", 401);
  }

  // Admins have cross-organization access
  if (req.user.role === "admin") {
    return next();
  }

  // Only admin and manager roles are allowed; teamlead, employee, and others are forbidden
  if (!["admin", "manager"].includes(req.user.role)) {
    return errorResponse(res, "Forbidden: insufficient role privileges", 403);
  }

  // Managers are restricted to their own organization
  const userOrgId = req.user.organizationId;

  if (!userOrgId) {
    return errorResponse(res, "Forbidden: manager account has no organization assigned", 403);
  }

  // Check for organizationId in body, query, or params
  const reqOrgId = req.body?.organizationId || req.query?.organizationId || req.params?.organizationId;

  if (reqOrgId && String(reqOrgId) !== String(userOrgId)) {
    return errorResponse(res, "Forbidden: You do not have access to this organization's data", 403);
  }

  // Attach the manager's org ID so controllers can scope queries without re-reading the JWT.
  req.managedOrgId = userOrgId;

  next();
};

export default authorizeManager;
