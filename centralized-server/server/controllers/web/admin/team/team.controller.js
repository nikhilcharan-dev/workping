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

export const createTeam = asyncHandler(async (req, res) => {
  const { teamName, teamManagerId: managerId, description, teamLeaderIds: leaderIds, organizationId } = req.body;

  const requiredCheck = validateRequiredFields({ teamName, organizationId }, ["teamName", "organizationId"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const nameValidation = validateString(teamName, "Team name", {
    minLength: 2,
    maxLength: 100,
  });
  if (!nameValidation.valid) return errorResponse(res, nameValidation.error);

  const orgValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgValidation.valid) return errorResponse(res, orgValidation.error);

  if (managerId) {
    const managerValidation = validateObjectId(managerId, "Manager ID");
    if (!managerValidation.valid) return errorResponse(res, managerValidation.error);
  }

  let cleanedLeaderIds = [];
  if (leaderIds) {
    if (!Array.isArray(leaderIds)) {
      return errorResponse(res, "teamLeaderIds must be an array");
    }
    for (const leaderId of leaderIds) {
      const leaderValidation = validateObjectId(leaderId, "Leader ID");
      if (!leaderValidation.valid) return errorResponse(res, leaderValidation.error);
    }
    cleanedLeaderIds = [...new Set(leaderIds)];
    if (managerId && cleanedLeaderIds.includes(managerId)) {
      return errorResponse(res, "Team manager cannot be added as a team leader");
    }
  }

  const teamExists = await Team.findOne({
    teamName: nameValidation.normalized,
    organizationId,
  });
  if (teamExists) return errorResponse(res, "Team name already exists in this organization", 409);

  const teamLimit = await checkTeamLimit(req.user.userId);
  if (!teamLimit.allowed) return errorResponse(res, teamLimit.message, 403);

  const detailObject = {
    teamName: nameValidation.normalized,
    managerId: managerId || null,
    leaderIds: cleanedLeaderIds,
    organizationId,
  };

  if (description !== undefined && description !== null) {
    const descValidation = validateString(description, "Description", { maxLength: 500 });
    if (!descValidation.valid) return errorResponse(res, descValidation.error);
    detailObject.description = descValidation.normalized;
  }

  const createdTeam = await Team.create(detailObject);

  // Process manager and leaders to add them to TeamMembership
  const usersToProcess = [];
  if (managerId) {
    usersToProcess.push({ userId: managerId, role: "manager" });
  }
  if (cleanedLeaderIds && cleanedLeaderIds.length > 0) {
    for (const leaderId of cleanedLeaderIds) {
      usersToProcess.push({ userId: leaderId, role: "teamLead" });
    }
  }

  const failedInsertions = [];
  let successCount = 0;

  if (usersToProcess.length > 0) {
    const userIds = usersToProcess.map((u) => u.userId);
    const existingMemberships = await TeamMembership.find({ userId: { $in: userIds } });

    const membershipsToInsert = [];
    const managerIdsToUpdate = [];
    const teamLeadIdsToUpdate = [];

    for (const user of usersToProcess) {
      const userMemberships = existingMemberships.filter((m) => m.userId.toString() === user.userId.toString());
      const inOtherTeam = userMemberships.length > 0; // Since this team is new, any existing membership is in another team

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
      successCount = membershipsToInsert.length;

      if (managerIdsToUpdate.length > 0) {
        await User.updateMany({ _id: { $in: managerIdsToUpdate } }, { $set: { role: "manager" } });
      }
      if (teamLeadIdsToUpdate.length > 0) {
        await User.updateMany({ _id: { $in: teamLeadIdsToUpdate } }, { $set: { role: "teamLead" } });
      }
    }
  }

  return successResponse(
    res,
    "Team added successfully",
    {
      ...detailObject,
      teamId: createdTeam._id,
      successCount,
      failedCount: failedInsertions.length,
      failedInsertions,
    },
    201
  );
}, "ADMIN_CREATE_TEAM_ERROR");

export const getTeam = asyncHandler(async (req, res) => {
  const { id: teamId } = req.params;

  const idValidation = validateObjectId(teamId, "Team ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const [team] = await Team.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(teamId) } },
    {
      $lookup: {
        from: "users",
        localField: "managerId",
        foreignField: "_id",
        pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1, profileImage: 1 } }],
        as: "manager",
      },
    },
    { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "leaderIds",
        foreignField: "_id",
        pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1, profileImage: 1 } }],
        as: "leaders",
      },
    },
    {
      $addFields: {
        // Frontend-expected aliases
        teamManagerId: "$managerId",
        teamLeaderId: { $arrayElemAt: ["$leaderIds", 0] },
      },
    },
  ]);

  if (!team) return errorResponse(res, "Team does not exist with given id", 404);
  return successResponse(res, "Team fetched", team);
}, "ADMIN_GET_TEAM_ERROR");

export const getAllTeams = asyncHandler(async (req, res) => {
  const { organizationId } = req.body;

  const idValidation = validateObjectId(organizationId, "Organization ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const teamList = await Team.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
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
  ]);

  return successResponse(res, "Teams fetched", teamList);
}, "ADMIN_GET_TEAMS_ERROR");

export const getTeamsPagination = asyncHandler(async (req, res) => {
  const { organizationId, page = 1, limit = 10, search = "" } = req.query;

  const adminId = req.user.userId;
  const thefilter = [];
  const orgList = [];

  if (organizationId) {
    const orgValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgValidation.valid) return errorResponse(res, orgValidation.error);
    orgList.push(new mongoose.Types.ObjectId(organizationId));
  } else {
    const orgs = await AdminOrg.find({ primaryAdmin: adminId }).select("organizationId");
    orgList.push(...orgs.map((org) => org.organizationId));
  }

  thefilter.push({ $match: { organizationId: { $in: orgList } } });

  if (search.trim() !== "") {
    thefilter.push({
      $match: {
        teamName: {
          $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      },
    });
  }

  thefilter.push({
    $lookup: {
      from: "users",
      localField: "managerId",
      foreignField: "_id",
      pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1 } }],
      as: "manager",
    },
  });
  thefilter.push({ $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } });
  thefilter.push({
    $lookup: {
      from: "users",
      localField: "leaderIds",
      foreignField: "_id",
      pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1 } }],
      as: "leaders",
    },
  });

  thefilter.push({
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "teamId",
      as: "members",
    },
  });

  thefilter.push(
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
    }
  );

  const results = await pagination(Team, page, limit, thefilter);
  return successResponse(res, "Teams fetched", {
    teamList: results.documents,
    totalRecords: results.totalRecords,
    totalPages: results.totalPages,
  });
}, "GET_TEAMS_PAGINATION_ERROR");

export const updateTeam = asyncHandler(async (req, res) => {
  const { teamId, teamName, description, managerId, leaderIds } = req.body;

  const idValidation = validateObjectId(teamId, "Team ID");
  if (!idValidation.valid) return errorResponse(res, idValidation.error);

  const team = await Team.findById(teamId);
  if (!team) return errorResponse(res, "Team not found", 404);

  const updateData = {};

  if (teamName !== undefined) {
    const nameValidation = validateString(teamName, "Team name", { minLength: 2, maxLength: 100 });
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
    updateData.teamName = nameValidation.normalized;
  }

  if (description !== undefined) {
    const descValidation = validateString(description, "Description", { maxLength: 500 });
    if (!descValidation.valid) return errorResponse(res, descValidation.error);
    updateData.description = descValidation.normalized;
  }

  if (managerId !== undefined) {
    if (managerId !== null) {
      const managerValidation = validateObjectId(managerId, "Manager ID");
      if (!managerValidation.valid) return errorResponse(res, managerValidation.error);
    }
    updateData.managerId = managerId;
  }

  if (leaderIds !== undefined) {
    if (!Array.isArray(leaderIds)) return errorResponse(res, "leaderIds must be an array");
    for (const id of leaderIds) {
      const v = validateObjectId(id, "Leader ID");
      if (!v.valid) return errorResponse(res, v.error);
    }
    updateData.leaderIds = [...new Set(leaderIds)];
  }

  if (Object.keys(updateData).length === 0) return errorResponse(res, "No valid fields to update");

  const updater = await Team.findByIdAndUpdate(teamId, updateData, { new: true, runValidators: true });
  return successResponse(res, "Team details updated", updater);
}, "ADMIN_UPDATE_TEAM_ERROR");

export const deleteTeam = asyncHandler(async (req, res) => {
  const { data: teamIds } = req.body;

  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return errorResponse(res, "teamIds must be a non-empty array");
  }

  for (const teamId of teamIds) {
    const idValidation = validateObjectId(teamId, "Team ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);
  }

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

  const paginationValidation = validatePagination(page, limit);
  if (!paginationValidation.valid) return errorResponse(res, paginationValidation.error);

  page = Number(page);
  limit = Number(limit);

  let filter = [
    {
      $match: {
        managerId: new mongoose.Types.ObjectId(managerId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
    },
  ];

  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.push({ $match: { teamName: { $regex: escaped, $options: "i" } } });
  }

  filter.push({
    $lookup: {
      from: "users",
      localField: "managerId",
      foreignField: "_id",
      pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1 } }],
      as: "manager",
    },
  });
  filter.push({ $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } });

  filter.push({
    $lookup: {
      from: "users",
      localField: "leaderIds",
      foreignField: "_id",
      pipeline: [{ $project: { employeeId: 1, name: 1, email: 1, workType: 1 } }],
      as: "leaders",
    },
  });

  filter.push({
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "teamId",
      as: "members",
    },
  });

  filter.push({
    $lookup: {
      from: "organizations",
      localField: "organizationId",
      foreignField: "_id",
      as: "organization",
    },
  });
  filter.push({ $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } });

  filter.push({
    $addFields: {
      memberCount: { $size: "$members" },
      organizationName: { $ifNull: ["$organization.name", null] },
    },
  });

  filter.push({
    $project: {
      members: 0,
      organization: 0,
    },
  });

  const results = await pagination(Team, page, limit, filter);
  return successResponse(res, "Manager teams fetched", {
    teamList: results.documents,
    totalRecords: results.totalRecords,
    totalPages: results.totalPages,
  });
}, "GET_MANAGER_TEAMS_ERROR");
