import express from "express";
import {
    getAttendanceSummary,
    getAttendanceByOrganizationId,
    getAttendanceByTeamId,
    getManagerAttendanceSummary,
} from "#webController/admin/attendance/controller.js";
import authorizeManager from "#middleware/authorizeManager.js";

const Router = express.Router();

Router.get("/summary", getAttendanceSummary);
Router.get("/manager/summary", authorizeManager, getManagerAttendanceSummary);
Router.post("/by-organization", getAttendanceByOrganizationId);
Router.post("/by-team", authorizeManager, getAttendanceByTeamId);

export default Router;
