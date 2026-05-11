import { asyncHandler } from "#utils/async.handler.js";
import User from "#models/User.js";
import Attendance from "#models/Attendance.js";
import Leave from "#models/Leave.js";
import Salary from "#models/Salary.js";
import Complaint from "#models/Complaint.js";
import FrsTicket from "#models/FrsTicket.js";
import {
  getUserByPhone,
  getTodayDateRange,
  getWeekStartDate,
  getCurrentYearDateRange,
  calculateUsedLeaveDays,
  validateLeaveType,
  normalizeLeaveDates,
  formatDateList,
  sendLeaveSubmissionConfirmation,
  findApproverAndNotify,
  normalizePhoneNumber,
  sendLeaveDecisionNotification,
  getUserShiftFromProjects,
  getUpcomingHolidaysForOrg,
  generateTicketId,
} from "./helpers.js";

// ── GET /internal/employee/by-phone/:phone ────────────────────────────────────
export const getEmployeeByPhone = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const result = await getUserByPhone(phone);

  if (!result.valid) {
    return res.status(400).json({ found: false, error: result.error });
  }

  if (!result.found) {
    return res.status(404).json({ found: false, error: result.error });
  }

  return res.json(result.user);
}, "INTERNAL_GET_EMPLOYEE_ERROR");

// ── GET /internal/attendance/today/:userId ────────────────────────────────────
export const getAttendanceToday = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { start, end } = getTodayDateRange();

  const record = await Attendance.findOne({
    userId,
    date: { $gte: start, $lte: end },
  }).lean();

  return res.json({ record: record || null });
}, "INTERNAL_ATTENDANCE_TODAY_ERROR");

// ── GET /internal/attendance/week/:userId ─────────────────────────────────────
export const getAttendanceWeek = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const weekStart = getWeekStartDate();

  const records = await Attendance.find({
    userId,
    date: { $gte: weekStart },
  })
    .sort({ date: 1 })
    .lean();

  return res.json({ records });
}, "INTERNAL_ATTENDANCE_WEEK_ERROR");

// ── GET /internal/leave/balance/:userId ───────────────────────────────────────
export const getLeaveBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).populate("organizationId", "clDays").lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const usedDays = await calculateUsedLeaveDays(userId);
  const totalCLDays = user.organizationId?.clDays || 12;

  return res.json({ totalCLDays, usedDays, remainingDays: totalCLDays - usedDays });
}, "INTERNAL_LEAVE_BALANCE_ERROR");

// ── GET /internal/leave/recent/:userId ───────────────────────────────────────
export const getRecentLeaves = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const leaves = await Leave.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();
  return res.json({ leaves });
}, "INTERNAL_RECENT_LEAVES_ERROR");

// ── POST /internal/leave/apply ────────────────────────────────────────────────
export const applyLeave = asyncHandler(async (req, res) => {
  const { userId, dates, leaveType, reason } = req.body;

  if (!userId || !dates || !leaveType) {
    return res.status(400).json({ error: "userId, dates, and leaveType are required" });
  }

  if (!validateLeaveType(leaveType)) {
    return res.status(400).json({ error: `Invalid leave type. Use: Casual, Sick, Earned, Unpaid` });
  }

  const dateValidation = normalizeLeaveDates(dates);
  if (!dateValidation.valid) {
    return res.status(400).json({ error: dateValidation.error });
  }

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const leave = await Leave.create({
    userId,
    organizationId: user.organizationId,
    leaveType,
    dates: dateValidation.dates,
    reason: reason || "",
    appliedBy: userId,
    status: "pending",
  });

  const days = dateValidation.dates.length;
  const dateList = formatDateList(dateValidation.dates);
  const leaveId = leave._id.toString();

  // Confirm submission to employee
  await sendLeaveSubmissionConfirmation(user, leaveType, days, dateList);

  // Determine approver and notify
  await findApproverAndNotify(user, leaveType, days, dateList, leaveId);

  return res.status(201).json({ success: true, leaveId: leave._id });
}, "INTERNAL_APPLY_LEAVE_ERROR");

// ── POST /internal/leave/decide ───────────────────────────────────────────────
export const decideLeave = asyncHandler(async (req, res) => {
  const { leaveId, decision, decidedByPhone } = req.body;

  if (!leaveId || !decision || !decidedByPhone) {
    return res.status(400).json({ error: "leaveId, decision, and decidedByPhone are required" });
  }
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
  }

  const normalizedPhone = normalizePhoneNumber(decidedByPhone);

  const decider = await User.findOne({ phone: normalizedPhone }).select("name _id organizationId").lean();
  if (!decider) return res.status(404).json({ error: "Approver not found" });

  const leave = await Leave.findById(leaveId);
  if (!leave) return res.status(404).json({ error: "Leave request not found" });
  if (leave.status !== "pending") {
    return res.status(400).json({ error: `This leave has already been ${leave.status}` });
  }

  // Verify approver belongs to the same organization as the leave requester
  if (decider.organizationId.toString() !== leave.organizationId.toString()) {
    return res.status(403).json({ error: "Approver is not authorized to decide this leave" });
  }

  leave.status = decision;
  leave.approvedBy = decider._id;
  await leave.save();

  // Notify employee of the outcome
  const employee = await User.findById(leave.userId).select("name phone").lean();
  await sendLeaveDecisionNotification(employee, leave, decider, decision);

  return res.json({ success: true });
}, "INTERNAL_DECIDE_LEAVE_ERROR");

// ── GET /internal/shift/:userId ───────────────────────────────────────────────
export const getUserShift = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const shift = await getUserShiftFromProjects(userId);
  return res.json({ shift });
}, "INTERNAL_GET_SHIFT_ERROR");

// ── GET /internal/holidays/:organizationId ────────────────────────────────────
export const getUpcomingHolidays = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const holidays = await getUpcomingHolidaysForOrg(organizationId);
  return res.json({ holidays });
}, "INTERNAL_GET_HOLIDAYS_ERROR");

// ── GET /internal/salary/:userId ──────────────────────────────────────────────
export const getSalarySlip = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const salary = await Salary.findOne({ userId }).sort({ month: -1 }).lean();
  return res.json({ salary: salary ?? null });
}, "INTERNAL_GET_SALARY_ERROR");

// ── POST /internal/complaint ──────────────────────────────────────────────────
export const fileComplaint = asyncHandler(async (req, res) => {
  const { userId, description } = req.body;
  if (!userId || !description?.trim()) {
    return res.status(400).json({ error: "userId and description are required" });
  }

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const ticketId = generateTicketId("COMP");

  const complaint = await Complaint.create({
    userId,
    organizationId: user.organizationId,
    ticketId,
    description: description.trim(),
  });

  return res.status(201).json({ success: true, ticketId: complaint.ticketId });
}, "INTERNAL_FILE_COMPLAINT_ERROR");

// ── POST /internal/frs-ticket ─────────────────────────────────────────────────
export const raiseFrsTicket = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const ticketId = generateTicketId("FRS");

  const ticket = await FrsTicket.create({
    userId,
    organizationId: user.organizationId,
    ticketId,
  });

  return res.status(201).json({ success: true, ticketId: ticket.ticketId });
}, "INTERNAL_RAISE_FRS_ERROR");
