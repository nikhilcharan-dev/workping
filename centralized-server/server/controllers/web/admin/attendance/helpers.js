import Attendance from "#models/Attendance.js";
import mongoose from "mongoose";

export async function calculateTrendData(userIds, startDate = null) {
  const thirtyDaysAgo = startDate || new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const trendAgg = await Attendance.aggregate([
    {
      $match: {
        userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
        date: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  const trend = {};
  trendAgg.forEach((r) => {
    const d = r._id.date;
    if (!trend[d]) trend[d] = { present: 0, absent: 0, late: 0, halfDay: 0 };
    trend[d][r._id.status] = r.count;
  });

  return trend;
}

export function calculateTeamRates(teams, users, todayRecords) {
  const teamUserMap = {};
  users.forEach((u) => {
    if (u.teamId) {
      const tid = u.teamId.toString();
      if (!teamUserMap[tid]) teamUserMap[tid] = [];
      teamUserMap[tid].push(u._id);
    }
  });

  return teams.map((t) => {
    const tid = t._id.toString();
    const tUsers = teamUserMap[tid] || [];
    if (!tUsers.length) return { teamId: tid, teamName: t.teamName, rate: 0, present: 0, total: 0 };
    const presentInTeam = todayRecords.filter(
      (r) => tUsers.some((id) => id.toString() === r.userId.toString()) && r.status === "present"
    ).length;
    return {
      teamId: tid,
      teamName: t.teamName,
      rate: Math.round((presentInTeam / tUsers.length) * 100),
      present: presentInTeam,
      total: tUsers.length,
    };
  });
}

export function getDateBoundaries(queryDate = null) {
  const date = queryDate ? new Date(queryDate) : new Date();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
}

export async function getTodayAttendanceSummary(userIds, dayStart, dayEnd) {
  const todayRecords = await Attendance.find({
    userId: { $in: userIds },
    date: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  const summary = { present: 0, absent: 0, late: 0, halfDay: 0, total: userIds.length };
  todayRecords.forEach((r) => {
    if (summary[r.status] !== undefined) summary[r.status]++;
  });

  return { summary, records: todayRecords };
}
