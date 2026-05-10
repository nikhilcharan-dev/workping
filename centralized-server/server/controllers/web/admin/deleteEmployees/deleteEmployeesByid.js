import User from "#models/User.js";
import Account from "#models/Account.js";
import GovtProof from "#models/GovtProof.js";
import TeamMembership from "#models/TeamMembership.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId } from "#utils/validators.js";
import { deleteFace } from "#services/face_recognition/enroll.js";

const deleteEmployeesById = asyncHandler(async (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data) || data.length === 0) {
    return errorResponse(res, "data must be a non-empty array of employee IDs");
  }

  for (const id of data) {
    const idValidation = validateObjectId(id, "Employee ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
  }

  const objectIds = data.map((id) => new mongoose.Types.ObjectId(id));

  const employees = await User.find({ _id: { $in: objectIds } }, { email: 1, employeeId: 1 }).lean();
  if (employees.length === 0) return errorResponse(res, "No employees found with the given IDs", 404);

  const emails = employees.map((e) => e.email);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await TeamMembership.deleteMany({ userId: { $in: objectIds } }, { session });
    await GovtProof.deleteMany({ userId: { $in: objectIds } }, { session });
    await Account.deleteMany({ email: { $in: emails } }, { session });
    await User.deleteMany({ _id: { $in: objectIds } }, { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Remove faces from FAISS index — fire-and-log
  for (const emp of employees) {
    if (emp.employeeId) deleteFace(emp.employeeId);
  }

  return successResponse(res, "Employees deleted successfully", { deletedCount: employees.length });
}, "DELETE_EMPLOYEES_BY_ID_CONTROLLER");

export default deleteEmployeesById;
