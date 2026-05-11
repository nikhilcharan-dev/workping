import User from "#models/User.js";
import Leave from "#models/Leave.js";
import Project from "#models/Project.js";
import ProjectMember from "#models/ProjectMember.js";
import Holiday from "#models/Holiday.js";
import { validatePhone } from "#utils/validators.js";
import { sendWhatsApp, startApprovalFlow } from "#services/whatsapp/whatsapp.service.js";

/**
 * Get user by phone with organization details
 */
export async function getUserByPhone(phone) {
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return { valid: false, error: phoneValidation.error };
  }

  const user = await User.findOne({ phone: phoneValidation.normalized })
    .populate("organizationId", "name clDays")
    .lean();

  if (!user) {
    return { valid: false, found: false };
  }

  if (!user.organizationId) {
    return { valid: false, found: false, error: "Employee organization not found" };
  }

  return {
    valid: true,
    found: true,
    user: {
      userId: user._id,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      workType: user.workType,
      organizationId: user.organizationId._id,
      organizationName: user.organizationId.name,
      clDays: user.organizationId.clDays || 12,
    },
  };
}

/**
 * Get today's date range (00:00:00 to 23:59:59)
 */
export function getTodayDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get week's start date (Monday at 00:00)
 */
export function getWeekStartDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get current year's date range
 */
export function getCurrentYearDateRange() {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  return { startOfYear, endOfYear };
}

/**
 * Calculate used leave days for a user
 */
export async function calculateUsedLeaveDays(userId) {
  const { startOfYear, endOfYear } = getCurrentYearDateRange();

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

  return usedDays;
}

/**
 * Validate leave type
 */
export function validateLeaveType(leaveType) {
  const validTypes = ["Casual", "Sick", "Earned", "Unpaid"];
  return validTypes.includes(leaveType);
}

/**
 * Normalize and validate leave dates
 */
export function normalizeLeaveDates(dates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedDates = [];

  for (const d of dates) {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      return { valid: false, error: `Invalid date: ${d}` };
    }
    if (date < today) {
      return { valid: false, error: `Date ${date.toLocaleDateString("en-IN")} is in the past` };
    }
    normalizedDates.push(date);
  }

  return { valid: true, dates: normalizedDates };
}

/**
 * Format date list for display
 */
export function formatDateList(dates) {
  const formatted =
    dates
      .slice(0, 3)
      .map((d) => new Date(d).toLocaleDateString("en-IN"))
      .join(", ") + (dates.length > 3 ? ` +${dates.length - 3} more` : "");
  return formatted;
}

/**
 * Send leave submission confirmation to employee
 */
export async function sendLeaveSubmissionConfirmation(user, leaveType, days, dateList) {
  if (user.phone) {
    sendWhatsApp(
      user.phone,
      `*Leave Request Submitted* 📋\nHi ${user.name}, your *${leaveType}* leave for *${days} day(s)* (${dateList}) has been submitted and is awaiting approval.`
    ).catch(() => {});
  }
}

/**
 * Send leave approval notification to admin
 */
export async function sendLeaveApprovalNotificationToAdmin(admin, user, leaveType, days, dateList, leaveId) {
  if (admin?.phone) {
    sendWhatsApp(
      admin.phone,
      `*Leave Approval Required* 📋\n*${user.name}* (Project Manager) has applied for *${leaveType}* leave.\n*Days:* ${days} (${dateList})\n\nReply *yes* to approve or *no* to reject.`
    ).catch(() => {});
    startApprovalFlow(admin.phone, { leaveId, employeeName: user.name, days, dateList }).catch(() => {});
  }
}

/**
 * Send leave approval notification to project manager
 */
export async function sendLeaveApprovalNotificationToPM(pm, user, leaveType, days, dateList, projectName, leaveId) {
  if (pm?.phone) {
    sendWhatsApp(
      pm.phone,
      `*Leave Approval Required* 📋\n*${user.name}* has applied for *${leaveType}* leave.\n*Project:* ${projectName}\n*Days:* ${days} (${dateList})\n\nReply *yes* to approve or *no* to reject.`
    ).catch(() => {});
    startApprovalFlow(pm.phone, { leaveId, employeeName: user.name, days, dateList }).catch(() => {});
  }
}

/**
 * Find approver and notify based on role
 */
export async function findApproverAndNotify(user, leaveType, days, dateList, leaveId) {
  const isProjectManager = await Project.exists({ projectManager: user._id });

  if (isProjectManager) {
    // PM applying → find manager of same org
    const admin = await User.findOne({
      organizationId: user.organizationId,
      role: "manager",
      isActive: true,
      _id: { $ne: user._id },
    })
      .select("name phone")
      .lean();

    await sendLeaveApprovalNotificationToAdmin(admin, user, leaveType, days, dateList, leaveId);
  } else {
    // Regular member → notify project manager(s)
    const projectIds = await ProjectMember.find({ userId: user._id, isActive: true }).distinct("projectId");
    if (projectIds.length > 0) {
      const projects = await Project.find({ _id: { $in: projectIds } })
        .populate({ path: "projectManager", select: "name phone" })
        .lean();

      const notified = new Set();
      for (const proj of projects) {
        const pm = proj.projectManager;
        if (!pm?.phone || notified.has(pm._id.toString())) continue;
        notified.add(pm._id.toString());
        await sendLeaveApprovalNotificationToPM(pm, user, leaveType, days, dateList, proj.name, leaveId);
      }
    }
  }
}

/**
 * Normalize phone number
 */
export function normalizePhoneNumber(phone) {
  const rawPhone = String(phone).replace(/\D/g, "");
  return rawPhone.length === 12 && rawPhone.startsWith("91") ? rawPhone.slice(2) : rawPhone;
}

/**
 * Send leave decision notification to employee
 */
export async function sendLeaveDecisionNotification(employee, leave, decider, decision) {
  if (employee?.phone) {
    const dateList = formatDateList(leave.dates);
    const msg =
      decision === "approved"
        ? `*Leave Approved* ✅\nHi ${employee.name}, your *${leave.leaveType}* leave for *${leave.dates.length} day(s)* (${dateList}) has been *approved* by ${decider.name}.`
        : `*Leave Rejected* ❌\nHi ${employee.name}, your *${leave.leaveType}* leave for *${leave.dates.length} day(s)* (${dateList}) has been *rejected* by ${decider.name}.`;
    sendWhatsApp(employee.phone, msg).catch(() => {});
  }
}

/**
 * Get user's shift from active projects
 */
export async function getUserShiftFromProjects(userId) {
  const projectIds = await ProjectMember.find({ userId, isActive: true }).distinct("projectId");
  if (!projectIds.length) return null;

  const project = await Project.findOne({
    _id: { $in: projectIds },
    shiftId: { $exists: true, $ne: null },
  })
    .populate("shiftId")
    .lean();

  return project?.shiftId ?? null;
}

/**
 * Get upcoming holidays for organization
 */
export async function getUpcomingHolidaysForOrg(organizationId, daysAhead = 60, maxResults = 10) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + daysAhead);

  const holidays = await Holiday.find({
    organizationId,
    date: { $gte: today, $lte: limit },
    isWorkingDay: false,
  })
    .sort({ date: 1 })
    .limit(maxResults)
    .lean();

  return holidays;
}

/**
 * Generate ticket ID with prefix
 */
export function generateTicketId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
