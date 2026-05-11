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

// Idempotency window — dedupes retried deliveries from the gateway for 10 minutes.
const IDEMPOTENCY_TTL_SECONDS = 10 * 60;

/**
 * Verify the HMAC-SHA256 signature on the forwarded webhook body.
 * The gateway microservice signs the raw bytes with ORIGIN_WEBHOOK_SECRET;
 * we verify with PHONEPE_SECRET (same value at deploy time) over req.rawBody.
 * timingSafeEqual prevents leaking the secret via response-time analysis.
 */
function verifyWebhookSignature(req) {
  const signature = req.headers["x-webhook-signature"];
  const secret = process.env.PHONEPE_SECRET;

  if (!signature || !secret || !req.rawBody) return false;

  const expected = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");

  try {
    const a = Buffer.from(String(signature).trim(), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const phonepeWebhook = asyncHandler(async (req, res) => {
  // --- HMAC signature verification ---
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ type: "error", message: "Invalid webhook signature" });
  }

  const { merchantOrderId, state, amount, paymentDetails } = req.body;

  if (!merchantOrderId || !state) {
    return res.status(400).json({ type: "error", message: "Missing required fields" });
  }

  // --- Redis-backed idempotency ---
  // Claim {orderId, state} with NX so concurrent / retried deliveries collapse to one processing.
  // On downstream failure we release the key so the gateway's retry can succeed.
  const idempotencyKey = `webhook:phonepe:${merchantOrderId}:${state}`;
  const claimed = await redis.set(idempotencyKey, "1", { NX: true, EX: IDEMPOTENCY_TTL_SECONDS });
  if (!claimed) {
    console.log(`[PhonePe Webhook] Duplicate delivery ${merchantOrderId}:${state} — skipping`);
    return res.status(200).json({ type: "success", message: "OK", note: "duplicate" });
  }

  const orderStatus = STATE_MAP[state] ?? "Pending";

  try {
  // Fetch our order (merchantOrderId = our Order._id)
  const order = await Order.findById(merchantOrderId);
  if (!order) {
    console.warn(`[PhonePe Webhook] Unknown order: ${merchantOrderId}`);
    // Possibly a race with order creation — release the claim so a retry can succeed.
    await redis.del(idempotencyKey).catch(() => {});
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
  } catch (err) {
    // Release the idempotency claim so the gateway's retry isn't silently swallowed.
    await redis.del(idempotencyKey).catch(() => {});
    throw err;
  }
}, "PHONEPE_WEBHOOK_ERROR");

router.post("/webhook", phonepeWebhook);

export default router;
