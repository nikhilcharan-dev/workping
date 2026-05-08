import { Router } from "express";
import { getPayments, getPaymentById } from "#webController/admin/payments/controller.js";

const router = Router();

router.get("/", getPayments);
router.get("/:id", getPaymentById);

export default router;
