import { asyncHandler } from "#utils/async.handler.js";
import Admin from "#models/Admin.js";
import Account from "#models/Account.js";
import AdminOrg from "#models/Admin.Org.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { uploadFile, deleteObject } from "#services/storage/oracle.service.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateName,
  validateRequiredFields,
} from "#utils/validators.js";

export const getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const [admin] = await Admin.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "plans",
        localField: "planId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, maxOrganizations: 1, maxEmployees: 1 } }],
        as: "plan",
      },
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
  ]);

  if (!admin) return errorResponse(res, "Admin not found", 404);

  const adminOrgs = await AdminOrg.find({ primaryAdmin: userId }).populate(
    "organizationId",
    "name type clDays foundedAt"
  );

  return successResponse(res, "Admin profile fetched", {
    ...admin,
    organizations: adminOrgs.map((org) => org.organizationId),
  });
}, "ADMIN_GET_PROFILE_ERROR");

export const getProfileByEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) return errorResponse(res, "Email is required");

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const [admin] = await Admin.aggregate([
    { $match: { email: emailValidation.normalized } },
    {
      $lookup: {
        from: "plans",
        localField: "planId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, maxOrganizations: 1, maxEmployees: 1 } }],
        as: "plan",
      },
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
  ]);

  if (!admin) return errorResponse(res, "Admin not found", 404);

  const adminOrgs = await AdminOrg.find({ primaryAdmin: admin._id }).populate(
    "organizationId",
    "name type clDays foundedAt"
  );

  return successResponse(res, "Admin profile fetched by email", {
    ...admin,
    organizations: adminOrgs.map((org) => org.organizationId),
  });
}, "ADMIN_GET_PROFILE_BY_EMAIL_ERROR");

export const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  const updates = {};

  if (req.body.name !== undefined) {
    const nameValidation = validateName(req.body.name);
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
    updates.name = nameValidation.normalized;
  }

  if (req.body.phoneNumber !== undefined) {
    const phoneValidation = validatePhone(req.body.phoneNumber);
    if (!phoneValidation.valid) return errorResponse(res, phoneValidation.error);

    const existingPhone = await Admin.findOne({
      phoneNumber: phoneValidation.normalized,
      _id: { $ne: userId },
    });
    if (existingPhone) return errorResponse(res, "Phone number already in use", 409);

    updates.phoneNumber = phoneValidation.normalized;
  }

  if (Object.keys(updates).length === 0) return errorResponse(res, "No valid fields to update");

  const updatedAdmin = await Admin.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });

  return successResponse(res, "Admin profile updated successfully", updatedAdmin);
}, "ADMIN_UPDATE_PROFILE_ERROR");

export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  if (!req.file) return errorResponse(res, "photo is required");

  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  if (admin.profileImage) {
    deleteObject(process.env.ORACLE_BUCKET_PROFILES, admin.profileImage);
  }

  const { objectName } = await uploadFile(
    process.env.ORACLE_BUCKET_PROFILES,
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  await Admin.findByIdAndUpdate(userId, { profileImage: objectName });
  return successResponse(res, "Profile photo uploaded", { profileImage: objectName });
}, "ADMIN_UPLOAD_PHOTO_ERROR");

export const changePassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  const requiredCheck = validateRequiredFields({ currentPassword, newPassword }, ["currentPassword", "newPassword"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  const account = await Account.findOne({ email: admin.email, role: "admin" });
  if (!account) return errorResponse(res, "Account not found", 404);

  const isMatch = await bcrypt.compare(currentPassword, account.password);
  if (!isMatch) return errorResponse(res, "Current password is incorrect", 401);

  const isSamePassword = await bcrypt.compare(newPassword, account.password);
  if (isSamePassword) return errorResponse(res, "New password cannot be the same as the current password");

  account.password = await bcrypt.hash(newPassword, 10);
  await account.save();

  return successResponse(res, "Password changed successfully");
}, "ADMIN_CHANGE_PASSWORD_ERROR");
