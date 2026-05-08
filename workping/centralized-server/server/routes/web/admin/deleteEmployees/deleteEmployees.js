import { Router } from "express";
import deleteEmployeesById from "#webController/admin/deleteEmployees/deleteEmployeesByid.js";

const router = Router();

router.post("/delete-employees", deleteEmployeesById);

export default router;
