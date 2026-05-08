import User from "#models/User.js";
import Account from "#models/Account.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { uploadFile, deleteObject } from "#services/storage/oracle.service.js";
import { formatUserDates } from "#helpers/data.reducer.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { clearAuthCookie } from "#utils/cookie.helper.js";
import {
    validateEmail,
    validatePhone,
    validatePassword,
    validateName,
    validateDate,
    validateEnum,
    validateString,
    validateRequiredFields,
} from "#utils/validators.js";

const userProfileLookupPipeline = [
    {
        $lookup: {
            from: "organizations",
            localField: "organizationId",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1, type: 1 } }],
            as: "organization",
        },
    },
    { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: "teams",
            localField: "teamId",
            foreignField: "_id",
            pipeline: [{ $project: { teamName: 1, description: 1 } }],
            as: "team",
        },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
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
];

export const getProfile = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const [user] = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        ...userProfileLookupPipeline,
    ]);

    if (!user) return errorResponse(res, "User not found", 404);

    return successResponse(res, "Profile fetched", formatUserDates(user));
}, "USER_GET_PROFILE_ERROR");

export const updateProfile = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    const updates = {};

    if (req.body.name !== undefined) {
        const nameValidation = validateName(req.body.name);
        if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
        updates.name = nameValidation.normalized;
    }

    if (req.body.phone !== undefined) {
        const phoneValidation = validatePhone(req.body.phone);
        if (!phoneValidation.valid) return errorResponse(res, phoneValidation.error);
        const existingPhone = await User.findOne({
            phone: phoneValidation.normalized,
            _id: { $ne: userId },
        });
        if (existingPhone) return errorResponse(res, "Phone number already in use", 409);
        updates.phone = phoneValidation.normalized;
    }

    if (req.body.gender !== undefined) {
        const genderValidation = validateEnum(req.body.gender, ["male", "female", "other"], "Gender");
        if (!genderValidation.valid) return errorResponse(res, genderValidation.error);
        updates.gender = genderValidation.normalized;
    }

    if (req.body.dob !== undefined) {
        const dobValidation = validateDate(req.body.dob, "Date of birth", { noFuture: true, minAge: 18 });
        if (!dobValidation.valid) return errorResponse(res, dobValidation.error);
        updates.dob = dobValidation.normalized;
    }

    if (req.body.address !== undefined) {
        const addressValidation = validateString(req.body.address, "Address", { maxLength: 500 });
        if (!addressValidation.valid) return errorResponse(res, addressValidation.error);
        updates.address = addressValidation.normalized;
    }

    if (req.body.profileImage !== undefined) {
        const profileImageValidation = validateString(req.body.profileImage, "Profile image", { maxLength: 500 });
        if (!profileImageValidation.valid) return errorResponse(res, profileImageValidation.error);
        updates.profileImage = profileImageValidation.normalized;
    }

    const account = await Account.findOne({ email: user.email });
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

    await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });

    const [enrichedUser] = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        ...userProfileLookupPipeline,
    ]);

    return successResponse(res, "Profile updated successfully", formatUserDates(enrichedUser));
}, "USER_UPDATE_PROFILE_ERROR");

export const uploadProfilePhoto = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    if (!req.file) return errorResponse(res, "photo is required");

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    if (user.profileImage) {
        deleteObject(process.env.ORACLE_BUCKET_PROFILES, user.profileImage);
    }

    const { objectName } = await uploadFile(
        process.env.ORACLE_BUCKET_PROFILES,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    await User.findByIdAndUpdate(userId, { profileImage: objectName });
    return successResponse(res, "Profile photo uploaded", { profileImage: objectName });
}, "USER_UPLOAD_PHOTO_ERROR");

export const changePassword = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    const requiredCheck = validateRequiredFields({ currentPassword, newPassword }, ["currentPassword", "newPassword"]);
    if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    const account = await Account.findOne({ email: user.email });
    if (!account) return errorResponse(res, "Account not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, account.password);
    if (!isMatch) return errorResponse(res, "Current password is incorrect", 401);

    const isSamePassword = await bcrypt.compare(newPassword, account.password);
    if (isSamePassword) return errorResponse(res, "New password cannot be the same as current password");

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    return successResponse(res, "Password changed successfully");
}, "USER_CHANGE_PASSWORD_ERROR");

export const deactivateAccount = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { password } = req.body;

    if (!password) return errorResponse(res, "Password is required to deactivate account");

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    const account = await Account.findOne({ email: user.email });
    if (!account) return errorResponse(res, "Account not found", 404);

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return errorResponse(res, "Invalid password", 401);

    user.isActive = false;
    await user.save();

    // const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    // res.clearCookie("accessToken", {
    //     httpOnly: true,
    //     secure: isSecure,
    //     sameSite: isSecure ? "none" : "lax",
    //     path: "/"
    // });
    clearAuthCookie(res, req);

    return successResponse(res, "Account deactivated successfully");
}, "USER_DEACTIVATE_ACCOUNT_ERROR");
