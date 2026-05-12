import axios from "axios";
import PHONEPE_CONFIG from "../config/phonepe.env.js";
import getAuthorisationToken from "../config/phonepe.auth.js";
import { logger } from "../utils/logger.js";

const STATUS_PATH = "/checkout/v2/order";

const phonepeCallBack = async (req, res) => {
  try {
    const { orderId, callbackResponse } = req.body;

    if (!orderId || !callbackResponse) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: orderId and callbackResponse",
      });
    }

    if (callbackResponse === "USER_CANCEL") {
      return res.status(200).json({ success: true, status: "CANCELLED" });
    }

    if (callbackResponse !== "CONCLUDED") {
      return res.status(400).json({
        success: false,
        error: "Invalid callbackResponse. Expected USER_CANCEL or CONCLUDED",
      });
    }

    // Verify real status with PhonePe
    const token = await getAuthorisationToken();
    const statusRes = await axios.get(`${PHONEPE_CONFIG.baseUrl}${STATUS_PATH}/${orderId}/status`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
    });

    const { state, amount, paymentDetails, metaInfo } = statusRes.data;

    // Forward to origin server as webhook fallback (fire-and-log — does not affect response)
    axios
      .post(
        process.env.ORIGIN_WEBHOOK_URL,
        {
          merchantOrderId: orderId,
          state,
          amount,
          paymentDetails,
          userId: metaInfo?.udf1 ?? null,
          event: "CALLBACK_FALLBACK",
        },
        {
          headers: {
            "X-Webhook-Secret": process.env.ORIGIN_WEBHOOK_SECRET,
            "Content-Type": "application/json",
          },
        }
      )
      .catch((err) => {
        logger.error("[Callback] Failed to forward to origin server:", { err: err?.response?.data || err.message });
      });

    return res.status(200).json({ success: true, state, amount, paymentDetails });
  } catch (err) {
    logger.error("[Callback] Error:", { err: err?.response?.data || err.message });
    return res.status(err?.response?.status || 500).json({
      success: false,
      error: err?.response?.data?.error || "Failed to verify payment status",
    });
  }
};

export default phonepeCallBack;
