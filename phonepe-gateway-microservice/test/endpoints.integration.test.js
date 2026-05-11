/*
 * Integration tests — boots the actual express app via supertest, exercises
 * routes end-to-end with real middleware (helmet, CORS, rate-limit, body
 * parsers, error handler). External boundaries are mocked at the ESM module
 * level via jest.unstable_mockModule:
 *   - axios            — PhonePe API + origin webhook forwarding
 *   - getAuthorisationToken — returns a static bearer
 *   - redis            — replaces the singleton client with an in-memory map
 *                        so the state machine + idempotency keys are testable
 *
 * Unit tests in test/sandbox.test.js cover pure crypto + state-machine logic;
 * this file covers wiring: auth headers, status codes, response shapes,
 * rate-limit kick-in, and webhook signature verification on the real handler.
 */
import { jest } from "@jest/globals";
import crypto from "node:crypto";

// ── Env setup BEFORE any module loads ──────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.WEBHOOK_USERNAME = "webhook-user";
process.env.WEBHOOK_PASSWORD = "webhook-secret";
process.env.PHONEPE_WEBHOOK_SECRET = "phonepe-hmac-secret";
process.env.ORIGIN_WEBHOOK_URL = "https://origin.test/webhook";
process.env.ORIGIN_WEBHOOK_SECRET = "origin-hmac-secret";
process.env.PHONEPE_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
process.env.PHONEPE_REDIRECT_URI = "https://app.test";
process.env.VALID_PLAN_AMOUNTS_PAISE = "9900,49900,99900"; // ₹99, ₹499, ₹999

// ── In-memory redis stub (sequence + idempotency support) ──────────────────
const store = new Map();
const mockRedis = {
  connect: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  get: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  // PhonePe webhook uses { NX: true, EX } to detect duplicates. Mirror that semantic.
  set: jest.fn(async (key, value, opts) => {
    if (opts?.NX && store.has(key)) return null;
    store.set(key, value);
    return "OK";
  }),
  del: jest.fn(async (key) => {
    const had = store.delete(key);
    return had ? 1 : 0;
  }),
};

// ── axios mock — covers both ESM default + named usage ─────────────────────
const axiosPost = jest.fn();
const axiosGet = jest.fn();
const axiosMock = { post: axiosPost, get: axiosGet };

jest.unstable_mockModule("axios", () => ({ default: axiosMock, __esModule: true }));
jest.unstable_mockModule("../config/redis.js", () => ({ default: mockRedis, __esModule: true }));
jest.unstable_mockModule("../config/phonepe.auth.js", () => ({
  default: jest.fn().mockResolvedValue("stub-bearer-token"),
  __esModule: true,
}));

// ── Now load app + supertest ───────────────────────────────────────────────
const { default: request } = await import("supertest");
const { default: app } = await import("../service.js");

beforeEach(() => {
  store.clear();
  axiosPost.mockReset();
  axiosGet.mockReset();
});

// ── /health (unauthenticated, bypasses limiter) ────────────────────────────
describe("GET /health", () => {
  it("returns 200 with status UP and a timestamp", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("UP");
    expect(typeof res.body.timestamp).toBe("string");
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

// ── /api/payments/initiate-payment ─────────────────────────────────────────
describe("POST /api/payments/initiate-payment", () => {
  const validBody = { amount: 99, orderId: "ORD-001", userId: "user-1" };

  it("rejects missing amount with 400", async () => {
    const res = await request(app).post("/api/payments/initiate-payment").send({ orderId: "x", userId: "u" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });

  it("rejects negative or zero amount", async () => {
    const res = await request(app).post("/api/payments/initiate-payment").send({ ...validBody, amount: -1 });
    expect(res.status).toBe(400);
  });

  it("rejects non-string orderId", async () => {
    const res = await request(app).post("/api/payments/initiate-payment").send({ ...validBody, orderId: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/orderId/);
  });

  it("rejects amount that does not match any allowlisted plan", async () => {
    const res = await request(app).post("/api/payments/initiate-payment").send({ ...validBody, amount: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/plan/i);
  });

  it("forwards to PhonePe and returns the upstream response when input is valid", async () => {
    axiosPost.mockResolvedValueOnce({ data: { state: "PENDING", merchantOrderId: "ORD-001" } });

    const res = await request(app).post("/api/payments/initiate-payment").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: "PENDING", merchantOrderId: "ORD-001" });
    expect(axiosPost).toHaveBeenCalledTimes(1);

    const [url, payload, opts] = axiosPost.mock.calls[0];
    expect(url).toBe("https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay");
    expect(payload.amount).toBe(9900); // ₹99 → 9900 paise
    expect(payload.metaInfo.udf1).toBe("user-1");
    expect(opts.headers.Authorization).toBe("O-Bearer stub-bearer-token");
  });

  it("surfaces upstream PhonePe error status", async () => {
    axiosPost.mockRejectedValueOnce({
      response: { status: 502, data: { error: "Bad Gateway" } },
      message: "Bad Gateway",
    });

    const res = await request(app).post("/api/payments/initiate-payment").send(validBody);

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });
});

// ── /api/phonepe/webhook ───────────────────────────────────────────────────
describe("POST /api/phonepe/webhook", () => {
  function basicAuth() {
    return crypto
      .createHash("sha256")
      .update(`${process.env.WEBHOOK_USERNAME}:${process.env.WEBHOOK_PASSWORD}`)
      .digest("hex");
  }

  function xVerify(body) {
    const sig = crypto
      .createHmac("sha256", process.env.PHONEPE_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest("hex");
    return `${sig}###1`;
  }

  const sampleBody = {
    event: "PAYMENT_SUCCESS",
    payload: {
      merchantOrderId: "ORDER-W-1",
      state: "COMPLETED",
      amount: 9900,
      metaInfo: { udf1: "user-1" },
      paymentDetails: [{ transactionId: "T-1" }],
    },
  };

  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).post("/api/phonepe/webhook").send(sampleBody);
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong basic-auth hash", async () => {
    const res = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", "0".repeat(64))
      .set("X-Verify", xVerify(sampleBody))
      .send(sampleBody);
    expect(res.status).toBe(401);
  });

  it("rejects requests with tampered body (X-Verify mismatch)", async () => {
    const tampered = JSON.parse(JSON.stringify(sampleBody));
    const sigForOriginal = xVerify(sampleBody);
    tampered.payload.amount = 1;

    const res = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", sigForOriginal)
      .send(tampered);

    expect(res.status).toBe(401);
  });

  it("rejects payload with no merchantOrderId", async () => {
    const body = { event: "x", payload: { state: "COMPLETED" } };
    const res = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", xVerify(body))
      .send(body);

    expect(res.status).toBe(400);
  });

  it("processes a valid PENDING → COMPLETED transition and forwards to origin", async () => {
    axiosPost.mockResolvedValueOnce({ status: 200, data: { ok: true } });

    const res = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", xVerify(sampleBody))
      .send(sampleBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Origin server was notified
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, forwardedBody, opts] = axiosPost.mock.calls[0];
    expect(url).toBe(process.env.ORIGIN_WEBHOOK_URL);
    expect(typeof forwardedBody).toBe("string"); // signed raw JSON
    expect(JSON.parse(forwardedBody).merchantOrderId).toBe("ORDER-W-1");
    expect(opts.headers["X-Webhook-Signature"]).toMatch(/^[a-f0-9]{64}$/);

    // State was persisted in mock redis
    expect(await mockRedis.get("order:state:ORDER-W-1")).toBe("COMPLETED");
  });

  it("returns 200 with note:duplicate on retried delivery (idempotency)", async () => {
    axiosPost.mockResolvedValue({ status: 200, data: { ok: true } });

    const first = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", xVerify(sampleBody))
      .send(sampleBody);
    expect(first.status).toBe(200);
    expect(first.body.note).toBeUndefined();

    const second = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", xVerify(sampleBody))
      .send(sampleBody);
    expect(second.status).toBe(200);
    expect(second.body.note).toBe("duplicate");

    // Origin only called once — the retry was absorbed
    expect(axiosPost).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid transition (COMPLETED → FAILED) with 409", async () => {
    axiosPost.mockResolvedValue({ status: 200, data: {} });

    // Drive into COMPLETED first
    const first = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", xVerify(sampleBody))
      .send(sampleBody);
    expect(first.status).toBe(200);

    // Now try to send FAILED for the same order — terminal state, should 409
    const failBody = {
      ...sampleBody,
      payload: { ...sampleBody.payload, state: "FAILED" },
    };

    const res = await request(app)
      .post("/api/phonepe/webhook")
      .set("Authorization", basicAuth())
      .set("X-Verify", xVerify(failBody))
      .send(failBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Invalid state transition/);
  });
});

// ── /api/refund/* ──────────────────────────────────────────────────────────
describe("POST /api/refund/initiate-refund", () => {
  it("rejects request missing refundId / orderId / amount", async () => {
    const res = await request(app).post("/api/refund/initiate-refund").send({ refundId: "R-1" });
    expect(res.status).toBe(400);
  });

  it("forwards a valid refund to PhonePe and returns success", async () => {
    axiosPost.mockResolvedValueOnce({ data: { refundId: "R-1", state: "PENDING" } });

    const res = await request(app)
      .post("/api/refund/initiate-refund")
      .send({ refundId: "R-1", orderId: "O-1", amount: 99 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [, payload] = axiosPost.mock.calls[0];
    expect(payload.amount).toBe(9900); // ₹99 → 9900 paise
    expect(payload.originalMerchantOrderId).toBe("O-1");
  });
});

// ── /api/payments/phonepe/callback ─────────────────────────────────────────
describe("POST /api/payments/phonepe/callback", () => {
  it("rejects missing fields with 400", async () => {
    const res = await request(app).post("/api/payments/phonepe/callback").send({ orderId: "O-1" });
    expect(res.status).toBe(400);
  });

  it("returns CANCELLED state when callbackResponse is USER_CANCEL", async () => {
    const res = await request(app)
      .post("/api/payments/phonepe/callback")
      .send({ orderId: "O-1", callbackResponse: "USER_CANCEL" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: "CANCELLED" });
    // Should NOT have called PhonePe for status when user cancelled
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it("rejects unknown callbackResponse values", async () => {
    const res = await request(app)
      .post("/api/payments/phonepe/callback")
      .send({ orderId: "O-1", callbackResponse: "RANDOM_VALUE" });

    expect(res.status).toBe(400);
  });

  it("verifies real status with PhonePe when callbackResponse is CONCLUDED", async () => {
    axiosGet.mockResolvedValueOnce({
      data: { state: "COMPLETED", amount: 9900, paymentDetails: [], metaInfo: { udf1: "user-1" } },
    });
    // origin forwarder is fire-and-log — we still need it not to throw
    axiosPost.mockResolvedValueOnce({ status: 200, data: {} });

    const res = await request(app)
      .post("/api/payments/phonepe/callback")
      .send({ orderId: "O-1", callbackResponse: "CONCLUDED" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.state).toBe("COMPLETED");
    expect(axiosGet).toHaveBeenCalledTimes(1);
  });
});
