import { Router } from "express";
import { getEmployeeDashboard } from "#webController/user/dashboard/controller.js";

const router = Router();

router.get("/", getEmployeeDashboard);

export default router;
