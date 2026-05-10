export function ruleEngine(text) {
  const msg = text.toLowerCase().trim();

  // ── Number shortcuts (menu quick-picks) ──────────────────────────────────
  if (msg === "1") return { intent: "ATTENDANCE_STATUS", confidence: 1.0 };
  if (msg === "2") return { intent: "LEAVE_REQUEST", confidence: 1.0 };
  if (msg === "3") return { intent: "LEAVE_BALANCE", confidence: 1.0 };
  if (msg === "4") return { intent: "LEAVE_STATUS", confidence: 1.0 };
  if (msg === "5") return { intent: "FRS_ISSUE", confidence: 1.0 };
  if (msg === "6") return { intent: "POLICY_INFO", confidence: 1.0 };
  if (msg === "7") return { intent: "COMPLAINT", confidence: 1.0 };

  // FRS Ticket creation (HIGH PRIORITY — must be before FRS_ISSUE)
  if (msg === "frs ticket" || msg.includes("raise frs ticket") || msg.includes("create frs ticket")) {
    return { intent: "FRS_TICKET", confidence: 0.95 };
  }

  // Face Recognition / FRS issues
  if (
    msg.includes("frs") ||
    (msg.includes("face") &&
      (msg.includes("issue") ||
        msg.includes("not working") ||
        msg.includes("failed") ||
        msg.includes("not detected") ||
        msg.includes("problem"))) ||
    msg.includes("biometric") ||
    msg.includes("attendance not updated") ||
    msg.includes("attendance issue")
  ) {
    return { intent: "FRS_ISSUE", confidence: 0.92 };
  }

  // Attendance status
  if (
    msg.includes("attendance") &&
    (msg.includes("status") ||
      msg.includes("today") ||
      msg.includes("my") ||
      msg.includes("check") ||
      msg.includes("week") ||
      msg.includes("month"))
  ) {
    return { intent: "ATTENDANCE_STATUS", confidence: 0.9 };
  }

  // Leave balance
  if (
    (msg.includes("leave") &&
      (msg.includes("balance") || msg.includes("remaining") || msg.includes("how many") || msg.includes("left"))) ||
    msg === "leave balance"
  ) {
    return { intent: "LEAVE_BALANCE", confidence: 0.92 };
  }

  // Leave status / history
  if (
    (msg.includes("leave") &&
      (msg.includes("status") ||
        msg.includes("history") ||
        msg.includes("pending") ||
        msg.includes("approved") ||
        msg.includes("rejected"))) ||
    msg === "my leaves" ||
    msg === "leave status"
  ) {
    return { intent: "LEAVE_STATUS", confidence: 0.92 };
  }

  // Leave request
  if (
    msg.includes("apply leave") ||
    msg.includes("request leave") ||
    msg.includes("take leave") ||
    msg.includes("casual leave") ||
    msg.includes("sick leave") ||
    msg.includes("time off") ||
    (msg.includes("leave") &&
      (msg.includes("apply") || msg.includes("want") || msg.includes("need") || msg.includes("request")))
  ) {
    return { intent: "LEAVE_REQUEST", confidence: 0.9 };
  }

  // Salary queries
  if (
    msg.includes("salary") ||
    msg.includes("payslip") ||
    msg.includes("pay slip") ||
    msg.includes("deduction") ||
    msg.includes("pay date") ||
    msg.includes("salary slip") ||
    msg.includes("ctc") ||
    msg.includes("compensation")
  ) {
    return { intent: "SALARY_QUERY", confidence: 0.9 };
  }

  // Shift info
  if (
    msg.includes("shift") ||
    msg.includes("roster") ||
    msg.includes("work hours") ||
    msg.includes("work timing") ||
    msg.includes("shift timing") ||
    msg.includes("schedule")
  ) {
    return { intent: "SHIFT_INFO", confidence: 0.88 };
  }

  // Holiday info
  if (
    msg.includes("holiday") ||
    msg.includes("holidays") ||
    msg.includes("office closed") ||
    msg.includes("day off") ||
    (msg.includes("next") && msg.includes("off"))
  ) {
    return { intent: "HOLIDAY_INFO", confidence: 0.9 };
  }

  // Specific policy queries → let LLM answer with actual content
  if (
    msg.includes("wfh") ||
    msg.includes("work from home") ||
    msg.includes("dress code") ||
    msg.includes("reimbursement") ||
    (msg.includes("leave") && msg.includes("policy"))
  ) {
    return { intent: "POLICY_DETAIL", confidence: 0.88 };
  }

  // Generic policy menu
  if (msg.includes("policy") || msg.includes("policies") || msg.includes("hr rule") || msg.includes("company rule")) {
    return { intent: "POLICY_INFO", confidence: 0.88 };
  }

  // Complaint
  if (
    msg.includes("complaint") ||
    msg.includes("complain") ||
    msg.includes("grievance") ||
    msg.includes("not fair") ||
    msg.includes("report issue") ||
    msg.includes("harassment")
  ) {
    return { intent: "COMPLAINT", confidence: 0.85 };
  }

  // Help / Menu
  if (
    msg === "help" ||
    msg === "menu" ||
    msg.includes("what can you do") ||
    msg.includes("how can you help") ||
    msg.includes("options") ||
    msg.includes("what services")
  ) {
    return { intent: "HELP", confidence: 0.95 };
  }

  // Confirmation (yes, confirm, ok — used in multi-step flows)
  if (/^(yes|yeah|yep|confirm|ok|sure|go ahead|approved?)$/i.test(msg)) {
    return { intent: "CONFIRM", confidence: 0.95 };
  }

  // Cancellation
  if (/^(no|nah|cancel|stop|nevermind|never mind)$/i.test(msg)) {
    return { intent: "CANCEL", confidence: 0.95 };
  }

  // Goodbye
  if (
    /^(bye|goodbye|thanks|thank you|ok bye|see you|ttyl)$/i.test(msg.trim()) ||
    (msg.includes("thank") && msg.split(" ").length <= 4)
  ) {
    return { intent: "GOODBYE", confidence: 0.93 };
  }

  // Greeting ONLY if message is short/simple
  if (/^(hi+|hello+|hey+|good\s*(morning|afternoon|evening))/.test(msg) && msg.split(" ").length <= 4) {
    return { intent: "GREETING", confidence: 0.95 };
  }

  return null;
}
