import { Router } from "express";
import redis from "../config/redisConfig.js";
import { sendEmailOTP, sendResetPasswordOTP } from "../mail/mailer.js";

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

/* ─── Send Email Verification OTP ─── */
router.post("/send-email-otp", validateEmail, async (req, res) => {
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
router.post("/send-reset-password-otp", validateEmail, async (req, res) => {
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
    if (OTP !== otp) return res.status(400).json({ status: "error", error: "Invalid OTP" });

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

router.post("/send-phone-otp", async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }
    const otp = generatorOtp(6);
    // await sendPhoneOTP(phone, otp);
    // await redis.set(`otp:phone:${phone}`, otp, { EX: 30 * 60 } );
    res.status(200).json({
      status: "success",
    });
  } catch (err) {
    console.log(err);
  }
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

    if (OTP !== otp)
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

router.post("/verify-phone-otp", async (req, res) => {
  const { phone, otp } = req.body;
  try {
    if (!phone || !otp) {
      return res.status(400).json({
        error: "Invalid Fields",
      });
    }

    if (phone.length !== 10) {
      return res.status(400).json({
        error: "Invalid Phone",
      });
    }

    // const OTP = await redis.get(`otp:phone:${phone}`);

    res.status(200).json({
      verified: true,
      status: "success",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

export default router;
