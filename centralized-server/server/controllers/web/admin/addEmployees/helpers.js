import bcrypt from "bcrypt";
import User from "#models/User.js";
import Account from "#models/Account.js";
import GovtProof from "#models/GovtProof.js";
import Organization from "#models/Organization.js";
import Team from "#models/Team.js";
import { validatePhone } from "#utils/validators.js";

// Regex patterns and validation constants
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  aadhaar: /^\d{12}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  passport: /^[A-Z0-9]{4,15}$/,
};

export const VALID_ENUMS = {
  roles: ["manager", "teamLead", "employee"],
  genders: ["male", "female", "other"],
  workTypes: ["onsite", "remote", "hybrid"],
};

export const REQUIRED_FIELDS = [
  "name",
  "email",
  "phone",
  "employeeId",
  "organizationName",
  "dateOfJoining",
  "aadhaar",
  "gender",
  "dob",
  "address",
  "workType",
];

/**
 * Validate required fields in a row
 */
export function validateRequiredFields(row, fieldsToCheck) {
  for (const field of fieldsToCheck) {
    if (row[field] === undefined || row[field] === null || (typeof row[field] === "string" && row[field].trim() === "")) {
      return {
        valid: false,
        error: `Required field "${field}" is missing or empty`,
      };
    }
  }
  return { valid: true };
}

/**
 * Validate phone number format
 */
export function validatePhoneFormat(phone) {
  const phoneValidation = validatePhone(phone);
  return phoneValidation;
}

/**
 * Validate email format
 */
export function validateEmailFormat(email) {
  const emailStr = String(email).trim();
  if (!VALIDATION_PATTERNS.email.test(emailStr)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true, email: emailStr };
}

/**
 * Validate role enum
 */
export function validateRole(roleValue) {
  if (!roleValue) return { valid: true, role: null };
  const role = String(roleValue).toLowerCase();
  if (!VALID_ENUMS.roles.includes(role)) {
    return {
      valid: false,
      error: `Invalid role. Must be one of: ${VALID_ENUMS.roles.join(", ")}`,
    };
  }
  return { valid: true, role };
}

/**
 * Validate gender enum
 */
export function validateGender(genderValue) {
  const gender = String(genderValue).toLowerCase();
  if (!VALID_ENUMS.genders.includes(gender)) {
    return {
      valid: false,
      error: `Invalid gender. Must be one of: ${VALID_ENUMS.genders.join(", ")}`,
    };
  }
  return { valid: true, gender };
}

/**
 * Validate aadhaar format
 */
export function validateAadhaar(aadhaarValue) {
  const aadhaar = String(aadhaarValue).trim();
  if (!VALIDATION_PATTERNS.aadhaar.test(aadhaar)) {
    return {
      valid: false,
      error: "Invalid aadhaar format. Must be exactly 12 digits",
    };
  }
  return { valid: true, aadhaar };
}

/**
 * Validate work type enum
 */
export function validateWorkType(workTypeValue) {
  const workType = String(workTypeValue).toLowerCase();
  if (!VALID_ENUMS.workTypes.includes(workType)) {
    return {
      valid: false,
      error: `Invalid work type. Must be one of: ${VALID_ENUMS.workTypes.join(", ")}`,
    };
  }
  return { valid: true, workType };
}

/**
 * Validate PAN format if provided
 */
export function validatePAN(panValue) {
  if (!panValue) return { valid: true, pan: null };
  const pan = String(panValue).trim().toUpperCase();
  if (!VALIDATION_PATTERNS.pan.test(pan)) {
    return {
      valid: false,
      error: "Invalid PAN format. Expected format: AAAAA9999A",
    };
  }
  return { valid: true, pan };
}

/**
 * Validate passport format if provided
 */
export function validatePassport(passportValue) {
  if (!passportValue) return { valid: true, passport: null };
  const passport = String(passportValue).trim().toUpperCase();
  if (!VALIDATION_PATTERNS.passport.test(passport)) {
    return {
      valid: false,
      error: "Invalid passport format. Expected 4-15 alphanumeric characters",
    };
  }
  return { valid: true, passport };
}

/**
 * Validate salary value
 */
export function validateSalary(salaryValue) {
  if (salaryValue === undefined || salaryValue === null || salaryValue === "") {
    return { valid: true, salary: null };
  }
  const salaryNum = Number(salaryValue);
  if (isNaN(salaryNum) || salaryNum < 0) {
    return { valid: false, error: "Invalid salary value" };
  }
  return { valid: true, salary: salaryNum };
}

/**
 * Validate date of joining
 */
export function validateDateOfJoining(dojValue) {
  const dojDate = new Date(dojValue);
  if (isNaN(dojDate.getTime())) {
    return { valid: false, error: "Invalid date of joining" };
  }
  if (dojDate > new Date()) {
    return { valid: false, error: "Date of joining cannot be a future date" };
  }
  return { valid: true, date: new Date(dojDate.toISOString().split("T")[0]) };
}

/**
 * Validate date of birth
 */
export function validateDateOfBirth(dobValue) {
  const dobDate = new Date(dobValue);
  if (isNaN(dobDate.getTime())) {
    return { valid: false, error: "Invalid date of birth" };
  }
  if (dobDate > new Date()) {
    return { valid: false, error: "Date of birth cannot be a future date" };
  }
  return { valid: true, date: new Date(dobDate.toISOString().split("T")[0]) };
}

/**
 * Validate PAN and bankId are provided together
 */
export function validatePanBankIdRelationship(pan, bankId) {
  if ((pan && !bankId) || (!pan && bankId)) {
    return {
      valid: false,
      error: "pan and bankId must be provided together",
    };
  }
  return { valid: true };
}

/**
 * Check if organization exists
 */
export async function checkOrganizationExists(organizationName) {
  const organization = await Organization.findOne({ name: organizationName });
  if (!organization) {
    return {
      exists: false,
      error: `Organization '${organizationName}' not found`,
    };
  }
  return { exists: true, organization };
}

/**
 * Check if team exists in organization
 */
export async function checkTeamExists(teamName, organizationId) {
  if (!teamName) return { exists: false, team: null };
  const team = await Team.findOne({
    teamName,
    organizationId,
  });
  if (!team) {
    return {
      exists: false,
      error: `Team '${teamName}' not found`,
    };
  }
  return { exists: true, team };
}

/**
 * Check if user already exists
 */
export async function checkUserExists(email, normalizedPhone, employeeId, organizationId) {
  const existingUser = await User.findOne({
    $or: [{ email }, { phone: normalizedPhone }, { employeeId, organizationId }],
  });
  if (existingUser) {
    return {
      exists: true,
      error: "User already exists with this email, phone, or employeeId in this organization",
    };
  }
  return { exists: false };
}

/**
 * Check if account already exists
 */
export async function checkAccountExists(email) {
  const existingAccount = await Account.findOne({ email });
  if (existingAccount) {
    return { exists: true, error: "Account already exists with this email" };
  }
  return { exists: false };
}

/**
 * Create user, account, and government proof records
 */
export async function createEmployeeRecords(userData, accountData, govtProofData, session) {
  // Create user
  const [newUser] = await User.create([userData], { session });

  // Create account with hashed password
  const password = process.env.USER_DEFAULT_PASSWORD || "WorkPing@123";
  const hashedPassword = await bcrypt.hash(password, 10);
  accountData.password = hashedPassword;

  await Account.create([accountData], { session });

  // Create government proof if all required fields provided
  if (govtProofData && govtProofData.aadhaarNumber && govtProofData.panNumber && govtProofData.bankAccount) {
    govtProofData.userId = newUser._id;
    await GovtProof.create([govtProofData], { session });
  }

  return newUser;
}

/**
 * Build user data object from row
 */
export function buildUserData(row, email, normalizedPhone, organizationId, role, gender, dojDate, dobDate, teamId) {
  const userData = {
    name: String(row.name).trim(),
    email,
    phone: normalizedPhone,
    employeeId: String(row.employeeId).trim(),
    organizationId,
    dateOfJoining: dojDate,
    workType: String(row.workType).trim().toLowerCase(),
    gender,
    address: String(row.address).trim(),
    dob: dobDate,
  };

  if (role) userData.role = role;
  if (row.salary !== undefined && row.salary !== null && row.salary !== "") {
    userData.salary = Number(row.salary);
  }
  if (teamId) userData.teamId = teamId;
  if (row.isActive !== undefined) userData.isActive = Boolean(row.isActive);

  return userData;
}

/**
 * Build account data object from row
 */
export function buildAccountData(row, email, role) {
  const accountData = {
    email,
    emailVerified: false,
  };

  if (role) accountData.role = role;

  return accountData;
}

/**
 * Build government proof data object from row
 */
export function buildGovtProofData(row, aadhaar, pan, passport) {
  if (!pan) return null;

  const govtProofData = {
    aadhaarNumber: aadhaar,
    panNumber: pan,
    bankAccount: String(row.bankId).trim(),
  };

  if (passport) {
    govtProofData.passportNumber = passport;
  }

  return govtProofData;
}
