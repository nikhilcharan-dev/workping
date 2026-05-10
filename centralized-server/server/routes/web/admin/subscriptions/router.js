import {
  getActiveSubscription,
  cancelSubscription,
  getSubscriptionHistory,
} from "#webController/admin/subscriptions/controller.js";
import express from "express";

const Router = express.Router();

Router.get("/active", getActiveSubscription);
Router.patch("/cancel", cancelSubscription);
Router.get("/history", getSubscriptionHistory);

export default Router;
