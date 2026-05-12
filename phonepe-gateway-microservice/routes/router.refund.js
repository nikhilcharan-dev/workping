import { Router } from "express";
import axios from "axios";
import PHONEPE_CONFIG from "../config/phonepe.env.js";
import getAuthorisationToken from "../config/phonepe.auth.js";

const PHONE_BASE_URL = PHONEPE_CONFIG.baseUrl;
const REFUND_PATH = "/payments/v2/refund";
const STATUS_PATH = "/payments/v2/refund/";
const ORDER_STATUS_PATH = "/checkout/v2/order";

const router = Router();

router.post("/initiate-refund", async (req, res) => {
  try {
    const { refundId, orderId, amount } = req.body;

    if (!refundId || !orderId || amount === undefined || amount === null) {
      return res.status(400).json({ error: "Missing required fields (refundId, orderId, amount)" });
    }

    const refundAmountNum = Number(amount);
    if (!Number.isFinite(refundAmountNum) || refundAmountNum <= 0) {
      return res.status(400).json({ error: "Invalid refund amount" });
    }
    const refundAmountPaise = Math.round(refundAmountNum * 100);

    const token = await getAuthorisationToken();

    // Verify refund amount does not exceed the original order's captured amount.
    // PhonePe's order status is the authoritative source — never trust the caller.
    let originalAmountPaise;
    try {
      const orderStatus = await axios.get(`${PHONE_BASE_URL}${ORDER_STATUS_PATH}/${orderId}/status`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
      });
      originalAmountPaise = orderStatus.data?.amount;
      if (!Number.isFinite(originalAmountPaise) || originalAmountPaise <= 0) {
        return res.status(409).json({ error: "Original order amount could not be verified" });
      }
    } catch (statusErr) {
      console.error("Refund pre-check status fetch failed:", statusErr?.response?.data || statusErr.message);
      return res.status(409).json({ error: "Original order not found or not in a refundable state" });
    }

    if (refundAmountPaise > originalAmountPaise) {
      console.warn(`[Refund] Rejected: refund ${refundAmountPaise} > original ${originalAmountPaise} for ${orderId}`);
      return res.status(400).json({ error: "Refund amount exceeds original order amount" });
    }

    const refundResponse = await axios.post(
      PHONE_BASE_URL + REFUND_PATH,
      {
        merchantRefundId: refundId,
        originalMerchantOrderId: orderId,
        amount: refundAmountPaise,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
      }
    );
    return res.status(200).json({
      status: "success",
      refundDetails: refundResponse.data,
    });
  } catch (err) {
    console.error("Refund Initiation Error:", err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({
      error: err?.response?.data?.error || "Refund initiation failed",
    });
  }
});

router.post("/get-refund-status", async (req, res) => {
  try {
    const { refundId } = req.body;
    if (!refundId) {
      return res.status(400).json({ error: "Missing refundId" });
    }

    const token = await getAuthorisationToken();
    const refundResponse = await axios.get(`${PHONE_BASE_URL}${STATUS_PATH}${refundId}/status`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
    });

    const data = refundResponse.data;
    return res.status(200).json(data);
  } catch (err) {
    console.error("Refund Status Error:", err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({
      error: err?.response?.data?.error || "Failed to fetch refund status",
    });
  }
});

export default router;
