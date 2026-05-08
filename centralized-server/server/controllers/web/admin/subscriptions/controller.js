import Subscription from "#models/Subscription.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";

const getActiveSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const subscription = await Subscription.findOne({
        adminId: userId,
        status: "ACTIVE",
    })
        .populate("planId")
        .sort({ createdAt: -1 })
        .lean();

    return successResponse(res, "Active subscription fetched successfully", subscription ?? null);
}, "ADMIN_GET_ACTIVE_SUBSCRIPTION_ERROR");

const cancelSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const subscription = await Subscription.findOne({
        adminId: userId,
        status: "ACTIVE",
    }).sort({ createdAt: -1 });

    if (!subscription) {
        return errorResponse(res, "No active subscription to cancel", 404);
    }

    subscription.status = "CANCELLED";
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;
    await subscription.save();

    return successResponse(res, "Subscription cancelled successfully", null);
}, "ADMIN_CANCEL_SUBSCRIPTION_ERROR");

const getSubscriptionHistory = asyncHandler(async (req, res) => {
    const { userId } = req.user;

    const subscriptions = await Subscription.find({ adminId: userId })
        .populate("planId")
        .sort({ createdAt: -1 })
        .lean();

    return successResponse(res, "Subscription history fetched successfully", subscriptions);
}, "ADMIN_GET_SUBSCRIPTION_HISTORY_ERROR");

export { getActiveSubscription, cancelSubscription, getSubscriptionHistory };
