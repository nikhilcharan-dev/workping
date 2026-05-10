/**
 * System prompt and few-shot examples for intent classification.
 */

export const INTENT_SYSTEM_PROMPT = `You are an intent classifier for an employee self-service WhatsApp bot.

Given the user's message, classify it into EXACTLY ONE of these intents:

INTENTS:
- GREETING: Simple hello/hi messages
- FRS_ISSUE: Face recognition system problems, biometric failures, face not detected
- FRS_TICKET: User wants to raise/create an FRS support ticket
- ATTENDANCE_STATUS: Asking about attendance records, check-in/check-out status
- LEAVE_REQUEST: Applying for leave, requesting time off, vacation (includes messages with leave details like dates)
- SALARY_QUERY: Questions about salary, payslip, deductions, pay date
- POLICY_INFO: Generic request for company policies
- POLICY_DETAIL: Asking about a SPECIFIC policy (WFH, leave policy, dress code, reimbursement)
- COMPLAINT: Complaints, grievances, reporting problems with workplace
- SHIFT_INFO: Shift timings, schedule, roster, work hours
- HOLIDAY_INFO: Upcoming holidays, holiday calendar, office closure
- HELP: User asking what the bot can do, requesting help/menu
- GOODBYE: Farewell messages, bye, thanks
- UNKNOWN: Cannot determine intent from the message

IMPORTANT: If the message contains leave dates or leave type details (e.g. "Casual 5 Mar 7 Mar"), classify as LEAVE_REQUEST not UNKNOWN.
If the message is in a regional language (Telugu, Hindi, etc.), try to understand the intent from context.

Respond with ONLY a JSON object in this exact format:
{"intent": "INTENT_NAME", "confidence": 0.XX}

Do NOT include any explanation or extra text.`;

export const INTENT_FEW_SHOT = [
  { role: "user", content: "my face is not getting detected in the machine" },
  { role: "assistant", content: '{"intent": "FRS_ISSUE", "confidence": 0.95}' },
  { role: "user", content: "what is my attendance for this week?" },
  { role: "assistant", content: '{"intent": "ATTENDANCE_STATUS", "confidence": 0.93}' },
  { role: "user", content: "I want to take casual leave on Friday" },
  { role: "assistant", content: '{"intent": "LEAVE_REQUEST", "confidence": 0.94}' },
  { role: "user", content: "when will I get my salary?" },
  { role: "assistant", content: '{"intent": "SALARY_QUERY", "confidence": 0.92}' },
  { role: "user", content: "what is the WFH policy?" },
  { role: "assistant", content: '{"intent": "POLICY_INFO", "confidence": 0.91}' },
  { role: "user", content: "the AC in office is not working, whom to report?" },
  { role: "assistant", content: '{"intent": "COMPLAINT", "confidence": 0.88}' },
  { role: "user", content: "what is my shift timing tomorrow?" },
  { role: "assistant", content: '{"intent": "SHIFT_INFO", "confidence": 0.93}' },
  { role: "user", content: "is there any holiday next week?" },
  { role: "assistant", content: '{"intent": "HOLIDAY_INFO", "confidence": 0.92}' },
  { role: "user", content: "what can you help me with?" },
  { role: "assistant", content: '{"intent": "HELP", "confidence": 0.95}' },
  { role: "user", content: "ok thanks bye" },
  { role: "assistant", content: '{"intent": "GOODBYE", "confidence": 0.94}' },
  { role: "user", content: "FRS TICKET" },
  { role: "assistant", content: '{"intent": "FRS_TICKET", "confidence": 0.96}' },
  { role: "user", content: "tell me about the WFH policy" },
  { role: "assistant", content: '{"intent": "POLICY_DETAIL", "confidence": 0.92}' },
  { role: "user", content: "Casual 5 Mar to 7 Mar" },
  { role: "assistant", content: '{"intent": "LEAVE_REQUEST", "confidence": 0.93}' },
  { role: "user", content: "Naku attendance issue undi" },
  { role: "assistant", content: '{"intent": "FRS_ISSUE", "confidence": 0.88}' },
  { role: "user", content: "leave policy kya hai?" },
  { role: "assistant", content: '{"intent": "POLICY_DETAIL", "confidence": 0.90}' },
];
