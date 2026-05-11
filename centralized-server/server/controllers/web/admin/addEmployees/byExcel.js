import { asyncHandler } from "#utils/async.handler.js";
import fs from "fs";
import xlsx from "xlsx";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { checkEmployeeLimit } from "#utils/plan.limits.js";
import {
  REQUIRED_FIELDS,
  validateRequiredFields,
  validatePhoneFormat,
  validateEmailFormat,
  validateRole,
  validateGender,
  validateAadhaar,
  validateWorkType,
  validatePAN,
  validatePassport,
  validateSalary,
  validateDateOfJoining,
  validateDateOfBirth,
  validatePanBankIdRelationship,
  checkOrganizationExists,
  checkTeamExists,
  checkUserExists,
  checkAccountExists,
  createEmployeeRecords,
  buildUserData,
  buildAccountData,
  buildGovtProofData,
} from "./helpers.js";

/**
 * Process and validate a single row from Excel
 */
async function processRowValidation(row, rowNumber) {
  // Validate required fields
  const requiredCheck = validateRequiredFields(row, REQUIRED_FIELDS);
  if (!requiredCheck.valid) {
    return { valid: false, error: requiredCheck.error };
  }

  // Validate phone
  const phoneCheck = validatePhoneFormat(row.phone);
  if (!phoneCheck.valid) {
    return { valid: false, error: phoneCheck.error };
  }

  // Validate email
  const emailCheck = validateEmailFormat(row.email);
  if (!emailCheck.valid) {
    return { valid: false, error: emailCheck.error };
  }

  // Validate role
  const roleCheck = validateRole(row.role);
  if (!roleCheck.valid) {
    return { valid: false, error: roleCheck.error };
  }

  // Validate gender
  const genderCheck = validateGender(row.gender);
  if (!genderCheck.valid) {
    return { valid: false, error: genderCheck.error };
  }

  // Validate aadhaar
  const aadhaarCheck = validateAadhaar(row.aadhaar);
  if (!aadhaarCheck.valid) {
    return { valid: false, error: aadhaarCheck.error };
  }

  // Validate work type
  const workTypeCheck = validateWorkType(row.workType);
  if (!workTypeCheck.valid) {
    return { valid: false, error: workTypeCheck.error };
  }

  // Validate PAN
  const panCheck = validatePAN(row.pan);
  if (!panCheck.valid) {
    return { valid: false, error: panCheck.error };
  }

  // Validate passport
  const passportCheck = validatePassport(row.passport);
  if (!passportCheck.valid) {
    return { valid: false, error: passportCheck.error };
  }

  // Validate salary
  const salaryCheck = validateSalary(row.salary);
  if (!salaryCheck.valid) {
    return { valid: false, error: salaryCheck.error };
  }

  // Validate dates
  const dojCheck = validateDateOfJoining(row.dateOfJoining);
  if (!dojCheck.valid) {
    return { valid: false, error: dojCheck.error };
  }

  const dobCheck = validateDateOfBirth(row.dob);
  if (!dobCheck.valid) {
    return { valid: false, error: dobCheck.error };
  }

  // Validate PAN and bankId relationship
  const panBankRelationCheck = validatePanBankIdRelationship(row.pan, row.bankId);
  if (!panBankRelationCheck.valid) {
    return { valid: false, error: panBankRelationCheck.error };
  }

  return {
    valid: true,
    data: {
      email: emailCheck.email,
      phone: phoneCheck.normalized,
      role: roleCheck.role,
      gender: genderCheck.gender,
      aadhaar: aadhaarCheck.aadhaar,
      workType: workTypeCheck.workType,
      pan: panCheck.pan,
      passport: passportCheck.passport,
      salary: salaryCheck.salary,
      dojDate: dojCheck.date,
      dobDate: dobCheck.date,
    },
  };
}

/**
 * Process a single row and create records
 */
async function processRowCreation(row, validatedData, failedRecords, successfulRecords, rowNumber, userId) {
  // Check organization
  const orgCheck = await checkOrganizationExists(row.organizationName);
  if (!orgCheck.exists) {
    failedRecords.push({ error: orgCheck.error, rowNumber, rowData: row });
    return;
  }

  // Check team if provided
  const teamCheck = await checkTeamExists(row.teamName, orgCheck.organization._id);
  if (row.teamName && !teamCheck.exists) {
    failedRecords.push({
      error: `Team '${row.teamName}' not found in organization '${row.organizationName}'`,
      rowNumber,
      rowData: row,
    });
    return;
  }

  // Check user doesn't exist
  const userCheck = await checkUserExists(validatedData.email, validatedData.phone, String(row.employeeId).trim(), orgCheck.organization._id);
  if (userCheck.exists) {
    failedRecords.push({ error: userCheck.error, rowNumber, rowData: row });
    return;
  }

  // Check account doesn't exist
  const accountCheck = await checkAccountExists(validatedData.email);
  if (accountCheck.exists) {
    failedRecords.push({ error: accountCheck.error, rowNumber, rowData: row });
    return;
  }

  // Create records in transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userData = buildUserData(
      row,
      validatedData.email,
      validatedData.phone,
      orgCheck.organization._id,
      validatedData.role,
      validatedData.gender,
      validatedData.dojDate,
      validatedData.dobDate,
      teamCheck.team ? teamCheck.team._id : null
    );

    const accountData = buildAccountData(row, validatedData.email, validatedData.role);

    const govtProofData = buildGovtProofData(row, validatedData.aadhaar, validatedData.pan, validatedData.passport);

    const newUser = await createEmployeeRecords(userData, accountData, govtProofData, session);

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

  const failedRecords = [];
  const successfulRecords = [];

  const empLimit = await checkEmployeeLimit(req.user.userId, jsonData.length);
  if (!empLimit.allowed) return errorResponse(res, empLimit.message, 403);

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2;

    // Validate row
    const validationResult = await processRowValidation(row, rowNumber);
    if (!validationResult.valid) {
      failedRecords.push({
        error: validationResult.error,
        rowNumber,
        rowData: row,
      });
      continue;
    }

    // Create records
    await processRowCreation(row, validationResult.data, failedRecords, successfulRecords, rowNumber, req.user.userId);
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
