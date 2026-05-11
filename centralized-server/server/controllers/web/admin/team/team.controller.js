import { asyncHandler } from "#utils/async.handler.js";
import Organization from "#models/Organization.js";
import User from "#models/User.js";
import Team from "#models/Team.js";
import AdminOrg from "#models/Admin.Org.js";
import TeamMembership from "#models/TeamMembership.js";
import mongoose from "mongoose";
import pagination from "#helpers/pagination.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { checkTeamLimit } from "#utils/plan.limits.js";
import { validateObjectId, validateString, validateRequiredFields, validatePagination } from "#utils/validators.js";

// ============================================================================
// HELPER FUNCTIONS - Validation
// ============================================================================

const validateTeamCreationInput = async (teamName, organizationId, managerId, leaderIds) => {
  // Validate team name
  const nameValidation = validateString(teamName, "Team name", {
    minLength: 2,
    maxLength: 100,
  });
  if (!nameValidation.valid) return { valid: false, error: nameValidation.error };

  // Validate organization ID
  const orgValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgValidation.valid) return { valid: false, error: orgValidation.error };

  // Validate manager ID if provided
  if (managerId) {
    const managerValidation = validateObjectId(managerId, "Manager ID");
    if (!managerValidation.valid) return { valid: false, error: managerValidation.error };
  }

  // Validate and clean leader IDs
  let cleanedLeaderIds = [];
  if (leaderIds) {
    if (!Array.isArray(leaderIds)) {
      return { valid: false, error: "teamLeaderIds must be an array" };
    }
    for (const leaderId of leaderIds) {
      const leaderValidation = validateObjectId(leaderId, "Leader ID");
      if (!leaderValidation.valid) return { valid: false, error: leaderValidation.error };
    }
    cleanedLeaderIds = [...new Set(leaderIds)];
    if (managerId && cleanedLeaderIds.includes(managerId)) {
      return { valid: false, error: "Team manager cannot be added as a team leader" };
    }
  }

  return { valid: true, nameValidation, cleanedLeaderIds };
};

const validateTeamNameUniqueness = async (teamName, organizationId) => {
  const teamExists = await Team.findOne({
    teamName,
    organizationId,
  });
  return !teamExists;
};

// ============================================================================
// HELPER FUNCTIONS - Team Data Building
// ============================================================================

const buildTeamData = async (teamName, organizationId, managerId, leaderIds, description) => {
  const detailObject = {
    teamName,
    managerId: managerId || null,
    leaderIds: leaderIds || [],
    organizationId,
  };

  if (description !== undefined && description !== null) {
    const descValidation = validateString(description, "Description", { maxLength: 500 });
    if (!descValidation.valid) return { valid: false, error: descValidation.error };
    detailObject.description = descValidation.normalized;
  }

  return { valid: true, data: detailObject };
};

// ============================================================================
// HELPER FUNCTIONS - Team Member Processing
// ============================================================================

const processTeamMembers = async (createdTeam, managerId, leaderIds, organizationId) => {
  const usersToProcess = [];
  if (managerId) {
    usersToProcess.push({ userId: managerId, role: "manager" });
  }
  if (leaderIds && leaderIds.length > 0) {
    for (const leaderId of leaderIds) {
      usersToProcess.push({ userId: leaderId, role: "teamLead" });
    }
  }

  if (usersToProcess.length === 0) {
    return { successCount: 0, failedInsertions: [] };
  }

  const userIds = usersToProcess.map((u) => u.userId);
  const existingMemberships = await TeamMembership.find({ userId: { $in: userIds } });

  const membershipsToInsert = [];
  const managerIdsToUpdate = [];
  const teamLeadIdsToUpdate = [];
  const failedInsertions = [];

  for (const user of usersToProcess) {
    const userMemberships = existingMemberships.filter((m) => m.userId.toString() === user.userId.toString());
    const inOtherTeam = userMemberships.length > 0;

    if (!inOtherTeam) {
      membershipsToInsert.push({
        userId: user.userId,
        teamId: createdTeam._id,
        organizationId,
      });

      if (user.role === "manager") managerIdsToUpdate.push(user.userId);
      else if (user.role === "teamLead") teamLeadIdsToUpdate.push(user.userId);
    } else {
      failedInsertions.push({
        id: user.userId.toString(),
        error: "User is already assigned to another team",
      });
    }
  }

  if (membershipsToInsert.length > 0) {
    await TeamMembership.insertMany(membershipsToInsert);

    if (managerIdsToUpdate.length > 0) {
      await User.updateMany({ _id: { $in: managerIdsToUpdate } }, { $set: { role: "manager" } });
    }
    if (teamLeadIdsToUpdate.length > 0) {
      await User.updateMany({ _id: { $in: teamLeadIdsToUpdate } }, { $set: { role: "teamLead" } });
    }
  }

  return { successCount: membershipsToInsert.length, failedInsertions };
};

// ============================================================================
// HELPER FUNCTIONS - Aggregation Pipelines
// ============================================================================

const buildTeamDetailsPipeline = (includeProfileImage = false) => {
  const projection = { employeeId: 1, name: 1, email: 1, workType: 1 };
  if (includeProfileImage) projection.profileImage = 1;

  return [
    {
      $lookup: {
        from: "users",
        localField: "managerId",
        foreignField: "_id",
        pipeline: [{ $project: projection }],
        as: "manager",
      },
    },
    { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "leaderIds",
        foreignField: "_id",
        pipeline: [{ $project: projection }],
        as: "leaders",
      },
    },
  ];
};

const buildTeamListPipeline = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "managerId",
        foreignField: "_id",
        pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1 } }],
        as: "manager",
      },
    },
    { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "leaderIds",
        foreignField: "_id",
        pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1 } }],
        as: "leaders",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "teamId",
        as: "members",
      },
    },
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
        memberCount: { $size: "$members" },
        organizationName: { $ifNull: ["$organization.name", null] },
      },
    },
    {
      $project: {
        members: 0,
        organization: 0,
      },
    },
  ];
};

const buildPaginationFilter = async (organizationId, search, adminId) => {
  const thefilter = [];
  const orgList = [];

  if (organizationId) {
    const orgValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgValidation.valid) return { valid: false, error: orgValidation.error };
    orgList.push(new mongoose.Types.ObjectId(organizationId));
  } else {
    const orgs = await AdminOrg.find({ primaryAdmin: adminId }).select("organizationId");
    orgList.push(...orgs.map((org) => org.organizationId));
  }

  thefilter.push({ $match: { organizationId: { $in: orgList } } });

  if (search?.trim()) {
    thefilter.push({
      $match: {
        teamName: {
          $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      },
    });
  }

  thefilter.push(...buildTeamListPipeline());
  return { valid: true, filter: thefilter };
};

const buildManagerTeamsFilter = (managerId, organizationId, search) => {
  let filter = [
    {
      $match: {
        managerId: new mongoose.Types.ObjectId(managerId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
    },
  ];

  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.push({ $match: { teamName: { $regex: escaped, $options: "i" } } });
  }

  filter.push(...buildTeamListPipeline());
  return filter;
};

export const createTeam = asyncHandler(async (req, res) => {
  const { teamName, teamManagerId: managerId, description, teamLeaderIds: leaderIds, organizationId } = req.body;

  // Validate required fields
  const requiredCheck = validateRequiredFields({ teamName, organizationId }, ["teamName", "organizationId"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  // Validate input
  const inputValidation = await validateTeamCreationInput(teamName, organizationId, managerId, leaderIds);
  if (!inputValidation.valid) return errorResponse(res, inputValidation.error);

  // Check team name uniqueness
  const isUnique = await validateTeamNameUniqueness(inputValidation.nameValidation.normalized, organizationId);
  if (!isUnique) return errorResponse(res, "Team name already exists in this organization", 409);

  // Check team creation limit
  const teamLimit = await checkTeamLimit(req.user.userId);
  if (!teamLimit.allowed) return errorResponse(res, teamLimit.message, 403);

  // Build team data
  const teamDataResult = await buildTeamData(
    inputValidation.nameValidation.normalized,
    organizationId,
    managerId,
    inputValidation.cleanedLeaderIds,
    description
  );
  if (!teamDataResult.valid) return errorResponse(res, teamDataResult.error);

  // Create team
  const createdTeam = await Team.create(teamDataResult.data);

  // Process team members
  const memberResult = await processTeamMembers(createdTeam, managerId, inputValidation.cleanedLeaderIds, organizationId);

  return successResponse(
    res,
    "Team added successfully",
    {
      ...teamDataResult.data,
      teamId: createdTeam._id,
      successCount: memberResult.successCount,
      failedCount: memberResult.failedInsertions.length,
      failedInsertions: memberResult.failedInsertions,
    },
    201
  );
}, "ADMIN_CREATE_TEAM_ERROR");

export const getTeam = asyncHandler(async (req, res) => {
  const { id: teamId } = req.params;

  // Validate team ID
  const idValidation = validateObjectId(teamId, "Team ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  // Fetch team with details
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(teamId) } },
    ...buildTeamDetailsPipeline(true),
    {
      $addFields: {
        teamManagerId: "$managerId",
        teamLeaderId: { $arrayElemAt: ["$leaderIds", 0] },
      },
    },
  ];

  const [team] = await Team.aggregate(pipeline);

  if (!team) return errorResponse(res, "Team does not exist with given id", 404);
  return successResponse(res, "Team fetched", team);
}, "ADMIN_GET_TEAM_ERROR");

export const getAllTeams = asyncHandler(async (req, res) => {
  const { organizationId } = req.body;

  // Validate organization ID
  const idValidation = validateObjectId(organizationId, "Organization ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  // Fetch teams with details
  const pipeline = [
    { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
    ...buildTeamListPipeline(),
  ];

  const teamList = await Team.aggregate(pipeline);

  return successResponse(res, "Teams fetched", teamList);
}, "ADMIN_GET_TEAMS_ERROR");

export const getTeamsPagination = asyncHandler(async (req, res) => {
  const { organizationId, page = 1, limit = 10, search = "" } = req.query;

  const adminId = req.user.userId;

  // Build pagination filter
  const filterResult = await buildPaginationFilter(organizationId, search, adminId);
  if (!filterResult.valid) return errorResponse(res, filterResult.error);

  // Fetch paginated results
  const results = await pagination(Team, page, limit, filterResult.filter);
  return successResponse(res, "Teams fetched", {
    teamList: results.documents,
    totalRecords: results.totalRecords,
    totalPages: results.totalPages,
  });
}, "GET_TEAMS_PAGINATION_ERROR");

export const updateTeam = asyncHandler(async (req, res) => {
  const { teamId, teamName, description, managerId, leaderIds } = req.body;

  // Validate team ID
  const idValidation = validateObjectId(teamId, "Team ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  // Verify team exists
  const team = await Team.findById(teamId);
  if (!team) return errorResponse(res, "Team not found", 404);

  const updateData = {};

  // Validate and set team name
  if (teamName !== undefined) {
    const nameValidation = validateString(teamName, "Team name", { minLength: 2, maxLength: 100 });
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
    updateData.teamName = nameValidation.normalized;
  }

  // Validate and set description
  if (description !== undefined) {
    const descValidation = validateString(description, "Description", { maxLength: 500 });
    if (!descValidation.valid) return errorResponse(res, descValidation.error);
    updateData.description = descValidation.normalized;
  }

  // Validate and set manager ID
  if (managerId !== undefined) {
    if (managerId !== null) {
      const managerValidation = validateObjectId(managerId, "Manager ID");
      if (!managerValidation.valid) return errorResponse(res, managerValidation.error);
    }
    updateData.managerId = managerId;
  }

  // Validate and set leader IDs
  if (leaderIds !== undefined) {
    if (!Array.isArray(leaderIds)) return errorResponse(res, "leaderIds must be an array");
    for (const id of leaderIds) {
      const v = validateObjectId(id, "Leader ID");
      if (!v.valid) return errorResponse(res, v.error);
    }
    updateData.leaderIds = [...new Set(leaderIds)];
  }

  // Ensure at least one field is being updated
  if (Object.keys(updateData).length === 0) return errorResponse(res, "No valid fields to update");

  // Apply updates
  const updater = await Team.findByIdAndUpdate(teamId, updateData, { new: true, runValidators: true });
  return successResponse(res, "Team details updated", updater);
}, "ADMIN_UPDATE_TEAM_ERROR");

export const deleteTeam = asyncHandler(async (req, res) => {
  const { data: teamIds } = req.body;

  // Validate input
  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return errorResponse(res, "teamIds must be a non-empty array");
  }

  // Validate all team IDs
  for (const teamId of teamIds) {
    const idValidation = validateObjectId(teamId, "Team ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
  }

  // Delete teams
  const result = await Team.deleteMany({ _id: { $in: teamIds } });

  if (result.deletedCount === 0) return errorResponse(res, "No matching teams found to delete", 404);

  return successResponse(res, `${result.deletedCount} team(s) deleted`, { deletedCount: result.deletedCount });
}, "ADMIN_DELETE_TEAM_ERROR");

export const getManagerTeams = asyncHandler(async (req, res) => {
  let { search = "", page = 1, limit = 10 } = req.query;
  let { userId: managerId, organizationId } = req.user;

  // Fallback if JWT is stale and doesn't contain organizationId
  if (!organizationId) {
    const User = mongoose.model("User");
    const userRec = await User.findById(managerId).select("organizationId").lean();
    organizationId = userRec?.organizationId;
  }

  if (!organizationId) return errorResponse(res, "Organization context missing. Please log out and back in.", 403);

  // Validate pagination
  const paginationValidation = validatePagination(page, limit);
  if (!paginationValidation.valid) return errorResponse(res, paginationValidation.error);

  page = Number(page);
  limit = Number(limit);

  // Build filter for manager teams
  const filter = buildManagerTeamsFilter(managerId, organizationId, search);

  // Fetch paginated results
  const results = await pagination(Team, page, limit, filter);
  return successResponse(res, "Manager teams fetched", {
    teamList: results.documents,
    totalRecords: results.totalRecords,
    totalPages: results.totalPages,
  });
}, "GET_MANAGER_TEAMS_ERROR");
