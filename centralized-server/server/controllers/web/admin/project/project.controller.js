import Project, { requiredProjectFields, optionalProjectFields } from "#models/Project.js";
import User from "#models/User.js";
import Shift from "#models/Shift.js";
import { pick } from "#helpers/data.reducer.js";
import Pagination from "#helpers/pagination.js";
import OrgAdmin from "#models/Admin.Org.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { checkProjectLimit } from "#utils/plan.limits.js";
import { validateObjectId, validateString, validatePagination, validateDate } from "#utils/validators.js";
import { scheduleShiftReminders } from "#services/shiftReminder/shiftReminder.cron.js";

export const createProject = asyncHandler(async (req, res) => {
    const requiredData = pick(req.body, requiredProjectFields);

    if (Object.keys(requiredData).length !== requiredProjectFields.length) {
        return errorResponse(res, "Missing required fields");
    }

    const data = {
        ...requiredData,
        ...pick(req.body, optionalProjectFields),
    };

    if (data.name) data.name = String(data.name).trim();

    if (data.assignedDate) {
        const assignedDateValidation = validateDate(data.assignedDate, "Assigned Date");
        if (!assignedDateValidation.valid) return errorResponse(res, assignedDateValidation.error);
        data.assignedDate = assignedDateValidation.normalized;
    }

    if (data.dueDate) {
        const dueDateValidation = validateDate(data.dueDate, "Due Date", { required: false });
        if (!dueDateValidation.valid) return errorResponse(res, dueDateValidation.error);
        data.dueDate = dueDateValidation.normalized;
    }

    const isExisting = await Project.findOne({ name: data.name, organizationId: data.organizationId });
    if (isExisting) return errorResponse(res, "Project already exists", 409);

    const projectLimit = await checkProjectLimit(req.user.userId);
    if (!projectLimit.allowed) return errorResponse(res, projectLimit.message, 403);

    const project = await Project.create(data);

    // Create owned shift inline if provided
    const s = req.body.shift;
    if (s?.startTime && s?.endTime) {
        const shift = await Shift.create({
            name: `${project.name} Shift`,
            startTime: s.startTime,
            endTime: s.endTime,
            ...(s.slotEnd && { slotEnd: s.slotEnd }),
            ...(s.slotStart && { slotStart: s.slotStart }),
            breakMinutes: s.breakMinutes ? Number(s.breakMinutes) : 60,
            organizationId: project.organizationId,
        });
        project.shiftId = shift._id;
        await project.save();

        // Schedule today's reminders for existing project members (fire-and-forget)
        scheduleShiftReminders(undefined, String(project._id)).catch((err) =>
            console.error("[ShiftReminder] createProject schedule failed:", err.message)
        );
    }

    return successResponse(res, "Project created successfully", project, 201);
}, "CREATE_PROJECT_ERROR");

export const getProjects = asyncHandler(async (req, res) => {
    let { organizationId, search = "", page = 1, limit = 10 } = req.query;

    const paginationValidation = validatePagination(page, limit);
    if (!paginationValidation.valid) return errorResponse(res, paginationValidation.error);

    page = Number(page);
    limit = Number(limit);

    let filter = [];

    if (search) {
        search = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.push({ $match: { name: { $regex: search, $options: "i" } } });
    }

    if (organizationId) {
        const orgValidation = validateObjectId(organizationId, "Organization ID");
        if (!orgValidation.valid) return errorResponse(res, orgValidation.error);
        filter.push({ $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } });
    } else {
        const orgAdmins = await OrgAdmin.find({ primaryAdmin: req.user.userId }, { organizationId: 1 });
        const organizationIds = orgAdmins.map((org) => org.organizationId);

        if (organizationIds.length === 0) {
            return successResponse(res, "Projects fetched", { projects: [], totalPages: 0, totalRecords: 0 });
        }
        filter.push({ $match: { organizationId: { $in: organizationIds } } });
    }

    filter.push({
        $lookup: { from: "organizations", localField: "organizationId", foreignField: "_id", as: "organization" },
    });
    filter.push({
        $lookup: { from: "users", localField: "projectManager", foreignField: "_id", as: "manager" },
    });
    filter.push({
        $lookup: { from: "projectmembers", localField: "_id", foreignField: "projectId", as: "members" },
    });
    filter.push({
        $addFields: {
            organizationName: { $arrayElemAt: ["$organization.name", 0] },
            projectManagerName: { $arrayElemAt: ["$manager.name", 0] },
            memberCount: { $size: "$members" },
            assignedDate: { $dateToString: { format: "%Y-%m-%d", date: "$assignedDate" } },
            dueDate: {
                $cond: {
                    if: "$dueDate",
                    then: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
                    else: null,
                },
            },
        },
    });
    filter.push({ $project: { members: 0, manager: 0, organization: 0 } });

    const pagination = await Pagination(Project, page, limit, filter);
    return successResponse(res, "Projects fetched", {
        projects: pagination.documents,
        totalPages: pagination.totalPages,
        totalRecords: pagination.totalRecords,
    });
}, "GET_PROJECTS_ERROR");

export const getManagerProjects = asyncHandler(async (req, res) => {
    let { search = "", page = 1, limit = 10 } = req.query;
    let { userId: managerId, organizationId } = req.user;

    // Fallback if JWT is stale and doesn't contain organizationId
    if (!organizationId) {
        const User = mongoose.model("User");
        const userRec = await User.findById(managerId).select("organizationId").lean();
        organizationId = userRec?.organizationId;
    }

    if (!organizationId) return errorResponse(res, "Organization context missing. Please log out and back in.", 403);

    const paginationValidation = validatePagination(page, limit);
    if (!paginationValidation.valid) return errorResponse(res, paginationValidation.error);

    page = Number(page);
    limit = Number(limit);

    let filter = [
        {
            $lookup: {
                from: "projectteams",
                localField: "_id",
                foreignField: "projectId",
                as: "associatedTeams",
            },
        },
        {
            $match: {
                organizationId: new mongoose.Types.ObjectId(organizationId),
                $or: [
                    { projectManager: new mongoose.Types.ObjectId(managerId) },
                    { "associatedTeams.teamManagerId": new mongoose.Types.ObjectId(managerId) },
                ],
            },
        },
    ];

    if (search) {
        search = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.push({ $match: { name: { $regex: search, $options: "i" } } });
    }

    filter.push({
        $lookup: { from: "organizations", localField: "organizationId", foreignField: "_id", as: "organization" },
    });
    filter.push({
        $lookup: { from: "projectmembers", localField: "_id", foreignField: "projectId", as: "members" },
    });
    filter.push({
        $addFields: {
            organizationName: { $arrayElemAt: ["$organization.name", 0] },
            memberCount: { $size: "$members" },
            assignedDate: { $dateToString: { format: "%Y-%m-%d", date: "$assignedDate" } },
            dueDate: {
                $cond: {
                    if: "$dueDate",
                    then: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
                    else: null,
                },
            },
        },
    });
    filter.push({ $project: { members: 0, organization: 0 } });

    const pagination = await Pagination(Project, page, limit, filter);
    return successResponse(res, "Manager projects fetched", {
        projects: pagination.documents,
        totalPages: pagination.totalPages,
        totalRecords: pagination.totalRecords,
    });
}, "GET_MANAGER_PROJECTS_ERROR");

export const getProject = asyncHandler(async (req, res) => {
    const { projectId: id } = req.query;

    const idValidation = validateObjectId(id, "Project ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const [project] = await Project.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
            $lookup: {
                from: "users",
                localField: "projectManager",
                foreignField: "_id",
                pipeline: [{ $project: { name: 1, employeeId: 1, email: 1, workType: 1, profileImage: 1 } }],
                as: "projectManagerInfo",
            },
        },
        { $unwind: { path: "$projectManagerInfo", preserveNullAndEmptyArrays: true } },
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
                from: "shifts",
                localField: "shiftId",
                foreignField: "_id",
                pipeline: [
                    { $project: { name: 1, startTime: 1, endTime: 1, slotStart: 1, slotEnd: 1, breakMinutes: 1 } },
                ],
                as: "shiftData",
            },
        },
        { $unwind: { path: "$shiftData", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                projectManagerName: { $ifNull: ["$projectManagerInfo.name", null] },
                organizationName: { $ifNull: ["$organization.name", null] },
                assignedDate: { $dateToString: { format: "%Y-%m-%d", date: "$assignedDate" } },
                dueDate: {
                    $cond: {
                        if: "$dueDate",
                        then: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
                        else: null,
                    },
                },
            },
        },
        { $project: { projectManagerInfo: 0, organization: 0 } },
    ]);

    if (!project) return errorResponse(res, "Project not found", 404);
    return successResponse(res, "Project fetched", project);
}, "GET_PROJECT_ERROR");

export const updateProject = asyncHandler(async (req, res) => {
    const { id } = req.body;

    const idValidation = validateObjectId(id, "Project ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const project = await Project.findById(id);
    if (!project) return errorResponse(res, "Project not found", 404);

    // Security: Check if manager has authority over this project
    if (req.user.role === "manager" && String(project.projectManager) !== String(req.user.userId)) {
        return errorResponse(res, "Forbidden: You cannot update a project you don't manage", 403);
    }

    const updateData = pick(req.body, [...requiredProjectFields, ...optionalProjectFields]);

    if (updateData.name) {
        const nameValidation = validateString(updateData.name, "Project name", { minLength: 2, maxLength: 200 });
        if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
        updateData.name = nameValidation.normalized;
    }

    if (updateData.name && updateData.name !== project.name) {
        const isExisting = await Project.findOne({
            name: updateData.name,
            organizationId: project.organizationId,
            _id: { $ne: id },
        });
        if (isExisting) return errorResponse(res, "Project with this name already exists", 409);
    }

    if (updateData.assignedDate) {
        const assignedDateValidation = validateDate(updateData.assignedDate, "Assigned Date");
        if (!assignedDateValidation.valid) return errorResponse(res, assignedDateValidation.error);
        updateData.assignedDate = assignedDateValidation.normalized;
    }

    if (updateData.dueDate) {
        const dueDateValidation = validateDate(updateData.dueDate, "Due Date", { required: false });
        if (!dueDateValidation.valid) return errorResponse(res, dueDateValidation.error);
        updateData.dueDate = dueDateValidation.normalized;
    }

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    // Create or update owned shift inline
    const s = req.body.shift;
    if (s?.startTime && s?.endTime) {
        const shiftData = {
            name: `${updatedProject.name} Shift`,
            startTime: s.startTime,
            endTime: s.endTime,
            slotEnd: s.slotEnd || undefined,
            slotStart: s.slotStart || undefined,
            breakMinutes: s.breakMinutes ? Number(s.breakMinutes) : 60,
        };
        if (project.shiftId) {
            await Shift.findByIdAndUpdate(project.shiftId, shiftData);
        } else {
            const shift = await Shift.create({ ...shiftData, organizationId: updatedProject.organizationId });
            await Project.findByIdAndUpdate(id, { shiftId: shift._id });
        }

        // Reschedule today's reminders with updated shift times (fire-and-forget)
        scheduleShiftReminders(undefined, String(id)).catch((err) =>
            console.error("[ShiftReminder] updateProject reschedule failed:", err.message)
        );
    }

    return successResponse(res, "Project updated successfully", updatedProject);
}, "UPDATE_PROJECT_ERROR");

export const deleteProject = asyncHandler(async (req, res) => {
    const { data: ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return errorResponse(res, "ids must be a non-empty array");
    }

    for (const id of ids) {
        const idValidation = validateObjectId(id, "Project ID");
        if (!idValidation.valid) return errorResponse(res, idValidation.error);
    }

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const result = await Project.deleteMany({ _id: { $in: objectIds } });
    return successResponse(res, "Projects deleted successfully", { deletedCount: result.deletedCount });
}, "DELETE_PROJECT_ERROR");
