import bcrypt from "bcrypt";
import Admin from "#models/Admin.js";
import Account from "#models/Account.js";
import { errorResponse } from "#utils/response.helper.js";
import { validateEmail, validatePhone, validatePassword, validateName } from "#utils/validators.js";

/**
 * Validate all registration input fields
 */
export async function validateRegistrationInput(name, email, password, phoneNumber) {
  const nameValidation = validateName(name);
  if (!nameValidation.valid) return nameValidation;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return emailValidation;

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) return passwordValidation;

  const phoneValidation = validatePhone(phoneNumber);
  if (!phoneValidation.valid) return phoneValidation;

  return {
    valid: true,
    nameValidation,
    emailValidation,
    passwordValidation,
    phoneValidation,
  };
}

/**
 * Check if email already exists in Admin or Account collections
 */
export async function checkEmailDuplicate(normalizedEmail) {
  const existingAdmin = await Admin.findOne({ email: normalizedEmail });
  if (existingAdmin) return { exists: true, message: "Admin already exists" };

  const existingAccount = await Account.findOne({ email: normalizedEmail });
  if (existingAccount) return { exists: true, message: "Account already exists with this email" };

  return { exists: false };
}

/**
 * Verify password matches the account password hash
 */
export async function verifyPasswordMatch(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password, rounds = 10) {
  return await bcrypt.hash(password, rounds);
}

/**
 * Find admin and account by email, with validation
 */
export async function findAdminAndAccountByEmail(normalizedEmail, res) {
  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) {
    errorResponse(res, "Admin not found", 404);
    return { success: false };
  }

  const account = await Account.findOne({ email: normalizedEmail, role: "admin" });
  if (!account) {
    errorResponse(res, "Account not found", 404);
    return { success: false };
  }

  return { success: true, admin, account };
}

/**
 * Validate login credentials and return admin/account if valid
 */
export async function validateLoginCredentials(email, password, res) {
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) return { success: false };

  const account = await Account.findOne({ email: emailValidation.normalized });
  if (!account || account.role !== "admin") {
    return { success: false, isNotAdmin: true, normalizedEmail: emailValidation.normalized };
  }

  if (account.isActive === false) {
    return { success: false, isInactive: true };
  }

  const isMatch = await verifyPasswordMatch(password, account.password);
  if (!isMatch) {
    return { success: false, isInvalidPassword: true, normalizedEmail: emailValidation.normalized };
  }

  return { success: true, normalizedEmail: emailValidation.normalized, account };
}

/**
 * Get admin profile with aggregation
 */
export async function getAdminWithProfile(userId) {
  const { ObjectId } = await import("mongoose").then((m) => m.Types);
  const [admin] = await Admin.aggregate([
    { $match: { _id: new ObjectId(userId) } },
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
  return admin;
}

/**
 * Format admin profile for response
 */
export function formatAdminResponse(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    phoneNumber: admin.phoneNumber,
    token: undefined, // Will be set by caller if needed
    refreshToken: undefined, // Will be set by caller if needed
  };
}

/**
 * Process profile update fields
 */
export async function processProfileUpdates(body, currentEmail, res) {
  const updates = {};
  const accountUpdates = {};

  if (body.name !== undefined) {
    const nameValidation = validateName(body.name);
    if (!nameValidation.valid) return { success: false };
    updates.name = nameValidation.normalized;
  }

  if (body.phone !== undefined || body.phoneNumber !== undefined) {
    const phone = body.phone || body.phoneNumber;
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) return { success: false };
    updates.phoneNumber = phoneValidation.normalized;
  }

  if (body.profileImage !== undefined) {
    updates.profileImage = body.profileImage;
  }

  if (body.email !== undefined) {
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) return { success: false };
    const emailLower = emailValidation.normalized.toLowerCase();
    if (emailLower !== currentEmail.toLowerCase()) {
      const existingAccount = await Account.findOne({ email: emailLower });
      if (existingAccount) {
        errorResponse(res, "Email already in use", 409);
        return { success: false };
      }
      updates.email = emailLower;
      accountUpdates.email = emailLower;
    }
  }

  if (body.twoFactorEnabled !== undefined) {
    accountUpdates.twoFactorEnabled = !!body.twoFactorEnabled;
  }

  return {
    success: true,
    updates,
    accountUpdates,
    hasChanges: Object.keys(updates).length > 0 || Object.keys(accountUpdates).length > 0,
  };
}

/**
 * Check if new password is different from current password
 */
export async function isNewPasswordDifferent(newPassword, hashedPassword) {
  return !(await verifyPasswordMatch(newPassword, hashedPassword));
}
