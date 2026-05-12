import { Router } from "express";
import redis from "../config/redisConfig.js";
import { sendEmailOTP, sendResetPasswordOTP } from "../mail/mailer.js";
import { perRecipientRateLimit } from "../utils/rateLimit.js";

const router = Router();

import crypto from "crypto";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ status: "error", error: "Valid email is required" });
  }
  next();
};

const generatorOtp = (len) => {
  return crypto
    .randomInt(0, 10 ** len)
    .toString()
    .padStart(len, "0");
};

// timingSafeEqual throws on length mismatch. Wrap so a user-supplied OTP of
// the wrong length cleanly fails (HTTP 400) instead of bubbling up as 500.
function constantTimeEquals(a, b) {
  const aStr = String(a);
  const bStr = String(b);
  if (aStr.length !== bStr.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(aStr), Buffer.from(bStr));
  } catch {
    return false;
  }
}

/* ─── Send Email Verification OTP ─── */
// Rate-limit by recipient — only SEND, not verify. Rate-limiting verify would
// let an attacker burn the legitimate user's retry budget.
router.post("/send-email-otp", validateEmail, perRecipientRateLimit(), async (req, res) => {
  const { email } = req.body;
  try {
    const otp = generatorOtp(6);

    await redis.set(`otp:email:${email}`, otp, { EX: 30 * 60 });

    await sendEmailOTP(email, otp);

    return res.status(200).json({
      status: "success",
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("[OTP Error]", err);
    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
    });
  }
});

/* ─── Send Reset Password OTP ─── */
router.post("/send-reset-password-otp", validateEmail, perRecipientRateLimit(), async (req, res) => {
  const { email } = req.body;
  try {
    const otp = generatorOtp(6);

    await redis.set(`otp:reset:${email}`, otp, { EX: 10 * 60 });

    await sendResetPasswordOTP(email, otp);

    return res.status(200).json({
      status: "success",
      message: "Reset password OTP sent successfully",
    });
  } catch (err) {
    console.error("[OTP Error]", err);
    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
    });
  }
});

/* ─── Verify Reset Password OTP ─── */
router.post("/verify-reset-password-otp", validateEmail, async (req, res) => {
  const { email, otp } = req.body;
  try {
    const OTP = await redis.get(`otp:reset:${email}`);
    if (!OTP) return res.status(400).json({ status: "error", error: "OTP expired or not found" });
    if (!constantTimeEquals(OTP, otp)) {
      return res.status(400).json({ status: "error", error: "Invalid OTP" });
    }

    await redis.del(`otp:reset:${email}`);
    return res.status(200).json({
      status: "success",
      verified: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error("[OTP Error]", err);
    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
    });
  }
});

// Phone OTP delivery is not implemented in this service. Previously these
// handlers returned `success: true` / `verified: true` without doing anything,
// which would silently authenticate any caller that wired them into a real
// flow. Fail loudly instead — a 501 makes the gap visible to callers.
router.post("/send-phone-otp", (_req, res) => {
  return res.status(501).json({ status: "error", error: "Phone OTP delivery is not implemented" });
});

router.post("/verify-email-otp", validateEmail, async (req, res) => {
  const { email, otp } = req.body;
  try {
    const OTP = await redis.get(`otp:email:${email}`);
    if (!OTP)
      return res.status(400).json({
        status: "error",
        error: "OTP expired or not found",
      });

    if (!constantTimeEquals(OTP, otp))
      return res.status(400).json({
        status: "error",
        error: "Invalid OTP",
      });

    await redis.del(`otp:email:${email}`);
    return res.status(200).json({
      status: "success",
      verified: true,
      message: "Email OTP verified successfully",
    });
  } catch (err) {
    console.error("[OTP Error]", err);
    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
    });
  }
});

router.post("/verify-phone-otp", (_req, res) => {
  return res.status(501).json({ status: "error", error: "Phone OTP verification is not implemented" });
});

export default router;
