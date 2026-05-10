import { Router } from "express";
import multer from "multer";
import insertByForm from "#webController/admin/addEmployees/byForm.js";
import insertByExcel from "#webController/admin/addEmployees/byExcel.js";
import uploadExcel from "#middleware/uploadExcel.js";

const router = Router();

const faceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/by-form", faceUpload.single("face_photo"), insertByForm);
router.post("/by-excel", uploadExcel.single("file"), insertByExcel);

export default router;
