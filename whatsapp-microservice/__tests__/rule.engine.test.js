import { ruleEngine } from "../intent/rule.engine.js";

describe("ruleEngine — menu shortcuts", () => {
  const cases = [
    ["1", "ATTENDANCE_STATUS"],
    ["2", "LEAVE_REQUEST"],
    ["3", "LEAVE_BALANCE"],
    ["4", "LEAVE_STATUS"],
    ["5", "FRS_ISSUE"],
    ["6", "POLICY_INFO"],
    ["7", "COMPLAINT"],
  ];
  it.each(cases)("'%s' → %s with confidence 1.0", (input, intent) => {
    expect(ruleEngine(input)).toEqual({ intent, confidence: 1.0 });
  });
});

describe("ruleEngine — FRS ticket priority", () => {
  it("routes 'frs ticket' to FRS_TICKET (must beat FRS_ISSUE)", () => {
    expect(ruleEngine("frs ticket").intent).toBe("FRS_TICKET");
  });
  it("routes 'raise frs ticket' to FRS_TICKET", () => {
    expect(ruleEngine("please raise frs ticket for me").intent).toBe("FRS_TICKET");
  });
  it("routes 'create frs ticket' to FRS_TICKET", () => {
    expect(ruleEngine("can you create frs ticket").intent).toBe("FRS_TICKET");
  });
});

describe("ruleEngine — face/FRS issues", () => {
  it("routes plain 'frs' to FRS_ISSUE", () => {
    expect(ruleEngine("frs").intent).toBe("FRS_ISSUE");
  });
  it("routes 'face not working' to FRS_ISSUE", () => {
    expect(ruleEngine("face not working").intent).toBe("FRS_ISSUE");
  });
  it("routes 'biometric' to FRS_ISSUE", () => {
    expect(ruleEngine("biometric").intent).toBe("FRS_ISSUE");
  });
  it("routes 'attendance not updated' to FRS_ISSUE", () => {
    expect(ruleEngine("attendance not updated").intent).toBe("FRS_ISSUE");
  });
});

describe("ruleEngine — attendance status", () => {
  it.each([
    "what is my attendance today",
    "check my attendance",
    "attendance for this week",
    "attendance this month",
  ])("matches '%s' → ATTENDANCE_STATUS", (msg) => {
    expect(ruleEngine(msg).intent).toBe("ATTENDANCE_STATUS");
  });
});

describe("ruleEngine — leave variants", () => {
  it("distinguishes balance from status from request", () => {
    expect(ruleEngine("leave balance").intent).toBe("LEAVE_BALANCE");
    expect(ruleEngine("how many leaves remaining").intent).toBe("LEAVE_BALANCE");
    expect(ruleEngine("leave status").intent).toBe("LEAVE_STATUS");
    expect(ruleEngine("pending leave").intent).toBe("LEAVE_STATUS");
    expect(ruleEngine("apply leave").intent).toBe("LEAVE_REQUEST");
    expect(ruleEngine("take leave").intent).toBe("LEAVE_REQUEST");
    expect(ruleEngine("i need casual leave").intent).toBe("LEAVE_REQUEST");
  });
});

describe("ruleEngine — salary, shift, holiday", () => {
  it.each([
    ["salary slip", "SALARY_QUERY"],
    ["my payslip", "SALARY_QUERY"],
    ["ctc breakdown", "SALARY_QUERY"],
    ["shift timing", "SHIFT_INFO"],
    ["work hours", "SHIFT_INFO"],
    ["roster for tomorrow", "SHIFT_INFO"],
    ["upcoming holidays", "HOLIDAY_INFO"],
    ["office closed next week", "HOLIDAY_INFO"],
  ])("routes '%s' → %s", (msg, intent) => {
    expect(ruleEngine(msg).intent).toBe(intent);
  });
});

describe("ruleEngine — policy detail vs generic", () => {
  it("routes WFH-specific queries to POLICY_DETAIL", () => {
    expect(ruleEngine("wfh policy").intent).toBe("POLICY_DETAIL");
    expect(ruleEngine("work from home").intent).toBe("POLICY_DETAIL");
    expect(ruleEngine("dress code").intent).toBe("POLICY_DETAIL");
    expect(ruleEngine("reimbursement").intent).toBe("POLICY_DETAIL");
  });
  it("routes generic 'policy' to POLICY_INFO", () => {
    expect(ruleEngine("policy").intent).toBe("POLICY_INFO");
    expect(ruleEngine("company rule").intent).toBe("POLICY_INFO");
  });
});

describe("ruleEngine — conversational intents", () => {
  it.each([
    ["yes", "CONFIRM"],
    ["yeah", "CONFIRM"],
    ["confirm", "CONFIRM"],
    ["ok", "CONFIRM"],
    ["go ahead", "CONFIRM"],
    ["no", "CANCEL"],
    ["cancel", "CANCEL"],
    ["nevermind", "CANCEL"],
    ["bye", "GOODBYE"],
    ["thanks", "GOODBYE"],
    ["hi", "GREETING"],
    ["hello there", "GREETING"],
    ["good morning", "GREETING"],
    ["help", "HELP"],
    ["menu", "HELP"],
    ["what can you do", "HELP"],
  ])("matches '%s' → %s", (msg, intent) => {
    expect(ruleEngine(msg).intent).toBe(intent);
  });
});

describe("ruleEngine — fallthrough", () => {
  it("returns null for unrecognised free-form text (handed to LLM)", () => {
    expect(ruleEngine("what is the weather in mumbai today")).toBeNull();
    expect(ruleEngine("can you tell me about quantum mechanics")).toBeNull();
  });

  it("does NOT misroute a long greeting-like sentence", () => {
    // The 'hi' pattern requires <=4 words; a long sentence should fall through.
    expect(ruleEngine("hi there can you please tell me about the company picnic")).toBeNull();
  });
});

describe("ruleEngine — case and whitespace insensitivity", () => {
  it("normalises casing", () => {
    expect(ruleEngine("LEAVE BALANCE").intent).toBe("LEAVE_BALANCE");
    expect(ruleEngine("Leave Balance").intent).toBe("LEAVE_BALANCE");
  });
  it("trims surrounding whitespace", () => {
    expect(ruleEngine("   leave balance   ").intent).toBe("LEAVE_BALANCE");
  });
});

describe("ruleEngine — confidence scores", () => {
  it("returns 1.0 for menu shortcuts (no ambiguity)", () => {
    expect(ruleEngine("1").confidence).toBe(1.0);
  });
  it("returns 0.85-0.95 for natural-language matches", () => {
    const r = ruleEngine("apply leave for tomorrow");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
    expect(r.confidence).toBeLessThanOrEqual(0.95);
  });
});
