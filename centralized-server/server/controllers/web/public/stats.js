import User from "#models/User.js";
import Organization from "#models/Organization.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";

const getPublicStats = asyncHandler(async (req, res) => {
  const [employeeCount, organizationCount] = await Promise.all([User.countDocuments(), Organization.countDocuments()]);

  return successResponse(res, "Stats fetched", { employeeCount, organizationCount });
}, "PUBLIC_STATS_ERROR");

export default getPublicStats;
