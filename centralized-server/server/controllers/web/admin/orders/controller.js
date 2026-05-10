import Order from "#models/Order.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId } from "#utils/validators.js";

// GET /api/admin/orders  — all orders for the logged-in admin
export const getOrders = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const orders = await Order.find({ userId }).populate("planId", "name amount").sort({ createdAt: -1 }).lean();

  return successResponse(res, "Orders fetched", orders);
});

// GET /api/admin/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const v = validateObjectId(id, "Order ID");
  if (!v.valid) return errorResponse(res, v.error);

  const order = await Order.findOne({ _id: id, userId: req.user.userId }).populate("planId", "name amount").lean();

  if (!order) return errorResponse(res, "Order not found", 404);

  return successResponse(res, "Order fetched", order);
});
