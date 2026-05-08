import { Router } from "express";
import { getShifts } from "#webController/admin/shift/controller.js";

const router = Router();

router.get("/", getShifts);

export default router;
