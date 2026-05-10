import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 3 * 1024 * 1024, // 3MB
  },
});
