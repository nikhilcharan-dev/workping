import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { metricsMiddleware, getMetrics, getMetricsCSV, startStatusTicker, saveToDisk } from "./middleware/metrics.js";
import bucketRoutes from "./routes/bucket.routes.js";
import presignRoutes from "./routes/presigned.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Validate required env vars at startup ---
const REQUIRED_ENV = ["COMPARTMENT_ID", "REGION"];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        logger.fatal(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.path === "/" || req.path.startsWith("/api/metrics"),
    })
);

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];

app.use(
    cors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : false,
        methods: ["GET", "POST", "DELETE"],
    })
);

// --- Body parsing & logging ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan("dev"));
app.use(metricsMiddleware);
startStatusTicker();

// --- Health check (unauthenticated) ---
app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

// --- Metrics & Dashboard ---
app.get("/api/metrics", apiKeyAuth, (_req, res) => res.json(getMetrics()));

app.get("/api/metrics/export", apiKeyAuth, (req, res) => {
    const format = req.query.format || "json";
    const timestamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="metrics-${timestamp}.csv"`);
        return res.send(getMetricsCSV());
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="metrics-${timestamp}.json"`);
    res.json(getMetrics());
});

app.get("/", (_req, res) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
    );
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// --- Authenticated API routes ---
app.use("/api", apiKeyAuth, bucketRoutes);
app.use("/api/presigned", apiKeyAuth, presignRoutes);

// --- Centralized error handler ---
app.use(errorHandler);

// --- Start server ---
const PORT = parseInt(process.env.PORT || "8000", 10);
const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

// --- Graceful shutdown ---
async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    await saveToDisk();
    server.close(() => {
        logger.info("Server closed");
        process.exit(0);
    });
    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
