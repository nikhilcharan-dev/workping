import Project from "#models/Project.js";
import ProjectMember from "#models/ProjectMember.js";
import mongoose from "mongoose";
import Pagination from "#helpers/pagination.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateEnum } from "#utils/validators.js";

// Shared pipeline stage: join ProjectTeam and compute project-specific role.
// Expects the current document to have projectId and userId fields.
const projectRoleStage = [
  {
    $lookup: {
      from: "projectteams",
      let: { pid: "$projectId", uid: "$userId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$projectId", "$$pid"] } } },
        {
          $project: {
            isManager: { $eq: ["$teamManagerId", "$$uid"] },
            isLead: { $eq: ["$teamLeaderId", "$$uid"] },
            isEmployee: { $in: ["$$uid", { $ifNull: ["$users", []] }] },
          },
        },
      ],
      as: "_teamRole",
    },
  },
  { $unwind: { path: "$_teamRole", preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      projectRole: {
        $cond: [
          { $eq: ["$_teamRole.isManager", true] },
          "manager",
          { $cond: [{ $eq: ["$_teamRole.isLead", true] }, "teamLead", "employee"] },
        ],
      },
    },
  },
  { $project: { _teamRole: 0 } },
];

export const getMyProjects = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  let { page = 1, limit = 10, status } = req.query;

  if (status) {
    const statusValidation = validateEnum(status, ["active", "completed", "onHold"], "Status");
    if (!statusValidation.valid) return errorResponse(res, statusValidation.error);
  }

  const filter = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $lookup: {
        from: "projects",
        localField: "projectId",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: "$project" },
    // Derive project-specific role from ProjectTeam
    ...projectRoleStage,
  ];

  if (status) filter.push({ $match: { "project.status": status } });
  filter.push({ $sort: { "project.createdAt": -1 } });

  const pagination = await Pagination(ProjectMember, page, limit, filter);

  return successResponse(res, "Projects fetched", {
    totalRecords: pagination.totalRecords,
    totalPages: pagination.totalPages,
    projects: pagination.documents,
  });
}, "USER_GET_MY_PROJECTS_ERROR");

export const getProjectById = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { projectId } = req.params;

  const idValidation = validateObjectId(projectId, "Project ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const membership = await ProjectMember.findOne({ projectId, userId, isActive: true });
  if (!membership) return errorResponse(res, "You are not a member of this project", 403);

  const projectObjId = new mongoose.Types.ObjectId(projectId);

  const [project, members] = await Promise.all([
    // Project with populated manager + organisation + shift
    Project.aggregate([
      { $match: { _id: projectObjId } },
      {
        $lookup: {
          from: "users",
          localField: "projectManager",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1, phone: 1, profileImage: 1, employeeId: 1, workType: 1 } }],
          as: "projectManager",
        },
      },
      { $unwind: { path: "$projectManager", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "organizations",
          localField: "organizationId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "organization",
        },
      },
      { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "shifts",
          localField: "shiftId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, startTime: 1, endTime: 1, breakMinutes: 1 } }],
          as: "shift",
        },
      },
      { $unwind: { path: "$shift", preserveNullAndEmptyArrays: true } },
    ]).then((r) => r[0]),

    // Members with contact info + project-specific role from ProjectTeam
    ProjectMember.aggregate([
      { $match: { projectId: projectObjId, isActive: true } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1, phone: 1, profileImage: 1, employeeId: 1, workType: 1 } }],
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // Derive project-specific role
      ...projectRoleStage,
      // Sort: manager → teamLead → employee → alpha
      {
        $addFields: {
          _sortOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$projectRole", "manager"] }, then: 0 },
                { case: { $eq: ["$projectRole", "teamLead"] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: { _sortOrder: 1, "user.name": 1 } },
      { $project: { _sortOrder: 0 } },
    ]),
  ]);

  if (!project) return errorResponse(res, "Project not found", 404);

  return successResponse(res, "Project fetched", { project, members });
}, "USER_GET_PROJECT_BY_ID_ERROR");

export const getProjectMembers = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { projectId } = req.params;

  const idValidation = validateObjectId(projectId, "Project ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const membership = await ProjectMember.findOne({ projectId, userId, isActive: true });
  if (!membership) return errorResponse(res, "You are not a member of this project", 403);

  const projectObjId = new mongoose.Types.ObjectId(projectId);

  const members = await ProjectMember.aggregate([
    { $match: { projectId: projectObjId, isActive: true } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, phone: 1, profileImage: 1, employeeId: 1, workType: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ...projectRoleStage,
  ]);

  return successResponse(res, "Project members fetched", members);
}, "USER_GET_PROJECT_MEMBERS_ERROR");
