import { Router } from "express";
import {
    getProfile,
    updateProfile,
    changePassword,
    getProfileByEmail,
} from "#webController/admin/profile/controller.js";

const router = Router();

router.get("/", getProfile);
router.get("/by-email", getProfileByEmail);
router.put("/", updateProfile);
router.put("/change-password", changePassword);

export default router;
