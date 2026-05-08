import axios from "axios";
import crypto from "node:crypto";

const USERNAME = process.env.WEBHOOK_USERNAME;
const PASSWORD = process.env.WEBHOOK_PASSWORD;

const ORIGIN_WEBHOOK_URL = process.env.ORIGIN_WEBHOOK_URL;

export function verifyPhonePeWebhook(authHeader) {
    if (!authHeader) return false;

    const expected = crypto.createHash("sha256").update(`${USERNAME}:${PASSWORD}`).digest("hex");

    try {
        return crypto.timingSafeEqual(Buffer.from(authHeader.trim()), Buffer.from(expected));
    } catch {
        // timingSafeEqual throws if buffers differ in byte length
        return false;
    }
}

const phonepeWebhook = async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!verifyPhonePeWebhook(authHeader)) {
            console.warn("Unauthorized webhook attempt");
            return res.status(401).send("Unauthorized");
        }

        const { event, payload } = req.body;

        if (!payload || !payload.merchantOrderId) {
            console.error("Invalid webhook payload received");
            return res.status(400).json({ error: "Invalid payload" });
        }

        const { merchantOrderId, state, amount, metaInfo, paymentDetails } = payload;

        const filtered = {
            merchantOrderId,
            amount,
            state,
            userId: metaInfo?.udf1,
            paymentDetails,
            event,
        };

        console.log(`Forwarding webhook for order ${merchantOrderId} to backend...`);

        // Forward to backend
        const response = await axios.post(ORIGIN_WEBHOOK_URL, filtered, {
            headers: {
                "X-Webhook-Secret": process.env.ORIGIN_WEBHOOK_SECRET,
                "Content-Type": "application/json",
            },
        });

        console.log(`Backend responded with status ${response.status} for order ${merchantOrderId}`);

        return res.status(200).json({
            success: true,
        });
    } catch (err) {
        console.error("Webhook Processing Error:", err?.response?.data || err.message);
        return res.status(500).json({
            error: "Failed to process webhook",
        });
    }
};

export default phonepeWebhook;
