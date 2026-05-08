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

    // Managers (and others like teamleads) are restricted to their own organization
    const userOrgId = req.user.organizationId;

    // Check for organizationId in body, query, or params
    const reqOrgId = req.body?.organizationId || req.query?.organizationId || req.params?.organizationId;

    if (reqOrgId && String(reqOrgId) !== String(userOrgId)) {
        return errorResponse(res, "Forbidden: You do not have access to this organization's data", 403);
    }

    // If no org ID is provided in the request, we assume the controller will handle resource-specific checks
    // or it's a generic request. For the routes we are hardening, orgId is usually present.

    next();
};

export default authorizeManager;
