import { Router } from "express";
import {
  sendEMail,
  sendRawHTML,
  sendForgotPassword,
  sendGreeting,
  sendAlertInfo,
  sendAlertWarning,
  sendAlertDanger,
  sendAlertSuccess,
  sendNotification,
  sendVerifyPassword,
} from "../mail/mailer.js";
import { perRecipientRateLimit } from "../utils/rateLimit.js";

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ status: "error", error: "Valid email is required" });
  }
  next();
};

// Apply to every email-sending route. validateEmail runs first so we don't
// charge the rate-limit counter for malformed payloads.
router.use(validateEmail, perRecipientRateLimit());

/* ─── Send templated email (subject + content) ─── */
router.post("/send-mail", validateEmail, async (req, res) => {
  const { email, subject, content } = req.body;
  try {
    if (!subject || !content) {
      return res.status(400).json({ status: "error", error: "subject and content are required" });
    }
    await sendEMail(email, subject, content);
    return res.status(200).json({ status: "success", message: "Email sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Send raw HTML (just provide `to`, `subject`, `html`) ─── */
router.post("/send-html", validateEmail, async (req, res) => {
  const { email, subject, html } = req.body;
  try {
    if (!subject || !html) {
      return res.status(400).json({ status: "error", error: "subject and html are required" });
    }
    await sendRawHTML(email, subject, html);
    return res.status(200).json({ status: "success", message: "HTML email sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

// Only allow links that point to known WorkPing origins, and only over
// http(s). Without this, a caller could plant `javascript:` URLs or
// attacker-controlled hosts in the password-reset mail.
const ALLOWED_RESET_LINK_HOSTS = new Set(
  (process.env.ALLOWED_RESET_LINK_HOSTS || "workping.live,admin.workping.live,employee.workping.live")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

function isSafeResetLink(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  // Match host or any subdomain of an allowed host.
  const host = url.hostname.toLowerCase();
  for (const allowed of ALLOWED_RESET_LINK_HOSTS) {
    if (host === allowed || host.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

/* ─── Forgot Password (link-based) ─── */
router.post("/forgot-password", validateEmail, async (req, res) => {
  const { email, resetLink } = req.body;
  try {
    if (!resetLink) {
      return res.status(400).json({ status: "error", error: "resetLink is required" });
    }
    if (!isSafeResetLink(resetLink)) {
      return res.status(400).json({ status: "error", error: "resetLink is not in the allowed host list" });
    }
    await sendForgotPassword(email, resetLink);
    return res.status(200).json({ status: "success", message: "Forgot password link sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Verify Password Confirmation ─── */
router.post("/verify-password", validateEmail, async (req, res) => {
  const { email } = req.body;
  try {
    await sendVerifyPassword(email);
    return res.status(200).json({ status: "success", message: "Verification email sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Welcome / Greeting ─── */
router.post("/greeting", validateEmail, async (req, res) => {
  const { email, name, org, role } = req.body;
  try {
    if (!name || !org || !role) {
      return res.status(400).json({ status: "error", error: "name, org, and role are required" });
    }
    await sendGreeting(email, name, org, role);
    return res.status(200).json({ status: "success", message: "Greeting email sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Alert: Info ─── */
router.post("/alert/info", validateEmail, async (req, res) => {
  const { email, title, message } = req.body;
  try {
    if (!title || !message) {
      return res.status(400).json({ status: "error", error: "title and message are required" });
    }
    await sendAlertInfo(email, title, message);
    return res.status(200).json({ status: "success", message: "Info alert sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Alert: Warning ─── */
router.post("/alert/warning", validateEmail, async (req, res) => {
  const { email, title, message, actionLink } = req.body;
  try {
    if (!title || !message) {
      return res.status(400).json({ status: "error", error: "title and message are required" });
    }
    await sendAlertWarning(email, title, message, actionLink);
    return res.status(200).json({ status: "success", message: "Warning alert sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Alert: Danger ─── */
router.post("/alert/danger", validateEmail, async (req, res) => {
  const { email, title, message, actionLink } = req.body;
  try {
    if (!title || !message) {
      return res.status(400).json({ status: "error", error: "title and message are required" });
    }
    await sendAlertDanger(email, title, message, actionLink);
    return res.status(200).json({ status: "success", message: "Danger alert sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Alert: Success ─── */
router.post("/alert/success", validateEmail, async (req, res) => {
  const { email, title, message } = req.body;
  try {
    if (!title || !message) {
      return res.status(400).json({ status: "error", error: "title and message are required" });
    }
    await sendAlertSuccess(email, title, message);
    return res.status(200).json({ status: "success", message: "Success alert sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

/* ─── Notification (Generic) ─── */
router.post("/notification", validateEmail, async (req, res) => {
  const { email, title, message } = req.body;
  try {
    if (!title || !message) {
      return res.status(400).json({ status: "error", error: "title and message are required" });
    }
    await sendNotification(email, title, message);
    return res.status(200).json({ status: "success", message: "Notification sent successfully" });
  } catch (err) {
    console.error("[Mail Error]", err);
    return res.status(500).json({ status: "error", error: "Internal Server Error" });
  }
});

export default router;
