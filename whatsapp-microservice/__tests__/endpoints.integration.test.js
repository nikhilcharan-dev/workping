/*
 * Integration tests — boots the real express app from server.js via supertest.
 *
 * The whatsapp service touches a lot of external systems at module-load time:
 *   - BullMQ scheduler (scheduler/shift.reminder.js)
 *   - WhatsApp sender (whatsapp/sender.js)
 *   - Redis-backed conversation state (utils/conversation.state.js)
 *   - LLM provider (utils/llm.provider.js)
 *   - File-backed analytics (utils/analytics.js)
 *   - Rate limiter (utils/rate.limiter.js)
 *   - Pipeline orchestrator (pipeline/message.pipeline.js)
 *
 * We mock each leaf at the ESM module level so the real route handlers run
 * end-to-end (auth middleware, JWT signing, validators, Meta-signature
 * verification) without touching Redis or BullMQ.
 *
 * Scope:
 *   - POST /api/login — bcrypt + JWT round-trip
 *   - JWT-gated dashboard routes (401 vs 200)
 *   - Meta webhook GET handshake (hub.verify_token)
 *   - Meta webhook POST signature verification + pipeline dispatch
 *   - /api/secure/whatsapp/send — auth + phone validation
 *   - /api/secure/whatsapp/schedule-reminder — body validators
 */
import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";

// ── Env BEFORE module load ─────────────────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.DASHBOARD_USER = "admin";
// bcrypt hash for password "pw123" (12 rounds). Re-generated below to avoid
// drift between bcryptjs releases.
process.env.DASHBOARD_PASS_HASH = bcrypt.hashSync("pw123", 4);
process.env.JWT_SECRET = "test-jwt-secret-thirty-two-bytes!";
process.env.WHATSAPP_VERIFY_TOKEN = "verify-token-secret";
process.env.WHATSAPP_APP_SECRET = "meta-app-secret-very-long-string";
process.env.ORIGIN = "https://test.workping.live";

// ── Leaf-module mocks ──────────────────────────────────────────────────────
const sendWhatsAppMessage = jest.fn().mockResolvedValue({ messageId: "stub" });
const startFlow = jest.fn().mockResolvedValue();
const scheduleShiftReminder = jest.fn().mockResolvedValue({ scheduled: true, fireAt: "2099-01-01T00:00:00Z" });
const cancelShiftReminder = jest.fn().mockResolvedValue({ cancelled: true });
const startReminderWorker = jest.fn();
const messagePipelineProcess = jest.fn().mockResolvedValue();
const llmHealthCheck = jest.fn().mockResolvedValue({ ok: true, provider: "stub" });

jest.unstable_mockModule("../whatsapp/sender.js", () => ({
  sendWhatsAppMessage,
  __esModule: true,
}));

jest.unstable_mockModule("../utils/conversation.state.js", () => ({
  startFlow,
  __esModule: true,
}));

jest.unstable_mockModule("../scheduler/shift.reminder.js", () => ({
  scheduleShiftReminder,
  cancelShiftReminder,
  startReminderWorker,
  __esModule: true,
}));

jest.unstable_mockModule("../pipeline/message.pipeline.js", () => ({
  default: { process: messagePipelineProcess },
  __esModule: true,
}));

jest.unstable_mockModule("../utils/llm.provider.js", () => ({
  healthCheck: llmHealthCheck,
  getProvider: jest.fn(() => "stub"),
  setProvider: jest.fn((p) => p),
  getProviderConfig: jest.fn(() => ({})),
  updateProviderConfig: jest.fn(() => ({})),
  getRawProviderConfig: jest.fn(() => ({})),
  chat: jest.fn().mockResolvedValue({ content: "stub-response" }),
  __esModule: true,
}));

jest.unstable_mockModule("../utils/analytics.js", () => ({
  getStats: jest.fn(() => ({ totalMessages: 0, intents: {} })),
  __esModule: true,
}));

jest.unstable_mockModule("../utils/rate.limiter.js", () => ({
  getGuardStats: jest.fn(() => ({ guards: 0 })),
  getGuardedUsers: jest.fn(() => []),
  unbanUser: jest.fn(() => true),
  unrateLimitUser: jest.fn(() => true),
  __esModule: true,
}));

jest.unstable_mockModule("../utils/env.sync.js", () => ({
  syncToEnv: jest.fn(),
  buildEnvUpdates: jest.fn(() => ({})),
  __esModule: true,
}));

const { default: request } = await import("supertest");
const crypto = await import("node:crypto");
const { default: app } = await import("../server.js");

beforeEach(() => {
  sendWhatsAppMessage.mockClear();
  startFlow.mockClear();
  scheduleShiftReminder.mockClear();
  cancelShiftReminder.mockClear();
  messagePipelineProcess.mockClear();
});

// ── Public health probe ────────────────────────────────────────────────────
describe("public probes", () => {
  it("GET /keepmealive returns 200 OK", async () => {
    const res = await request(app).get("/keepmealive");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  it("GET /health returns 200 when LLM healthCheck reports ok", async () => {
    llmHealthCheck.mockResolvedValueOnce({ ok: true, provider: "stub" });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  it("GET /health returns 503 when LLM healthCheck reports degraded", async () => {
    llmHealthCheck.mockResolvedValueOnce({ ok: false, provider: "stub", error: "boom" });
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("DEGRADED");
  });
});

// ── /api/login ─────────────────────────────────────────────────────────────
describe("POST /api/login", () => {
  it("returns 400 when username or password is missing", async () => {
    const res = await request(app).post("/api/login").send({ username: "admin" });
    expect(res.status).toBe(400);
  });

  it("returns 401 for the wrong username", async () => {
    const res = await request(app).post("/api/login").send({ username: "nope", password: "pw123" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for the wrong password", async () => {
    const res = await request(app).post("/api/login").send({ username: "admin", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("returns 200 with a JWT for correct credentials", async () => {
    const res = await request(app).post("/api/login").send({ username: "admin", password: "pw123" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.token).toBe("string");
    // 3 segments — proper JWT shape
    expect(res.body.token.split(".")).toHaveLength(3);
  });
});

// ── JWT-gated dashboard routes ─────────────────────────────────────────────
describe("/api/dashboard/* JWT gating", () => {
  async function login() {
    const res = await request(app).post("/api/login").send({ username: "admin", password: "pw123" });
    return res.body.token;
  }

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a bogus token", async () => {
    const res = await request(app).get("/api/dashboard/stats").set("x-dashboard-token", "not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("returns 200 + stats payload for an authenticated request", async () => {
    const token = await login();
    const res = await request(app).get("/api/dashboard/stats").set("x-dashboard-token", token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalMessages");
  });

  it("returns 200 for /api/dashboard/health (proxied healthCheck)", async () => {
    const token = await login();
    const res = await request(app).get("/api/dashboard/health").set("x-dashboard-token", token);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── Meta webhook GET (hub.verify_token handshake) ──────────────────────────
describe("GET /api/secure/whatsapp/webhook (Meta handshake)", () => {
  it("echoes hub.challenge when verify_token matches", async () => {
    const res = await request(app).get("/api/secure/whatsapp/webhook").query({
      "hub.mode": "subscribe",
      "hub.verify_token": process.env.WHATSAPP_VERIFY_TOKEN,
      "hub.challenge": "ping-12345",
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe("ping-12345");
  });
});

// ── Meta webhook POST (signature verification + pipeline dispatch) ─────────
describe("POST /api/secure/whatsapp/webhook", () => {
  function sign(body) {
    return (
      "sha256=" +
      crypto.createHmac("sha256", process.env.WHATSAPP_APP_SECRET).update(JSON.stringify(body)).digest("hex")
    );
  }

  const incomingMsg = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "biz-1",
        changes: [
          {
            value: {
              contacts: [{ profile: { name: "Alice" }, wa_id: "919999999999" }],
              messages: [
                {
                  id: "wamid.1",
                  from: "919999999999",
                  type: "text",
                  timestamp: "1700000000",
                  text: { body: "leave balance" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  it("returns 401 with no x-hub-signature-256", async () => {
    const res = await request(app).post("/api/secure/whatsapp/webhook").send(incomingMsg);
    expect(res.status).toBe(401);
  });

  it("returns 401 with a tampered signature", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/webhook")
      .set("x-hub-signature-256", "sha256=" + "0".repeat(64))
      .send(incomingMsg);
    expect(res.status).toBe(401);
  });

  it("dispatches a text message to the pipeline on a valid signature", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/webhook")
      .set("x-hub-signature-256", sign(incomingMsg))
      .send(incomingMsg);

    expect(res.status).toBe(200);
    expect(messagePipelineProcess).toHaveBeenCalledTimes(1);
    expect(messagePipelineProcess.mock.calls[0][0]).toMatchObject({
      from: "919999999999",
      text: "leave balance",
      type: "text",
    });
  });

  it("returns 200 and skips pipeline for a delivery-status update", async () => {
    const statusBody = {
      object: "whatsapp_business_account",
      entry: [{ id: "biz", changes: [{ value: { statuses: [{ id: "wamid.x", status: "delivered" }] } }] }],
    };
    const res = await request(app)
      .post("/api/secure/whatsapp/webhook")
      .set("x-hub-signature-256", sign(statusBody))
      .send(statusBody);
    expect(res.status).toBe(200);
    expect(messagePipelineProcess).not.toHaveBeenCalled();
  });

  it("deduplicates a retried delivery of the same messageId", async () => {
    const sig = sign(incomingMsg);

    await request(app).post("/api/secure/whatsapp/webhook").set("x-hub-signature-256", sig).send(incomingMsg);
    await request(app).post("/api/secure/whatsapp/webhook").set("x-hub-signature-256", sig).send(incomingMsg);

    // The webhook tracks processedMessageIds in memory; second delivery is skipped.
    expect(messagePipelineProcess).toHaveBeenCalledTimes(1);
  });
});

// ── /api/secure/whatsapp/send ──────────────────────────────────────────────
describe("POST /api/secure/whatsapp/send", () => {
  const auth = { Authorization: process.env.WHATSAPP_VERIFY_TOKEN };

  it("returns 401 with no Authorization", async () => {
    const res = await request(app).post("/api/secure/whatsapp/send").send({ to: "919999999999", text: "hi" });
    expect(res.status).toBe(401);
  });

  it("returns 401 with a wrong Authorization value", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/send")
      .set("Authorization", "wrong")
      .send({ to: "919999999999", text: "hi" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when 'to' or 'text' is missing", async () => {
    const res = await request(app).post("/api/secure/whatsapp/send").set(auth).send({ to: "919999999999" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'to' fails phone-format validation", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/send")
      .set(auth)
      .send({ to: "+1-555-not-a-phone", text: "hi" });
    expect(res.status).toBe(400);
  });

  it("returns 200 and calls sendWhatsAppMessage for a valid payload", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/send")
      .set(auth)
      .send({ to: "919999999999", text: "hello" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sent: true, to: "919999999999" });
    expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({ to: "919999999999", text: "hello" });
  });

  it("returns 500 when the sender throws", async () => {
    sendWhatsAppMessage.mockRejectedValueOnce(new Error("meta-api-down"));
    const res = await request(app)
      .post("/api/secure/whatsapp/send")
      .set(auth)
      .send({ to: "919999999999", text: "hi" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("meta-api-down");
  });
});

// ── /api/secure/whatsapp/schedule-reminder ─────────────────────────────────
describe("POST /api/secure/whatsapp/schedule-reminder", () => {
  const auth = { Authorization: process.env.WHATSAPP_VERIFY_TOKEN };
  const validBody = {
    userId: "u-1",
    shiftDate: "2026-04-19",
    phone: "919999999999",
    name: "Priya",
    role: "employee",
    shift: { name: "Morning", startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
  };

  it("requires auth", async () => {
    const res = await request(app).post("/api/secure/whatsapp/schedule-reminder").send(validBody);
    expect(res.status).toBe(401);
  });

  it("rejects when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/schedule-reminder")
      .set(auth)
      .send({ ...validBody, shiftDate: undefined });
    expect(res.status).toBe(400);
  });

  it("rejects when shiftDate is not YYYY-MM-DD", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/schedule-reminder")
      .set(auth)
      .send({ ...validBody, shiftDate: "19-04-2026" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/YYYY-MM-DD/);
  });

  it("rejects when phone fails the country-code check", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/schedule-reminder")
      .set(auth)
      .send({ ...validBody, phone: "+91 99999 99999" });
    expect(res.status).toBe(400);
  });

  it("forwards a valid payload to scheduleShiftReminder", async () => {
    const res = await request(app).post("/api/secure/whatsapp/schedule-reminder").set(auth).send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.scheduled).toBe(true);
    expect(scheduleShiftReminder).toHaveBeenCalledTimes(1);
    expect(scheduleShiftReminder.mock.calls[0][0]).toMatchObject({ userId: "u-1", phone: "919999999999" });
  });
});

// ── /api/secure/whatsapp/cancel-reminder ───────────────────────────────────
describe("POST /api/secure/whatsapp/cancel-reminder", () => {
  const auth = { Authorization: process.env.WHATSAPP_VERIFY_TOKEN };

  it("requires userId and shiftDate", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/cancel-reminder")
      .set(auth)
      .send({ userId: "u-1" });
    expect(res.status).toBe(400);
  });

  it("forwards to cancelShiftReminder for a valid request", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/cancel-reminder")
      .set(auth)
      .send({ userId: "u-1", shiftDate: "2026-04-19" });
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(true);
    expect(cancelShiftReminder).toHaveBeenCalledWith("u-1", "2026-04-19");
  });
});

// ── /api/secure/whatsapp/start-flow ────────────────────────────────────────
describe("POST /api/secure/whatsapp/start-flow", () => {
  const auth = { Authorization: process.env.WHATSAPP_VERIFY_TOKEN };

  it("requires phone / flow / step", async () => {
    const res = await request(app).post("/api/secure/whatsapp/start-flow").set(auth).send({ phone: "p" });
    expect(res.status).toBe(400);
  });

  it("calls startFlow with normalised phone", async () => {
    const res = await request(app)
      .post("/api/secure/whatsapp/start-flow")
      .set(auth)
      .send({ phone: " 919999999999 ", flow: "LEAVE_APPROVAL", step: "AWAITING_DECISION", data: { id: 1 } });
    expect(res.status).toBe(200);
    expect(res.body.started).toBe(true);
    expect(startFlow).toHaveBeenCalledWith("919999999999", "LEAVE_APPROVAL", "AWAITING_DECISION", { id: 1 });
  });
});
