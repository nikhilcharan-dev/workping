import { Router } from "express";
import axios from "axios";
import PHONEPE_CONFIG from "../config/phonepe.env.js";
import getAuthorisationToken from "../config/phonepe.auth.js";

const PHONE_BASE_URL = PHONEPE_CONFIG.baseUrl;
const REFUND_PATH = "/payments/v2/refund";
const STATUS_PATH = "/payments/v2/refund/";

const router = Router();

router.post("/initiate-refund", async (req, res) => {
  try {
    const { refundId, orderId, amount } = req.body;

    if (!refundId || !orderId || !amount) {
      return res.status(400).json({ error: "Missing required fields (refundId, orderId, amount)" });
    }

    const token = await getAuthorisationToken();
    const refundResponse = await axios.post(
      PHONE_BASE_URL + REFUND_PATH,
      {
        merchantRefundId: refundId,
        originalMerchantOrderId: orderId,
        amount: Math.round(amount * 100),
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
