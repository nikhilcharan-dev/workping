import { asyncHandler } from "#utils/async.handler.js";
import Payment from "#models/Payment.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId } from "#utils/validators.js";

// GET /api/admin/payments  — all payments for the logged-in admin
export const getPayments = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const payments = await Payment.find({ adminId: userId })
    .populate("orderId", "planId amount date")
    .populate("subscriptionId", "planName billingCycle status")
    .sort({ createdAt: -1 })
    .lean();

  return successResponse(res, "Payments fetched", payments);
});

// GET /api/admin/payments/:id  — single payment
export const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const v = validateObjectId(id, "Payment ID");
  if (!v.valid) return errorResponse(res, v.error);

  const payment = await Payment.findOne({ _id: id, adminId: req.user.userId })
    .populate("orderId", "planId amount date orderStatus")
    .populate("subscriptionId", "planName billingCycle status startDate endDate")
    .lean();

  if (!payment) return errorResponse(res, "Payment not found", 404);

  return successResponse(res, "Payment fetched", payment);
});
