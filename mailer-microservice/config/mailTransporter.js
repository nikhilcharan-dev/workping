import nodemailer from "nodemailer";

// Generic SMTP transport. Previously this pinned `service: "gmail"`, which
// caps free Gmail at ~500 sends/day and ties the deploy to a single provider.
// Configure host/port/secure via env so the same image runs against Gmail,
// SES, SendGrid, Mailgun, or a private relay without code changes.
//   SMTP_HOST    — hostname (default smtp.gmail.com for back-compat)
//   SMTP_PORT    — 465 (TLS) or 587 (STARTTLS); default 587
//   SMTP_SECURE  — "true" for implicit TLS on 465, else false
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verification used to run as a side-effect of importing this module, which
// fired a network handshake at import time and crashed the process if SMTP
// was unreachable during boot (CI, local dev, regional outage). Callers now
// opt in via verifyTransport() — invoked once from server.js startup.
export function verifyTransport() {
  return new Promise((resolve, reject) => {
    transporter.verify((err) => (err ? reject(err) : resolve()));
  });
}

export default transporter;
