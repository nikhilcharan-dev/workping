import fs from "fs";
import xlsx from "xlsx";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "#models/User.js";
import Account from "#models/Account.js";
import GovtProof from "#models/GovtProof.js";
import Organization from "#models/Organization.js";
import Team from "#models/Team.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validatePhone } from "#utils/validators.js";
import { checkEmployeeLimit } from "#utils/plan.limits.js";

const insertByExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, "No file uploaded");
  }

  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  // Delete file after processing
  fs.unlinkSync(filePath);

  const requiredFields = [
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validRoles = ["manager", "teamLead", "employee"];
  const validGenders = ["male", "female", "other"];
  const validWorkTypes = ["onsite", "remote", "hybrid"];

  const failedRecords = [];
  const successfulRecords = [];

  const empLimit = await checkEmployeeLimit(req.user.userId, jsonData.length);
  if (!empLimit.allowed) return errorResponse(res, empLimit.message, 403);

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2;
    let validationError = null;

    // Validate required fields
    for (const field of requiredFields) {
      if (
        row[field] === undefined ||
        row[field] === null ||
        (typeof row[field] === "string" && row[field].trim() === "")
      ) {
        validationError = `Required field "${field}" is missing or empty`;
        break;
      }
    }

    if (validationError) {
      failedRecords.push({
        error: validationError,
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate phone format
    const phoneValidation = validatePhone(row.phone);
    if (!phoneValidation.valid) {
      failedRecords.push({ error: phoneValidation.error, rowNumber, rowData: row });
      continue;
    }

    // Validate email format
    const email = String(row.email).trim();
    if (!emailRegex.test(email)) {
      failedRecords.push({
        error: "Invalid email format",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate role enum if provided
    const role = row.role ? String(row.role).toLowerCase() : null;
    if (role && !validRoles.includes(role)) {
      failedRecords.push({
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate gender enum
    const gender = String(row.gender).toLowerCase();
    if (!validGenders.includes(gender)) {
      failedRecords.push({
        error: `Invalid gender. Must be one of: ${validGenders.join(", ")}`,
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate aadhaar format
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(String(row.aadhaar).trim())) {
      failedRecords.push({
        error: "Invalid aadhaar format. Must be exactly 12 digits",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    if (!validWorkTypes.includes(String(row.workType).toLowerCase())) {
      failedRecords.push({
        error: `Invalid work type. Must be one of: ${validWorkTypes.join(", ")}`,
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate PAN format if provided
    if (row.pan) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (!panRegex.test(String(row.pan).trim().toUpperCase())) {
        failedRecords.push({
          error: "Invalid PAN format. Expected format: AAAAA9999A",
          rowNumber,
          rowData: row,
        });
        continue;
      }
    }

    // Validate passport format if provided
    if (row.passport) {
      const passportRegex = /^[A-Z0-9]{4,15}$/;
      if (!passportRegex.test(String(row.passport).trim().toUpperCase())) {
        failedRecords.push({
          error: "Invalid passport format. Expected 4-15 alphanumeric characters",
          rowNumber,
          rowData: row,
        });
        continue;
      }
    }

    // Validate salary if provided
    if (row.salary !== undefined && row.salary !== null && row.salary !== "") {
      const salaryNum = Number(row.salary);
      if (isNaN(salaryNum) || salaryNum < 0) {
        failedRecords.push({
          error: "Invalid salary value",
          rowNumber,
          rowData: row,
        });
        continue;
      }
    }

    // Validate dateOfJoining is not a future date
    const dojDate = new Date(row.dateOfJoining);
    if (isNaN(dojDate.getTime())) {
      failedRecords.push({
        error: "Invalid date of joining",
        rowNumber,
        rowData: row,
      });
      continue;
    }
    if (dojDate > new Date()) {
      failedRecords.push({
        error: "Date of joining cannot be a future date",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate date of birth
    const dobDate = new Date(row.dob);
    if (isNaN(dobDate.getTime())) {
      failedRecords.push({
        error: "Invalid date of birth",
        rowNumber,
        rowData: row,
      });
      continue;
    }
    if (dobDate > new Date()) {
      failedRecords.push({
        error: "Date of birth cannot be a future date",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Validate PAN and bankId must be provided together
    if ((row.pan && !row.bankId) || (!row.pan && row.bankId)) {
      failedRecords.push({
        error: "pan and bankId must be provided together",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Check if organization exists
    const organization = await Organization.findOne({ name: row.organizationName });
    if (!organization) {
      failedRecords.push({
        error: `Organization '${row.organizationName}' not found`,
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Check if team exists (if teamName provided)
    let team = null;
    if (row.teamName) {
      team = await Team.findOne({
        teamName: row.teamName,
        organizationId: organization._id,
      });
      if (!team) {
        failedRecords.push({
          error: `Team '${row.teamName}' not found in organization '${row.organizationName}'`,
          rowNumber,
          rowData: row,
        });
        continue;
      }
    }

    // Check if user already exists (email/phone globally, employeeId within org)
    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { phone: phoneValidation.normalized },
        { employeeId: String(row.employeeId).trim(), organizationId: organization._id },
      ],
    });

    if (existingUser) {
      failedRecords.push({
        error: "User already exists with this email, phone, or employeeId in this organization",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Check if account already exists
    const existingAccount = await Account.findOne({ email: email });
    if (existingAccount) {
      failedRecords.push({
        error: "Account already exists with this email",
        rowNumber,
        rowData: row,
      });
      continue;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Prepare user data
      const userData = {
        name: String(row.name).trim(),
        email: email,
        phone: phoneValidation.normalized,
        employeeId: String(row.employeeId).trim(),
        organizationId: organization._id,
        dateOfJoining: new Date(dojDate.toISOString().split("T")[0]),
        workType: String(row.workType).trim().toLowerCase(),
      };

      // Add optional user fields
      userData.gender = String(row.gender).toLowerCase();
      if (role) userData.role = role;
      if (row.salary !== undefined && row.salary !== null && row.salary !== "") {
        userData.salary = Number(row.salary);
      }
      const dobOnly = new Date(new Date(row.dob).toISOString().split("T")[0]);
      userData.dob = dobOnly;
      userData.address = String(row.address).trim();
      if (team) userData.teamId = team._id;
      if (row.isActive !== undefined) userData.isActive = Boolean(row.isActive);

      // Create user
      const [newUser] = await User.create([userData], { session });

      // Create account with password
      const password = process.env.USER_DEFAULT_PASSWORD || "WorkPing@123";
      const hashedPassword = await bcrypt.hash(password, 10);

      const accountData = {
        email: email,
        password: hashedPassword,
        emailVerified: false,
      };

      if (role) accountData.role = role;

      await Account.create([accountData], { session });

      // Create government proof
      if (row.pan && row.bankId) {
        const govtProofData = {
          aadhaarNumber: String(row.aadhaar).trim(),
          panNumber: String(row.pan).trim().toUpperCase(),
          bankAccount: String(row.bankId).trim(),
          userId: newUser._id,
        };

        if (row.passport) {
          govtProofData.passportNumber = String(row.passport).trim().toUpperCase();
        }

        await GovtProof.create([govtProofData], { session });
      }

      await session.commitTransaction();

      successfulRecords.push({
        rowNumber,
        employeeId: newUser.employeeId,
        email: newUser.email,
        name: newUser.name,
      });
    } catch (error) {
      await session.abortTransaction();

      failedRecords.push({
        error: error.message || "Database error occurred",
        rowNumber,
        rowData: row,
      });
    } finally {
      session.endSession();
    }
  }

  const successCount = successfulRecords.length;
  const failedCount = failedRecords.length;
  const totalCount = jsonData.length;

  if (failedCount === 0) {
    return successResponse(
      res,
      "All employees added successfully",
      {
        count: { total: totalCount, successful: successCount, failed: failedCount },
        successfulRecords,
      },
      201
    );
  }

  return successResponse(
    res,
    `Processed ${totalCount} records: ${successCount} successful, ${failedCount} failed`,
    {
      count: { total: totalCount, successful: successCount, failed: failedCount },
      successfulRecords,
      failedRecords,
    },
    207
  );
}, "ERROR_PROCESSING_EXCEL_FILE");

export default insertByExcel;
