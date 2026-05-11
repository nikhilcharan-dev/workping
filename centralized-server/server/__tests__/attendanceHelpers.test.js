import "../globals.js";
import { calculateTrendData, calculateTeamRates, getDateBoundaries, getTodayAttendanceSummary } from "../controllers/web/admin/attendance/helpers.js";
import Attendance from "#models/Attendance.js";
import mongoose from "mongoose";

describe("Attendance Helpers", () => {
  describe("getDateBoundaries", () => {
    it("returns today's boundaries when no date provided", () => {
      const { dayStart, dayEnd } = getDateBoundaries();
      expect(dayStart.getHours()).toBe(0);
      expect(dayStart.getMinutes()).toBe(0);
      expect(dayStart.getSeconds()).toBe(0);
      expect(dayEnd.getHours()).toBe(23);
      expect(dayEnd.getMinutes()).toBe(59);
      expect(dayEnd.getSeconds()).toBe(59);
    });

    it("returns correct boundaries for provided date", () => {
      const testDate = new Date("2025-01-15");
      const { dayStart, dayEnd } = getDateBoundaries(testDate);
      expect(dayStart.getFullYear()).toBe(2025);
      expect(dayStart.getMonth()).toBe(0);
      expect(dayStart.getDate()).toBe(15);
      expect(dayEnd.getDate()).toBe(15);
    });
  });

  describe("calculateTeamRates", () => {
    it("returns zero rate for teams with no members", () => {
      const teams = [{ _id: new mongoose.Types.ObjectId(), teamName: "Empty Team" }];
      const users = [];
      const todayRecords = [];

      const rates = calculateTeamRates(teams, users, todayRecords);

      expect(rates).toHaveLength(1);
      expect(rates[0].rate).toBe(0);
      expect(rates[0].present).toBe(0);
      expect(rates[0].total).toBe(0);
    });

    it("calculates correct attendance rate for team with mixed status", () => {
      const teamId = new mongoose.Types.ObjectId();
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      const teams = [{ _id: teamId, teamName: "QA Team" }];
      const users = [
        { _id: userId1, teamId },
        { _id: userId2, teamId },
      ];
      const todayRecords = [
        { userId: userId1, status: "present" },
      ];

      const rates = calculateTeamRates(teams, users, todayRecords);

      expect(rates[0].total).toBe(2);
      expect(rates[0].present).toBe(1);
      expect(rates[0].rate).toBe(50);
    });

    it("handles users without team assignment", () => {
      const teamId = new mongoose.Types.ObjectId();
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      const teams = [{ _id: teamId, teamName: "Dev Team" }];
      const users = [
        { _id: userId1, teamId },
        { _id: userId2, teamId: null },
      ];
      const todayRecords = [{ userId: userId1, status: "present" }];

      const rates = calculateTeamRates(teams, users, todayRecords);

      expect(rates[0].total).toBe(1);
      expect(rates[0].present).toBe(1);
      expect(rates[0].rate).toBe(100);
    });

    it("returns 100% rate when all team members present", () => {
      const teamId = new mongoose.Types.ObjectId();
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

      const teams = [{ _id: teamId, teamName: "Full Team" }];
      const users = userIds.map((id) => ({ _id: id, teamId }));
      const todayRecords = userIds.map((userId) => ({ userId, status: "present" }));

      const rates = calculateTeamRates(teams, users, todayRecords);

      expect(rates[0].rate).toBe(100);
      expect(rates[0].present).toBe(3);
    });
  });

  describe("getTodayAttendanceSummary", () => {
    beforeEach(async () => {
      await Attendance.deleteMany({});
    });

    it("returns zero counts when no attendance records exist", async () => {
      const userIds = [new mongoose.Types.ObjectId()];
      const { dayStart, dayEnd } = getDateBoundaries();

      const { summary, records } = await getTodayAttendanceSummary(userIds, dayStart, dayEnd);

      expect(summary.present).toBe(0);
      expect(summary.absent).toBe(0);
      expect(summary.total).toBe(1);
      expect(records).toHaveLength(0);
    });

    it("counts attendance records by status correctly", async () => {
      const today = new Date();
      const { dayStart, dayEnd } = getDateBoundaries(today);
      const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

      await Attendance.create([
        { userId: userIds[0], date: new Date(), status: "present" },
        { userId: userIds[1], date: new Date(), status: "absent" },
        { userId: userIds[2], date: new Date(), status: "late" },
      ]);

      const { summary, records } = await getTodayAttendanceSummary(userIds, dayStart, dayEnd);

      expect(summary.present).toBe(1);
      expect(summary.absent).toBe(1);
      expect(summary.late).toBe(1);
      expect(summary.halfDay).toBe(0);
      expect(summary.total).toBe(3);
      expect(records).toHaveLength(3);
    });

    it("only counts records within date boundaries", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const { dayStart, dayEnd } = getDateBoundaries(today);

      const userIds = [new mongoose.Types.ObjectId()];

      await Attendance.create([
        { userId: userIds[0], date: yesterday, status: "present" },
        { userId: userIds[0], date: new Date(), status: "present" },
      ]);

      const { summary, records } = await getTodayAttendanceSummary(userIds, dayStart, dayEnd);

      expect(records).toHaveLength(1);
      expect(summary.present).toBe(1);
    });

    it("includes all status types in summary", async () => {
      const { dayStart, dayEnd } = getDateBoundaries();
      const userId = new mongoose.Types.ObjectId();

      const { summary } = await getTodayAttendanceSummary([userId], dayStart, dayEnd);

      expect(summary).toHaveProperty("present");
      expect(summary).toHaveProperty("absent");
      expect(summary).toHaveProperty("late");
      expect(summary).toHaveProperty("halfDay");
      expect(summary).toHaveProperty("total");
    });
  });

  describe("calculateTrendData", () => {
    beforeEach(async () => {
      await Attendance.deleteMany({});
    });

    it("returns empty trend for users with no records", async () => {
      const userIds = [new mongoose.Types.ObjectId()];

      const trend = await calculateTrendData(userIds);

      expect(trend).toEqual({});
    });

    it("groups attendance by date and status correctly", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      await Attendance.create([
        { userId: userId1, date: today, status: "present" },
        { userId: userId2, date: today, status: "present" },
        { userId: userId1, date: today, status: "absent" },
        { userId: userId2, date: yesterday, status: "late" },
      ]);

      const trend = await calculateTrendData([userId1, userId2]);

      const todayKey = today.toISOString().split("T")[0];
      const yesterdayKey = yesterday.toISOString().split("T")[0];

      expect(trend[todayKey]).toBeDefined();
      expect(trend[todayKey].present).toBe(2);
      expect(trend[todayKey].absent).toBe(1);
      expect(trend[yesterdayKey].late).toBe(1);
    });

    it("covers 30-day period correctly", async () => {
      const userId = new mongoose.Types.ObjectId();
      const today = new Date();

      const dates = [];
      for (let i = 0; i < 35; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d);
      }

      await Promise.all(
        dates.map((date) =>
          Attendance.create({
            userId,
            date,
            status: i % 2 === 0 ? "present" : "absent",
          })
        )
      );

      const trend = await calculateTrendData([userId]);

      const trendKeys = Object.keys(trend);
      expect(trendKeys.length).toBeLessThanOrEqual(30);
    });

    it("initializes all status fields for each date", async () => {
      const userId = new mongoose.Types.ObjectId();
      const today = new Date();

      await Attendance.create({
        userId,
        date: today,
        status: "present",
      });

      const trend = await calculateTrendData([userId]);

      const todayKey = today.toISOString().split("T")[0];
      const dayTrend = trend[todayKey];

      expect(dayTrend).toHaveProperty("present");
      expect(dayTrend).toHaveProperty("absent");
      expect(dayTrend).toHaveProperty("late");
      expect(dayTrend).toHaveProperty("halfDay");
    });
  });
});
