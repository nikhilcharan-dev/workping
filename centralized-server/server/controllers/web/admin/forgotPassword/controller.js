import Account from "#models/Account.js";
import { sendResetPasswordOTP, verifyResetPasswordOTP } from "#services/mailer/mail.service.js";
import bcrypt from "bcrypt";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateEmail, validatePassword, validateOTP, validateRequiredFields } from "#utils/validators.js";

export const send_otp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const findAdmin = await Account.findOne({ email: emailValidation.normalized });

  if (!findAdmin) {
    // Intentionally vague for security
    return successResponse(res, "If an admin exists with this email, an OTP will be sent");
  }

  try {
    await sendResetPasswordOTP(emailValidation.normalized);
  } catch (err) {
    return errorResponse(res, "Something went wrong sending OTP", 500);
  }

  return successResponse(res, "If an admin exists with this email, an OTP will be sent");
}, "FORGOT_PASSWORD_SEND_OTP_ERROR");

export const verify_otp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const requiredCheck = validateRequiredFields({ email, otp }, ["email", "otp"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const otpValidation = validateOTP(otp);
  if (!otpValidation.valid) return errorResponse(res, otpValidation.error);

  const findAdmin = await Account.findOne({ email: emailValidation.normalized });
  if (!findAdmin) return errorResponse(res, "Verification failed", 401);

  try {
    await verifyResetPasswordOTP(emailValidation.normalized, otp);
  } catch (err) {
    return errorResponse(res, "Invalid OTP", 401);
  }

  return successResponse(res, "OTP Verification Successful");
}, "FORGOT_PASSWORD_VERIFY_OTP_ERROR");

export const verify_otp_and_change_password = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const requiredCheck = validateRequiredFields({ email, otp, newPassword }, ["email", "otp", "newPassword"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

  const account = await Account.findOne({ email: emailValidation.normalized, role: "admin" });
  if (!account) return errorResponse(res, "Admin does not exist", 401);

  try {
    await verifyResetPasswordOTP(emailValidation.normalized, otp);
  } catch (err) {
    return errorResponse(res, "Password change failed. Invalid OTP.", 401);
  }

  const isMatch = await bcrypt.compare(newPassword, account.password);
  if (isMatch) return errorResponse(res, "New password cannot be the same as current password");

  account.password = await bcrypt.hash(newPassword, 10);
  await account.save();

  return successResponse(res, "Password changed successfully");
}, "CHANGE_PASSWORD_ERROR");
