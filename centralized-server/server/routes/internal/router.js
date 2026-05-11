import { Router } from "express";
import crypto from "crypto";
import {
  getEmployeeByPhone,
  getAttendanceToday,
  getAttendanceWeek,
  getLeaveBalance,
  getRecentLeaves,
  applyLeave,
  decideLeave,
  getUserShift,
  getUpcomingHolidays,
  getSalarySlip,
  fileComplaint,
  raiseFrsTicket,
} from "../../controllers/internal/controller.js";

const router = Router();

// Shared-secret guard — all internal routes require x-internal-secret
router.use((req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const secretBuf = Buffer.from(secret);
    const expectedBuf = Buffer.from(process.env.INTERNAL_SECRET || "");
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

router.get("/employee/by-phone/:phone", getEmployeeByPhone);
router.get("/attendance/today/:userId", getAttendanceToday);
router.get("/attendance/week/:userId", getAttendanceWeek);
router.get("/leave/balance/:userId", getLeaveBalance);
router.get("/leave/recent/:userId", getRecentLeaves);
router.post("/leave/apply", applyLeave);
router.post("/leave/decide", decideLeave);
router.get("/shift/:userId", getUserShift);
router.get("/holidays/:organizationId", getUpcomingHolidays);
router.get("/salary/:userId", getSalarySlip);
router.post("/complaint", fileComplaint);
router.post("/frs-ticket", raiseFrsTicket);

export default router;
