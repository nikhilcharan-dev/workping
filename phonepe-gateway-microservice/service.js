import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import "dotenv/config";

import paymentRoutes from "./routes/router.payment.js";
import refundRoutes from "./routes/router.refund.js";
import phonepeWebhook from "./webhook/phonepe.webhook.js";
import phonepeCallback from "./routes/callback.js";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security headers ---
app.use(helmet({ contentSecurityPolicy: false }));

// --- CORS ---
const allowedOrigins = [
  process.env.ORIGIN,
  "https://admin.workping.live",
  "https://workping.live",
  "https://api.workping.live",
  "https://phonepe.workping.live",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked")),
    credentials: true,
  })
);

// --- Rate limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

// Stricter limiter for payment initiation routes
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many payment attempts, please try again later." },
});

app.use(generalLimiter);

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Health check (before auth) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/api/refund", paymentLimiter, refundRoutes);
app.post("/api/phonepe/webhook", phonepeWebhook);
app.post("/api/payments/phonepe/callback", phonepeCallback);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = status === 500 ? "Internal Server Error" : err.message;

  console.error({
    level: "error",
    status,
    message: err.message,
    method: req.method,
    path: req.originalUrl,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: message,
  });
});

(async () => {
  app.listen(PORT, () => {
    console.log(`PhonePe Gateway running on port ${PORT}`);
  });
})();
