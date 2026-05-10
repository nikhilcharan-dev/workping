import TeamMembership from "#models/TeamMembership.js";
import Team from "#models/Team.js";
import Pagination from "#helpers/pagination.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateRequiredFields } from "#utils/validators.js";

export const addTeamMemberToTeam = asyncHandler(async (req, res) => {
  // Accept both `members` (frontend key) and `userIds` (legacy) for the employee list
  // Accept both `orgId` (frontend key) and `organizationId` (legacy) for the org
  const { userIds: rawUserIds, members, teamId, organizationId: rawOrgId, orgId } = req.body;
  const userIds = rawUserIds || members;

  if (!teamId) return errorResponse(res, "teamId is required");
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return errorResponse(res, "members/userIds must be a non-empty array");
  }

  const teamIdValidation = validateObjectId(teamId, "Team ID");
  if (!teamIdValidation.valid) return errorResponse(res, teamIdValidation.error);

  // organizationId is optional — derive from team if not supplied
  let organizationId = rawOrgId || orgId;
  if (!organizationId) {
    const team = await Team.findById(teamId).lean();
    if (!team) return errorResponse(res, "Team not found", 404);
    organizationId = team.organizationId.toString();
  }

  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  for (const userId of userIds) {
    const userIdValidation = validateObjectId(userId, "User ID");
    if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);
  }

  const existingMemberships = await TeamMembership.find({
    userId: { $in: userIds },
  });

  const membershipsToInsert = [];
  const failedInsertions = [];

  for (const userId of userIds) {
    const userMemberships = existingMemberships.filter((m) => m.userId.toString() === userId.toString());

    const inOtherTeam = userMemberships.some((m) => m.teamId.toString() !== teamId.toString());
    const inCurrentTeam = userMemberships.find((m) => m.teamId.toString() === teamId.toString());

    if (inCurrentTeam) {
      // Do nothing, user is already in this team
    } else if (inOtherTeam) {
      failedInsertions.push({
        id: userId.toString(),
        error: "User is already assigned to another team",
      });
    } else {
      membershipsToInsert.push({
        userId,
        teamId,
        organizationId,
      });
    }
  }

  let insertedMemberships = [];
  if (membershipsToInsert.length > 0) {
    insertedMemberships = await TeamMembership.insertMany(membershipsToInsert);
  }

  const successCount = membershipsToInsert.length;
  const failedCount = failedInsertions.length;

  return successResponse(res, "Team members processed successfully", {
    successCount,
    failedCount,
    addedCount: membershipsToInsert.length,
    membershipIds: insertedMemberships.map((m) => m._id),
    failedInsertions,
  });
}, "ADMIN_ADD_TEAM_MEMBER_ERROR");

export const removeTeamMemberFromTeam = asyncHandler(async (req, res) => {
  const { membershipIds } = req.body;

  if (!Array.isArray(membershipIds) || membershipIds.length === 0) {
    return errorResponse(res, "membershipIds must be a non-empty array");
  }

  for (const membershipId of membershipIds) {
    const idValidation = validateObjectId(membershipId, "Membership ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
  }

  const result = await TeamMembership.deleteMany({
    _id: { $in: membershipIds },
  });

  if (result.deletedCount === 0) return errorResponse(res, "No memberships found with given ids", 404);

  return successResponse(res, "Users removed from team successfully", { removedCount: result.deletedCount });
}, "ADMIN_REMOVE_TEAM_MEMBER_ERROR");

export const getTeamMembers = asyncHandler(async (req, res) => {
  let { teamId, projectId, page = 1, limit = 20, search = "", organizationId } = req.query;

  const matchStage = {};

  if (teamId) teamId = String(teamId).trim();
  if (organizationId) organizationId = String(organizationId).trim();
  if (projectId === "null" || projectId === "undefined" || projectId === "") projectId = undefined;
  if (search === "null" || search === "undefined") search = "";

  if (teamId && teamId !== "undefined" && teamId !== "null") {
    const idValidation = validateObjectId(teamId, "Team ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
    matchStage.teamId = new mongoose.Types.ObjectId(teamId);
  }
  if (organizationId && organizationId !== "undefined" && organizationId !== "null" && organizationId !== "") {
    const idValidation = validateObjectId(organizationId, "Organization ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
    matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, phone: 1, employeeId: 1, isActive: 1, workType: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "organizations",
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pipeline.push({
      $match: {
        $or: [
          { "user.name": { $regex: escaped, $options: "i" } },
          { "user.email": { $regex: escaped, $options: "i" } },
        ],
      },
    });
  }

  // projectId filter: find users who are members of the given project
  if (projectId) {
    const idValidation = validateObjectId(projectId, "Project ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    pipeline.push({
      $lookup: {
        from: "projectmembers",
        let: { uid: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$userId", "$$uid"] }, { $eq: ["$projectId", new mongoose.Types.ObjectId(projectId)] }],
              },
            },
          },
        ],
        as: "projectMembership",
      },
    });
    pipeline.push({ $match: { "projectMembership.0": { $exists: true } } });
  }

  const pagination = await Pagination(TeamMembership, page, limit, pipeline);

  return successResponse(res, "Team members fetched", {
    members: pagination.documents.map((m) => ({
      ...m,
      organizationName: m.organization?.name || null,
    })),
    totalPages: pagination.totalPages,
    totalRecords: pagination.totalRecords,
  });
}, "ADMIN_GET_TEAM_MEMBERS_ERROR");

export const getUserTeams = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  const idValidation = validateObjectId(userId, "User ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const teamsList = await TeamMembership.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "teams",
        localField: "teamId",
        foreignField: "_id",
        pipeline: [{ $project: { teamName: 1, description: 1 } }],
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
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
      $addFields: {
        organizationName: "$organization.name",
      },
    },
    { $project: { organization: 0 } },
  ]);

  return successResponse(res, "User teams fetched", teamsList);
}, "ADMIN_GET_USER_TEAMS_ERROR");

export const getEligibleEmployeesForTeam = asyncHandler(async (req, res) => {
  const { teamId, organizationId, search = "", page = 1, limit = 20 } = req.query;

  if (!organizationId) return errorResponse(res, "organizationId is required");

  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  // Find all users already in any team
  const assignedUserIds = await TeamMembership.distinct("userId");

  const filter = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    _id: { $nin: assignedUserIds },
    isActive: true,
  };

  if (search.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } },
      { employeeId: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, totalRecords] = await Promise.all([
    User.find(filter).select("name email employeeId workType profileImage").skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(filter),
  ]);

  return successResponse(res, "Eligible employees fetched", {
    users,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
  });
}, "ADMIN_GET_ELIGIBLE_TEAM_MEMBERS_ERROR");
