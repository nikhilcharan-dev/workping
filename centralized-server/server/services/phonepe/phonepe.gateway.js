import { asyncHandler } from "#utils/async.handler.js";
import Order from "#models/Order.js";
import Plan from "#models/Plan.js";
import OrgAdmin from "#models/Admin.Org.js";
import { Router } from "express";
import axios from "axios";
import { successResponse, errorResponse } from "#utils/response.helper.js";

const router = Router();

const PHONEPE_URI = process.env.PHONE_PE;

const phonepeGateway = asyncHandler(async (req, res) => {
  const { planId } = req.body;
  const { userId } = req.user;

  if (!planId) {
    return errorResponse(res, "planId required", 400);
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    return errorResponse(res, "Invalid planId", 404);
  }

  if (!plan.isActive) {
    return errorResponse(res, "Plan is no longer available", 410);
  }

  const orgAdmin = await OrgAdmin.findOne({ primaryAdmin: userId }).lean();
  const organizationId = orgAdmin?.organizationId ?? null;

  const newOrder = await Order.create({
    userId,
    planId,
    amount: plan.amount,
    date: Date.now(),
    organizationId,
  });

  const phonepeRes = (
    await axios.post(`${PHONEPE_URI}/api/payments/initiate-payment`, {
      orderId: newOrder._id,
      userId,
      amount: plan.amount, // microservice converts to paise
    })
  ).data; // { orderId, state, expireAt, redirectUrl }

  newOrder.phonepeOrderId = phonepeRes.orderId;
  await newOrder.save();

  const paymentMeta = {
    expireAt: phonepeRes.expireAt,
    orderId: newOrder._id,
    planName: plan.name,
    amount: plan.amount,
    status: "Pending",
  };

  await redis.set(`payment:${userId}`, JSON.stringify(paymentMeta));

  // Notify client — "Processing your payment..."
  io.to(`payment:${userId}`).emit("payment:processing", {
    orderId: newOrder._id,
    planName: plan.name,
    amount: plan.amount,
    expireAt: phonepeRes.expireAt,
  });

  return successResponse(res, "Payment initiated", { redirectUrl: phonepeRes.redirectUrl });
}, "PHONEPE_GATEWAY_ERROR");

router.post("/initiate-payment", phonepeGateway);

export default router;
