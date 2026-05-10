import { Router } from "express";
import axios from "axios";
import PHONEPE_CONFIG from "../config/phonepe.env.js";
import getAuthorisationToken from "../config/phonepe.auth.js";

const PHONE_PAYMENT_BASE_URI = PHONEPE_CONFIG.baseUrl;
const REDIRECT_URI = PHONEPE_CONFIG.redirectUri;
const PAY_PATH = "/checkout/v2/pay";
const STATUS_PATH = "/checkout/v2/order";

// Allowlist of valid plan amounts in paise. Prevents amount tampering.
const VALID_AMOUNTS = new Set(
  (process.env.VALID_PLAN_AMOUNTS_PAISE || "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
);

const router = Router();

// Initiate a payment
router.post("/initiate-payment", async (req, res) => {
  try {
    const { amount, orderId, userId } = req.body;

    // Input validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount provided" });
    }
    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "Invalid orderId provided" });
    }
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Validate amount matches a known plan price (in paise)
    const amountPaise = Math.round(amount * 100);
    if (VALID_AMOUNTS.size > 0 && !VALID_AMOUNTS.has(amountPaise)) {
      console.warn(`[Payment] Rejected unknown amount ${amountPaise} paise for order ${orderId}`);
      return res.status(400).json({ error: "Amount does not match any active plan price" });
    }

    // Default Payload for PhonePe payment initialization
    const requestPayload = {
      merchantOrderId: orderId,
      amount: amountPaise,
      expiresAfter: 10 * 60,
      metaInfo: {
        udf1: userId,
      },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment for order " + orderId,
        merchantUrls: {
          redirectUrl: `${REDIRECT_URI}/order/${orderId}`,
        },
        disablePaymentRetry: false,
        paymentModeConfig: {
          enabledPaymentModes: [
            { type: "UPI_COLLECT" },
            { type: "UPI_INTENT" },
            { type: "UPI_QR" },
            { type: "CARD" },
            { type: "NET_BANKING" },
          ],
        },
      },
    };

    const token = await getAuthorisationToken();
    const response = await axios.post(PHONE_PAYMENT_BASE_URI + PAY_PATH, requestPayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
    });

    return res.status(200).json(response.data);
  } catch (err) {
    console.error("Payment Initiation Error:", err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({
      success: false,
      error: err?.response?.data?.error || "Payment initiation failed",
    });
  }
});

router.post("/get-payment-status", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({
        error: "Missing orderId",
      });
    }

    const token = await getAuthorisationToken();
    const statusRes = await axios.get(`${PHONE_PAYMENT_BASE_URI}${STATUS_PATH}/${orderId}/status`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
    });

    return res.status(200).json(statusRes.data);
  } catch (err) {
    console.error("Payment Status Error:", err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({
      success: false,
      error: err?.response?.data?.error || "Failed to fetch payment status",
    });
  }
});

export default router;
