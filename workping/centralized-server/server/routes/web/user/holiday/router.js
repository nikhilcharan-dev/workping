import { getHolidays, getHolidayById } from "#webController/user/holiday/controller.js";
import express from "express";

const Router = express.Router();

Router.get("/get-holidays", getHolidays);
Router.get("/get-holiday-by-id/:id", getHolidayById);

export default Router;
