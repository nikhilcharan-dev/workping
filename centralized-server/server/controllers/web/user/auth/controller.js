import User from "#models/User.js";
import Account from "#models/Account.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { formatUserDates } from "#helpers/data.reducer.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { setAuthCookie, clearAuthCookie } from "#utils/cookie.helper.js";
import { generateTokenPair, revokeAllTokens } from "#utils/token.helper.js";
import {
    validateEmail,
    validatePassword,
    validateName,
    validatePhone,
    validateObjectId,
    validateRequiredFields,
} from "#utils/validators.js";

export const register = asyncHandler(async (req, res) => {
    const { name, userEmail, password, organizationId, role, phone, employeeId, workType, dateOfJoining } = req.body;

    const requiredCheck = validateRequiredFields(
        { name, userEmail, password, organizationId, role, phone, employeeId, workType, dateOfJoining },
        ["name", "userEmail", "password", "organizationId", "role", "phone", "employeeId", "workType", "dateOfJoining"]
    );
    if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

    const nameValidation = validateName(name);
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);

    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return errorResponse(res, passwordValidation.error);

    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

    const VALID_USER_ROLES = ["user", "manager", "teamlead", "employee"];
    if (!VALID_USER_ROLES.includes(role)) {
        return errorResponse(res, `Role must be one of: ${VALID_USER_ROLES.join(", ")}`);
    }

    const validWorkTypes = ["remote", "onsite", "hybrid"];
    if (!validWorkTypes.includes(workType.toLowerCase())) {
        return errorResponse(res, `workType must be one of: ${validWorkTypes.join(", ")}`);
    }

    const dojDate = new Date(dateOfJoining);
    if (isNaN(dojDate.getTime())) {
        return errorResponse(res, "Invalid dateOfJoining");
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) return errorResponse(res, phoneValidation.error);
    const existingPhone = await User.findOne({ phone: phoneValidation.normalized });
    if (existingPhone) return errorResponse(res, "Phone number already in use", 409);

    const empIdTrimmed = String(employeeId).trim();
    const existingEmpId = await User.findOne({ employeeId: empIdTrimmed, organizationId });
    if (existingEmpId) return errorResponse(res, "Employee ID already exists in this organization", 409);

    const existingAccount = await Account.findOne({ email: emailValidation.normalized });
    if (existingAccount) return errorResponse(res, "User Already Exists", 409);

    const hashedPassword = await bcrypt.hash(password, 10);

    const session = await mongoose.startSession();
    session.startTransaction();
    let user;
    try {
        [user] = await User.create(
            [
                {
                    name: nameValidation.normalized,
                    email: emailValidation.normalized,
                    phone: phoneValidation.normalized,
                    employeeId: empIdTrimmed,
                    workType: workType.toLowerCase(),
                    dateOfJoining: new Date(dojDate.toISOString().split("T")[0]),
                    organizationId,
                    role,
                },
            ],
            { session }
        );

        await Account.create(
            [
                {
                    role,
                    email: emailValidation.normalized,
                    password: hashedPassword,
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

    const { accessToken, refreshToken } = await generateTokenPair({ userId: user._id, role, organizationId }, req);

    setAuthCookie(res, req, accessToken);

    return successResponse(
        res,
        "Register Successful",
        {
            id: user._id,
            name: user.name,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
            token: accessToken,
            refreshToken,
        },
        201
    );
}, "USER_AUTH_REGISTER_ERROR");

export const login = asyncHandler(async (req, res) => {
    const { userEmail, password } = req.body;

    const requiredCheck = validateRequiredFields({ userEmail, password }, ["userEmail", "password"]);
    if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.valid) return errorResponse(res, emailValidation.error);

    const account = await Account.findOne({ email: emailValidation.normalized });
    if (!account || account.role === "admin") return errorResponse(res, "User does not exist", 401);

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

    const userMetaDetails = await User.findOne({ email: emailValidation.normalized });
    if (!userMetaDetails) return errorResponse(res, "User profile does not exist", 401);

    const { accessToken, refreshToken } = await generateTokenPair(
        { userId: userMetaDetails._id, role: account.role, organizationId: userMetaDetails.organizationId },
        req
    );

    setAuthCookie(res, req, accessToken);

    return successResponse(res, "Login Successful", {
        ...formatUserDates(userMetaDetails),
        token: accessToken,
        refreshToken,
    });
}, "USER_AUTH_LOGIN_ERROR");

export const logout = asyncHandler(async (req, res) => {
    if (req.user?.userId) {
        await revokeAllTokens(req.user.userId);
    }
    clearAuthCookie(res, req);
    return successResponse(res, "Logout successful");
}, "USER_AUTH_LOGOUT_ERROR");

export const verifyPassword = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { password } = req.body;

    if (!password) return errorResponse(res, "Password is required");

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, "User not found", 404);

    const account = await Account.findOne({ email: user.email });
    if (!account) return errorResponse(res, "Account not found", 404);

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return errorResponse(res, "Incorrect password", 401);

    return successResponse(res, "Password verified");
}, "USER_VERIFY_PASSWORD_ERROR");
