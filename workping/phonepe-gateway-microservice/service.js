import express from "express";
import cors from "cors";
import "dotenv/config";

import paymentRoutes from "./routes/router.payment.js";
import refundRoutes from "./routes/router.refund.js";
import phonepeWebhook from "./webhook/phonepe.webhook.js";
import phonepeCallback from "./routes/callback.js";

// import sandboxTestRoute from "./test/sandbox.test.js";

const app = express();
const PORT = process.env.PORT || 3000;

// app.use(cors({
//     origin: process.env.ORIGIN || true,
//     credentials: true
// }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.use("/api/payments", paymentRoutes);
app.use("/api/refund", refundRoutes);
app.post("/api/phonepe/webhook", phonepeWebhook);
app.post("/api/payments/phonepe/callback", phonepeCallback);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.message);
    res.status(500).json({
        success: false,
        error: "Internal Server Error",
    });
});

(async () => {
    app.listen(PORT, () => {
        console.log(`PhonePe Gateway running on port ${PORT}`);
    });
})();
