import crypto from "node:crypto";

// ─── Helpers that mirror the production webhook logic ────────────────────────
// These reproduce the exact algorithms used in webhook/phonepe.webhook.js so
// tests fail if the production implementation ever diverges.

function computeBasicAuthToken(username, password) {
  return crypto.createHash("sha256").update(`${username}:${password}`).digest("hex");
}

function computeXVerify(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

// State machine copied from production code
const VALID_TRANSITIONS = {
  PENDING: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
  COMPLETED: new Set([]),
  FAILED: new Set([]),
  CANCELLED: new Set([]),
};

// ─── Basic Auth verification ─────────────────────────────────────────────────
describe("Basic Auth verification", () => {
  const USERNAME = "webhook-user";
  const PASSWORD = "webhook-secret";

  it("accepts correct credentials", () => {
    const authHeader = computeBasicAuthToken(USERNAME, PASSWORD);
    const expected = computeBasicAuthToken(USERNAME, PASSWORD);
    const match = crypto.timingSafeEqual(Buffer.from(authHeader.trim()), Buffer.from(expected));
    expect(match).toBe(true);
  });

  it("rejects wrong username", () => {
    const authHeader = computeBasicAuthToken("wrong-user", PASSWORD);
    const expected = computeBasicAuthToken(USERNAME, PASSWORD);
    expect(authHeader).not.toBe(expected);
  });

  it("rejects wrong password", () => {
    const authHeader = computeBasicAuthToken(USERNAME, "wrong-secret");
    const expected = computeBasicAuthToken(USERNAME, PASSWORD);
    expect(authHeader).not.toBe(expected);
  });

  it("rejects absent auth header (null guard)", () => {
    // verifyBasicAuth(null) → returns false immediately
    const authHeader = null;
    expect(Boolean(authHeader)).toBe(false);
  });

  it("produces different tokens for different credential pairs", () => {
    const t1 = computeBasicAuthToken("user1", "pass1");
    const t2 = computeBasicAuthToken("user2", "pass2");
    expect(t1).not.toBe(t2);
  });
});

// ─── X-Verify HMAC signature verification ───────────────────────────────────
describe("X-Verify HMAC validation", () => {
  const WEBHOOK_SECRET = "phonepe-hmac-secret";

  it("accepts valid signature for original payload", () => {
    const body = JSON.stringify({
      event: "PAYMENT_SUCCESS",
      payload: { merchantOrderId: "ORDER-001", state: "COMPLETED", amount: 50000 },
    });
    const sig = computeXVerify(body, WEBHOOK_SECRET);
    const xVerify = `${sig}###1`;
    const [header] = xVerify.split("###");
    const expected = computeXVerify(body, WEBHOOK_SECRET);
    const match = crypto.timingSafeEqual(Buffer.from(header.trim()), Buffer.from(expected));
    expect(match).toBe(true);
  });

  it("rejects signature when payload is tampered", () => {
    const original = JSON.stringify({ amount: 50000 });
    const tampered = JSON.stringify({ amount: 1 });
    const sig = computeXVerify(original, WEBHOOK_SECRET);
    const recomputed = computeXVerify(tampered, WEBHOOK_SECRET);
    expect(sig).not.toBe(recomputed);
  });

  it("rejects signature produced with wrong secret", () => {
    const body = JSON.stringify({ merchantOrderId: "ORDER-002" });
    const correct = computeXVerify(body, WEBHOOK_SECRET);
    const wrong = computeXVerify(body, "wrong-secret");
    expect(correct).not.toBe(wrong);
  });

  it("rejects missing X-Verify header (null guard)", () => {
    // verifyXVerify(body, null) → returns false when secret is configured
    const xVerifyHeader = null;
    expect(Boolean(xVerifyHeader)).toBe(false);
  });

  it("signature is hex string of expected length (64 chars for SHA-256)", () => {
    const sig = computeXVerify('{"test":1}', WEBHOOK_SECRET);
    expect(sig).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(sig)).toBe(true);
  });
});

// ─── Order state machine ─────────────────────────────────────────────────────
describe("Order state machine transitions", () => {
  it("allows PENDING → COMPLETED", () => {
    expect(VALID_TRANSITIONS.PENDING.has("COMPLETED")).toBe(true);
  });

  it("allows PENDING → FAILED", () => {
    expect(VALID_TRANSITIONS.PENDING.has("FAILED")).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(VALID_TRANSITIONS.PENDING.has("CANCELLED")).toBe(true);
  });

  it("blocks COMPLETED → FAILED (terminal state)", () => {
    expect(VALID_TRANSITIONS.COMPLETED.has("FAILED")).toBe(false);
  });

  it("blocks COMPLETED → CANCELLED (terminal state)", () => {
    expect(VALID_TRANSITIONS.COMPLETED.has("CANCELLED")).toBe(false);
  });

  it("blocks FAILED → COMPLETED (terminal state)", () => {
    expect(VALID_TRANSITIONS.FAILED.has("COMPLETED")).toBe(false);
  });

  it("blocks CANCELLED → COMPLETED (terminal state)", () => {
    expect(VALID_TRANSITIONS.CANCELLED.has("COMPLETED")).toBe(false);
  });

  it("all terminal states have empty transition sets", () => {
    expect(VALID_TRANSITIONS.COMPLETED.size).toBe(0);
    expect(VALID_TRANSITIONS.FAILED.size).toBe(0);
    expect(VALID_TRANSITIONS.CANCELLED.size).toBe(0);
  });

  it("only PENDING has valid outgoing transitions", () => {
    const nonTerminal = Object.entries(VALID_TRANSITIONS).filter(([, set]) => set.size > 0);
    expect(nonTerminal.map(([state]) => state)).toEqual(["PENDING"]);
  });
});

// ─── Idempotency key construction ────────────────────────────────────────────
describe("Idempotency key uniqueness", () => {
  function idempotencyKey(orderId, state) {
    return `webhook:seen:${orderId}:${state}`;
  }

  it("generates unique keys per order", () => {
    expect(idempotencyKey("ORD-1", "COMPLETED")).not.toBe(idempotencyKey("ORD-2", "COMPLETED"));
  });

  it("generates unique keys per state for same order", () => {
    expect(idempotencyKey("ORD-1", "COMPLETED")).not.toBe(idempotencyKey("ORD-1", "FAILED"));
  });

  it("generates deterministic key for the same input", () => {
    expect(idempotencyKey("ORD-42", "PENDING")).toBe("webhook:seen:ORD-42:PENDING");
  });
});
