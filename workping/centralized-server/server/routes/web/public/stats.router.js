import { Router } from "express";
import getPublicStats from "#webController/public/stats.js";

const router = Router();

router.get("/stats", getPublicStats);

export default router;
