import mongoose from "mongoose";
import Attendance from "#models/Attendance.js";
import Leave from "#models/Leave.js";
import Holiday from "#models/Holiday.js";
import TeamMembership from "#models/TeamMembership.js";
import Team from "#models/Team.js";
import ProjectMember from "#models/ProjectMember.js";
import Organization from "#models/Organization.js";
import User from "#models/User.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";

export const getEmployeeDashboard = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const user = await User.findById(userId).select("organizationId name").lean();
    if (!user) return errorResponse(res, "User not found", 404);

    const orgId = user.organizationId;
    const uid = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const [todayAtt, monthAtt, recentLeaves, usedLeaveAgg, upcomingHolidays, membership, projectMembers, organization] =
        await Promise.all([
            // 1. Today's attendance record
            Attendance.findOne({
                userId: uid,
                date: { $gte: startOfToday, $lte: endOfToday },
            })
                .select("checkIn checkOut status")
                .lean(),

            // 2. This month's attendance grouped by status
            Attendance.aggregate([
                { $match: { userId: uid, date: { $gte: startOfMonth, $lte: endOfMonth } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),

            // 3. Recent 5 leaves (own)
            Leave.find({ userId: uid })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("leaveType dates status reason createdAt")
                .lean(),

            // 4. Approved leave days used this year (for balance)
            Leave.aggregate([
                {
                    $match: {
                        userId: uid,
                        status: "approved",
                        dates: { $elemMatch: { $gte: startOfYear, $lte: endOfYear } },
                    },
                },
                {
                    $project: {
                        yearDates: {
                            $filter: {
                                input: "$dates",
                                as: "d",
                                cond: { $and: [{ $gte: ["$$d", startOfYear] }, { $lte: ["$$d", endOfYear] }] },
                            },
                        },
                    },
                },
                { $project: { count: { $size: "$yearDates" } } },
                { $group: { _id: null, total: { $sum: "$count" } } },
            ]),

            // 5. Next 5 upcoming holidays
            Holiday.find({ organizationId: orgId, date: { $gte: startOfToday } })
                .sort({ date: 1 })
                .limit(5)
                .select("name date type")
                .lean(),

            // 6. Team membership → team → manager
            TeamMembership.findOne({ userId: uid, isActive: true }).lean(),

            // 7. Project memberships
            ProjectMember.find({ userId: uid, isActive: true })
                .populate({ path: "projectId", select: "name status dueDate contractedBy" })
                .lean(),

            // 8. Organization (for clDays)
            Organization.findById(orgId).select("clDays").lean(),
        ]);

    // ── Attendance summary ────────────────────────────────────────────────────
    const attendanceSummary = { present: 0, absent: 0, late: 0, halfDay: 0 };
    monthAtt.forEach(({ _id, count }) => {
        if (_id in attendanceSummary) attendanceSummary[_id] = count;
    });

    // ── Today card ────────────────────────────────────────────────────────────
    let workedMinutes = null;
    if (todayAtt?.checkIn && todayAtt?.checkOut) {
        workedMinutes = Math.round((new Date(todayAtt.checkOut) - new Date(todayAtt.checkIn)) / 60000);
    }
    const today = {
        status: todayAtt?.status ?? null,
        checkIn: todayAtt?.checkIn ?? null,
        checkOut: todayAtt?.checkOut ?? null,
        workedMinutes,
    };

    // ── Leave balance ─────────────────────────────────────────────────────────
    const totalCLDays = organization?.clDays ?? 12;
    const usedDays = usedLeaveAgg[0]?.total ?? 0;
    const leaveBalance = { totalCLDays, usedDays, remainingDays: totalCLDays - usedDays };

    // ── Team info ─────────────────────────────────────────────────────────────
    let team = null;
    if (membership) {
        const teamDoc = await Team.findById(membership.teamId)
            .populate({ path: "managerId", select: "name profileImage employeeId" })
            .lean();
        if (teamDoc) {
            team = {
                teamId: teamDoc._id,
                teamName: teamDoc.teamName,
                manager: teamDoc.managerId ?? null,
            };
        }
    }

    // ── Projects ──────────────────────────────────────────────────────────────
    const validProjects = projectMembers.filter((pm) => pm.projectId);
    const projects = {
        total: validProjects.length,
        active: validProjects.filter((pm) => pm.projectId?.status === "active").length,
        list: validProjects
            .filter((pm) => pm.projectId?.status === "active")
            .slice(0, 4)
            .map((pm) => ({
                _id: pm.projectId._id,
                name: pm.projectId.name,
                status: pm.projectId.status,
                dueDate: pm.projectId.dueDate,
                contractedBy: pm.projectId.contractedBy,
                assignedDate: pm.assignedDate,
            })),
    };

    return successResponse(res, "Dashboard fetched", {
        today,
        attendanceSummary,
        leaveBalance,
        recentLeaves,
        upcomingHolidays,
        team,
        projects,
    });
}, "USER_DASHBOARD_ERROR");
