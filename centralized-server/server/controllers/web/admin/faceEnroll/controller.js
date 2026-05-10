import User from "#models/User.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId } from "#utils/validators.js";
import { enrollFace, deleteFace } from "#services/face_recognition/enroll.js";

// DELETE /api/admin/employees/:id/face
export const deleteEmployeeFace = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const v = validateObjectId(id, "Employee ID");
  if (!v.valid) return errorResponse(res, v.error);

  const user = await User.findById(id).lean();
  if (!user) return errorResponse(res, "Employee not found", 404);

  await deleteFace(user.employeeId);

  return successResponse(res, "Face embedding removed");
}, "DELETE_FACE_ERROR");

// POST /api/admin/employees/:id/enroll-face
// Multipart: face_photo (required, single image)
export const enrollEmployeeFace = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const v = validateObjectId(id, "Employee ID");
  if (!v.valid) return errorResponse(res, v.error);

  if (!req.file) {
    return errorResponse(res, "face_photo is required");
  }

  const user = await User.findById(id).lean();
  if (!user) return errorResponse(res, "Employee not found", 404);

  await enrollFace(req.file.buffer, user);

  return successResponse(res, "Face enrolled successfully", {
    employeeId: user.employeeId,
    name: user.name,
  });
}, "ENROLL_FACE_ERROR");
