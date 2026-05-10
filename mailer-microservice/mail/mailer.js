import transporter from "../config/mailTransporter.js";
import templates from "./templates.js";
import { logEmailEvent } from "../utils/analytics.js";

/* ─── Generic: send raw HTML ─── */
export const sendEMail = async (email, subject, content) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: subject,
      html: content,
    });
    await logEmailEvent("raw", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("raw", "failure");
    throw err;
  }
};

/* ─── OTP: Email Verification ─── */
export const sendEmailOTP = async (email, otp) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: "OTP Verification",
      html: templates.getOtp(email, otp),
    });
    await logEmailEvent("otp", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("otp", "failure");
    throw err;
  }
};

/* ─── OTP: Reset Password ─── */
export const sendResetPasswordOTP = async (email, otp) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: "Reset Password OTP",
      html: templates.getResetPasswordOtp(email, otp),
    });
    await logEmailEvent("otp", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("otp", "failure");
    throw err;
  }
};

/* ─── Confirm: Password Verified ─── */
export const sendVerifyPassword = async (email) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: "Password Verified",
      html: templates.getVerifyPassword(email),
    });
    await logEmailEvent("forgotPassword", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("forgotPassword", "failure");
    throw err;
  }
};

/* ─── Forgot Password (link-based) ─── */
export const sendForgotPassword = async (email, resetLink) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: "Reset Your Password",
      html: templates.getForgotPassword(email, resetLink),
    });
    await logEmailEvent("forgotPassword", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("forgotPassword", "failure");
    throw err;
  }
};

/* ─── Welcome / Greeting ─── */
export const sendGreeting = async (email, name, org, role) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: `Welcome to ${org}!`,
      html: templates.getGreeting(name, org, role),
    });
    await logEmailEvent("greeting", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("greeting", "failure");
    throw err;
  }
};

/* ─── Alert: Info ─── */
export const sendAlertInfo = async (email, title, message) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: title,
      html: templates.getAlertInfo(email, title, message),
    });
    await logEmailEvent("alert", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("alert", "failure");
    throw err;
  }
};

/* ─── Alert: Warning ─── */
export const sendAlertWarning = async (email, title, message, actionLink) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: `⚠️ ${title}`,
      html: templates.getAlertWarning(email, title, message, actionLink),
    });
    await logEmailEvent("alert", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("alert", "failure");
    throw err;
  }
};

/* ─── Alert: Danger ─── */
export const sendAlertDanger = async (email, title, message, actionLink) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: `🚨 ${title}`,
      html: templates.getAlertDanger(email, title, message, actionLink),
    });
    await logEmailEvent("alert", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("alert", "failure");
    throw err;
  }
};

/* ─── Alert: Success ─── */
export const sendAlertSuccess = async (email, title, message) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: `✅ ${title}`,
      html: templates.getAlertSuccess(email, title, message),
    });
    await logEmailEvent("alert", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("alert", "failure");
    throw err;
  }
};

/* ─── Notification (Generic) ─── */
export const sendNotification = async (email, title, message) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: title,
      html: templates.getNotification(email, title, message),
    });
    await logEmailEvent("notification", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("notification", "failure");
    throw err;
  }
};

/* ─── Raw HTML (just send pre-built HTML to an address) ─── */
export const sendRawHTML = async (email, subject, html) => {
  try {
    await transporter.sendMail({
      to: email,
      subject: subject,
      html: html,
    });
    await logEmailEvent("raw", "success");
  } catch (err) {
    console.error("[Mailer Error]", err.message);
    await logEmailEvent("raw", "failure");
    throw err;
  }
};
