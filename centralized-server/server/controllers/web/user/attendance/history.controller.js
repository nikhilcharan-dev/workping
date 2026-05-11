import { asyncHandler } from "#utils/async.handler.js";
import Attendance from "#models/Attendance.js";
import User from "#models/User.js";
import mongoose from "mongoose";
import Pagination from "#helpers/pagination.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";

export const getMyAttendance = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  let { page = 1, limit = 10, startDate, endDate, status } = req.query;

  const filter = [{ $match: { userId: new mongoose.Types.ObjectId(userId) } }];

  if (startDate || endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    filter.push({ $match: { date: dateFilter } });
  }

  if (status) {
    filter.push({ $match: { status } });
  }

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
      organizationName: "$organization.name",
    },
  });
  filter.push({ $project: { organization: 0 } });
  filter.push({ $sort: { date: -1 } });

  const pagination = await Pagination(Attendance, page, limit, filter);

  return successResponse(res, "Attendance fetched", {
    totalRecords: pagination.totalRecords,
    totalPages: pagination.totalPages,
    attendance: pagination.documents,
  });
}, "USER_GET_MY_ATTENDANCE_ERROR");

export const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { date } = req.query;

  if (!date) return errorResponse(res, "Date is required");

  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  const [attendance] = await Attendance.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: startOfDay, $lte: endOfDay } } },
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

  if (!attendance) return errorResponse(res, "No attendance record found for the given date", 404);

  return successResponse(res, "Attendance fetched", attendance);
}, "USER_GET_ATTENDANCE_BY_DATE_ERROR");

export const getMyAttendanceSummary = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { month, year } = req.query;

  if (!month || !year) return errorResponse(res, "Month and year are required");

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const records = await Attendance.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  });

  const summary = {
    totalDays: records.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
  };

  records.forEach((record) => {
    if (summary[record.status] !== undefined) {
      summary[record.status]++;
    }
  });

  return successResponse(res, "Attendance summary fetched", summary);
}, "USER_GET_ATTENDANCE_SUMMARY_ERROR");
