import { Router } from "express";
import {
    createTeam,
    getTeam,
    getAllTeams,
    updateTeam,
    deleteTeam,
    getTeamsPagination,
    getManagerTeams,
} from "#webController/admin/team/team.controller.js";
import {
    addTeamMemberToTeam,
    removeTeamMemberFromTeam,
    getTeamMembers,
    getUserTeams,
    getEligibleEmployeesForTeam,
} from "#webController/admin/team/member.controller.js";
import requireRole from "#middleware/requireRole.js";
import authorizeManager from "#middleware/authorizeManager.js";

const router = Router();

// Team routes

router.post("/create-team", requireRole("admin"), createTeam);
router.get("/get-team/:id", getTeam);
router.post("/get-all-teams", getAllTeams);
router.get("/manager/all", authorizeManager, getManagerTeams);
router.post("/update-team", updateTeam);
router.post("/delete-team", requireRole("admin"), deleteTeam);
router.get("/get-teams-filter", getTeamsPagination);

// Team Member routes

router.post("/add-team-member", addTeamMemberToTeam);
router.post("/remove-team-member", removeTeamMemberFromTeam);
router.get("/get-team-members", getTeamMembers);
router.get("/get-user-teams", getUserTeams);
router.get("/eligible-members", getEligibleEmployeesForTeam);

export default router;
