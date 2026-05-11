// Integration tests for the brute-force lockout middleware.
// Hits the real /api/admin/auth/login endpoint with bad credentials and
// confirms the account is locked after MAX_ATTEMPTS (5) failures.
//
// The test DB setup (setup/db.js) installs an in-memory Redis mock that
// behaves like ioredis for the keys bruteForce.js writes to.
import "../globals.js";
import request from "supertest";
import app from "../app/app.js";
import { connectTestDB, disconnectTestDB, clearCollections } from "./setup/db.js";
import {
  recordFailedAttempt,
  clearFailedAttempts,
  checkBruteForce,
} from "../middleware/bruteForce.js";

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnectTestDB(); });

const ADMIN = {
  name: "Brute Target",
  email: "brute.target@example.com",
  password: "Secure@Pass1",
  number: "9876543210",
};

// ── End-to-end: lock after 5 wrong-password attempts ────────────────────────
describe("login brute-force lockout (end-to-end)", () => {
  beforeEach(async () => {
    await request(app).post("/api/admin/auth/register").send(ADMIN);
  });

  it("returns 429 ACCOUNT_LOCKED after 5 consecutive wrong-password attempts", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ email: ADMIN.email, password: "WrongPass@99" });
      expect(res.status).toBe(401); // login rejects credentials
    }

    // 6th attempt — even with the CORRECT password — must be blocked
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("ACCOUNT_LOCKED");
    expect(res.body.message).toMatch(/locked/i);
  });

  it("clears the counter on a successful login (no lock with mixed attempts)", async () => {
    // 3 wrong attempts
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/admin/auth/login")
        .send({ email: ADMIN.email, password: "Wrong@111" });
    }
    // Correct credentials clears the counter
    const ok = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(ok.status).toBe(200);

    // 4 more wrong attempts → still under 5 from baseline
    for (let i = 0; i < 4; i++) {
      const r = await request(app)
        .post("/api/admin/auth/login")
        .send({ email: ADMIN.email, password: "Wrong@222" });
      expect(r.status).toBe(401);
    }

    // A correct attempt at this point still works (not locked)
    const stillOk = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(stillOk.status).toBe(200);
  });
});

// ── Direct middleware tests against the mock Redis ──────────────────────────
describe("checkBruteForce middleware (direct)", () => {
  function mockRes() {
    const res = {};
    res.status = jest.fn((c) => {
      res._status = c;
      return res;
    });
    res.json = jest.fn((p) => {
      res._payload = p;
      return res;
    });
    return res;
  }

  it("calls next() when the email is missing from the body", async () => {
    const mw = checkBruteForce("email");
    const next = jest.fn();
    await mw({ body: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("normalizes the email (trim+lowercase) on req._loginEmail", async () => {
    const mw = checkBruteForce("email");
    const next = jest.fn();
    const req = { body: { email: "  USER@Example.COM " } };
    await mw(req, mockRes(), next);
    expect(req._loginEmail).toBe("user@example.com");
    expect(next).toHaveBeenCalled();
  });

  it("returns 429 ACCOUNT_LOCKED when the email is locked in Redis", async () => {
    const email = "locked@example.com";
    // Trigger lock by recording 5 failed attempts via the helper
    for (let i = 0; i < 5; i++) await recordFailedAttempt(email);

    const mw = checkBruteForce("email");
    const next = jest.fn();
    const res = mockRes();
    await mw({ body: { email } }, res, next);
    expect(res._status).toBe(429);
    expect(res._payload.code).toBe("ACCOUNT_LOCKED");
    expect(next).not.toHaveBeenCalled();
  });

  it("clearFailedAttempts removes the counter so subsequent attempts start fresh", async () => {
    const email = "clearme@example.com";
    await recordFailedAttempt(email);
    await recordFailedAttempt(email);
    await clearFailedAttempts(email);

    // After clearing, four more failures should NOT cross the 5-attempt threshold
    for (let i = 0; i < 4; i++) await recordFailedAttempt(email);

    const mw = checkBruteForce("email");
    const next = jest.fn();
    const res = mockRes();
    await mw({ body: { email } }, res, next);
    // 4 attempts post-clear is below MAX_ATTEMPTS, so the request passes through
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("fails open when Redis throws (does not block legitimate login)", async () => {
    const original = globalThis.redis;
    globalThis.redis = {
      get: async () => { throw new Error("redis down"); },
      incr: async () => 1,
      expire: async () => 1,
      set: async () => "OK",
      del: async () => 0,
    };
    try {
      const mw = checkBruteForce("email");
      const next = jest.fn();
      await mw({ body: { email: "x@y.com" } }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    } finally {
      globalThis.redis = original;
    }
  });
});
