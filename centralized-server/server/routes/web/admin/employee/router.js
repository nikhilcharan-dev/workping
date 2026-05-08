import { getEmployee, updateEmployee } from "#webController/admin/addEmployees/controller.js";
import { Router } from "express";

const router = Router();

router.get("/get-employee/:id", getEmployee);
router.post("/update", updateEmployee);

export default router;
