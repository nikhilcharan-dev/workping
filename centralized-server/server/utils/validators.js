import mongoose from "mongoose";

/**
 * Validation utility functions for common validations across controllers
 */

// Email validation
export const validateEmail = (email) => {
    if (!email) return { valid: false, error: "Email is required" };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: "Invalid email format" };
    }

    // Check for common invalid patterns
    if (email.length > 254) {
        return { valid: false, error: "Email is too long (max 254 characters)" };
    }

    const [localPart, domain] = email.split("@");
    if (localPart.length > 64) {
        return { valid: false, error: "Email local part is too long (max 64 characters)" };
    }

    return { valid: true, normalized: email.toLowerCase().trim() };
};

// Phone validation (Indian format - 10 digits)
export const validatePhone = (phone) => {
    if (!phone) return { valid: false, error: "Phone number is required" };

    // Remove all non-digit characters
    const cleanPhone = phone.toString().replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
        return { valid: false, error: "Phone number must be 10 digits" };
    }

    return { valid: true, normalized: cleanPhone };
};

// Password strength validation
export const validatePassword = (password) => {
    if (!password) return { valid: false, error: "Password is required" };

    if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters long" };
    }

    if (password.length > 128) {
        return { valid: false, error: "Password is too long (max 128 characters)" };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: "Password must contain at least one uppercase letter" };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: "Password must contain at least one lowercase letter" };
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: "Password must contain at least one number" };
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, error: "Password must contain at least one special character" };
    }

    return { valid: true };
};

// ObjectId validation
export const validateObjectId = (id, fieldName = "ID") => {
    if (!id) return { valid: false, error: `${fieldName} is required` };

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return { valid: false, error: `Invalid ${fieldName} format` };
    }

    return { valid: true };
};

// Name validation
export const validateName = (name) => {
    if (!name) return { valid: false, error: "Name is required" };

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
        return { valid: false, error: "Name must be at least 2 characters long" };
    }

    if (trimmedName.length > 100) {
        return { valid: false, error: "Name is too long (max 100 characters)" };
    }

    // Allow letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
        return { valid: false, error: "Name contains invalid characters" };
    }

    return { valid: true, normalized: trimmedName };
};

// Date validation
export const validateDate = (date, fieldName = "Date", options = {}) => {
    // Default required to true if not specified, to maintain backwards compatibility
    const isRequired = options.required !== false;

    if (!date) {
        if (isRequired) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true };
    }

    let dateObj;

    // Handle DD-MM-YYYY format specifically if it's a string
    if (typeof date === "string" && /^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) {
        const [d, m, y] = date.split("-").map(Number);
        // Create as UTC 00:00
        dateObj = new Date(Date.UTC(y, m - 1, d));
    } else {
        dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) {
        return { valid: false, error: `Invalid ${fieldName} format` };
    }

    // Check if date is in the future (if not allowed)
    if (options.noFuture && dateObj > new Date()) {
        return { valid: false, error: `${fieldName} cannot be in the future` };
    }

    // Check if date is in the past (if not allowed)
    if (options.noPast) {
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        if (dateObj < todayUTC) {
            return { valid: false, error: `${fieldName} cannot be in the past` };
        }
    }

    // Check minimum age (for DOB)
    if (options.minAge) {
        const ageDiff = Date.now() - dateObj.getTime();
        const ageDate = new Date(ageDiff);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);

        if (age < options.minAge) {
            return { valid: false, error: `Age must be at least ${options.minAge} years` };
        }
    }

    // Normalize to UTC 00:00:00 (Strip time)
    // The safest way is to use the YYYY-MM-DD format which parses as UTC 00:00
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getUTCDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    return { valid: true, normalized: new Date(dateString) };
};

// Enum validation
export const validateEnum = (value, validValues, fieldName = "Field") => {
    if (!value) return { valid: false, error: `${fieldName} is required` };

    const normalizedValue = value.toString().toLowerCase();
    const normalizedValidValues = validValues.map((v) => v.toLowerCase());

    if (!normalizedValidValues.includes(normalizedValue)) {
        return {
            valid: false,
            error: `Invalid ${fieldName}. Must be one of: ${validValues.join(", ")}`,
        };
    }

    return { valid: true, normalized: normalizedValue };
};

// Number validation
export const validateNumber = (value, fieldName = "Number", options = {}) => {
    if (value === undefined || value === null || value === "") {
        if (options.required) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true };
    }

    const num = Number(value);

    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} must be a valid number` };
    }

    if (options.min !== undefined && num < options.min) {
        return { valid: false, error: `${fieldName} must be at least ${options.min}` };
    }

    if (options.max !== undefined && num > options.max) {
        return { valid: false, error: `${fieldName} cannot exceed ${options.max}` };
    }

    if (options.integer && !Number.isInteger(num)) {
        return { valid: false, error: `${fieldName} must be an integer` };
    }

    return { valid: true, normalized: num };
};

// String length validation
export const validateString = (value, fieldName = "Field", options = {}) => {
    if (!value) {
        if (options.required) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true };
    }

    const str = value.toString().trim();

    if (options.minLength && str.length < options.minLength) {
        return { valid: false, error: `${fieldName} must be at least ${options.minLength} characters` };
    }

    if (options.maxLength && str.length > options.maxLength) {
        return { valid: false, error: `${fieldName} cannot exceed ${options.maxLength} characters` };
    }

    if (options.pattern && !options.pattern.test(str)) {
        return { valid: false, error: `${fieldName} has invalid format` };
    }

    return { valid: true, normalized: str };
};

// Array validation
export const validateArray = (value, fieldName = "Array", options = {}) => {
    if (!value) {
        if (options.required) {
            return { valid: false, error: `${fieldName} is required` };
        }
        return { valid: true };
    }

    if (!Array.isArray(value)) {
        return { valid: false, error: `${fieldName} must be an array` };
    }

    if (options.minLength && value.length < options.minLength) {
        return { valid: false, error: `${fieldName} must have at least ${options.minLength} items` };
    }

    if (options.maxLength && value.length > options.maxLength) {
        return { valid: false, error: `${fieldName} cannot have more than ${options.maxLength} items` };
    }

    if (options.uniqueItems) {
        const uniqueSet = new Set(value.map((v) => (typeof v === "object" ? JSON.stringify(v) : v)));
        if (uniqueSet.size !== value.length) {
            return { valid: false, error: `${fieldName} must contain unique items` };
        }
    }

    return { valid: true };
};

// Employee ID validation
export const validateEmployeeId = (employeeId) => {
    if (!employeeId) return { valid: false, error: "Employee ID is required" };

    const str = employeeId.toString().trim();

    if (str.length < 3) {
        return { valid: false, error: "Employee ID must be at least 3 characters" };
    }

    if (str.length > 20) {
        return { valid: false, error: "Employee ID cannot exceed 20 characters" };
    }

    // Allow alphanumeric and common separators (-, _)
    if (!/^[a-zA-Z0-9\-_]+$/.test(str)) {
        return { valid: false, error: "Employee ID can only contain letters, numbers, hyphens, and underscores" };
    }

    return { valid: true, normalized: str.toUpperCase() };
};

// Month format validation (YYYY-MM)
export const validateMonth = (month) => {
    if (!month) return { valid: false, error: "Month is required" };

    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(month)) {
        return { valid: false, error: "Invalid month format. Expected YYYY-MM (e.g., 2024-01)" };
    }

    const [year, mon] = month.split("-").map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year < 2000 || year > currentYear + 1) {
        return { valid: false, error: "Year must be between 2000 and next year" };
    }

    if (year === currentYear && mon > currentMonth) {
        return { valid: false, error: "Cannot query future months" };
    }

    return { valid: true };
};

// OTP validation
export const validateOTP = (otp) => {
    if (!otp) return { valid: false, error: "OTP is required" };

    const otpStr = otp.toString().trim();

    if (otpStr.length < 4 || otpStr.length > 6) {
        return { valid: false, error: "OTP must be 4-6 digits" };
    }

    if (!/^\d+$/.test(otpStr)) {
        return { valid: false, error: "OTP must contain only digits" };
    }

    return { valid: true };
};

// Pagination validation
export const validatePagination = (page, limit) => {
    const pageValidation = validateNumber(page, "Page", {
        required: false,
        min: 1,
        integer: true,
    });

    if (!pageValidation.valid) return pageValidation;

    const limitValidation = validateNumber(limit, "Limit", {
        required: false,
        min: 1,
        max: 1000,
        integer: true,
    });

    if (!limitValidation.valid) return limitValidation;

    return {
        valid: true,
        page: pageValidation.normalized || 1,
        limit: limitValidation.normalized || 10,
    };
};

// Required fields validation
export const validateRequiredFields = (data, requiredFields) => {
    const missing = [];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === "") {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        return {
            valid: false,
            error: `Missing required fields: ${missing.join(", ")}`,
        };
    }

    return { valid: true };
};

export default {
    validateEmail,
    validatePhone,
    validatePassword,
    validateObjectId,
    validateName,
    validateDate,
    validateEnum,
    validateNumber,
    validateString,
    validateArray,
    validateEmployeeId,
    validateMonth,
    validateOTP,
    validatePagination,
    validateRequiredFields,
};
