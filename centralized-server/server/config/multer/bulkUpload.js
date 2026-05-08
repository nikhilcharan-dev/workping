import fs from "fs";
import multer from "multer";

const uploadDir = "uploads/spreadsheets";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // temp folder
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + file.originalname);
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
