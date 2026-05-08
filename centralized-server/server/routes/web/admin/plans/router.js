import { Router } from "express";
import { getPlans, seedPlans, getCustomCatalogue, createCustomPlan } from "#webController/admin/plans/controller.js";

const router = Router();

router.get("/", getPlans);
router.get("/custom-catalogue", getCustomCatalogue);
router.post("/custom", createCustomPlan);
router.post("/seed", seedPlans);

export default router;
