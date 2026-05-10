/**
 * Intents that MUST use templates because they involve structured flows,
 * real-time DB data, or multi-step data collection that LLM can't handle.
 */
const TEMPLATE_ONLY_INTENTS = [
  // Leave flows
  "LEAVE_REQUEST", // multi-step conversational flow
  "LEAVE_BALANCE", // real-time DB data
  "LEAVE_STATUS", // real-time DB data
  "LEAVE_APPROVE_DECISION", // manager approval decision
  "LEAVE_REJECT_DECISION", // manager rejection decision

  // Attendance
  "ATTENDANCE_STATUS", // real-time DB data

  // Salary, shift, holidays
  "SALARY_QUERY", // real-time DB data
  "SHIFT_INFO", // real-time DB data
  "HOLIDAY_INFO", // real-time DB data

  // Complaints & FRS
  "COMPLAINT", // multi-step flow with DB storage
  "FRS_ISSUE", // structured template with ticket option
  "FRS_TICKET", // creates DB ticket

  // Navigation
  "GREETING", // checks registration, shows menu
  "HELP", // shows menu
  "GOODBYE", // farewell + menu hint
  "CONFIRM", // flow confirmations
  "CANCEL", // cancels flow and shows menu
];

export function resolveResponseStrategy(intentResult, context) {
  const { intent } = intentResult;

  if (TEMPLATE_ONLY_INTENTS.includes(intent)) {
    return { mode: "TEMPLATE", intent };
  }

  // Policy details go through LLM for conversational responses
  return { mode: "LLM", intent };
}
