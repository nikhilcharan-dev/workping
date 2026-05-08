import express from "express";
import {
    getAllLeaves,
    approveLeave,
    rejectLeave,
    getPendingCount,
    getManagerTeamLeaves,
} from "#webController/admin/leaves/controller.js";
import authorizeManager from "#middleware/authorizeManager.js";

const Router = express.Router();

Router.get("/pending-count", getPendingCount);
Router.get("/all", getAllLeaves);
Router.get("/manager/team-leaves", authorizeManager, getManagerTeamLeaves);
Router.post("/approve/:leaveId", authorizeManager, approveLeave);
Router.post("/reject/:leaveId", authorizeManager, rejectLeave);

export default Router;
