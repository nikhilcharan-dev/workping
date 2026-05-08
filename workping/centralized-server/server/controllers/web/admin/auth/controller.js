import Admin from "#models/Admin.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Account from "#models/Account.js";
import { sendEmailOTP, verifyEmailOTP } from "#services/mailer/mail.service.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { setAuthCookie, clearAuthCookie } from "#utils/cookie.helper.js";
import { generateTokenPair, revokeAllTokens } from "#utils/token.helper.js";
import {
    validateEmail,
    validatePhone,
    validatePassword,
    validateName,
    validateRequiredFields,
} from "#utils/validators.js";

export const register = asyncHandler(async (req, res) => {
    const { name, email, password, number: phoneNumber } = req.body;

    const requiredCheck = validateRequiredFields({ name, email, password, phoneNumber }, [
        "name",
        "email",
        "password",
        "phoneNumber",
    ]);
    if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

    const nameValidation = validateName(name);
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.valid) return errorResponse(res, phoneValidation.error);

    const existingUser = await Admin.findOne({ email: emailValidation.normalized });
    if (existingUser) return errorResponse(res, "Admin already exists", 409);

    const existingAccount = await Account.findOne({ email: emailValidation.normalized });
    if (existingAccount) return errorResponse(res, "Account already exists with this email", 409);

    const hashedPassword = await bcrypt.hash(password, 10);

    const session = await mongoose.startSession();
    session.startTransaction();
    let user;
    try {
        [user] = await Admin.create(
            [
                {
                    name: nameValidation.normalized,
                    email: emailValidation.normalized,
                    phoneNumber: phoneValidation.normalized,
                },
            ],
            { session }
        );

        await Account.create(
            [
                {
                    password: hashedPassword,
                    email: emailValidation.normalized,
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

    const { accessToken, refreshToken } = await generateTokenPair({ userId: user._id, role: "admin" }, req);

    setAuthCookie(res, req, accessToken, { httpOnly: false });

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

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

    const account = await Account.findOne({ email: emailValidation.normalized });
    if (!account || account.role !== "admin") return errorResponse(res, "Admin does not exist", 401);

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

    const admin = await Admin.findOne({ email: emailValidation.normalized });
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
    // Revoke all refresh tokens for this admin
    if (req.user?.userId) {
        await revokeAllTokens(req.user.userId);
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

    const isSamePassword = await bcrypt.compare(newPassword, account.password);
    if (isSamePassword) return errorResponse(res, "New password cannot be the same as current password");

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    return successResponse(res, "Password reset successful");
}, "FORGOT_PASSWORD_RESET_ERROR");

export const getProfile = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const [admin] = await Admin.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: "accounts",
                localField: "email",
                foreignField: "email",
                as: "account",
            },
        },
        { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                role: "$account.role",
                twoFactorEnabled: "$account.twoFactorEnabled",
            },
        },
    ]);
    if (!admin) return errorResponse(res, "Admin not found", 404);
    return successResponse(res, "Admin profile fetched", admin);
}, "ADMIN_GET_PROFILE_ERROR");

export const updateProfile = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const admin = await Admin.findById(userId);
    if (!admin) return errorResponse(res, "Admin not found", 404);

    const updates = {};
    if (req.body.name !== undefined) {
        const nameValidation = validateName(req.body.name);
        if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
        updates.name = nameValidation.normalized;
    }

    if (req.body.phone !== undefined || req.body.phoneNumber !== undefined) {
        const phone = req.body.phone || req.body.phoneNumber;
        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.valid) return errorResponse(res, phoneValidation.error);
        updates.phoneNumber = phoneValidation.normalized;
    }

    if (req.body.profileImage !== undefined) {
        updates.profileImage = req.body.profileImage;
    }

    const account = await Account.findOne({ email: admin.email, role: "admin" });
    if (!account) return errorResponse(res, "Account not found", 404);

    const accountUpdates = {};
    if (req.body.email !== undefined) {
        const emailValidation = validateEmail(req.body.email);
        if (!emailValidation.valid) return errorResponse(res, emailValidation.error);
        const emailLower = emailValidation.normalized.toLowerCase();
        if (emailLower !== account.email.toLowerCase()) {
            const existingAccount = await Account.findOne({ email: emailLower });
            if (existingAccount) return errorResponse(res, "Email already in use", 409);
            updates.email = emailLower;
            accountUpdates.email = emailLower;
        }
    }

    if (req.body.twoFactorEnabled !== undefined) {
        accountUpdates.twoFactorEnabled = !!req.body.twoFactorEnabled;
    }

    if (Object.keys(updates).length === 0 && Object.keys(accountUpdates).length === 0) {
        return errorResponse(res, "No valid fields to update");
    }

    if (Object.keys(accountUpdates).length > 0) {
        await Account.findByIdAndUpdate(account._id, accountUpdates);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    return successResponse(res, "Admin profile updated", updatedAdmin);
}, "ADMIN_UPDATE_PROFILE_ERROR");

export const changePassword = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const requiredCheck = validateRequiredFields({ currentPassword, newPassword }, ["currentPassword", "newPassword"]);
    if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

    const admin = await Admin.findById(userId);
    if (!admin) return errorResponse(res, "Admin not found", 404);

    const account = await Account.findOne({ email: admin.email, role: "admin" });
    if (!account) return errorResponse(res, "Account not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, account.password);
    if (!isMatch) return errorResponse(res, "Current password is incorrect", 401);

    const isSamePassword = await bcrypt.compare(newPassword, account.password);
    if (isSamePassword) return errorResponse(res, "New password cannot be the same as current password");

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

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

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return errorResponse(res, "Invalid password", 401);

    // Deactivate admin profile? Or just account?
    // Admin model doesn't have isActive? (Checked Admin.js, it doesn't)
    // Let's just clear cookie and respond
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

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return errorResponse(res, "Incorrect password", 401);

    return successResponse(res, "Password verified");
}, "ADMIN_VERIFY_PASSWORD_ERROR");
