import { asyncHandler } from "#utils/async.handler.js";
import Admin from "#models/Admin.js";
import { sendEmailOTP, verifyEmailOTP } from "#services/mailer/mail.service.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateEmail, validateRequiredFields } from "#utils/validators.js";

export const send_email_otp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  // For general verification, we don't necessarily want to block existing emails.
  // If specific routes need that check, they should implement it or we add a query param.
  // Const user = await Admin.findOne({ email: emailValidation.normalized });
  // if (user) return errorResponse(res, "Email already exists", 409);

  await sendEmailOTP(emailValidation.normalized);

  return successResponse(res, "Email sent successfully", null, 201);
}, "AUTH_EMAIL_OTP_ERROR");

export const send_phone_otp = asyncHandler(async (req, res) => {
  return successResponse(res, "Phone OTP sent");
}, "AUTH_PHONE_OTP_ERROR");

export const verify_email_otp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const requiredCheck = validateRequiredFields({ email, otp }, ["email", "otp"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  await verifyEmailOTP(emailValidation.normalized, otp);

  return successResponse(res, "Email verified");
}, "AUTH_VERIFY_EMAIL_OTP_ERROR");

export const verify_phone_otp = asyncHandler(async (req, res) => {
  return successResponse(res, "Phone OTP verified");
}, "AUTH_VERIFY_PHONE_OTP_ERROR");
