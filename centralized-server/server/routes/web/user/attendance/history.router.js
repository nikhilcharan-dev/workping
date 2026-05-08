import { Router } from "express";
import {
    getMyAttendance,
    getAttendanceByDate,
    getMyAttendanceSummary,
} from "#webController/user/attendance/history.controller.js";

const router = Router();

router.get("/my-attendance", getMyAttendance);
router.get("/by-date", getAttendanceByDate);
router.get("/summary", getMyAttendanceSummary);

export default router;
