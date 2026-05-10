import User from "#models/User.js";
import Organization from "#models/Organization.js";
import Team from "#models/Team.js";
import TeamMembership from "#models/TeamMembership.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";

export const getMyOrganization = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const user = await User.findById(userId);
  if (!user) return errorResponse(res, "User not found", 404);

  const organization = await Organization.findById(user.organizationId);
  if (!organization) return errorResponse(res, "Organization not found", 404);

  return successResponse(res, "Organization fetched", organization);
}, "USER_GET_MY_ORG_ERROR");

export const getMyTeam = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const user = await User.findById(userId);
  if (!user) return errorResponse(res, "User not found", 404);

  // Fall back to TeamMembership if User.teamId is not set
  let teamId = user.teamId;
  if (!teamId) {
    const membership = await TeamMembership.findOne({ userId: user._id, isActive: true });
    if (membership) {
      teamId = membership.teamId;
      // Sync back to User document for future lookups
      await User.findByIdAndUpdate(userId, { teamId });
    }
  }
  if (!teamId) return errorResponse(res, "You are not assigned to any team", 404);

  const [team] = await Team.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(String(teamId)) } },
    {
      $lookup: {
        from: "users",
        localField: "managerId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, employeeId: 1, workType: 1, profileImage: 1 } }],
        as: "manager",
      },
    },
    { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "leaderIds",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, employeeId: 1, workType: 1, profileImage: 1 } }],
        as: "leaders",
      },
    },
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
      $addFields: {
        organizationName: "$organization.name",
      },
    },
    { $project: { organization: 0 } },
  ]);

  if (!team) return errorResponse(res, "Team not found", 404);

  return successResponse(res, "Team fetched", team);
}, "USER_GET_MY_TEAM_ERROR");

export const getMyTeamMembers = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const user = await User.findById(userId);
  if (!user) return errorResponse(res, "User not found", 404);

  // Fall back to TeamMembership if User.teamId is not set
  let teamId = user.teamId;
  if (!teamId) {
    const membership = await TeamMembership.findOne({ userId: user._id, isActive: true });
    if (membership) {
      teamId = membership.teamId;
      await User.findByIdAndUpdate(userId, { teamId });
    }
  }
  if (!teamId) return errorResponse(res, "You are not assigned to any team", 404);

  const members = await TeamMembership.aggregate([
    { $match: { teamId: new mongoose.Types.ObjectId(String(teamId)), isActive: true } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, phone: 1, role: 1, profileImage: 1, employeeId: 1, workType: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]);

  return successResponse(res, "Team members fetched", members);
}, "USER_GET_MY_TEAM_MEMBERS_ERROR");

export const getAllMyTeams = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const memberships = await TeamMembership.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $lookup: {
        from: "teams",
        localField: "teamId",
        foreignField: "_id",
        pipeline: [{ $project: { teamName: 1, description: 1, organizationId: 1 } }],
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
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
  ]);

  return successResponse(res, "Teams fetched", memberships);
}, "USER_GET_ALL_MY_TEAMS_ERROR");
