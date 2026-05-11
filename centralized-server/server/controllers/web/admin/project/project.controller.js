import { asyncHandler } from "#utils/async.handler.js";
import Project, { requiredProjectFields, optionalProjectFields } from "#models/Project.js";
import { pick } from "#helpers/data.reducer.js";
import Pagination from "#helpers/pagination.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { checkProjectLimit } from "#utils/plan.limits.js";
import { validateObjectId, validateString, validatePagination } from "#utils/validators.js";
import {
  checkProjectNameExists,
  buildShiftData,
  createOrUpdateShift,
  scheduleReminders,
  getManagerOrganizationId,
  buildAdminProjectsAggregation,
  buildManagerProjectsAggregation,
  getProjectWithDetails,
  validateDeleteIds,
  getAdminOrganizations,
  validateProjectDate,
} from "./helpers.js";

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

  // Validate dates
  if (data.assignedDate) {
    const assignedDateValidation = validateProjectDate(data.assignedDate, "Assigned Date");
    if (!assignedDateValidation.valid) return errorResponse(res, assignedDateValidation.error);
    data.assignedDate = assignedDateValidation.normalized;
  }

  if (data.dueDate) {
    const dueDateValidation = validateProjectDate(data.dueDate, "Due Date", { required: false });
    if (!dueDateValidation.valid) return errorResponse(res, dueDateValidation.error);
    data.dueDate = dueDateValidation.normalized;
  }

  // Check project doesn't exist
  const nameCheck = await checkProjectNameExists(data.name, data.organizationId);
  if (nameCheck.exists) return errorResponse(res, "Project already exists", 409);

  const projectLimit = await checkProjectLimit(req.user.userId);
  if (!projectLimit.allowed) return errorResponse(res, projectLimit.message, 403);

  const project = await Project.create(data);

  // Create shift if provided
  const shiftData = buildShiftData(req.body.shift, project.name);
  if (shiftData) {
    const shiftId = await createOrUpdateShift(shiftData, project.organizationId);
    project.shiftId = shiftId;
    await project.save();
    scheduleReminders(project._id);
  }

  return successResponse(res, "Project created successfully", project, 201);
}, "CREATE_PROJECT_ERROR");

export const getProjects = asyncHandler(async (req, res) => {
  let { organizationId, search = "", page = 1, limit = 10 } = req.query;

  const paginationValidation = validatePagination(page, limit);
  if (!paginationValidation.valid) return errorResponse(res, paginationValidation.error);

  page = Number(page);
  limit = Number(limit);

  // Validate organization ID if provided
  if (organizationId) {
    const orgValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgValidation.valid) return errorResponse(res, orgValidation.error);
  }

  // Get organization IDs to filter
  let organizationIds = [];
  if (organizationId) {
    organizationIds = [new mongoose.Types.ObjectId(organizationId)];
  } else {
    const orgs = await getAdminOrganizations(req.user.userId);
    if (orgs.length === 0) {
      return successResponse(res, "Projects fetched", { projects: [], totalPages: 0, totalRecords: 0 });
    }
    organizationIds = orgs;
  }

  const filter = buildAdminProjectsAggregation(search, organizationIds);

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
    organizationId = await getManagerOrganizationId(managerId);
  }

  if (!organizationId) return errorResponse(res, "Organization context missing. Please log out and back in.", 403);

  const paginationValidation = validatePagination(page, limit);
  if (!paginationValidation.valid) return errorResponse(res, paginationValidation.error);

  page = Number(page);
  limit = Number(limit);

  const filter = buildManagerProjectsAggregation(managerId, organizationId, search);

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

  const project = await getProjectWithDetails(id);
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

  // Validate and normalize name
  if (updateData.name) {
    const nameValidation = validateString(updateData.name, "Project name", { minLength: 2, maxLength: 200 });
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
    updateData.name = nameValidation.normalized;

    // Check for duplicate name
    if (updateData.name !== project.name) {
      const nameCheck = await checkProjectNameExists(updateData.name, project.organizationId, id);
      if (nameCheck.exists) return errorResponse(res, "Project with this name already exists", 409);
    }
  }

  // Validate dates
  if (updateData.assignedDate) {
    const assignedDateValidation = validateProjectDate(updateData.assignedDate, "Assigned Date");
    if (!assignedDateValidation.valid) return errorResponse(res, assignedDateValidation.error);
    updateData.assignedDate = assignedDateValidation.normalized;
  }

  if (updateData.dueDate) {
    const dueDateValidation = validateProjectDate(updateData.dueDate, "Due Date", { required: false });
    if (!dueDateValidation.valid) return errorResponse(res, dueDateValidation.error);
    updateData.dueDate = dueDateValidation.normalized;
  }

  const updatedProject = await Project.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

  // Create or update shift if provided
  const shiftData = buildShiftData(req.body.shift, updatedProject.name);
  if (shiftData) {
    await createOrUpdateShift(shiftData, updatedProject.organizationId, project.shiftId, id);
    scheduleReminders(id);
  }

  return successResponse(res, "Project updated successfully", updatedProject);
}, "UPDATE_PROJECT_ERROR");

export const deleteProject = asyncHandler(async (req, res) => {
  const { data: ids } = req.body;

  const validationResult = await validateDeleteIds(ids);
  if (!validationResult.valid) return errorResponse(res, validationResult.error);

  const result = await Project.deleteMany({ _id: { $in: validationResult.objectIds } });
  return successResponse(res, "Projects deleted successfully", { deletedCount: result.deletedCount });
}, "DELETE_PROJECT_ERROR");
