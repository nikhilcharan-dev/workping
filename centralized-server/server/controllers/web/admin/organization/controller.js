import { asyncHandler } from "#utils/async.handler.js";
import mongoose from "mongoose";
import Organization from "#models/Organization.js";
import OrgAdmin from "#models/Admin.Org.js";
import Admin from "#models/Admin.js";
import { uploadFile, deleteObject } from "#services/storage/oracle.service.js";
import Pagination from "#helpers/pagination.js";
import AdminOrg from "#models/Admin.Org.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { checkOrgLimit } from "#utils/plan.limits.js";
import {
  validateObjectId,
  validateString,
  validateNumber,
  validatePagination,
  validateEmail,
  validateDate,
} from "#utils/validators.js";

// ============================================================================
// HELPER FUNCTIONS - Data Formatting
// ============================================================================

const formatOrg = (org) => {
  if (!org) return org;
  if (org.foundedAt) {
    const date = new Date(org.foundedAt);
    if (!isNaN(date.getTime())) {
      org.foundedAt = date.toISOString().split("T")[0];
    }
  }
  return org;
};

// ============================================================================
// HELPER FUNCTIONS - Database Queries
// ============================================================================

const existingOrganizationWithSameName = async (organizationName) => {
  return await Organization.findOne({ name: organizationName });
};

// ============================================================================
// HELPER FUNCTIONS - Validation
// ============================================================================

const validateAreaPins = (areaPins) => {
  if (areaPins === undefined) return { valid: true };
  if (!Array.isArray(areaPins)) {
    return { valid: false, error: "areaPins must be an array" };
  }

  const normalized = [];
  for (const pin of areaPins) {
    let lat;
    let lng;

    if (Array.isArray(pin) && pin.length >= 2) {
      lat = Number(pin[0]);
      lng = Number(pin[1]);
    } else if (pin && typeof pin === "object") {
      lat = Number(pin.lat);
      lng = Number(pin.lng);
    } else {
      return { valid: false, error: "Each area pin must be [lat, lng] or { lat, lng }" };
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { valid: false, error: "Each area pin must have valid lat -90..90 and lng -180..180" };
    }

    normalized.push({ lat, lng });
  }

  return { valid: true, normalized };
};

const validateCoordinates = (coords) => {
  if (coords === undefined) return { valid: true };
  if (
    !Array.isArray(coords) ||
    coords.length !== 2 ||
    coords.some((v) => typeof v !== "number" || isNaN(v)) ||
    coords[0] < -90 ||
    coords[0] > 90 ||
    coords[1] < -180 ||
    coords[1] > 180
  ) {
    return { valid: false, error: "coordinates must be [lat, lng] with lat -90..90 and lng -180..180" };
  }
  return { valid: true, normalized: coords };
};

// ============================================================================
// HELPER FUNCTIONS - Organization Data Building
// ============================================================================

const buildOrgDataFromRequest = async (body, isUpdate = false) => {
  const orgData = {};

  // Validate and set name (only for create, not for update)
  if (body.name !== undefined) {
    const nameValidation = validateString(body.name, "Organization name", {
      required: !isUpdate,
      minLength: 2,
      maxLength: 100,
    });
    if (!nameValidation.valid) return { valid: false, error: nameValidation.error };

    const duplicate = await existingOrganizationWithSameName(nameValidation.normalized);
    if (duplicate && (!isUpdate || duplicate._id.toString() !== body._id?.toString())) {
      return { valid: false, error: "Organization Name is already taken", statusCode: 409 };
    }

    orgData.name = nameValidation.normalized;
  }

  // Validate and set clDays
  if (body.clDays !== undefined) {
    const clDaysValidation = validateNumber(body.clDays, "CL Days", { min: 0, max: 365, integer: true });
    if (!clDaysValidation.valid) return { valid: false, error: clDaysValidation.error };
    orgData.clDays = clDaysValidation.normalized;
  }

  // Validate and set foundedAt
  if (body.foundedAt !== undefined) {
    const foundedAtValidation = validateDate(body.foundedAt, "Founded At");
    if (!foundedAtValidation.valid) return { valid: false, error: foundedAtValidation.error };
    orgData.foundedAt = foundedAtValidation.normalized;
  }

  // Set optional fields
  if (body.description !== undefined) orgData.description = String(body.description).trim();
  if (body.type !== undefined) orgData.type = String(body.type).trim();
  if (body.IPWhitelist !== undefined) {
    orgData.IPWhitelist = Array.isArray(body.IPWhitelist) ? body.IPWhitelist : [body.IPWhitelist];
  }
  if (body.msl !== undefined) {
    const msl = String(body.msl).trim();
    if (!msl) return { valid: false, error: "msl cannot be empty" };
    orgData.msl = msl;
  }

  // Validate and set coordinates
  if (body.coordinates !== undefined) {
    const coordsValidation = validateCoordinates(body.coordinates);
    if (!coordsValidation.valid) return { valid: false, error: coordsValidation.error };
    orgData.coordinates = coordsValidation.normalized;
  }

  // Validate and set areaPins
  if (body.areaPins !== undefined) {
    const areaPinsValidation = validateAreaPins(body.areaPins);
    if (!areaPinsValidation.valid) return { valid: false, error: areaPinsValidation.error };

    orgData.areaPins = areaPinsValidation.normalized;
    // Auto-set coordinates from first arePin if not explicitly set
    if (orgData.coordinates === undefined && areaPinsValidation.normalized.length > 0) {
      orgData.coordinates = [areaPinsValidation.normalized[0].lat, areaPinsValidation.normalized[0].lng];
    }
  }

  return { valid: true, data: orgData };
};

// ============================================================================
// HELPER FUNCTIONS - Transaction Management
// ============================================================================

const createOrgWithAdmin = async (orgData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let newOrganization;
  try {
    [newOrganization] = await Organization.create([orgData], { session });
    await OrgAdmin.create([{ organizationId: newOrganization._id, primaryAdmin: userId }], { session });
    await session.commitTransaction();
    return newOrganization;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const deleteOrgWithAdmins = async (objectIds) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await OrgAdmin.deleteMany({ organizationId: { $in: objectIds } }, { session });
    await Organization.deleteMany({ _id: { $in: objectIds } }, { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ============================================================================
// HELPER FUNCTIONS - Admin Management
// ============================================================================

const buildAdminList = (orgAdmin) => {
  const admins = [];
  if (orgAdmin.primaryAdmin) {
    admins.push({
      _id: orgAdmin.primaryAdmin._id,
      userId: orgAdmin.primaryAdmin._id,
      name: orgAdmin.primaryAdmin.name,
      email: orgAdmin.primaryAdmin.email,
      role: "primary",
    });
  }
  if (orgAdmin.secondaryAdmin) {
    admins.push({
      _id: orgAdmin.secondaryAdmin._id,
      userId: orgAdmin.secondaryAdmin._id,
      name: orgAdmin.secondaryAdmin.name,
      email: orgAdmin.secondaryAdmin.email,
      role: "secondary",
    });
  }
  return admins;
};

const validateAdminInvite = (orgAdmin, userId, userIdStr) => {
  if (orgAdmin.primaryAdmin.toString() === userIdStr) {
    return { valid: false, error: "User is already the primary admin of this organization", statusCode: 409 };
  }
  if (orgAdmin.secondaryAdmin && orgAdmin.secondaryAdmin.toString() === userIdStr) {
    return { valid: false, error: "User is already a secondary admin of this organization", statusCode: 409 };
  }
  return { valid: true };
};

const validateAdminRemoval = (orgAdmin, userIdStr) => {
  if (orgAdmin.primaryAdmin.toString() === userIdStr) {
    return { valid: false, error: "Cannot remove the primary admin", statusCode: 400 };
  }
  if (!orgAdmin.secondaryAdmin || orgAdmin.secondaryAdmin.toString() !== userIdStr) {
    return { valid: false, error: "User is not a secondary admin of this organization", statusCode: 404 };
  }
  return { valid: true };
};

// ============================================================================
// HELPER FUNCTIONS - Aggregation Pipelines
// ============================================================================

const buildOrgListAggregation = (userId, search) => {
  return [
    { $match: { primaryAdmin: userId } },
    {
      $lookup: {
        from: "organizations",
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    { $unwind: "$organization" },
    {
      $match: {
        "organization.name": { $regex: search, $options: "i" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "organizationId",
        foreignField: "organizationId",
        as: "employees",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "organizationId",
        foreignField: "organizationId",
        as: "teams",
      },
    },
    {
      $addFields: {
        "organization.employeeCount": { $size: "$employees" },
        "organization.teamCount": { $size: "$teams" },
      },
    },
    { $sort: { "organization.name": 1 } },
  ];
};

const buildOrgIdsAggregation = (userId) => {
  return [
    { $match: { primaryAdmin: userId } },
    {
      $lookup: {
        from: "organizations",
        localField: "organizationId",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
        as: "org",
      },
    },
    { $unwind: "$org" },
    {
      $project: {
        _id: 0,
        organizationId: "$org._id",
        name: "$org.name",
      },
    },
  ];
};

const addOrganization = asyncHandler(async (req, res) => {
  let { userId } = req.user;
  userId = new mongoose.Types.ObjectId(userId);

  // Build and validate organization data
  const buildResult = await buildOrgDataFromRequest(req.body, false);
  if (!buildResult.valid) {
    const statusCode = buildResult.statusCode || 400;
    return errorResponse(res, buildResult.error, statusCode);
  }

  // Check organization creation limit
  const orgLimit = await checkOrgLimit(userId);
  if (!orgLimit.allowed) return errorResponse(res, orgLimit.message, 403);

  // Create organization with admin in transaction
  const newOrganization = await createOrgWithAdmin(buildResult.data, userId);

  return successResponse(res, "Organization created successfully", newOrganization, 201);
}, "ADMIN_ADD_ORG_ERROR");

const getOrganizationsOfAdmin = asyncHandler(async (req, res) => {
  let { userId } = req.user;
  userId = new mongoose.Types.ObjectId(userId);

  // Verify admin exists
  const existingAdmin = await Admin.findById(userId);
  if (!existingAdmin) return errorResponse(res, "Admin doesn't exist", 404);

  // Parse and sanitize query parameters
  let { search = "", page = 1, limit = 10 } = req.query;
  search = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  page = Number(page);

  // Build and execute aggregation pipeline
  const filter = buildOrgListAggregation(userId, search);
  const pagination = await Pagination(AdminOrg, page, limit, filter);
  const organizations = pagination.documents.map((item) => formatOrg(item.organization));

  return successResponse(res, "Organizations fetched", {
    totalRecords: pagination.totalRecords,
    totalPages: pagination.totalPages,
    organizations,
  });
}, "ADMIN_GET_ORG_ERROR");

const updateOrganization = asyncHandler(async (req, res) => {
  const { _id } = req.body;

  // Validate organization ID
  const idValidation = validateObjectId(_id, "Organization ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  // Verify organization exists
  const existingOrganization = await Organization.findById(_id);
  if (!existingOrganization) return errorResponse(res, "Organization doesn't exist", 404);

  // Build and validate updates
  req.body._id = _id; // Include ID for duplicate check
  const buildResult = await buildOrgDataFromRequest(req.body, true);
  if (!buildResult.valid) {
    const statusCode = buildResult.statusCode || 400;
    return errorResponse(res, buildResult.error, statusCode);
  }

  // Apply updates
  const updated = await Organization.findByIdAndUpdate(_id, buildResult.data, { new: true, runValidators: true }).lean();
  return successResponse(res, "Organization updated successfully", formatOrg(updated));
}, "ADMIN_UPDATE_ORG_ERROR");

const getOrganizationById = asyncHandler(async (req, res) => {
  const { id: organizationId } = req.params;

  const idValidation = validateObjectId(organizationId, "Organization ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const existingOrganization = await Organization.findById(organizationId).lean();
  if (!existingOrganization) return errorResponse(res, "Organization doesn't exist", 404);

  return successResponse(res, "Organization fetched", formatOrg(existingOrganization));
}, "ADMIN_GET_ORG_BY_ID_ERROR");

const deleteOrganization = asyncHandler(async (req, res) => {
  const { data: organizationIds } = req.body;

  // Validate input
  if (!Array.isArray(organizationIds) || organizationIds.length === 0) {
    return errorResponse(res, "organizationIds must be a non-empty array");
  }

  // Validate all IDs
  for (const organizationId of organizationIds) {
    const idValidation = validateObjectId(organizationId, "Organization ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
  }

  // Convert to ObjectIds and verify existence
  const objectIds = organizationIds.map((id) => new mongoose.Types.ObjectId(id));
  const existingOrganizations = await Organization.find({ _id: { $in: objectIds } }).lean();
  if (existingOrganizations.length === 0) return errorResponse(res, "Organizations don't exist", 404);

  // Delete organizations and associated admin records
  await deleteOrgWithAdmins(objectIds);

  return successResponse(res, "Organizations deleted successfully", { deletedCount: existingOrganizations.length });
}, "ADMIN_DELETE_ORG_ERROR");

const getOrganizationIDsOfAdmin = asyncHandler(async (req, res) => {
  let { userId } = req.user;
  userId = new mongoose.Types.ObjectId(userId);

  // Verify admin exists
  const existingAdmin = await Admin.findById(userId);
  if (!existingAdmin) return errorResponse(res, "Admin doesn't exist", 404);

  // Fetch organization IDs with aggregation
  const pipeline = buildOrgIdsAggregation(userId);
  const organizationIds = await OrgAdmin.aggregate(pipeline);

  return successResponse(res, "Organization IDs fetched", organizationIds);
}, "ADMIN_GET_ORG_IDS_ERROR");

const getOrgAdmins = asyncHandler(async (req, res) => {
  const { organizationId } = req.query;

  // Validate organization ID
  const idValidation = validateObjectId(organizationId, "Organization ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  // Fetch organization admin record
  const orgAdmin = await OrgAdmin.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) })
    .populate("primaryAdmin", "name email")
    .populate("secondaryAdmin", "name email")
    .lean();

  if (!orgAdmin) return errorResponse(res, "No admins found for this organization", 404);

  // Build admin list from fetched data
  const admins = buildAdminList(orgAdmin);

  return successResponse(res, "Org admins fetched", admins);
}, "ADMIN_GET_ORG_ADMINS_ERROR");

const findAdminByEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const admin = await Admin.findOne({ email: emailValidation.normalized }).lean();
  if (!admin) return errorResponse(res, "Admin not found", 404);

  return successResponse(res, "Admin found", {
    _id: admin._id,
    userId: admin._id,
    name: admin.name,
    userName: admin.name,
    email: admin.email,
  });
}, "ADMIN_FIND_BY_EMAIL_ERROR");

const inviteAdmin = asyncHandler(async (req, res) => {
  const { organizationId, userId } = req.body;

  // Validate IDs
  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  const userIdValidation = validateObjectId(userId, "User ID");
  if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);

  // Verify organization and admin exist
  const [org, admin] = await Promise.all([
    Organization.findById(organizationId),
    Admin.findById(userId),
  ]);
  if (!org) return errorResponse(res, "Organization not found", 404);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  // Fetch organization admin record
  const orgAdmin = await OrgAdmin.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) });
  if (!orgAdmin) return errorResponse(res, "Organization admin record not found", 404);

  // Validate invite
  const inviteValidation = validateAdminInvite(orgAdmin, new mongoose.Types.ObjectId(userId), userId);
  if (!inviteValidation.valid) {
    return errorResponse(res, inviteValidation.error, inviteValidation.statusCode);
  }

  // Invite admin
  orgAdmin.secondaryAdmin = new mongoose.Types.ObjectId(userId);
  await orgAdmin.save();

  return successResponse(res, "Admin invited successfully");
}, "ADMIN_INVITE_ADMIN_ERROR");

const removeAdmin = asyncHandler(async (req, res) => {
  const { organizationId, userId } = req.body;

  // Validate IDs
  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  const userIdValidation = validateObjectId(userId, "User ID");
  if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);

  // Fetch organization admin record
  const orgAdmin = await OrgAdmin.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) });
  if (!orgAdmin) return errorResponse(res, "Organization admin record not found", 404);

  // Validate removal
  const removalValidation = validateAdminRemoval(orgAdmin, userId);
  if (!removalValidation.valid) {
    return errorResponse(res, removalValidation.error, removalValidation.statusCode);
  }

  // Remove admin
  orgAdmin.secondaryAdmin = undefined;
  await orgAdmin.save();

  return successResponse(res, "Admin removed successfully");
}, "ADMIN_REMOVE_ADMIN_ERROR");

const uploadOrgLogo = asyncHandler(async (req, res) => {
  const { organizationId } = req.body;

  // Validate organization ID
  const idValidation = validateObjectId(organizationId, "Organization ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  // Validate file exists
  if (!req.file) return errorResponse(res, "logo is required");

  // Verify organization exists
  const org = await Organization.findById(organizationId);
  if (!org) return errorResponse(res, "Organization not found", 404);

  // Delete old logo if exists
  if (org.logo) {
    deleteObject(process.env.ORACLE_BUCKET_ORG_LOGOS, org.logo);
  }

  // Upload new logo
  const { objectName } = await uploadFile(
    process.env.ORACLE_BUCKET_ORG_LOGOS,
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  // Update organization record
  await Organization.findByIdAndUpdate(organizationId, { logo: objectName });
  return successResponse(res, "Organization logo uploaded", { logo: objectName });
}, "ADMIN_UPLOAD_ORG_LOGO_ERROR");

export {
  addOrganization,
  updateOrganization,
  getOrganizationById,
  getOrganizationsOfAdmin,
  deleteOrganization,
  getOrganizationIDsOfAdmin,
  getOrgAdmins,
  findAdminByEmail,
  inviteAdmin,
  removeAdmin,
  uploadOrgLogo,
};
