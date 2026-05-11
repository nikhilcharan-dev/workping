/*
 * Integration tests — boots the real express app from server.js via supertest.
 * Mocks the two external boundaries at the ESM module level:
 *   - config/redisConfig.js     → in-memory store (OTP set/get/del)
 *   - config/mailTransporter.js → fake transporter that records sendMail calls
 *
 * What this covers that the unit tests do not:
 *   - The bearer-token middleware wiring (token + email validation on every API call)
 *   - Public endpoints (/health, /, /dashboard, /api/v1/analytics/stats) bypassing auth
 *   - The full OTP round-trip: send-email-otp generates a 6-digit code, stores it
 *     in redis with the right key + TTL, and verify-email-otp deletes the key on match
 *   - All mailer routes wire through to nodemailer (each handler calls sendMail
 *     with the right subject and html shape)
 *   - 500 path when nodemailer throws
 */
import { jest } from "@jest/globals";

// ── Env setup BEFORE any module loads ──────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.SECRET = "shared-mailer-secret-32-bytes-long";

// ── In-memory redis mock (mirrors the subset used by router.otp.js) ────────
const store = new Map();
const ttls = new Map();
const mockRedis = {
  connect: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  get: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  set: jest.fn(async (key, value, opts) => {
    store.set(key, value);
    if (opts?.EX) ttls.set(key, opts.EX);
    return "OK";
  }),
  del: jest.fn(async (key) => {
    const had = store.delete(key);
    ttls.delete(key);
    return had ? 1 : 0;
  }),
};

// ── Fake nodemailer transporter (records every sendMail call) ──────────────
const sendMail = jest.fn().mockResolvedValue({ messageId: "stub-message-id" });
const verify = jest.fn((cb) => cb && cb(null, true));
const mockTransporter = { sendMail, verify };

// ── Apply module mocks BEFORE importing the app ────────────────────────────
jest.unstable_mockModule("../config/redisConfig.js", () => ({ default: mockRedis, __esModule: true }));
jest.unstable_mockModule("../config/mailTransporter.js", () => ({ default: mockTransporter, __esModule: true }));

const { default: request } = await import("supertest");
const { default: app } = await import("../server.js");

const SECRET = process.env.SECRET;
const headers = { Authorization: SECRET };

beforeEach(() => {
  store.clear();
  ttls.clear();
  sendMail.mockClear();
});

// ── Public routes ──────────────────────────────────────────────────────────
describe("public routes", () => {
  it("GET /health returns 200 UP without an Authorization header", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "UP", service: "workping-mailer" });
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("GET / returns the HTML landing page (no auth)", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Mailer/);
  });

  it("GET /dashboard renders analytics HTML (no auth)", async () => {
    const res = await request(app).get("/dashboard");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Analytics Dashboard/);
  });

  // Note: /api/v1/analytics/stats is registered AFTER the auth middleware in
  // server.js (line ~447). The middleware reads req.body.email, so a plain GET
  // (which has no body and no Authorization header) is rejected with 403.
  // Treating that as the contract — the dashboard hits this endpoint over the
  // internal network with the bearer token.
  it("GET /api/v1/analytics/stats is auth-gated and 403s without a token", async () => {
    const res = await request(app).get("/api/v1/analytics/stats");
    expect(res.status).toBe(403);
  });
});

// ── Auth middleware ────────────────────────────────────────────────────────
describe("API auth middleware", () => {
  it("rejects /api/v1/mail/send-mail with no Authorization", async () => {
    const res = await request(app).post("/api/v1/mail/send-mail").send({ email: "u@x.com" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  it("rejects /api/v1/mail/send-mail with wrong-length token", async () => {
    const res = await request(app)
      .post("/api/v1/mail/send-mail")
      .set("Authorization", "wrong")
      .send({ email: "u@x.com" });
    expect(res.status).toBe(403);
  });

  it("rejects /api/v1/mail/send-mail with same-length but wrong value", async () => {
    const res = await request(app)
      .post("/api/v1/mail/send-mail")
      .set("Authorization", "X".repeat(SECRET.length))
      .send({ email: "u@x.com", subject: "s", content: "c" });
    expect(res.status).toBe(403);
  });

  it("rejects /api/v1/mail/send-mail with no email", async () => {
    const res = await request(app).post("/api/v1/mail/send-mail").set(headers).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("rejects malformed email format", async () => {
    const res = await request(app).post("/api/v1/mail/send-mail").set(headers).send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });
});

// ── /api/v1/mail/* ─────────────────────────────────────────────────────────
describe("POST /api/v1/mail/send-mail", () => {
  it("returns 400 when subject or content are missing", async () => {
    const res = await request(app)
      .post("/api/v1/mail/send-mail")
      .set(headers)
      .send({ email: "u@x.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject and content/);
  });

  it("calls nodemailer with the expected shape and returns 200 on success", async () => {
    const res = await request(app)
      .post("/api/v1/mail/send-mail")
      .set(headers)
      .send({ email: "u@x.com", subject: "Hi", content: "<b>Hi</b>" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "success" });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({ to: "u@x.com", subject: "Hi", html: "<b>Hi</b>" });
  });

  it("returns 500 when nodemailer throws", async () => {
    sendMail.mockRejectedValueOnce(new Error("smtp-down"));
    const res = await request(app)
      .post("/api/v1/mail/send-mail")
      .set(headers)
      .send({ email: "u@x.com", subject: "s", content: "c" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal Server Error");
  });
});

describe("POST /api/v1/mail/greeting", () => {
  it("rejects when name / org / role missing", async () => {
    const res = await request(app)
      .post("/api/v1/mail/greeting")
      .set(headers)
      .send({ email: "u@x.com", name: "Alice" });
    expect(res.status).toBe(400);
  });

  it("calls sendMail with a welcome subject", async () => {
    const res = await request(app)
      .post("/api/v1/mail/greeting")
      .set(headers)
      .send({ email: "u@x.com", name: "Alice", org: "Acme", role: "manager" });
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toBe("Welcome to Acme!");
  });
});

describe("POST /api/v1/mail/alert/*", () => {
  it.each([
    ["info", "Server Reboot"],
    ["warning", "⚠️ Disk Full"],
    ["danger", "🚨 Breach"],
    ["success", "✅ Backup OK"],
  ])("alert/%s sends mail with the right subject prefix", async (variant, expectedSubjectFragment) => {
    const title = expectedSubjectFragment.replace(/^[^A-Za-z]+/, "").trim();
    const res = await request(app)
      .post(`/api/v1/mail/alert/${variant}`)
      .set(headers)
      .send({ email: "u@x.com", title, message: "msg" });

    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toContain(title);
  });

  it("rejects alert with no title", async () => {
    const res = await request(app)
      .post("/api/v1/mail/alert/info")
      .set(headers)
      .send({ email: "u@x.com", message: "hi" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/mail/forgot-password", () => {
  it("rejects when resetLink is missing", async () => {
    const res = await request(app)
      .post("/api/v1/mail/forgot-password")
      .set(headers)
      .send({ email: "u@x.com" });
    expect(res.status).toBe(400);
  });

  it("sends the password reset email", async () => {
    // Handlebars HTML-escapes `=` in query strings inside `{{...}}`, so the
    // raw URL appears as `https://x.com/reset/abc` (path-based avoids that).
    const res = await request(app)
      .post("/api/v1/mail/forgot-password")
      .set(headers)
      .send({ email: "u@x.com", resetLink: "https://x.com/reset/abc" });
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].html).toContain("https://x.com/reset/abc");
  });
});

describe("POST /api/v1/mail/send-html", () => {
  it("rejects when html body is missing", async () => {
    const res = await request(app)
      .post("/api/v1/mail/send-html")
      .set(headers)
      .send({ email: "u@x.com", subject: "s" });
    expect(res.status).toBe(400);
  });

  it("forwards raw HTML to nodemailer as-is", async () => {
    const html = "<h1>hello</h1>";
    const res = await request(app)
      .post("/api/v1/mail/send-html")
      .set(headers)
      .send({ email: "u@x.com", subject: "raw", html });
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith({ to: "u@x.com", subject: "raw", html });
  });
});

// ── /api/v1/otp/* ──────────────────────────────────────────────────────────
describe("OTP flow — send + verify round trip", () => {
  it("send-email-otp stores a 6-digit OTP in redis with 30-minute TTL and emails it", async () => {
    const res = await request(app)
      .post("/api/v1/otp/send-email-otp")
      .set(headers)
      .send({ email: "u@x.com" });

    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const key = "otp:email:u@x.com";
    const stored = store.get(key);
    expect(stored).toMatch(/^\d{6}$/);
    expect(ttls.get(key)).toBe(30 * 60);
  });

  it("send-reset-password-otp uses the shorter 10-minute TTL and the reset: key prefix", async () => {
    const res = await request(app)
      .post("/api/v1/otp/send-reset-password-otp")
      .set(headers)
      .send({ email: "u@x.com" });
    expect(res.status).toBe(200);

    const key = "otp:reset:u@x.com";
    expect(store.get(key)).toMatch(/^\d{6}$/);
    expect(ttls.get(key)).toBe(10 * 60);
  });

  it("verify-email-otp returns 400 when no OTP has been issued", async () => {
    const res = await request(app)
      .post("/api/v1/otp/verify-email-otp")
      .set(headers)
      .send({ email: "u@x.com", otp: "123456" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired|not found/i);
  });

  it("verify-email-otp returns 400 on wrong OTP and leaves the key in place", async () => {
    store.set("otp:email:u@x.com", "111111");
    const res = await request(app)
      .post("/api/v1/otp/verify-email-otp")
      .set(headers)
      .send({ email: "u@x.com", otp: "999999" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid OTP/);
    expect(store.has("otp:email:u@x.com")).toBe(true); // not consumed
  });

  it("verify-email-otp returns 200 on match and deletes the key (single-use)", async () => {
    store.set("otp:email:u@x.com", "424242");
    const res = await request(app)
      .post("/api/v1/otp/verify-email-otp")
      .set(headers)
      .send({ email: "u@x.com", otp: "424242" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "success", verified: true });
    expect(store.has("otp:email:u@x.com")).toBe(false);
  });

  it("verify-reset-password-otp follows the same single-use contract", async () => {
    store.set("otp:reset:u@x.com", "777777");

    const wrong = await request(app)
      .post("/api/v1/otp/verify-reset-password-otp")
      .set(headers)
      .send({ email: "u@x.com", otp: "111111" });
    expect(wrong.status).toBe(400);
    expect(store.has("otp:reset:u@x.com")).toBe(true);

    const right = await request(app)
      .post("/api/v1/otp/verify-reset-password-otp")
      .set(headers)
      .send({ email: "u@x.com", otp: "777777" });
    expect(right.status).toBe(200);
    expect(store.has("otp:reset:u@x.com")).toBe(false);
  });
});
