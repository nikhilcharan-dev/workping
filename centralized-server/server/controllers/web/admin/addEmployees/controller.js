import User from "#models/User.js";
import GovtProof from "#models/GovtProof.js";
import Organization from "#models/Organization.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import {
  validateObjectId,
  validateEmail,
  validatePhone,
  validateName,
  validateEnum,
  validateDate,
  validateNumber,
  validateEmployeeId,
} from "#utils/validators.js";

const employeeLookupPipeline = [
  {
    $lookup: {
      from: "organizations",
      localField: "organizationId",
      foreignField: "_id",
      as: "organization",
    },
  },
  { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "teams",
      localField: "teamId",
      foreignField: "_id",
      as: "team",
    },
  },
  { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "govtproofs",
      localField: "_id",
      foreignField: "userId",
      as: "govtProof",
    },
  },
  { $unwind: { path: "$govtProof", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "projectmembers",
      localField: "_id",
      foreignField: "userId",
      as: "projectMemberships",
    },
  },
  {
    $lookup: {
      from: "projects",
      localField: "projectMemberships.projectId",
      foreignField: "_id",
      as: "assignedProjects",
    },
  },
  {
    $addFields: {
      organizationName: { $ifNull: ["$organization.name", null] },
      departmentName: { $ifNull: ["$team.teamName", null] },
      projects: { $ifNull: ["$assignedProjects.name", []] },
      aadhaarNumber: { $ifNull: ["$govtProof.aadhaarNumber", null] },
      panNumber: { $ifNull: ["$govtProof.panNumber", null] },
      passportNumber: { $ifNull: ["$govtProof.passportNumber", null] },
      bankAccount: { $ifNull: ["$govtProof.bankAccount", null] },
      workType: { $ifNull: ["$workType", null] },
      profileImage: { $ifNull: ["$profileImage", null] },
      dateOfJoining: { $dateToString: { format: "%Y-%m-%d", date: "$dateOfJoining" } },
      dob: { $cond: { if: "$dob", then: { $dateToString: { format: "%Y-%m-%d", date: "$dob" } }, else: null } },
      // Frontend-expected field aliases
      userName: "$name",
      userId: "$employeeId",
      doj: { $dateToString: { format: "%Y-%m-%d", date: "$dateOfJoining" } },
      aadhaar: { $ifNull: ["$govtProof.aadhaarNumber", null] },
      pan: { $ifNull: ["$govtProof.panNumber", null] },
      passport: { $ifNull: ["$govtProof.passportNumber", null] },
      bankId: { $ifNull: ["$govtProof.bankAccount", null] },
    },
  },
  {
    $project: {
      organization: 0,
      team: 0,
      govtProof: 0,
    },
  },
];

const getEmployee = asyncHandler(async (req, res) => {
  const { id: employeeId } = req.params;

  const idValidation = validateObjectId(employeeId, "Employee ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const [employee] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(employeeId) } },
    ...employeeLookupPipeline,
  ]);

  if (!employee) return errorResponse(res, "Employee doesn't exist", 404);
  return successResponse(res, "Employee fetched", employee);
}, "ADMIN_GET_EMPLOYEE_ERROR");

const updateEmployee = asyncHandler(async (req, res) => {
  let { employeeId } = req.body;

  const idValidation = validateObjectId(employeeId, "Employee ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  employeeId = new mongoose.Types.ObjectId(employeeId);
  const employee = await User.findById(employeeId);
  if (!employee) return errorResponse(res, "Employee doesn't exist", 404);

  const {
    userName,
    name: bodyName,
    email,
    phone,
    gender,
    salary,
    dob,
    address,
    dateOfJoining,
    role,
    isActive,
    teamId,
    userId,
    employeeId: bodyEmployeeId,
    organizationId,
    aadhaar,
    pan,
    passport,
    bankId,
    workType,
  } = req.body;

  const name = userName || bodyName;
  const userIdToUse = userId || bodyEmployeeId;

  const updates = {};
  const govtUpdates = {};

  if (name && name !== employee.name) {
    const nameValidation = validateName(name);
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
    updates.name = nameValidation.normalized;
  }

  if (email && email !== employee.email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

    const existingEmail = await User.findOne({ email: emailValidation.normalized, _id: { $ne: employeeId } });
    if (existingEmail) return errorResponse(res, "Email already in use by another employee", 409);

    updates.email = emailValidation.normalized;
  }

  if (workType && workType !== employee.workType) {
    const validWorkTypes = ["remote", "onsite", "hybrid"];
    if (!validWorkTypes.includes(workType.toLowerCase())) {
      return errorResponse(res, `Invalid workType. Must be one of: ${validWorkTypes.join(", ")}`);
    }
    updates.workType = workType.toLowerCase();
  }

  if (phone && phone !== employee.phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) return errorResponse(res, phoneValidation.error);

    const existingPhone = await User.findOne({ phone: phoneValidation.normalized, _id: { $ne: employeeId } });
    if (existingPhone) return errorResponse(res, "Phone number already in use by another employee", 409);

    updates.phone = phoneValidation.normalized;
  }

  if (userIdToUse && userIdToUse !== employee.employeeId) {
    const userIdValidation = validateEmployeeId(userIdToUse);
    if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);

    const existingEmpId = await User.findOne({
      employeeId: userIdValidation.normalized,
      organizationId: employee.organizationId,
      _id: { $ne: employeeId },
    });
    if (existingEmpId) return errorResponse(res, "Employee ID already in use by another employee", 409);

    updates.employeeId = userIdValidation.normalized;
  }

  if (gender && gender !== employee.gender) {
    const genderValidation = validateEnum(gender, ["male", "female", "other"], "Gender");
    if (!genderValidation.valid) return errorResponse(res, genderValidation.error);
    updates.gender = genderValidation.normalized;
  }

  if (salary !== undefined && salary !== employee.salary) {
    const salaryValidation = validateNumber(salary, "Salary", { min: 0 });
    if (!salaryValidation.valid) return errorResponse(res, salaryValidation.error);
    updates.salary = salaryValidation.normalized;
  }

  if (dob) {
    const dobValidation = validateDate(dob, "Date of Birth", { noFuture: true });
    if (!dobValidation.valid) return errorResponse(res, dobValidation.error);
    updates.dob = dobValidation.normalized;
  }

  if (address) updates.address = String(address).trim();

  if (dateOfJoining) {
    const dojValidation = validateDate(dateOfJoining, "Date of Joining", { noFuture: true });
    if (!dojValidation.valid) return errorResponse(res, dojValidation.error);
    updates.dateOfJoining = dojValidation.normalized;
  }

  if (role && role !== employee.role) {
    const roleValidation = validateEnum(role, ["manager", "teamLead", "employee"], "Role");
    if (!roleValidation.valid) return errorResponse(res, roleValidation.error);
    updates.role = roleValidation.normalized;
  }

  if (isActive !== undefined && isActive !== employee.isActive) {
    if (typeof isActive !== "boolean") return errorResponse(res, "isActive must be a boolean");
    updates.isActive = isActive;
  }

  if (teamId) {
    const teamIdValidation = validateObjectId(teamId, "Team ID");
    if (!teamIdValidation.valid) return errorResponse(res, teamIdValidation.error);
    updates.teamId = new mongoose.Types.ObjectId(teamId);
  }

  if (organizationId) {
    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

    const org = await Organization.findById(organizationId);
    if (!org) return errorResponse(res, "Organization not found", 404);

    updates.organizationId = new mongoose.Types.ObjectId(organizationId);
  }

  // GovtProof fields
  if (aadhaar) {
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(String(aadhaar).trim())) {
      return errorResponse(res, "Invalid aadhaar format. Must be exactly 12 digits");
    }
    govtUpdates.aadhaarNumber = String(aadhaar).trim();
  }

  if (pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(String(pan).trim().toUpperCase())) {
      return errorResponse(res, "Invalid PAN format. Expected format: AAAAA9999A");
    }
    govtUpdates.panNumber = String(pan).trim().toUpperCase();
  }

  if (passport) {
    // Relaxed regex: starts with a letter or digit, 4-15 characters
    const passportRegex = /^[A-Z0-9]{4,15}$/;
    if (!passportRegex.test(String(passport).trim().toUpperCase())) {
      return errorResponse(res, "Invalid passport format. Expected 4-15 alphanumeric characters");
    }
    govtUpdates.passportNumber = String(passport).trim().toUpperCase();
  }

  if (bankId) govtUpdates.bankAccount = String(bankId).trim();

  if (Object.keys(updates).length === 0 && Object.keys(govtUpdates).length === 0) {
    return successResponse(res, "No changes detected");
  }

  if (Object.keys(updates).length > 0) {
    await User.findByIdAndUpdate(employeeId, updates, { new: true, runValidators: true });
  }

  if (Object.keys(govtUpdates).length > 0) {
    await GovtProof.findOneAndUpdate(
      { userId: employeeId },
      { $set: govtUpdates },
      { upsert: true, new: true, runValidators: true }
    );
  }

  const [enrichedEmployee] = await User.aggregate([{ $match: { _id: employeeId } }, ...employeeLookupPipeline]);

  return successResponse(res, "Employee updated successfully", enrichedEmployee);
}, "ADMIN_UPDATE_EMPLOYEE_ERROR");

export { getEmployee, updateEmployee };
