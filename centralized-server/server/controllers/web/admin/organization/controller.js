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

const existingOrganizationWithSameName = async (organizationName) => {
    return await Organization.findOne({ name: organizationName });
};

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

const addOrganization = asyncHandler(async (req, res) => {
    let { name, type, description, clDays, foundedAt, IPWhitelist } = req.body;

    const nameValidation = validateString(name, "Organization name", {
        required: true,
        minLength: 2,
        maxLength: 100,
    });
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);

    if (clDays !== undefined) {
        const clDaysValidation = validateNumber(clDays, "CL Days", { min: 0, max: 365, integer: true });
        if (!clDaysValidation.valid) return errorResponse(res, clDaysValidation.error);
        clDays = clDaysValidation.normalized;
    }

    let { userId } = req.user;
    userId = new mongoose.Types.ObjectId(userId);

    const duplicate = await existingOrganizationWithSameName(nameValidation.normalized);
    if (duplicate) return errorResponse(res, "Organization Name is already taken", 409);

    const orgLimit = await checkOrgLimit(userId);
    if (!orgLimit.allowed) return errorResponse(res, orgLimit.message, 403);

    const orgData = { name: nameValidation.normalized };
    if (type !== undefined) orgData.type = String(type).trim();
    if (description !== undefined) orgData.description = String(description).trim();
    if (clDays !== undefined) orgData.clDays = clDays;
    if (foundedAt !== undefined) {
        const foundedAtValidation = validateDate(foundedAt, "Founded At");
        if (!foundedAtValidation.valid) return errorResponse(res, foundedAtValidation.error);
        orgData.foundedAt = foundedAtValidation.normalized;
    }
    if (IPWhitelist !== undefined) orgData.IPWhitelist = Array.isArray(IPWhitelist) ? IPWhitelist : [IPWhitelist];
    if (req.body.coordinates !== undefined) {
        const coords = req.body.coordinates;
        if (
            !Array.isArray(coords) ||
            coords.length !== 2 ||
            coords.some((v) => typeof v !== "number" || isNaN(v)) ||
            coords[0] < -90 ||
            coords[0] > 90 ||
            coords[1] < -180 ||
            coords[1] > 180
        ) {
            return errorResponse(res, "coordinates must be [lat, lng] with lat -90..90 and lng -180..180");
        }
        orgData.coordinates = coords;
    }
    if (req.body.areaPins !== undefined) {
        const areaPinsValidation = validateAreaPins(req.body.areaPins);
        if (!areaPinsValidation.valid) return errorResponse(res, areaPinsValidation.error);

        orgData.areaPins = areaPinsValidation.normalized;
        if (orgData.coordinates === undefined && areaPinsValidation.normalized.length > 0) {
            orgData.coordinates = [areaPinsValidation.normalized[0].lat, areaPinsValidation.normalized[0].lng];
        }
    }
    if (req.body.msl !== undefined) {
        const msl = String(req.body.msl).trim();
        if (!msl) return errorResponse(res, "msl cannot be empty");
        orgData.msl = msl;
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    let newOrganization;
    try {
        [newOrganization] = await Organization.create([orgData], { session });
        await OrgAdmin.create(
            [
                {
                    organizationId: newOrganization._id,
                    primaryAdmin: userId,
                },
            ],
            { session }
        );
        await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }

    return successResponse(res, "Organization created successfully", newOrganization, 201);
}, "ADMIN_ADD_ORG_ERROR");

const getOrganizationsOfAdmin = asyncHandler(async (req, res) => {
    let { userId } = req.user;
    userId = new mongoose.Types.ObjectId(userId);

    const existingAdmin = await Admin.findById(userId);
    if (!existingAdmin) return errorResponse(res, "Admin doesn't exist", 404);

    let { search = "", page = 1, limit = 10 } = req.query;
    search = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    page = Number(page);

    const filter = [
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

    const idValidation = validateObjectId(_id, "Organization ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const updates = {};

    if (req.body.name !== undefined) {
        const nameValidation = validateString(req.body.name, "Organization name", { minLength: 2, maxLength: 100 });
        if (!nameValidation.valid) return errorResponse(res, nameValidation.error);

        const duplicate = await existingOrganizationWithSameName(nameValidation.normalized);
        if (duplicate && duplicate._id.toString() !== _id.toString()) {
            return errorResponse(res, "Organization Name is already taken", 409);
        }

        updates.name = nameValidation.normalized;
    }

    if (req.body.clDays !== undefined) {
        const clDaysValidation = validateNumber(req.body.clDays, "CL Days", { min: 0, max: 365, integer: true });
        if (!clDaysValidation.valid) return errorResponse(res, clDaysValidation.error);
        updates.clDays = clDaysValidation.normalized;
    }

    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.type !== undefined) updates.type = String(req.body.type).trim();
    if (req.body.foundedAt !== undefined) {
        const foundedAtValidation = validateDate(req.body.foundedAt, "Founded At");
        if (!foundedAtValidation.valid) return errorResponse(res, foundedAtValidation.error);
        updates.foundedAt = foundedAtValidation.normalized;
    }
    if (req.body.IPWhitelist !== undefined)
        updates.IPWhitelist = Array.isArray(req.body.IPWhitelist) ? req.body.IPWhitelist : [req.body.IPWhitelist];
    if (req.body.coordinates !== undefined) {
        const coords = req.body.coordinates;
        if (
            !Array.isArray(coords) ||
            coords.length !== 2 ||
            coords.some((v) => typeof v !== "number" || isNaN(v)) ||
            coords[0] < -90 ||
            coords[0] > 90 ||
            coords[1] < -180 ||
            coords[1] > 180
        ) {
            return errorResponse(res, "coordinates must be [lat, lng] with lat -90..90 and lng -180..180");
        }
        updates.coordinates = coords;
    }
    if (req.body.areaPins !== undefined) {
        const areaPinsValidation = validateAreaPins(req.body.areaPins);
        if (!areaPinsValidation.valid) return errorResponse(res, areaPinsValidation.error);

        updates.areaPins = areaPinsValidation.normalized;
        if (updates.coordinates === undefined && areaPinsValidation.normalized.length > 0) {
            updates.coordinates = [areaPinsValidation.normalized[0].lat, areaPinsValidation.normalized[0].lng];
        }
    }
    if (req.body.msl !== undefined) {
        const msl = String(req.body.msl).trim();
        if (!msl) return errorResponse(res, "msl cannot be empty");
        updates.msl = msl;
    }

    const existingOrganization = await Organization.findById(_id);
    if (!existingOrganization) return errorResponse(res, "Organization doesn't exist", 404);

    const updated = await Organization.findByIdAndUpdate(_id, updates, { new: true, runValidators: true }).lean();
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

    if (!Array.isArray(organizationIds) || organizationIds.length === 0) {
        return errorResponse(res, "organizationIds must be a non-empty array");
    }

    for (const organizationId of organizationIds) {
        const idValidation = validateObjectId(organizationId, "Organization ID");
        if (!idValidation.valid) return errorResponse(res, idValidation.error);
    }

    const objectIds = organizationIds.map((id) => new mongoose.Types.ObjectId(id));

    const existingOrganizations = await Organization.find({ _id: { $in: objectIds } }).lean();
    if (existingOrganizations.length === 0) return errorResponse(res, "Organizations don't exist", 404);

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

    return successResponse(res, "Organizations deleted successfully", { deletedCount: existingOrganizations.length });
}, "ADMIN_DELETE_ORG_ERROR");

const getOrganizationIDsOfAdmin = asyncHandler(async (req, res) => {
    let { userId } = req.user;
    userId = new mongoose.Types.ObjectId(userId);

    const existingAdmin = await Admin.findById(userId);
    if (!existingAdmin) return errorResponse(res, "Admin doesn't exist", 404);

    const organizationIds = await OrgAdmin.aggregate([
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
    ]);

    return successResponse(res, "Organization IDs fetched", organizationIds);
}, "ADMIN_GET_ORG_IDS_ERROR");

const getOrgAdmins = asyncHandler(async (req, res) => {
    const { organizationId } = req.query;

    const idValidation = validateObjectId(organizationId, "Organization ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const orgAdmin = await OrgAdmin.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) })
        .populate("primaryAdmin", "name email")
        .populate("secondaryAdmin", "name email")
        .lean();

    if (!orgAdmin) return errorResponse(res, "No admins found for this organization", 404);

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

    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

    const userIdValidation = validateObjectId(userId, "User ID");
    if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);

    const org = await Organization.findById(organizationId);
    if (!org) return errorResponse(res, "Organization not found", 404);

    const admin = await Admin.findById(userId);
    if (!admin) return errorResponse(res, "Admin not found", 404);

    const orgAdmin = await OrgAdmin.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) });
    if (!orgAdmin) return errorResponse(res, "Organization admin record not found", 404);

    if (orgAdmin.primaryAdmin.toString() === userId) {
        return errorResponse(res, "User is already the primary admin of this organization", 409);
    }
    if (orgAdmin.secondaryAdmin && orgAdmin.secondaryAdmin.toString() === userId) {
        return errorResponse(res, "User is already a secondary admin of this organization", 409);
    }

    orgAdmin.secondaryAdmin = new mongoose.Types.ObjectId(userId);
    await orgAdmin.save();

    return successResponse(res, "Admin invited successfully");
}, "ADMIN_INVITE_ADMIN_ERROR");

const removeAdmin = asyncHandler(async (req, res) => {
    const { organizationId, userId } = req.body;

    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

    const userIdValidation = validateObjectId(userId, "User ID");
    if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);

    const orgAdmin = await OrgAdmin.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) });
    if (!orgAdmin) return errorResponse(res, "Organization admin record not found", 404);

    if (orgAdmin.primaryAdmin.toString() === userId) {
        return errorResponse(res, "Cannot remove the primary admin", 400);
    }
    if (!orgAdmin.secondaryAdmin || orgAdmin.secondaryAdmin.toString() !== userId) {
        return errorResponse(res, "User is not a secondary admin of this organization", 404);
    }

    orgAdmin.secondaryAdmin = undefined;
    await orgAdmin.save();

    return successResponse(res, "Admin removed successfully");
}, "ADMIN_REMOVE_ADMIN_ERROR");

const uploadOrgLogo = asyncHandler(async (req, res) => {
    const { organizationId } = req.body;

    const idValidation = validateObjectId(organizationId, "Organization ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    if (!req.file) return errorResponse(res, "logo is required");

    const org = await Organization.findById(organizationId);
    if (!org) return errorResponse(res, "Organization not found", 404);

    if (org.logo) {
        deleteObject(process.env.ORACLE_BUCKET_ORG_LOGOS, org.logo);
    }

    const { objectName } = await uploadFile(
        process.env.ORACLE_BUCKET_ORG_LOGOS,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

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
