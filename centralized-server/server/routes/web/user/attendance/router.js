import express from "express";
import { upload } from "./multer.js";
import validateCookie from "#middleware/jwtBearer.js";
import {
  verify_mark_attendance,
  verify_mark_attendance_status,
  verify_location,
} from "#webController/user/attendance/controller.js";

const router = express.Router();

router.post("/verify-location", validateCookie, verify_location);

router.post(
  "/verify-mark-attendance",
  validateCookie,
  upload.array("frames", 5), // 👈 matches frontend
  verify_mark_attendance
);

router.get("/status/:ticketId", validateCookie, verify_mark_attendance_status);

export default router;
