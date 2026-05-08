import cron from "node-cron";
import ProjectMember from "#models/ProjectMember.js";
import { scheduleShiftReminder } from "#services/whatsapp/whatsapp.service.js";

function todayIST() {
    // Returns "YYYY-MM-DD" in IST regardless of server timezone
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Fetch all active project members whose project has a shift assigned,
 * then call the whatsapp-microservice to schedule a 15-min pre-shift reminder
 * for each one for the given date.
 *
 * @param {string} [shiftDate] - "YYYY-MM-DD", defaults to today (IST)
 * @param {string} [filterProjectId] - limit to one project (used on shift update)
 */
export async function scheduleShiftReminders(shiftDate, filterProjectId) {
    const date = shiftDate || todayIST();

    const matchStage = filterProjectId
        ? { isActive: true, projectId: new (await import("mongoose")).default.Types.ObjectId(filterProjectId) }
        : { isActive: true };

    const rows = await ProjectMember.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "projects",
                localField: "projectId",
                foreignField: "_id",
                as: "project",
            },
        },
        { $unwind: "$project" },
        { $match: { "project.shiftId": { $exists: true, $ne: null } } },
        {
            $lookup: {
                from: "shifts",
                localField: "project.shiftId",
                foreignField: "_id",
                as: "shift",
            },
        },
        { $unwind: "$shift" },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: "$user" },
        {
            $project: {
                _id: 0,
                userId: "$user._id",
                phone: "$user.phone",
                name: "$user.name",
                role: "$user.role",
                shift: {
                    name: "$shift.name",
                    startTime: "$shift.startTime",
                    endTime: "$shift.endTime",
                    breakMinutes: "$shift.breakMinutes",
                },
            },
        },
    ]);

    if (!rows.length) return;

    console.log(`[ShiftReminderCron] Scheduling reminders for ${rows.length} member(s) on ${date}`);

    const results = await Promise.allSettled(
        rows
            .filter((r) => r.phone && r.shift?.startTime)
            .map((r) =>
                scheduleShiftReminder({
                    userId: String(r.userId),
                    shiftDate: date,
                    phone: r.phone,
                    name: r.name,
                    role: r.role,
                    shift: r.shift,
                })
            )
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
        console.error(`[ShiftReminderCron] ${failed.length} reminder(s) failed to schedule`);
    }
}

async function runDailyReminders() {
    // Redis mutex — only one cluster worker executes per day
    const locked = await redis.set("cron:shift-reminder:lock", "1", { NX: true, EX: 3600 });
    if (!locked) return;

    console.log("[ShiftReminderCron] Running daily shift reminder scheduling...");
    await scheduleShiftReminders().catch((err) => console.error("[ShiftReminderCron] Failed:", err.message));
}

export function startShiftReminderCron() {
    // Runs daily at 00:05 AM IST — safely before any shift reminder fire time
    cron.schedule("5 0 * * *", runDailyReminders, { timezone: "Asia/Kolkata" });
    console.log("[ShiftReminderCron] Started — daily 00:05 IST");
}
