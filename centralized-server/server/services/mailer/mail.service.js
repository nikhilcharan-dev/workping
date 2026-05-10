import mailClient from "#utils/mailClient.js";

/**
 * Centralized Mail Service
 * Wraps all HTTP calls to the mailer microservice.
 * Base URL & auth are configured in mailClient.js via env vars.
 */

// ─── OTP ────────────────────────────────────────────────────────────────

export const sendEmailOTP = async (email) => {
  const res = await mailClient.post("/otp/send-email-otp", { email });
  return res.data;
};

export const verifyEmailOTP = async (email, otp) => {
  const res = await mailClient.post("/otp/verify-email-otp", { email, otp });
  return res.data;
};

export const sendResetPasswordOTP = async (email) => {
  const res = await mailClient.post("/otp/send-reset-password-otp", { email });
  return res.data;
};

export const verifyResetPasswordOTP = async (email, otp) => {
  const res = await mailClient.post("/otp/verify-reset-password-otp", { email, otp });
  return res.data;
};

// ─── MAIL ───────────────────────────────────────────────────────────────

export const sendMail = async (email, subject, content) => {
  const res = await mailClient.post("/mail/send-mail", { email, subject, content });
  return res.data;
};

export const sendHTMLMail = async (email, subject, html) => {
  const res = await mailClient.post("/mail/send-html", { email, subject, html });
  return res.data;
};

export const sendForgotPasswordMail = async (email, resetLink) => {
  const res = await mailClient.post("/mail/forgot-password", { email, resetLink });
  return res.data;
};

export const sendVerifyPasswordMail = async (email) => {
  const res = await mailClient.post("/mail/verify-password", { email });
  return res.data;
};

export const sendGreetingMail = async (email, name, org, role) => {
  const res = await mailClient.post("/mail/greeting", { email, name, org, role });
  return res.data;
};

// ─── ALERTS ─────────────────────────────────────────────────────────────

export const sendAlertInfo = async (email, title, message) => {
  const res = await mailClient.post("/mail/alert/info", { email, title, message });
  return res.data;
};

export const sendAlertWarning = async (email, title, message, actionLink) => {
  const res = await mailClient.post("/mail/alert/warning", { email, title, message, actionLink });
  return res.data;
};

export const sendAlertDanger = async (email, title, message, actionLink) => {
  const res = await mailClient.post("/mail/alert/danger", { email, title, message, actionLink });
  return res.data;
};

export const sendAlertSuccess = async (email, title, message) => {
  const res = await mailClient.post("/mail/alert/success", { email, title, message });
  return res.data;
};

// ─── NOTIFICATION ───────────────────────────────────────────────────────

export const sendNotification = async (email, title, message) => {
  const res = await mailClient.post("/mail/notification", { email, title, message });
  return res.data;
};
