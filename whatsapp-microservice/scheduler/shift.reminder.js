import { Queue, Worker, QueueEvents } from "bullmq";
import { sendWhatsAppMessage } from "../whatsapp/sender.js";
import { logger } from "../utils/logger.js";

const REMINDER_MINUTES = 15;
const QUEUE_NAME = "shift-reminders";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
};

const reminderQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
  },
});

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function buildReminderMessage(name, shift, role) {
  const workHours = (() => {
    try {
      const [sh, sm] = shift.startTime.split(":").map(Number);
      const [eh, em] = shift.endTime.split(":").map(Number);
      const total = eh * 60 + em - (sh * 60 + sm) - (shift.breakMinutes || 0);
      return `${Math.floor(total / 60)}h ${total % 60}m`;
    } catch {
      return null;
    }
  })();

  const greeting =
    role === "manager"
      ? `Hi ${name}, your team's shift starts in *${REMINDER_MINUTES} minutes*.`
      : `Hi ${name}, your shift starts in *${REMINDER_MINUTES} minutes*. Time to get ready!`;

  return (
    `⏰ *Shift Reminder*\n\n` +
    `${greeting}\n\n` +
    `*Shift:* ${shift.name}\n` +
    `*Start:* ${formatTime(shift.startTime)}\n` +
    `*End:* ${formatTime(shift.endTime)}\n` +
    `*Break:* ${shift.breakMinutes || 60} mins\n` +
    (workHours ? `*Work Hours:* ${workHours}` : "")
  );
}

function jobId(userId, shiftDate) {
  return `shift-reminder:${userId}:${shiftDate}`;
}

/**
 * Schedule (or reschedule) a 15-min pre-shift WhatsApp reminder.
 * Safe to call again when a shift is updated — replaces the old job.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.shiftDate  - "YYYY-MM-DD" date the shift falls on
 * @param {string} opts.phone      - recipient phone with country code, no +
 * @param {string} opts.name
 * @param {"employee"|"manager"} opts.role
 * @param {{ name, startTime, endTime, breakMinutes }} opts.shift
 */
export async function scheduleShiftReminder({ userId, shiftDate, phone, name, role, shift }) {
  // Compute exact fire time: shiftDate + startTime - 15 min
  const [hour, minute] = shift.startTime.split(":").map(Number);
  const shiftStart = new Date(`${shiftDate}T${shift.startTime}:00`);
  const fireAt = new Date(shiftStart.getTime() - REMINDER_MINUTES * 60 * 1000);
  const delay = fireAt.getTime() - Date.now();

  if (delay <= 0) {
    logger.info("[SHIFT-REMINDER] Skipped — fire time already passed", { userId, shiftDate });
    return { skipped: true, reason: "fire time in the past" };
  }

  // Remove any existing job for this user+date so we don't double-send on updates
  const existing = await reminderQueue.getJob(jobId(userId, shiftDate));
  if (existing) await existing.remove();

  await reminderQueue.add(
    "send-reminder",
    { phone, name, role, shift },
    {
      jobId: jobId(userId, shiftDate),
      delay,
    }
  );

  logger.info("[SHIFT-REMINDER] Scheduled", { name, userId, shiftDate, firesInMin: Math.round(delay / 60000) });
  return { scheduled: true, fireAt };
}

/**
 * Cancel a pending reminder (e.g. shift deleted or employee removed).
 */
export async function cancelShiftReminder(userId, shiftDate) {
  const job = await reminderQueue.getJob(jobId(userId, shiftDate));
  if (!job) return { cancelled: false, reason: "not found" };
  await job.remove();
  logger.info("[SHIFT-REMINDER] Cancelled", { userId, shiftDate });
  return { cancelled: true };
}

/**
 * Start the BullMQ worker that processes reminder jobs.
 * Call once at server startup.
 */
let _worker = null;

export function startReminderWorker() {
  _worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { phone, name, role, shift } = job.data;
      const text = buildReminderMessage(name || "there", shift, role);
      await sendWhatsAppMessage({ to: phone, text });
      logger.info("[SHIFT-REMINDER] Sent", { phone, name });
    },
    { connection }
  );

  _worker.on("failed", (job, err) => {
    logger.error("[SHIFT-REMINDER] Job failed", { jobId: job?.id, error: err.message });
  });

  logger.info("[SHIFT-REMINDER] Worker started — waiting for jobs");
  return _worker;
}

async function shutdown() {
  if (_worker) await _worker.close();
  await reminderQueue.close();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
