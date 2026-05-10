import { storage, fileFilter } from "#config/multer/bulkUpload.js";
import multer from "multer";
// Multer instance
const uploadExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

export default uploadExcel;
