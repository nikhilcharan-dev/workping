import { Router } from "express";
import {
  getMyOrganization,
  getMyTeam,
  getMyTeamMembers,
  getAllMyTeams,
} from "#webController/user/organisation/controller.js";

const router = Router();

router.get("/my-organization", getMyOrganization);
router.get("/my-team", getMyTeam);
router.get("/my-team-members", getMyTeamMembers);
router.get("/my-teams", getAllMyTeams);

export default router;
