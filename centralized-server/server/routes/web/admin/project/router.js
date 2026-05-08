import {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    getManagerProjects,
} from "#webController/admin/project/project.controller.js";
import {
    addProjectMember,
    getProjectMembers,
    getProjectMember,
    updateProjectMember,
    removeProjectMembers,
    getEligibleEmployeesForProject,
} from "#webController/admin/project/teams.controller.js";
import { Router } from "express";
import requireRole from "#middleware/requireRole.js";

const router = Router();

router.get("/", getProjects);
router.post("/create-project", requireRole("admin"), createProject);
router.get("/get-projects", getProjects);
router.get("/manager/all", getManagerProjects);
router.get("/get-project", getProject);
router.post("/update-project", updateProject);
router.post("/delete-projects", requireRole("admin"), deleteProject);

// Project Members
router.post("/add-member", addProjectMember);
router.get("/get-members", getProjectMembers);
router.get("/get-member/:id", getProjectMember);
router.put("/update-member/:id", updateProjectMember);
router.post("/remove-members", removeProjectMembers);
router.get("/eligible-members", getEligibleEmployeesForProject);

export default router;
