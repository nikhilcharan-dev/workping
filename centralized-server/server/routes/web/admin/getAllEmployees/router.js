import { Router } from "express";

import getOrgInfo from "#webController/admin/getAllEmployees/getOrgInfo.js";
import getAllEmployeesByPageNumber, {
  getManagerEmployees,
} from "#webController/admin/getAllEmployees/getAllEmployeesByPageNumber.js";

const router = Router();

router.get("/", getAllEmployeesByPageNumber);
router.get("/get-organization-info", getOrgInfo);
router.get("/get-all-employees-by-page-number", getAllEmployeesByPageNumber);
router.get("/manager/team", getManagerEmployees);

export default router;
