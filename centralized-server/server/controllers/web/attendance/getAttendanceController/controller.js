import express from "express";
import Attendance from "#models/Attendance.js";
import Organization from "#models/Organization.js";
import User from "#models/User.js";
import Team from "#models/Team.js";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateDate, validateRequiredFields } from "#utils/validators.js";

const getAttendanceByUserId = asyncHandler(async (req, res) => {
  const { userId, date } = req.body;

  const requiredCheck = validateRequiredFields({ userId, date }, ["userId", "date"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const userIdValidation = validateObjectId(userId, "User ID");
  if (!userIdValidation.valid) return errorResponse(res, userIdValidation.error);

  const dateValidation = validateDate(date, "Date");
  if (!dateValidation.valid) return errorResponse(res, dateValidation.error);

  const attendanceRecord = await Attendance.findOne({ userId, date: dateValidation.normalized });

  if (!attendanceRecord) {
    return successResponse(res, "Attendance Not Captured Yet");
  }

  return successResponse(res, "Attendance fetched", attendanceRecord);
}, "GET_ATTENDANCE_BY_USER_ID");

const getAttendanceByTeamId = asyncHandler(async (req, res) => {
  const { teamId, date } = req.body;

  const requiredCheck = validateRequiredFields({ teamId, date }, ["teamId", "date"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const teamIdValidation = validateObjectId(teamId, "Team ID");
  if (!teamIdValidation.valid) return errorResponse(res, teamIdValidation.error);

  const dateValidation = validateDate(date, "Date");
  if (!dateValidation.valid) return errorResponse(res, dateValidation.error);

  const existingTeam = await Team.findById(teamId);
  if (!existingTeam) return errorResponse(res, "Team Doesn't Exist", 404);

  const teamMembers = await User.find({ teamId }).select("_id name email");
  if (!teamMembers || teamMembers.length === 0) {
    return errorResponse(res, "Team Has No Users", 404);
  }

  const userIds = teamMembers.map((user) => user._id);

  const teamAttendance = await Attendance.aggregate([
    { $match: { userId: { $in: userIds }, date: dateValidation.normalized } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, employeeId: 1, workType: 1, profileImage: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]);

  if (!teamAttendance || teamAttendance.length === 0) {
    return successResponse(res, "No Attendance Recorded For This Team");
  }

  return successResponse(res, "Team attendance fetched", {
    teamId,
    date,
    totalMembers: teamMembers.length,
    attendanceCount: teamAttendance.length,
    records: teamAttendance,
  });
}, "GET_ATTENDANCE_BY_TEAM_ID");

const getAttendanceByOrganizationId = asyncHandler(async (req, res) => {
  const { organizationId, date } = req.body;

  const requiredCheck = validateRequiredFields({ organizationId, date }, ["organizationId", "date"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const orgIdValidation = validateObjectId(organizationId, "Organization ID");
  if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

  const dateValidation = validateDate(date, "Date");
  if (!dateValidation.valid) return errorResponse(res, dateValidation.error);

  const existingOrganization = await Organization.findById(organizationId);
  if (!existingOrganization) return errorResponse(res, "Organization Doesn't Exist", 404);

  const users = await User.find({ organizationId }).select("_id name email");
  if (!users || users.length === 0) {
    return errorResponse(res, "Organization Has No Users", 404);
  }

  const userIds = users.map((user) => user._id);

  const organizationAttendance = await Attendance.aggregate([
    { $match: { userId: { $in: userIds }, date: dateValidation.normalized } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, email: 1, employeeId: 1, workType: 1, profileImage: 1 } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]);

  if (!organizationAttendance || organizationAttendance.length === 0) {
    return successResponse(res, "No Attendance Recorded For This Organization");
  }

  return successResponse(res, "Organization attendance fetched", {
    organizationId,
    date,
    totalUsers: users.length,
    attendanceCount: organizationAttendance.length,
    records: organizationAttendance,
  });
}, "GET_ATTENDANCE_BY_ORGANIZATION_ID");

export { getAttendanceByUserId, getAttendanceByTeamId, getAttendanceByOrganizationId };
