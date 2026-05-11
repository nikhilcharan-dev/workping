import { asyncHandler } from "#utils/async.handler.js";
import Attendance from "#models/Attendance.js";
import Organization from "#models/Organization.js";
import User from "#models/User.js";
import Team from "#models/Team.js";
import ProjectMember from "#models/ProjectMember.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateDate, validateRequiredFields } from "#utils/validators.js";
import { calculateTrendData, calculateTeamRates, getDateBoundaries, getTodayAttendanceSummary } from "./helpers.js";

// GET /api/admin/attendance/summary?organizationId=&date=
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { organizationId, date } = req.query;

  if (!organizationId) return errorResponse(res, "organizationId is required");

  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  const org = await Organization.findById(organizationId);
  if (!org) return errorResponse(res, "Organization not found", 404);

  const users = await User.find({ organizationId }).select("_id teamId");
  if (!users.length) {
    return successResponse(res, "No employees in this organization", {
      today: { present: 0, absent: 0, late: 0, halfDay: 0, total: 0 },
      trend: {},
    });
  }

  const userIds = users.map((u) => u._id);
  const { dayStart, dayEnd } = getDateBoundaries(date);

  const { summary: today, records: todayRecords } = await getTodayAttendanceSummary(userIds, dayStart, dayEnd);
  const trend = await calculateTrendData(userIds);
  const teams = await Team.find({ organizationId }).select("_id teamName").lean();
  const teamRates = calculateTeamRates(teams, users, todayRecords);

  return successResponse(res, "Attendance summary fetched", { today, trend, teamRates });
}, "ADMIN_GET_ATTENDANCE_SUMMARY");

// GET /api/admin/attendance/manager/summary (Manager scoped)
export const getManagerAttendanceSummary = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { userId: managerId, organizationId } = req.user;

  const managedTeams = await Team.find({ managerId, organizationId }).select("_id teamName").lean();
  const teamIds = managedTeams.map((t) => t._id);

  if (!teamIds.length) {
    return successResponse(res, "No teams managed", {
      today: { present: 0, absent: 0, late: 0, halfDay: 0, total: 0 },
      trend: {},
      teamRates: [],
    });
  }

  const users = await User.find({ teamId: { $in: teamIds }, organizationId }).select("_id teamId");
  if (!users.length) {
    return successResponse(res, "No employees in managed teams", {
      today: { present: 0, absent: 0, late: 0, halfDay: 0, total: 0 },
      trend: {},
      teamRates: managedTeams.map((t) => ({
        teamId: t._id,
        teamName: t.teamName,
        rate: 0,
        present: 0,
        total: 0,
      })),
    });
  }

  const userIds = users.map((u) => u._id);
  const { dayStart, dayEnd } = getDateBoundaries(date);

  const { summary: today, records: todayRecords } = await getTodayAttendanceSummary(userIds, dayStart, dayEnd);
  const trend = await calculateTrendData(userIds);
  const teamRates = calculateTeamRates(managedTeams, users, todayRecords);

  return successResponse(res, "Manager attendance summary fetched", { today, trend, teamRates });
}, "MANAGER_GET_ATTENDANCE_SUMMARY");

// POST /api/admin/attendance/by-organization
export const getAttendanceByOrganizationId = asyncHandler(async (req, res) => {
  const { organizationId, date, projectId } = req.body;

  const requiredCheck = validateRequiredFields({ organizationId, date }, ["organizationId", "date"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  const dateValidation = validateDate(date, "Date");
  if (!dateValidation.valid) return errorResponse(res, dateValidation.error);

  if (projectId) {
    const projIdValidation = validateObjectId(projectId, "Project ID");
    if (!projIdValidation.valid) return errorResponse(res, projIdValidation.error);
  }

  const existingOrg = await Organization.findById(organizationId);
  if (!existingOrg) return errorResponse(res, "Organization not found", 404);

  const users = await User.find({ organizationId }).select("_id name email teamId");
  if (!users.length) return errorResponse(res, "No employees in this organization", 404);

  let userIds = users.map((u) => u._id);

  // Narrow to project members if projectId provided
  if (projectId) {
    const members = await ProjectMember.find({ projectId, isActive: true }).select("userId").lean();
    const memberSet = new Set(members.map((m) => m.userId.toString()));
    userIds = userIds.filter((id) => memberSet.has(id.toString()));
  }
  const queryDate = dateValidation.normalized;
  const dayStart = new Date(queryDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(queryDate);
  dayEnd.setHours(23, 59, 59, 999);

  const records = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
        date: { $gte: dayStart, $lte: dayEnd },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, employeeId: 1, teamId: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "teams",
        localField: "user.teamId",
        foreignField: "_id",
        pipeline: [{ $project: { teamName: 1 } }],
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    { $addFields: { teamName: "$team.teamName" } },
    { $project: { team: 0 } },
  ]);

  return successResponse(res, "Organization attendance fetched", {
    organizationId,
    date,
    totalUsers: users.length,
    attendanceCount: records.length,
    records,
  });
}, "ADMIN_GET_ATTENDANCE_BY_ORG");

// POST /api/admin/attendance/by-team
export const getAttendanceByTeamId = asyncHandler(async (req, res) => {
  const { teamId, date } = req.body;

  const requiredCheck = validateRequiredFields({ teamId, date }, ["teamId", "date"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const teamIdValidation = validateObjectId(teamId, "Team ID");
  if (!teamIdValidation.valid) return errorResponse(res, teamIdValidation.error);

  // Security: Check if manager has authority over this team
  if (req.user.role === "manager") {
    const isManagedTeam = await Team.exists({ _id: teamId, managerId: req.user.userId });
    if (!isManagedTeam)
      return errorResponse(res, "Forbidden: You cannot view attendance for a team you don't manage", 403);
  }

  const dateValidation = validateDate(date, "Date");
  if (!dateValidation.valid) return errorResponse(res, dateValidation.error);

  const existingTeam = await Team.findById(teamId);
  if (!existingTeam) return errorResponse(res, "Team not found", 404);

  const teamMembers = await User.find({ teamId }).select("_id name email employeeId");
  if (!teamMembers.length) return errorResponse(res, "Team has no employees", 404);

  const userIds = teamMembers.map((u) => u._id);
  const queryDate = dateValidation.normalized;
  const dayStart = new Date(queryDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(queryDate);
  dayEnd.setHours(23, 59, 59, 999);

  const records = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
        date: { $gte: dayStart, $lte: dayEnd },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, employeeId: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]);

  return successResponse(res, "Team attendance fetched", {
    teamId,
    teamName: existingTeam.teamName,
    date,
    totalMembers: teamMembers.length,
    attendanceCount: records.length,
    records,
  });
}, "ADMIN_GET_ATTENDANCE_BY_TEAM");
