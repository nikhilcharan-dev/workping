import { Router } from "express";
import { getMyProjects, getProjectById, getProjectMembers } from "#webController/user/projects/controller.js";

const router = Router();

router.get("/my-projects", getMyProjects);
router.get("/:projectId", getProjectById);
router.get("/:projectId/members", getProjectMembers);

export default router;
