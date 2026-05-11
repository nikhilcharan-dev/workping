import fs from "fs";
import path from "path";
import os from "os";
import multer from "multer";

// Use absolute path in temp directory to prevent path traversal
const uploadDir = path.join(os.tmpdir(), `workping-uploads-${process.env.NODE_ENV || 'development'}`);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename: remove special characters and preserve only extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return cb(new Error('Invalid file extension. Only .xlsx and .xls are allowed.'));
    }
    // Generate random filename instead of appending original
    const randomName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    cb(null, randomName + ext);
  },
});

// File filter (allow only Excel)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xls, .xlsx) are allowed"), false);
  }
};

export { storage, fileFilter };
