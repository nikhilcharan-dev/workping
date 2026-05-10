import { Router } from "express";
import {
  applyLeave,
  getMyLeaves,
  getLeaveById,
  cancelLeave,
  getLeaveBalance,
} from "#webController/user/leaves/controller.js";

const router = Router();

router.post("/apply", applyLeave);
router.get("/my-leaves", getMyLeaves);
router.get("/balance", getLeaveBalance);
router.get("/:leaveId", getLeaveById);
router.delete("/cancel/:leaveId", cancelLeave);

export default router;
