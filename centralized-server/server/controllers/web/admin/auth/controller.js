import { asyncHandler } from "#utils/async.handler.js";
import Admin from "#models/Admin.js";
import Account from "#models/Account.js";
import mongoose from "mongoose";
import { sendEmailOTP, verifyEmailOTP } from "#services/mailer/mail.service.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { setAuthCookie, clearAuthCookie } from "#utils/cookie.helper.js";
import { generateTokenPair, revokeAllTokens, blacklistToken } from "#utils/token.helper.js";
import { recordFailedAttempt, clearFailedAttempts } from "#middleware/bruteForce.js";
import { validateEmail, validatePassword, validateRequiredFields } from "#utils/validators.js";
import {
  validateRegistrationInput,
  checkEmailDuplicate,
  hashPassword,
  validateLoginCredentials,
  getAdminWithProfile,
  processProfileUpdates,
  isNewPasswordDifferent,
  verifyPasswordMatch,
} from "./helpers.js";

/**
 * Create admin and account records in a transaction
 */
async function createAdminAndAccountTransaction(name, email, phoneNumber, hashedPassword) {
  const session = await mongoose.startSession();
  session.startTransaction();
  let user;
  try {
    [user] = await Admin.create(
      [
        {
          name,
          email,
          phoneNumber,
        },
      ],
      { session }
    );

    await Account.create(
      [
        {
          password: hashedPassword,
          email,
          role: "admin",
          twoFactorEnabled: false,
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
  return user;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, number: phoneNumber } = req.body;

  const requiredCheck = validateRequiredFields({ name, email, password, phoneNumber }, [
    "name",
    "email",
    "password",
    "phoneNumber",
  ]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const validationResult = await validateRegistrationInput(name, email, password, phoneNumber);
  if (!validationResult.valid) return errorResponse(res, validationResult.error);

  const duplicateCheck = await checkEmailDuplicate(validationResult.emailValidation.normalized);
  if (duplicateCheck.exists) return errorResponse(res, duplicateCheck.message, 409);

  const hashedPassword = await hashPassword(password);

  const user = await createAdminAndAccountTransaction(
    validationResult.nameValidation.normalized,
    validationResult.emailValidation.normalized,
    validationResult.phoneValidation.normalized,
    hashedPassword
  );

  const { accessToken, refreshToken } = await generateTokenPair({ userId: user._id, role: "admin" }, req);

  setAuthCookie(res, req, accessToken);

  return successResponse(
    res,
    "Register Successful",
    {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      token: accessToken,
      refreshToken,
    },
    201
  );
}, "REGISTER_ADMIN_CONTROLLER_ERROR");

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const requiredCheck = validateRequiredFields({ email, password }, ["email", "password"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const loginCheck = await validateLoginCredentials(email, password, res);
  if (!loginCheck.success) {
    if (loginCheck.isNotAdmin) {
      await recordFailedAttempt(loginCheck.normalizedEmail);
      return errorResponse(res, "Admin does not exist", 401);
    }
    if (loginCheck.isInactive) {
      return errorResponse(res, "Account has been deactivated. Please contact support.", 403);
    }
    if (loginCheck.isInvalidPassword) {
      await recordFailedAttempt(loginCheck.normalizedEmail);
      return errorResponse(res, "Invalid credentials", 401);
    }
  }

  await clearFailedAttempts(loginCheck.normalizedEmail);

  const admin = await Admin.findOne({ email: loginCheck.normalizedEmail });
  if (!admin) return errorResponse(res, "Admin profile not found", 401);

  const { accessToken, refreshToken } = await generateTokenPair({ userId: admin._id, role: "admin" }, req);

  setAuthCookie(res, req, accessToken);

  return successResponse(res, "Login Successful", {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    phoneNumber: admin.phoneNumber,
    token: accessToken,
    refreshToken,
  });
}, "LOGIN_ADMIN_ERROR");

export const logout = asyncHandler(async (req, res) => {
  if (req.user?.userId) {
    await revokeAllTokens(req.user.userId);
  }
  if (req.accessToken) {
    await blacklistToken(req.accessToken);
  }
  clearAuthCookie(res, req);
  return successResponse(res, "Logout successful");
}, "ADMIN_LOGOUT_ERROR");

export const forgot_password_send_otp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const admin = await Admin.findOne({ email: emailValidation.normalized });
  if (!admin) return errorResponse(res, "Admin not found", 404);

  let result;
  try {
    result = await sendEmailOTP(emailValidation.normalized);
  } catch (err) {
    return errorResponse(res, "Failed to send OTP", 500);
  }
  if (!result || result.status !== "success") {
    return errorResponse(res, "Something went wrong", 401);
  }
  return successResponse(res, "OTP sent successfully");
}, "FORGOT_PASSWORD_SEND_OTP_ERROR");

export const forgot_password_verify_otp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const requiredCheck = validateRequiredFields({ email, otp }, ["email", "otp"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  let result;
  try {
    result = await verifyEmailOTP(emailValidation.normalized, otp);
  } catch (err) {
    return errorResponse(res, "Failed to verify OTP", 500);
  }
  if (!result || result.status !== "success") {
    return errorResponse(res, "Invalid OTP", 401);
  }
  return successResponse(res, "OTP Verification Successful");
}, "FORGOT_PASSWORD_VERIFY_OTP_ERROR");

export const forgot_password_reset = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const requiredCheck = validateRequiredFields({ email, otp, newPassword }, ["email", "otp", "newPassword"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

  let result;
  try {
    result = await verifyEmailOTP(emailValidation.normalized, otp);
  } catch (err) {
    return errorResponse(res, "Failed to verify OTP", 500);
  }
  if (!result || result.status !== "success") {
    return errorResponse(res, "Invalid OTP", 401);
  }

  const account = await Account.findOne({ email: emailValidation.normalized, role: "admin" });
  if (!account) return errorResponse(res, "Admin account not found", 404);

  const isDifferent = await isNewPasswordDifferent(newPassword, account.password);
  if (!isDifferent) return errorResponse(res, "New password cannot be the same as current password");

  account.password = await hashPassword(newPassword);
  await account.save();

  return successResponse(res, "Password reset successful");
}, "FORGOT_PASSWORD_RESET_ERROR");

export const getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const admin = await getAdminWithProfile(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);
  return successResponse(res, "Admin profile fetched", admin);
}, "ADMIN_GET_PROFILE_ERROR");

export const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  const account = await Account.findOne({ email: admin.email, role: "admin" });
  if (!account) return errorResponse(res, "Account not found", 404);

  const updateResult = await processProfileUpdates(req.body, admin.email, res);
  if (!updateResult.success) return errorResponse(res, "Invalid profile update fields");

  if (!updateResult.hasChanges) {
    return errorResponse(res, "No valid fields to update");
  }

  if (Object.keys(updateResult.accountUpdates).length > 0) {
    await Account.findByIdAndUpdate(account._id, updateResult.accountUpdates);
  }

  const updatedAdmin = await Admin.findByIdAndUpdate(userId, updateResult.updates, { new: true, runValidators: true });
  return successResponse(res, "Admin profile updated", updatedAdmin);
}, "ADMIN_UPDATE_PROFILE_ERROR");

export const changePassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;

  const requiredCheck = validateRequiredFields({ currentPassword, newPassword }, ["currentPassword", "newPassword"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  const account = await Account.findOne({ email: admin.email, role: "admin" });
  if (!account) return errorResponse(res, "Account not found", 404);

  const isCurrentPasswordCorrect = await verifyPasswordMatch(currentPassword, account.password);
  if (!isCurrentPasswordCorrect) return errorResponse(res, "Current password is incorrect", 401);

  const isDifferent = await isNewPasswordDifferent(newPassword, account.password);
  if (!isDifferent) return errorResponse(res, "New password cannot be the same as current password");

  account.password = await hashPassword(newPassword);
  await account.save();

  // Invalidate all sessions so other devices must re-authenticate
  await revokeAllTokens(userId);
  if (req.accessToken) {
    await blacklistToken(req.accessToken);
  }

  return successResponse(res, "Password changed successfully");
}, "ADMIN_CHANGE_PASSWORD_ERROR");

export const deactivateAccount = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { password } = req.body;

  if (!password) return errorResponse(res, "Password is required to deactivate account");

  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  const account = await Account.findOne({ email: admin.email, role: "admin" });
  if (!account) return errorResponse(res, "Account not found", 404);

  const isPasswordCorrect = await verifyPasswordMatch(password, account.password);
  if (!isPasswordCorrect) return errorResponse(res, "Invalid password", 401);

  // Deactivate the account — mark as inactive so login is blocked
  account.isActive = false;
  account.deactivatedAt = new Date();
  await account.save();

  // Revoke all refresh tokens so existing sessions are invalidated
  await revokeAllTokens(userId);

  clearAuthCookie(res, req);

  return successResponse(res, "Account deactivated successfully");
}, "ADMIN_DEACTIVATE_ACCOUNT_ERROR");

export const verifyPassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { password } = req.body;

  if (!password) return errorResponse(res, "Password is required");

  const admin = await Admin.findById(userId);
  if (!admin) return errorResponse(res, "Admin not found", 404);

  const account = await Account.findOne({ email: admin.email, role: "admin" });
  if (!account) return errorResponse(res, "Account not found", 404);

  const isPasswordCorrect = await verifyPasswordMatch(password, account.password);
  if (!isPasswordCorrect) return errorResponse(res, "Incorrect password", 401);

  return successResponse(res, "Password verified");
}, "ADMIN_VERIFY_PASSWORD_ERROR");
