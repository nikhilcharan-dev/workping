import { Router } from "express";
import multer from "multer";
import {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  uploadProfilePhoto,
} from "#webController/user/profile/controller.js";

const router = Router();
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/profile", getProfile);
router.post("/update-profile", updateProfile);
router.post("/change-password", changePassword);
router.post("/deactivate-account", deactivateAccount);
router.post("/upload-photo", photoUpload.single("photo"), uploadProfilePhoto);

export default router;
