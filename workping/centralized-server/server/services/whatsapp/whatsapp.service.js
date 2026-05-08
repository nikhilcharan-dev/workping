import waClient from "#utils/whatsappClient.js";

/**
 * Normalise any Indian phone number to the format expected by the WhatsApp
 * microservice: country code + 10 digits, no + sign (e.g. "919876543210").
 */
export const formatWANumber = (phone) => {
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
    return digits; // pass through unchanged if unrecognised
};

/**
 * Send a WhatsApp message via the WhatsApp microservice.
 * @param {string} to   - Recipient phone (raw — will be normalised)
 * @param {string} text - Message body (supports *bold*, _italic_ WhatsApp formatting)
 */
export const sendWhatsApp = async (to, text) => {
    const res = await waClient.post("/api/secure/whatsapp/send", { to: formatWANumber(to), text });
    return res.data; // { sent: true, to }
};

/**
 * Tell the WhatsApp microservice to start a LEAVE_APPROVAL flow for a PM or admin.
 * They will then be prompted to reply yes/no to approve/reject the leave.
 */
export const startApprovalFlow = async (phone, data) => {
    const res = await waClient.post("/api/secure/whatsapp/start-flow", {
        phone: formatWANumber(phone),
        flow: "LEAVE_APPROVAL",
        step: "AWAITING_DECISION",
        data,
    });
    return res.data;
};

/**
 * Schedule (or reschedule) a 15-min pre-shift WhatsApp reminder.
 * Safe to call on shift create/update — replaces any existing reminder for that user+date.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.shiftDate  - "YYYY-MM-DD"
 * @param {string} opts.phone
 * @param {string} opts.name
 * @param {string} opts.role       - "employee" | "manager"
 * @param {{ name, startTime, endTime, breakMinutes }} opts.shift
 */
export const scheduleShiftReminder = async ({ userId, shiftDate, phone, name, role, shift }) => {
    const res = await waClient.post("/api/secure/whatsapp/schedule-reminder", {
        userId,
        shiftDate,
        phone: formatWANumber(phone),
        name,
        role,
        shift,
    });
    return res.data;
};

/**
 * Cancel a pending shift reminder (e.g. employee removed from project or shift deleted).
 */
export const cancelShiftReminder = async (userId, shiftDate) => {
    const res = await waClient.post("/api/secure/whatsapp/cancel-reminder", { userId, shiftDate });
    return res.data;
};
