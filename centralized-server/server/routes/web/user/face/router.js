import { Router } from "express";
import multer from "multer";
import { enrollOwnFace, getFaceStatus } from "#webController/user/face/controller.js";

const router = Router();

const faceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/status", getFaceStatus);
router.post("/enroll", faceUpload.single("face_photo"), enrollOwnFace);

export default router;
