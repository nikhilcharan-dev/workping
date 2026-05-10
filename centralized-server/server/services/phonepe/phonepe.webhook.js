import Order from "#models/Order.js";
import Payment from "#models/Payment.js";
import Subscription from "#models/Subscription.js";
import Plan from "#models/Plan.js";
import OrgAdmin from "#models/Admin.Org.js";
import Admin from "#models/Admin.js";
import { Router } from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { sendWhatsApp } from "#services/whatsapp/whatsapp.service.js";

const router = Router();

// PhonePe state → our orderStatus
const STATE_MAP = {
  COMPLETED: "Success",
  FAILED: "Failed",
  PENDING: "Pending",
};

// PhonePe paymentMode → our paymentMethod enum
const METHOD_MAP = {
  UPI: "UPI",
  CARD: "Credit Card",
  NET_BANKING: "Net Banking",
  WALLET: "UPI",
};

/**
 * Verify PhonePe webhook secret using a constant-time comparison
 * to prevent timing-based secret enumeration attacks.
 */
function verifyWebhookSecret(req) {
  const receivedSecret = req.headers["x-webhook-secret"];
  const expectedSecret = process.env.PHONEPE_SECRET;

  if (!receivedSecret || !expectedSecret) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(receivedSecret), Buffer.from(expectedSecret));
  } catch {
    // timingSafeEqual throws if buffers differ in byte length
    return false;
  }
}

const phonepeWebhook = asyncHandler(async (req, res) => {
  // --- Static Secret verification ---
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ type: "error", message: "Invalid webhook secret" });
  }

  const { merchantOrderId, state, amount, paymentDetails } = req.body;

  if (!merchantOrderId || !state) {
    return res.status(400).json({ type: "error", message: "Missing required fields" });
  }

  const orderStatus = STATE_MAP[state] ?? "Pending";

  // Fetch our order (merchantOrderId = our Order._id)
  const order = await Order.findById(merchantOrderId);
  if (!order) {
    console.warn(`[PhonePe Webhook] Unknown order: ${merchantOrderId}`);
    return res.status(200).json({ type: "success", message: "OK" });
  }

  if (order.orderStatus !== "Pending") {
    console.log(`[PhonePe Webhook] Order ${merchantOrderId} already ${order.orderStatus} — skipping`);
    return res.status(200).json({ type: "success", message: "OK" });
  }

  const userId = order.userId.toString();

  // Extract payment details from PhonePe payload
  const detail = Array.isArray(paymentDetails) ? paymentDetails[0] : null;
  const transactionId = detail?.transactionId ?? null;
  const paymentMode = detail?.paymentMode ?? "UPI";
  const paymentMethod = METHOD_MAP[paymentMode] ?? "UPI";

  order.orderStatus = orderStatus;
  if (transactionId) order.transactionId = transactionId;
  await order.save();

  // --- COMPLETED ---
  if (state === "COMPLETED") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Look up organization via OrgAdmin join model
      const orgAdmin = await OrgAdmin.findOne({ primaryAdmin: order.userId }).lean();
      const organizationId = orgAdmin?.organizationId;

      // Create Payment record
      const [payment] = await Payment.create(
        [
          {
            adminId: order.userId,
            organizationId: organizationId ?? order.userId,
            orderId: order._id,
            amount: amount / 100, // paise → rupees
            paymentMethod,
            paymentGateway: "PHONEPE",
            transactionId,
            status: "SUCCESS",
            paidAt: new Date(),
          },
        ],
        { session }
      );

      // Create Subscription
      const plan = await Plan.findById(order.planId);
      let endDate = new Date();
      let subscription = null;

      if (plan) {
        const startDate = new Date();
        endDate = new Date();

        plan.billingCycle === "YEARLY"
          ? endDate.setFullYear(endDate.getFullYear() + 1)
          : endDate.setMonth(endDate.getMonth() + 1);

        [subscription] = await Subscription.create(
          [
            {
              adminId: order.userId,
              organizationId: organizationId,
              planId: plan._id,
              orderId: order._id,
              planName: plan.name,
              price: plan.amount,
              billingCycle: plan.billingCycle,
              status: "ACTIVE",
              startDate,
              endDate,
              paymentId: payment._id,
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      // Cross-link records outside the transaction (already committed)
      if (subscription) {
        await Payment.findByIdAndUpdate(payment._id, { subscriptionId: subscription._id });

        // Expire any previous active subscriptions for this admin (excluding the new one)
        await Subscription.updateMany(
          { adminId: order.userId, status: "ACTIVE", _id: { $ne: subscription._id } },
          { $set: { status: "EXPIRED" } }
        );

        // Keep Admin.planId in sync so limit checks always reflect the current plan
        await Admin.findByIdAndUpdate(order.userId, { planId: plan._id });
      }
      await Order.findByIdAndUpdate(order._id, { paymentId: payment._id });

      // Post-transaction actions
      if (plan) {
        // Emit success to client — closes "Processing..." UI
        io.to(`payment:${userId}`).emit("payment:success", {
          orderId: order._id,
          transactionId,
          planName: plan.name,
          amount: amount / 100,
          billingCycle: plan.billingCycle,
          subscriptionEnds: endDate,
        });

        // WhatsApp payment confirmation — fire-and-log
        const admin = await Admin.findById(order.userId).lean();
        if (admin?.phoneNumber) {
          sendWhatsApp(
            admin.phoneNumber,
            `*Payment Successful* 💳\nHi ${admin.name}, your payment of *₹${amount / 100}* for the *${plan.name}* plan has been confirmed.\nSubscription active till *${endDate.toLocaleDateString("en-IN")}*.`
          ).catch((err) => console.error("[WhatsApp] Payment notification failed:", err.message));
        }
      }

      // Clear Redis pending-payment key
      await redis.del(`payment:${userId}`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // --- FAILED ---
  } else if (state === "FAILED") {
    io.to(`payment:${userId}`).emit("payment:failed", {
      orderId: order._id,
      reason: detail?.errorCode ?? "Payment failed",
    });
  }

  return res.status(200).json({ type: "success", message: "OK" });
}, "PHONEPE_WEBHOOK_ERROR");

router.post("/webhook", phonepeWebhook);

export default router;
