import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import sanitizeMongo from "#middleware/sanitizeMongo.js";
import originGuard from "#middleware/originGuard.js";

const MODE = process.env.MODE;

import { allowedOrigins } from "#config/cors.js";

const corsOptions = {
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked"))),
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
  max: 5,  // Reduced from 10 to 5 per 15 min (one attempt per 3 minutes)
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { type: "error", message: "Too many attempts, please try again in 15 minutes." },
  keyGenerator: (req) => req.body?.email || req.ip,  // Rate limit by email if provided
});

// OTP rate limiter — strict per email
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,  // 3 OTP attempts per 5 minutes
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { type: "error", message: "Too many OTP attempts, please try again later." },
  keyGenerator: (req) => req.body?.email || req.ip,
  skip: (req) => req.path !== '/otp/verify',  // Only limit verification, not sending
});

// Sensitive operations rate limiter
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,  // 10 per minute per user
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { type: "error", message: "Rate limit exceeded for sensitive operation." },
  keyGenerator: (req) => req.user?.userId || req.ip,
});

export default function middlewares(app) {
  app.set("trust proxy", 1);

  // Security headers — CSP locked down for a JSON-only API (no scripts/styles served)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          imgSrc: ["'none'"],
          fontSrc: ["'none'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "no-referrer" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },  // Prevent clickjacking
      noSniff: true,  // Prevent MIME type sniffing
      xssFilter: true,  // Enable XSS filter
      permissionsPolicy: {  // Control browser capabilities
        camera: [],
        microphone: [],
        geolocation: [],
        magnetometer: [],
        gyroscope: [],
      },
    })
  );

  app.use(cors(corsOptions));

  app.use(generalLimiter);

  app.use(
    express.json({
      limit: "10kb",
      verify: (req, _res, buf) => {
        // Preserve raw bytes for HMAC signature verification (PhonePe webhook)
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));

  app.use(sanitizeMongo);

  app.use(cookieParser());

  // CSRF defense: enforce Origin/Referer against the CORS allowlist on
  // state-changing requests. Browsers always set Origin on POST/PUT/PATCH/DELETE,
  // and the allowlist is the same set CORS already trusts, so legitimate UIs
  // pass without any client-side token plumbing. Server-to-server callers
  // (PhonePe webhook, /internal routes) are exempt and use their own auth.
  app.use(originGuard);

  // Request logging — reduced to warn/error level only
  app.use((req, res, next) => {
    // Log only sensitive operations and errors
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      console.log(`[${req.method}] ${req.path} [${req.ip}]`);
    }
    if (req.headers["user-agent"]?.includes("PostmanRuntime") && MODE === "production") {
      return res.status(403).json({
        type: "error",
        message: "API testing tools not allowed in production",
      });
    }
    next();
  });
}
