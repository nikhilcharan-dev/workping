import { Router } from "express";
import { sendWhatsAppMessage } from "../whatsapp/sender.js";
import { startFlow } from "../utils/conversation.state.js";
import { scheduleShiftReminder, cancelShiftReminder } from "../scheduler/shift.reminder.js";

const originRouter = Router();

const API_SECRET = process.env.WHATSAPP_VERIFY_TOKEN;
if (!API_SECRET) throw new Error("[CONFIG] WHATSAPP_VERIFY_TOKEN env var is required");

function authGuard(req, res, next) {
  const token = req.headers["authorization"];
  if (token !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/**
 * POST /api/secure/whatsapp/send
 *
 * Send a WhatsApp message to a user.
 * Designed to be called by external services (e.g. your main backend).
 *
 * Headers (required):
 *   Authorization: earthisflat
 *
 * Request body:
 *   {
 *     "to":   "91XXXXXXXXXX",   // required - recipient phone (with country code, no +)
 *     "text": "Hello there!"    // required - message body (supports WhatsApp formatting: *bold*, _italic_)
 *   }
 *
 * Success response (200):
 *   { "sent": true, "to": "91XXXXXXXXXX" }
 *
 * Error responses:
 *   401  { "error": "Unauthorized" }
 *   400  { "error": "Both 'to' and 'text' are required" }
 *   500  { "error": "...WhatsApp API error message..." }
 *
 * Example (curl):
 *   curl -X POST https://your-host/api/secure/whatsapp/send \
 *     -H "Content-Type: application/json" \
 *     -H "Authorization: earthisflat" \
 *     -d '{"to": "919876543210", "text": "Your leave has been approved."}'
 *
 * Example (axios from another service):
 *   await axios.post('https://your-host/api/secure/whatsapp/send', {
 *     to: '919876543210',
 *     text: 'Attendance marked successfully.'
 *   }, { headers: { Authorization: 'earthisflat' } });
 */
originRouter.post("/send", authGuard, async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ error: "Both 'to' and 'text' are required" });
  }
  if (!/^\d{10,15}$/.test(String(to).trim())) {
    return res.status(400).json({ error: "'to' must be a phone number with country code (10-15 digits, no +)" });
  }
  try {
    await sendWhatsAppMessage({ to, text });
    console.log("Message sent to:", to);
    res.json({ sent: true, to });
  } catch (err) {
    console.error("Send message failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/secure/whatsapp/start-flow
 *
 * Start a conversational flow for a user (called by server when PM/admin needs to approve leave).
 *
 * Headers: Authorization: <secret>
 * Body: { phone, flow, step, data }
 */
originRouter.post("/start-flow", authGuard, async (req, res) => {
  const { phone, flow, step, data } = req.body;
  if (!phone || !flow || !step) {
    return res.status(400).json({ error: "phone, flow, and step are required" });
  }
  await startFlow(String(phone).trim(), flow, step, data || {});
  res.json({ started: true, phone });
});

/**
 * POST /api/secure/whatsapp/schedule-reminder
 *
 * Schedule (or reschedule) a 15-min pre-shift WhatsApp reminder for an employee or manager.
 * Safe to call on every shift create/update — replaces any existing reminder for that user+date.
 *
 * Headers: Authorization: <WHATSAPP_VERIFY_TOKEN>
 * Body:
 *   {
 *     "userId":    "123",
 *     "shiftDate": "2026-04-19",        // date the shift falls on (YYYY-MM-DD)
 *     "phone":     "919876543210",
 *     "name":      "Priya Sharma",
 *     "role":      "employee",          // "employee" | "manager"
 *     "shift": {
 *       "name":         "Morning Shift",
 *       "startTime":    "09:00",
 *       "endTime":      "18:00",
 *       "breakMinutes": 60
 *     }
 *   }
 *
 * Success: { "scheduled": true, "fireAt": "<ISO datetime>" }
 *          or { "skipped": true, "reason": "fire time in the past" }
 */
originRouter.post("/schedule-reminder", authGuard, async (req, res) => {
  const { userId, shiftDate, phone, name, role, shift } = req.body;

  if (!userId || !shiftDate || !phone || !shift?.startTime) {
    return res.status(400).json({ error: "userId, shiftDate, phone, and shift.startTime are required" });
  }
  if (!/^\d{10,15}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: "'phone' must include country code (10-15 digits, no +)" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
    return res.status(400).json({ error: "'shiftDate' must be YYYY-MM-DD" });
  }

  try {
    const result = await scheduleShiftReminder({ userId, shiftDate, phone, name, role, shift });
    res.json(result);
  } catch (err) {
    console.error("[ROUTE] schedule-reminder failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/secure/whatsapp/cancel-reminder
 *
 * Cancel a pending shift reminder (e.g. shift deleted or employee removed).
 *
 * Headers: Authorization: <WHATSAPP_VERIFY_TOKEN>
 * Body: { "userId": "123", "shiftDate": "2026-04-19" }
 *
 * Success: { "cancelled": true } or { "cancelled": false, "reason": "not found" }
 */
originRouter.post("/cancel-reminder", authGuard, async (req, res) => {
  const { userId, shiftDate } = req.body;

  if (!userId || !shiftDate) {
    return res.status(400).json({ error: "userId and shiftDate are required" });
  }

  try {
    const result = await cancelShiftReminder(userId, shiftDate);
    res.json(result);
  } catch (err) {
    console.error("[ROUTE] cancel-reminder failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default originRouter;
