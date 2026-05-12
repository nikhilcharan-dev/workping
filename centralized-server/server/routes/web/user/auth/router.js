import { Router } from "express";
import { login, register, logout, verifyPassword } from "#webController/user/auth/controller.js";
import validateCookie from "#middleware/jwtBearer.js";
import requireRole from "#middleware/requireRole.js";

const router = Router();

// /register is no longer public. Only an authenticated admin (or manager, for
// employees within their own org) may create user accounts. Role and
// organizationId are derived from the authenticated caller — not from the body.
router.post("/register", validateCookie, requireRole("admin", "manager"), register);
router.post("/login", login);
router.post("/logout", validateCookie, logout);
router.post("/verify-password", validateCookie, verifyPassword);

export default router;
