import {
  sendMail,
  sendHTMLMail,
  sendGreetingMail,
  sendAlertInfo,
  sendAlertWarning,
  sendAlertDanger,
  sendAlertSuccess,
  sendNotification,
} from "#services/mailer/mail.service.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateEmail, validateRequiredFields } from "#utils/validators.js";

export const send_simple_mail = asyncHandler(async (req, res) => {
  const { email, subject, content } = req.body;
  const requiredCheck = validateRequiredFields({ email, subject, content }, ["email", "subject", "content"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendMail(email, subject, content);
  return successResponse(res, "Mail sent successfully");
}, "SEND_SIMPLE_MAIL_ERROR");

export const send_html_mail = asyncHandler(async (req, res) => {
  const { email, subject, html } = req.body;
  const requiredCheck = validateRequiredFields({ email, subject, html }, ["email", "subject", "html"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendHTMLMail(email, subject, html);
  return successResponse(res, "HTML Mail sent successfully");
}, "SEND_HTML_MAIL_ERROR");

export const send_greeting = asyncHandler(async (req, res) => {
  const { email, name, org, role } = req.body;
  const requiredCheck = validateRequiredFields({ email, name, org, role }, ["email", "name", "org", "role"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendGreetingMail(email, name, org, role);
  return successResponse(res, "Greeting mail sent");
}, "SEND_GREETING_ERROR");

export const send_alert_info = asyncHandler(async (req, res) => {
  const { email, title, message } = req.body;
  const requiredCheck = validateRequiredFields({ email, title, message }, ["email", "title", "message"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendAlertInfo(email, title, message);
  return successResponse(res, "Info alert sent");
}, "SEND_ALERT_INFO_ERROR");

export const send_alert_warning = asyncHandler(async (req, res) => {
  const { email, title, message, actionLink } = req.body;
  const requiredCheck = validateRequiredFields({ email, title, message }, ["email", "title", "message"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendAlertWarning(email, title, message, actionLink);
  return successResponse(res, "Warning alert sent");
}, "SEND_ALERT_WARNING_ERROR");

export const send_alert_danger = asyncHandler(async (req, res) => {
  const { email, title, message, actionLink } = req.body;
  const requiredCheck = validateRequiredFields({ email, title, message }, ["email", "title", "message"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendAlertDanger(email, title, message, actionLink);
  return successResponse(res, "Danger alert sent");
}, "SEND_ALERT_DANGER_ERROR");

export const send_alert_success = asyncHandler(async (req, res) => {
  const { email, title, message } = req.body;
  const requiredCheck = validateRequiredFields({ email, title, message }, ["email", "title", "message"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendAlertSuccess(email, title, message);
  return successResponse(res, "Success alert sent");
}, "SEND_ALERT_SUCCESS_ERROR");

export const send_general_notification = asyncHandler(async (req, res) => {
  const { email, title, message } = req.body;
  const requiredCheck = validateRequiredFields({ email, title, message }, ["email", "title", "message"]);
  if (!requiredCheck.valid) return errorResponse(res, requiredCheck.error);

  await sendNotification(email, title, message);
  return successResponse(res, "Notification sent");
}, "SEND_NOTIFICATION_ERROR");
