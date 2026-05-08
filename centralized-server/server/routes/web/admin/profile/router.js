import { getProfile, updateProfile, changePassword, deactivateAccount } from "#webController/admin/auth/controller.js";
import { uploadProfilePhoto } from "#webController/admin/profile/controller.js";
import { Router } from "express";
import multer from "multer";

const router = Router();
const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/profile", getProfile);
router.post("/update-profile", updateProfile);
router.post("/change-password", changePassword);
router.post("/deactivate-account", deactivateAccount);
router.post("/upload-photo", photoUpload.single("photo"), uploadProfilePhoto);

export default router;
