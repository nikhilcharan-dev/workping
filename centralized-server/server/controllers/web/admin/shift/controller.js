import Shift from "#models/Shift.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId } from "#utils/validators.js";

// GET /api/admin/shifts?organizationId=
export const getShifts = asyncHandler(async (req, res) => {
  const { organizationId } = req.query;

  if (!organizationId) return errorResponse(res, "organizationId is required");

  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  const shifts = await Shift.find({ organizationId })
    .select("_id name startTime endTime slotStart slotEnd breakMinutes")
    .sort({ name: 1 })
    .lean();

  return successResponse(res, "Shifts fetched", shifts);
}, "ADMIN_GET_SHIFTS");
