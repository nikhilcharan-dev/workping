import { Router } from "express";
import {
  send_otp,
  verify_otp_and_change_password,
  verify_otp,
} from "#webController/admin/forgotPassword/controller.js";

const router = Router();

router.post("/send-otp", send_otp);
router.post("/verify-otp", verify_otp);
router.post("/verify-and-change", verify_otp_and_change_password);

export default router;
