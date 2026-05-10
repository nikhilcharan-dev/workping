import {
  addHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHolidays,
} from "#webController/admin/holiday/controller.js";
import express from "express";

const Router = express.Router();

Router.get("/get-holidays", getHolidays);
Router.get("/get-holiday-by-id/:id", getHolidayById);
Router.post("/add-holiday", addHoliday);
Router.post("/update-holiday", updateHoliday);
Router.post("/delete-holidays", deleteHolidays);

export default Router;
