import { Router } from "express";
import {
  send_email_otp,
  verify_email_otp,
  send_phone_otp,
  verify_phone_otp,
} from "#webController/admin/otp/controller.js";

const router = Router();

router.post("/send-email-otp", send_email_otp);
router.post("/verify-email-otp", verify_email_otp);
router.post("/send-phone-otp", send_phone_otp);
router.post("/verify-phone-otp", verify_phone_otp);
export default router;
