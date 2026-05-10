import { Router } from "express";
import * as Auth from "#webController/admin/auth/controller.js";
import {
  send_otp,
  verify_otp,
  verify_otp_and_change_password,
} from "#webController/admin/forgotPassword/controller.js";
import validateCookie from "#middleware/jwtBearer.js";

const router = Router();

router.post("/register", Auth.register);
router.post("/login", Auth.login);
router.post("/logout", validateCookie, Auth.logout);

// Forgot password routes (delegated to forgotPassword controller)
router.post("/forgot-password/send-otp", send_otp);
router.post("/forgot-password/verify-otp", verify_otp);
router.post("/forgot-password/reset", verify_otp_and_change_password);

export default router;
