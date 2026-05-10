import User from "#models/User.js";
import Attendance from "#models/Attendance.js";
import Leave from "#models/Leave.js";
import Organization from "#models/Organization.js";
import Project from "#models/Project.js";
import ProjectMember from "#models/ProjectMember.js";
import Holiday from "#models/Holiday.js";
import Salary from "#models/Salary.js";
import Complaint from "#models/Complaint.js";
import FrsTicket from "#models/FrsTicket.js";
import { validatePhone } from "#utils/validators.js";
import { sendWhatsApp, startApprovalFlow } from "#services/whatsapp/whatsapp.service.js";

// ── GET /internal/employee/by-phone/:phone ────────────────────────────────────
export const getEmployeeByPhone = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) return res.status(400).json({ found: false, error: phoneValidation.error });

  const user = await User.findOne({ phone: phoneValidation.normalized })
    .populate("organizationId", "name clDays")
    .lean();

  if (!user) return res.status(404).json({ found: false });
  if (!user.organizationId) return res.status(404).json({ found: false, error: "Employee organization not found" });

  return res.json({
    found: true,
    userId: user._id,
    name: user.name,
    employeeId: user.employeeId,
    role: user.role,
    workType: user.workType,
    organizationId: user.organizationId._id,
    organizationName: user.organizationId.name,
    clDays: user.organizationId.clDays || 12,
  });
}, "INTERNAL_GET_EMPLOYEE_ERROR");

// ── GET /internal/attendance/today/:userId ────────────────────────────────────
export const getAttendanceToday = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const record = await Attendance.findOne({
    userId,
    date: { $gte: start, $lte: end },
  }).lean();

  return res.json({ record: record || null });
}, "INTERNAL_ATTENDANCE_TODAY_ERROR");

// ── GET /internal/attendance/week/:userId ─────────────────────────────────────
export const getAttendanceWeek = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // back to Monday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

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

  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const approvedLeaves = await Leave.find({
    userId,
    status: "approved",
    dates: { $elemMatch: { $gte: startOfYear, $lte: endOfYear } },
  }).lean();

  let usedDays = 0;
  approvedLeaves.forEach((leave) => {
    (leave.dates || []).forEach((d) => {
      const date = new Date(d);
      if (date >= startOfYear && date <= endOfYear) usedDays++;
    });
  });

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

  const validTypes = ["Casual", "Sick", "Earned", "Unpaid"];
  if (!validTypes.includes(leaveType)) {
    return res.status(400).json({ error: `Invalid leave type. Use: ${validTypes.join(", ")}` });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedDates = [];
  for (const d of dates) {
    const date = new Date(d);
    if (isNaN(date.getTime())) return res.status(400).json({ error: `Invalid date: ${d}` });
    if (date < today) return res.status(400).json({ error: `Date ${date.toLocaleDateString("en-IN")} is in the past` });
    normalizedDates.push(date);
  }

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const leave = await Leave.create({
    userId,
    organizationId: user.organizationId,
    leaveType,
    dates: normalizedDates,
    reason: reason || "",
    appliedBy: userId,
    status: "pending",
  });

  const dateList =
    normalizedDates
      .slice(0, 3)
      .map((d) => new Date(d).toLocaleDateString("en-IN"))
      .join(", ") + (normalizedDates.length > 3 ? ` +${normalizedDates.length - 3} more` : "");
  const days = normalizedDates.length;
  const leaveId = leave._id.toString();

  // Confirm submission to employee
  if (user.phone) {
    sendWhatsApp(
      user.phone,
      `*Leave Request Submitted* 📋\nHi ${user.name}, your *${leaveType}* leave for *${days} day(s)* (${dateList}) has been submitted and is awaiting approval.`
    ).catch(() => {});
  }

  // Determine approver: if applicant is a project manager → notify admin; else → notify their PM
  const isProjectManager = await Project.exists({ projectManager: userId });

  if (isProjectManager) {
    // PM applying → find admin of same org
    const admin = await User.findOne({
      organizationId: user.organizationId,
      role: "manager",
      isActive: true,
      _id: { $ne: userId },
    })
      .select("name phone")
      .lean();

    if (admin?.phone) {
      sendWhatsApp(
        admin.phone,
        `*Leave Approval Required* 📋\n*${user.name}* (Project Manager) has applied for *${leaveType}* leave.\n*Days:* ${days} (${dateList})\n\nReply *yes* to approve or *no* to reject.`
      ).catch(() => {});
      startApprovalFlow(admin.phone, { leaveId, employeeName: user.name, days, dateList }).catch(() => {});
    }
  } else {
    // Regular member → notify project manager(s)
    const projectIds = await ProjectMember.find({ userId, isActive: true }).distinct("projectId");
    if (projectIds.length > 0) {
      const projects = await Project.find({ _id: { $in: projectIds } })
        .populate({ path: "projectManager", select: "name phone" })
        .lean();

      const notified = new Set();
      for (const proj of projects) {
        const pm = proj.projectManager;
        if (!pm?.phone || notified.has(pm._id.toString())) continue;
        notified.add(pm._id.toString());
        sendWhatsApp(
          pm.phone,
          `*Leave Approval Required* 📋\n*${user.name}* has applied for *${leaveType}* leave.\n*Project:* ${proj.name}\n*Days:* ${days} (${dateList})\n\nReply *yes* to approve or *no* to reject.`
        ).catch(() => {});
        startApprovalFlow(pm.phone, { leaveId, employeeName: user.name, days, dateList }).catch(() => {});
      }
    }
  }

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

  // Strip country code to match DB format (10-digit)
  const rawPhone = String(decidedByPhone).replace(/\D/g, "");
  const normalizedPhone = rawPhone.length === 12 && rawPhone.startsWith("91") ? rawPhone.slice(2) : rawPhone;

  const decider = await User.findOne({ phone: normalizedPhone }).select("name _id").lean();
  if (!decider) return res.status(404).json({ error: "Approver not found" });

  const leave = await Leave.findById(leaveId);
  if (!leave) return res.status(404).json({ error: "Leave request not found" });
  if (leave.status !== "pending") {
    return res.status(400).json({ error: `This leave has already been ${leave.status}` });
  }

  leave.status = decision;
  leave.approvedBy = decider._id;
  await leave.save();

  // Notify employee of the outcome
  const employee = await User.findById(leave.userId).select("name phone").lean();
  if (employee?.phone) {
    const dateList =
      leave.dates
        .slice(0, 3)
        .map((d) => new Date(d).toLocaleDateString("en-IN"))
        .join(", ") + (leave.dates.length > 3 ? ` +${leave.dates.length - 3} more` : "");
    const msg =
      decision === "approved"
        ? `*Leave Approved* ✅\nHi ${employee.name}, your *${leave.leaveType}* leave for *${leave.dates.length} day(s)* (${dateList}) has been *approved* by ${decider.name}.`
        : `*Leave Rejected* ❌\nHi ${employee.name}, your *${leave.leaveType}* leave for *${leave.dates.length} day(s)* (${dateList}) has been *rejected* by ${decider.name}.`;
    sendWhatsApp(employee.phone, msg).catch(() => {});
  }

  return res.json({ success: true });
}, "INTERNAL_DECIDE_LEAVE_ERROR");

// ── GET /internal/shift/:userId ───────────────────────────────────────────────
export const getUserShift = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const projectIds = await ProjectMember.find({ userId, isActive: true }).distinct("projectId");
  if (!projectIds.length) return res.json({ shift: null });

  const project = await Project.findOne({
    _id: { $in: projectIds },
    shiftId: { $exists: true, $ne: null },
  })
    .populate("shiftId")
    .lean();

  return res.json({ shift: project?.shiftId ?? null });
}, "INTERNAL_GET_SHIFT_ERROR");

// ── GET /internal/holidays/:organizationId ────────────────────────────────────
export const getUpcomingHolidays = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 60); // next 60 days

  const holidays = await Holiday.find({
    organizationId,
    date: { $gte: today, $lte: limit },
    isWorkingDay: false,
  })
    .sort({ date: 1 })
    .limit(10)
    .lean();

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

  const ticketId = "COMP-" + Date.now().toString(36).toUpperCase();

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

  const ticketId = "FRS-" + Date.now().toString(36).toUpperCase();

  const ticket = await FrsTicket.create({
    userId,
    organizationId: user.organizationId,
    ticketId,
  });

  return res.status(201).json({ success: true, ticketId: ticket.ticketId });
}, "INTERNAL_RAISE_FRS_ERROR");
