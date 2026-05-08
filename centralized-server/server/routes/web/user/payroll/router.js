import { Router } from "express";
import { getMySalarySlips, getSalarySlipById, getSalaryByMonth } from "#webController/user/payroll/controller.js";

const router = Router();

router.get("/my-salary-slips", getMySalarySlips);
router.get("/by-month", getSalaryByMonth);
router.get("/:salaryId", getSalarySlipById);

export default router;
