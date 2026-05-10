import cron from "node-cron";
import Subscription from "#models/Subscription.js";
import Admin from "#models/Admin.js";
import OrgAdmin from "#models/Admin.Org.js";
import { sendAlertWarning } from "#services/mailer/mail.service.js";
import { sendWhatsApp } from "#services/whatsapp/whatsapp.service.js";

const RENEWAL_DAYS = [7, 3, 1];
const RENEWAL_LINK = `${process.env.APP_URL ?? "https://workping.live"}/pages/pricing`;

async function notifyAdmins(sub) {
  const daysLeft = Math.ceil((new Date(sub.endDate) - Date.now()) / 86_400_000);
  const endDate = new Date(sub.endDate).toLocaleDateString("en-IN");
  const billingLabel = sub.billingCycle === "YEARLY" ? "year" : "month";
  const dayWord = daysLeft === 1 ? "day" : "days";

  // Primary admin — directly referenced by subscription
  const primary = await Admin.findById(sub.adminId).lean();

  // Secondary admin — via OrgAdmin join record
  const orgAdmin = await OrgAdmin.findOne({
    organizationId: sub.organizationId,
    primaryAdmin: sub.adminId,
  })
    .populate("secondaryAdmin")
    .lean();

  const admins = [];
  if (primary) admins.push(primary);
  if (orgAdmin?.secondaryAdmin) admins.push(orgAdmin.secondaryAdmin);

  for (const admin of admins) {
    const subject = `Your WorkPing ${sub.planName} plan expires in ${daysLeft} ${dayWord}`;
    const message = `Hi ${admin.name}, your *${sub.planName}* plan (₹${sub.price}/${billingLabel}) will expire on *${endDate}*. Renew now to keep your team running without interruption.`;

    if (admin.email) {
      sendAlertWarning(admin.email, subject, message, RENEWAL_LINK).catch((err) =>
        console.error(`[RenewalCron] Email to ${admin.email} failed:`, err.message)
      );
    }

    if (admin.phoneNumber) {
      sendWhatsApp(
        admin.phoneNumber,
        `*WorkPing Renewal Reminder* ⏰\nHi ${admin.name}, your *${sub.planName}* plan expires in *${daysLeft} ${dayWord}* (${endDate}).\nRenew here: ${RENEWAL_LINK}`
      ).catch((err) => console.error(`[RenewalCron] WhatsApp to ${admin.phoneNumber} failed:`, err.message));
    }
  }
}

async function runRenewalReminders() {
  // Redis mutex — only one cluster worker executes per day
  const locked = await redis.set("cron:renewal:lock", "1", { NX: true, EX: 3600 });
  if (!locked) return;

  console.log("[RenewalCron] Running subscription renewal reminders...");

  for (const days of RENEWAL_DAYS) {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() + days);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    const subs = await Subscription.find({
      status: "ACTIVE",
      autoRenew: true,
      endDate: { $gte: windowStart, $lte: windowEnd },
    }).lean();

    for (const sub of subs) {
      await notifyAdmins(sub).catch((err) =>
        console.error(`[RenewalCron] Notify failed for subscription ${sub._id}:`, err.message)
      );
    }

    console.log(`[RenewalCron] ${subs.length} subscription(s) notified for expiry in ${days} day(s)`);
  }
}

export function startRenewalCron() {
  // Runs daily at 09:00 AM IST
  cron.schedule("0 9 * * *", runRenewalReminders, { timezone: "Asia/Kolkata" });
  console.log("[RenewalCron] Started — daily 09:00 IST (reminders at 7d, 3d, 1d before expiry)");
}
