import { Router } from "express";
import { login, register, logout, verifyPassword } from "#webController/user/auth/controller.js";
import validateCookie from "#middleware/jwtBearer.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", validateCookie, logout);
router.post("/verify-password", validateCookie, verifyPassword);

export default router;
