import { getFlow, startFlow, clearFlow } from "../utils/conversation.state.js";
import originClient from "../utils/origin.client.js";

function buildMenu(name) {
    return (
        `Hi ${name}! What would you like to do?\n\n` +
        `*1* — Attendance status\n` +
        `*2* — Apply for leave\n` +
        `*3* — Leave balance\n` +
        `*4* — My leave requests\n` +
        `*5* — FRS / Biometric issue\n` +
        `*6* — Company policies\n` +
        `*7* — File a complaint\n\n` +
        `_Reply with a number or just type your question._`
    );
}

// Leave type: WhatsApp input → DB enum value
const LEAVE_TYPE_MAP = {
    casual: "Casual",
    sick: "Sick",
    earned: "Earned",
    unpaid: "Unpaid",
    "comp-off": null, // not supported — handled gracefully
    compoff: null,
};

/**
 * Parse natural-language leave requests.
 * Handles: "Casual 5 Mar 7 Mar", "Sick Leave | 10 Mar | 11 Mar", "casual today to tomorrow"
 */
function parseLeaveDetails(text) {
    const msg = text.toLowerCase();

    let leaveType = null;
    for (const [key, val] of Object.entries(LEAVE_TYPE_MAP)) {
        if (msg.includes(key)) {
            leaveType = val; // may be null for unsupported types
            break;
        }
    }

    // Try pipe-delimited: "Casual Leave | 10 Mar | 11 Mar"
    const pipeMatch = text.match(/\|?\s*(\d{1,2}\s+\w+)\s*\|?\s*(\d{1,2}\s+\w+)\s*$/);
    if (pipeMatch) {
        return { leaveType, fromDate: pipeMatch[1].trim(), toDate: pipeMatch[2].trim() };
    }

    // Try natural: "5 Mar 7 Mar", "5 Mar to 7 Mar"
    const naturalMatch = text.match(/(\d{1,2}\s+\w+)\s+(?:to\s+)?(\d{1,2}\s+\w+)/i);
    if (naturalMatch) {
        return { leaveType, fromDate: naturalMatch[1].trim(), toDate: naturalMatch[2].trim() };
    }

    // Try "today"/"tomorrow"
    const today = new Date();
    const dayNames = { today: formatDate(today), tomorrow: formatDate(addDays(today, 1)) };
    let fromDate = null,
        toDate = null;
    if (msg.includes("today")) fromDate = dayNames.today;
    if (msg.includes("tomorrow")) {
        if (!fromDate) fromDate = dayNames.tomorrow;
        else toDate = dayNames.tomorrow;
    }
    if (fromDate && !toDate) toDate = fromDate;
    if (fromDate) return { leaveType, fromDate, toDate };

    return { leaveType, fromDate: null, toDate: null };
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function formatDate(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

/** Convert "5 Mar" style string to a Date (current year assumed) */
function parseNaturalDate(str) {
    return new Date(`${str} ${new Date().getFullYear()}`);
}

/** Parse a single date from user input — handles "today", "tomorrow", "5 Mar", "15 April" */
function parseSingleDate(text) {
    const msg = text.toLowerCase().trim();
    const today = new Date();
    if (msg === "today") return formatDate(today);
    if (msg === "tomorrow") return formatDate(addDays(today, 1));
    const match = text.match(/(\d{1,2})\s+(\w+)/i);
    if (match) {
        const candidate = `${match[1]} ${match[2]}`;
        const parsed = new Date(`${candidate} ${today.getFullYear()}`);
        if (!isNaN(parsed.getTime())) return candidate;
    }
    return null;
}

/** Parse leave type from user input — handles numbers, abbreviations, and keywords */
function parseLeaveType(text) {
    const msg = text.toLowerCase().trim();
    if (msg === "1" || msg.includes("casual") || msg === "cl") return "Casual";
    if (msg === "2" || msg.includes("sick") || msg === "sl") return "Sick";
    if (msg === "3" || msg.includes("earned") || msg === "el") return "Earned";
    if (msg === "4" || msg.includes("unpaid") || msg === "ul") return "Unpaid";
    return null;
}

/** Build date array (inclusive range) from fromDate → toDate strings */
function buildDateRange(fromStr, toStr) {
    const from = parseNaturalDate(fromStr);
    const to = parseNaturalDate(toStr);
    const dates = [];
    const cur = new Date(from);
    while (cur <= to) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

function formatAttendanceStatus(record) {
    if (!record) return "ABSENT / Not marked";
    const status = record.status.charAt(0).toUpperCase() + record.status.slice(1);
    const checkIn = record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
    const checkOut = record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : null;
    let str = `*${status}*`;
    if (checkIn) str += `\nCheck-in:  ${checkIn}`;
    if (checkOut) str += `\nCheck-out: ${checkOut}`;
    return str;
}

function formatWeekSummary(records) {
    if (!records || records.length === 0) return "No records found for this week.";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return records
        .map((r) => {
            const d = new Date(r.date);
            const day = days[d.getDay()];
            const dateStr = `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
            const status = r.status.charAt(0).toUpperCase() + r.status.slice(1);
            return `${day} ${dateStr}: *${status}*`;
        })
        .join("\n");
}

function formatRecentLeaves(leaves) {
    if (!leaves || leaves.length === 0) return "No leave records found.";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return leaves
        .map((l) => {
            const dates = l.dates.map((d) => {
                const dt = new Date(d);
                return `${dt.getDate()} ${months[dt.getMonth()]}`;
            });
            const dateStr = dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`;
            const status = l.status.charAt(0).toUpperCase() + l.status.slice(1);
            return `• ${l.leaveType} (${dateStr}): *${status}*`;
        })
        .join("\n");
}

export async function getTemplateResponse(strategy, context) {
    const { intent } = context.intent;
    const name = context.employee.name;
    const phone = context.employee.phone;
    const userId = context.employee.userId;
    const flow = getFlow(phone);

    switch (intent) {
        case "GREETING":
            if (flow) clearFlow(phone);
            if (!userId) {
                return `Hi! Your number isn't registered in WorkPing.\nPlease contact your HR admin to get added.`;
            }
            return buildMenu(name);

        case "ATTENDANCE_STATUS": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            const att = context.systemData?.attendance;
            const todayStr = formatAttendanceStatus(att?.today);
            const weekStr = formatWeekSummary(att?.week);
            return `Hi ${name}, here's your attendance:\n\n` + `*Today:*\n${todayStr}\n\n` + `*This week:*\n${weekStr}`;
        }

        case "LEAVE_BALANCE": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            const bal = context.systemData?.leave?.balance;
            if (!bal) return `Couldn't fetch your leave balance. Please try again.`;
            return (
                `Hi ${name}, your *${new Date().getFullYear()} Leave Balance*:\n\n` +
                `Total CL: *${bal.totalCLDays} days*\n` +
                `Used:     *${bal.usedDays} days*\n` +
                `Remaining: *${bal.remainingDays} days*`
            );
        }

        case "LEAVE_STATUS": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            const recent = context.systemData?.leave?.recent;
            return `Hi ${name}, your recent leave requests:\n\n` + formatRecentLeaves(recent);
        }

        case "FRS_ISSUE":
            return (
                `I'm sorry about the face recognition issue, ${name}.\n\n` +
                "Please try these steps:\n" +
                "1. Ensure good lighting\n" +
                "2. Remove glasses/mask if possible\n" +
                "3. Stand at arm's length from the device\n\n" +
                "If the issue continues, reply with *FRS TICKET* to raise a support request."
            );

        case "FRS_TICKET":
            return (
                `Your FRS support ticket has been created, ${name}.\n\n` +
                "Ticket ID: *FRS-" +
                Date.now().toString(36).toUpperCase() +
                "*\n" +
                "Our support team will contact you shortly."
            );

        case "LEAVE_REQUEST": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;

            // ── Step: collecting leave type ───────────────────────────────────
            if (flow?.flow === "LEAVE_REQUEST" && flow?.step === "AWAITING_TYPE") {
                const leaveType = parseLeaveType(context.message.text);
                if (!leaveType) {
                    return (
                        `Please choose a valid leave type:\n\n` +
                        `*1* — Casual Leave\n` +
                        `*2* — Sick Leave\n` +
                        `*3* — Earned Leave\n` +
                        `*4* — Unpaid Leave`
                    );
                }
                startFlow(phone, "LEAVE_REQUEST", "AWAITING_FROM_DATE", { ...flow.pendingData, leaveType });
                return `📅 *From which date?*\n_Example: 5 Mar, today, tomorrow_`;
            }

            // ── Step: collecting start date ───────────────────────────────────
            if (flow?.flow === "LEAVE_REQUEST" && flow?.step === "AWAITING_FROM_DATE") {
                const fromDate = parseSingleDate(context.message.text);
                if (!fromDate) {
                    return `I didn't understand that date. Please try:\n_5 Mar_, _15 Apr_, _today_, or _tomorrow_`;
                }
                startFlow(phone, "LEAVE_REQUEST", "AWAITING_TO_DATE", { ...flow.pendingData, fromDate });
                return `📅 *Until which date?*\n_Enter a date or reply *same* for a single day_`;
            }

            // ── Step: collecting end date ─────────────────────────────────────
            if (flow?.flow === "LEAVE_REQUEST" && flow?.step === "AWAITING_TO_DATE") {
                const rawMsg = context.message.text.toLowerCase().trim();
                let toDate;
                if (["same", "single", "1 day", "one day"].includes(rawMsg)) {
                    toDate = flow.pendingData.fromDate;
                } else {
                    toDate = parseSingleDate(context.message.text);
                }
                if (!toDate) {
                    return `I didn't understand that date. Please try:\n_5 Mar_, _15 Apr_, or _same_ for single day`;
                }
                if (parseNaturalDate(toDate) < parseNaturalDate(flow.pendingData.fromDate)) {
                    return `⚠️ End date can't be before start date (*${flow.pendingData.fromDate}*). Please enter a valid end date.`;
                }
                startFlow(phone, "LEAVE_REQUEST", "AWAITING_REASON", { ...flow.pendingData, toDate });
                return `📝 *Reason for leave?*\n_Type your reason or reply *skip* to leave it blank_`;
            }

            // ── Step: collecting reason → show confirmation ───────────────────
            if (flow?.flow === "LEAVE_REQUEST" && flow?.step === "AWAITING_REASON") {
                const rawMsg = context.message.text.toLowerCase().trim();
                const reason = ["skip", "none", "na", "-"].includes(rawMsg) ? "" : context.message.text.trim();
                const { leaveType, fromDate, toDate } = flow.pendingData;
                const days = buildDateRange(fromDate, toDate).length;
                const bal = context.systemData?.leave?.balance;
                const balanceNote = bal ? `\n\n_Remaining balance: ${bal.remainingDays} day(s)_` : "";

                startFlow(phone, "LEAVE_REQUEST", "AWAITING_CONFIRM", { ...flow.pendingData, reason });
                return (
                    `Please confirm your leave request:\n\n` +
                    `*Type:* ${leaveType} Leave\n` +
                    `*From:* ${fromDate}\n` +
                    `*To:* ${toDate}\n` +
                    `*Days:* ${days}\n` +
                    `*Reason:* ${reason || "—"}` +
                    balanceNote +
                    `\n\nReply *yes* to submit or *no* to cancel.`
                );
            }

            // ── No active flow — try to parse one-shot message ────────────────
            if (context.message.text.toLowerCase().match(/comp.?off/)) {
                return `Comp-off leaves aren't handled here. Please apply through the HR portal.\n\nSupported types: Casual, Sick, Earned, Unpaid.`;
            }

            const parsed = parseLeaveDetails(context.message.text);
            if (parsed.leaveType && parsed.fromDate && parsed.toDate) {
                // Has type + dates — skip to reason step
                startFlow(phone, "LEAVE_REQUEST", "AWAITING_REASON", { ...parsed, userId });
                return `📝 *Reason for leave?*\n_Type your reason or reply *skip* to leave it blank_`;
            }

            // ── Start fresh step-by-step ──────────────────────────────────────
            startFlow(phone, "LEAVE_REQUEST", "AWAITING_TYPE", { userId });
            return (
                `Sure! Let's apply for leave. 📋\n\n` +
                `*What type of leave do you need?*\n\n` +
                `*1* — Casual Leave\n` +
                `*2* — Sick Leave\n` +
                `*3* — Earned Leave\n` +
                `*4* — Unpaid Leave`
            );
        }

        case "CONFIRM": {
            if (flow && flow.flow === "LEAVE_REQUEST" && flow.step === "AWAITING_CONFIRM") {
                const { leaveType, fromDate, toDate, reason, userId: flowUserId } = flow.pendingData;
                clearFlow(phone);

                const dates = buildDateRange(fromDate, toDate);
                try {
                    await originClient.post("/internal/leave/apply", {
                        userId: flowUserId,
                        leaveType,
                        dates: dates.map((d) => d.toISOString()),
                        reason: reason || "Applied via WhatsApp",
                    });
                    return (
                        `✅ Leave request submitted, ${name}!\n\n` +
                        `*Type:* ${leaveType} Leave\n` +
                        `*From:* ${fromDate}\n` +
                        `*To:* ${toDate}\n` +
                        `*Days:* ${dates.length}\n` +
                        `*Reason:* ${reason || "—"}\n\n` +
                        `You'll be notified once your manager approves it.`
                    );
                } catch (err) {
                    const msg = err?.response?.data?.error || "Failed to submit leave request.";
                    return `Sorry ${name}, couldn't submit your leave: _${msg}_\n\nPlease try again or use the HR portal.`;
                }
            }
            // Complaint submission
            if (flow && flow.flow === "COMPLAINT" && flow.step === "AWAITING_CONFIRM") {
                const { description, userId: flowUserId } = flow.pendingData;
                clearFlow(phone);
                try {
                    const res = await originClient.post("/internal/complaint", {
                        userId: flowUserId,
                        description,
                    });
                    return (
                        `✅ Your complaint has been submitted to HR confidentially.\n\n` +
                        `*Ticket ID:* ${res.data.ticketId}\n` +
                        `*Status:* Open\n\n` +
                        `We'll follow up with you within 2 working days, ${name}.`
                    );
                } catch (err) {
                    const msg = err?.response?.data?.error || "Failed to submit complaint.";
                    return `Sorry ${name}, couldn't submit your complaint: _${msg}_\n\nPlease contact HR directly.`;
                }
            }

            return `Nothing to confirm right now, ${name}. Type *help* to see what I can do.`;
        }

        case "CANCEL": {
            if (flow) {
                clearFlow(phone);
            }
            return buildMenu(name);
        }

        case "LEAVE_APPROVE_DECISION": {
            if (flow?.flow === "LEAVE_APPROVAL" && flow?.step === "AWAITING_DECISION") {
                const { leaveId, employeeName, days, dateList } = flow.pendingData;
                clearFlow(phone);
                try {
                    await originClient.post("/internal/leave/decide", {
                        leaveId,
                        decision: "approved",
                        decidedByPhone: phone,
                    });
                    return (
                        `✅ *Leave Approved*\n\n` +
                        `You've approved *${employeeName}*'s leave request.\n` +
                        `*Days:* ${days} (${dateList})`
                    );
                } catch (err) {
                    const msg = err?.response?.data?.error || "Failed to process approval.";
                    return `⚠️ Couldn't process approval: _${msg}_\n\nPlease use the admin portal.`;
                }
            }
            return null;
        }

        case "LEAVE_REJECT_DECISION": {
            if (flow?.flow === "LEAVE_APPROVAL" && flow?.step === "AWAITING_DECISION") {
                const { leaveId, employeeName, days, dateList } = flow.pendingData;
                clearFlow(phone);
                try {
                    await originClient.post("/internal/leave/decide", {
                        leaveId,
                        decision: "rejected",
                        decidedByPhone: phone,
                    });
                    return (
                        `❌ *Leave Rejected*\n\n` +
                        `You've rejected *${employeeName}*'s leave request.\n` +
                        `*Days:* ${days} (${dateList})`
                    );
                } catch (err) {
                    const msg = err?.response?.data?.error || "Failed to process rejection.";
                    return `⚠️ Couldn't process rejection: _${msg}_\n\nPlease use the admin portal.`;
                }
            }
            return null;
        }

        case "SALARY_QUERY": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            const sal = context.systemData?.salary;
            if (!sal) {
                return `Hi ${name}, no salary record found yet.\n\nIf you believe this is a mistake, please contact your HR admin.`;
            }
            const monthLabel = (() => {
                const [y, m] = sal.month.split("-");
                const d = new Date(Number(y), Number(m) - 1, 1);
                return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
            })();
            return (
                `Hi ${name}, here's your latest salary slip:\n\n` +
                `*Month:* ${monthLabel}\n` +
                `*Days Present:* ${sal.daysPresent}\n` +
                `*LOP Days:* ${sal.lopDays}\n` +
                `*Overtime Hours:* ${sal.overtimeHours}\n\n` +
                `*Base Salary:* ₹${sal.baseSalary.toLocaleString("en-IN")}\n` +
                `*Bonuses:* ₹${(sal.bonuses || 0).toLocaleString("en-IN")}\n` +
                `*Deductions:* ₹${(sal.deductions || 0).toLocaleString("en-IN")}\n` +
                `*Tax:* ₹${(sal.tax || 0).toLocaleString("en-IN")}\n` +
                `*Net Salary:* ₹${sal.netSalary.toLocaleString("en-IN")}\n` +
                `*Status:* ${sal.status === "paid" ? "✅ Paid" : "🕐 Pending"}`
            );
        }

        case "SHIFT_INFO": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            const shift = context.systemData?.shift;
            if (!shift) {
                return `Hi ${name}, no shift has been assigned to you yet.\n\nPlease check with your project manager or HR admin.`;
            }
            const formatTime = (t) => {
                if (!t) return "—";
                const [h, m] = t.split(":");
                const hour = Number(h);
                const ampm = hour >= 12 ? "PM" : "AM";
                return `${hour % 12 || 12}:${m} ${ampm}`;
            };
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
            return (
                `Hi ${name}, your current shift:\n\n` +
                `*Shift:* ${shift.name}\n` +
                `*Start:* ${formatTime(shift.startTime)}\n` +
                `*End:* ${formatTime(shift.endTime)}\n` +
                `*Break:* ${shift.breakMinutes || 60} mins\n` +
                (workHours ? `*Work Hours:* ${workHours}` : "")
            );
        }

        case "HOLIDAY_INFO": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            const holidays = context.systemData?.holidays ?? [];
            if (!holidays.length) {
                return `Hi ${name}, no upcoming holidays in the next 60 days. Enjoy your work! 💼`;
            }
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const list = holidays
                .map((h) => {
                    const d = new Date(h.date);
                    const dateStr = `${d.getDate()} ${months[d.getMonth()]}`;
                    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
                    return `• *${dateStr}* (${dayName}) — ${h.name}`;
                })
                .join("\n");
            return (
                `Hi ${name}, upcoming holidays:\n\n` +
                list +
                `\n\n_Source: ${context.employee.organizationName || "your organization"}_`
            );
        }

        case "COMPLAINT": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;

            // ── Step: user typed their complaint description ───────────────────
            if (flow?.flow === "COMPLAINT" && flow?.step === "AWAITING_DESCRIPTION") {
                const description = context.message.text.trim();
                if (description.length < 10) {
                    return `Please provide more details (at least 10 characters).\n\nDescribe your issue clearly so HR can help you.`;
                }
                startFlow(phone, "COMPLAINT", "AWAITING_CONFIRM", { ...flow.pendingData, description });
                return (
                    `Your complaint:\n\n_"${description}"_\n\n` +
                    `Reply *yes* to submit to HR confidentially or *no* to cancel.`
                );
            }

            // ── Start fresh complaint flow ─────────────────────────────────────
            startFlow(phone, "COMPLAINT", "AWAITING_DESCRIPTION", { userId });
            return (
                `I understand, ${name}. Your concern matters to us. 🤝\n\n` +
                `Please describe your issue or complaint in detail:\n` +
                `_(Be specific — who, what, when)_\n\n` +
                `_Type *cancel* to go back to the menu._`
            );
        }

        case "FRS_ISSUE": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            return (
                `I'm sorry about the FRS issue, ${name}.\n\n` +
                `*Please try these steps first:*\n` +
                `1. Ensure good lighting on your face\n` +
                `2. Remove glasses or mask if possible\n` +
                `3. Stand at arm's length from the device\n` +
                `4. Clean the camera lens\n\n` +
                `If the issue persists, type *FRS ticket* to raise a support request and our team will reach out to you.`
            );
        }

        case "FRS_TICKET": {
            if (!userId) return `Your number isn't registered in WorkPing. Please contact HR.`;
            try {
                const res = await originClient.post("/internal/frs-ticket", { userId });
                return (
                    `Your FRS support ticket has been created, ${name}. ✅\n\n` +
                    `*Ticket ID:* ${res.data.ticketId}\n\n` +
                    `Our support team will contact you on WhatsApp within 1 working day.`
                );
            } catch {
                return `Couldn't create the FRS ticket right now. Please contact your HR admin directly.`;
            }
        }

        case "POLICY_INFO":
            return (
                `Hi ${name}, I can help you with company policies.\n\n` +
                "Which policy would you like to know about?\n\n" +
                "- *WFH policy*\n" +
                "- *Leave policy*\n" +
                "- *Dress code*\n" +
                "- *Reimbursement policy*\n\n" +
                "_Just type the policy name._"
            );

        case "HELP":
            return buildMenu(name);

        case "GOODBYE":
            if (flow) clearFlow(phone);
            return `Take care, ${name}! Feel free to message anytime.\n\nType *menu* if you need anything.`;

        default:
            return null;
    }
}
