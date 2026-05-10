import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import sanitizeMongo from "#middleware/sanitizeMongo.js";

const MODE = process.env.MODE;

import { allowedOrigins } from "#config/cors.js";

const corsOptions = {
    origin: (origin, cb) =>
        !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked")),
    credentials: true,
};

// General limiter — all routes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { type: "error", message: "Too many requests, please try again later." },
});

// Strict limiter — auth, OTP, password reset (brute-force targets)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { type: "error", message: "Too many attempts, please try again in 15 minutes." },
});

export default function middlewares(app) {
    app.set("trust proxy", 1);

    // Security headers — CSP disabled since this is a pure JSON API
    app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

    app.use(cors(corsOptions));

    app.use(generalLimiter);

    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true, limit: "10kb" }));

    app.use(sanitizeMongo);

    app.use(cookieParser());

    app.use((req, res, next) => {
        console.log(`[Request] [${req.ip}] ${req.method} ${req.url}`);
        if (req.headers["user-agent"]?.includes("PostmanRuntime") && MODE === "production") {
            return res.status(403).json({
                message: "Axios/Postman is fast, but not fast enough to be a browser.",
            });
        }
        next();
    });
}
