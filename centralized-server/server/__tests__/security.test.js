// globals.js must be first so globalThis.asyncHandler / AppError / redis
// are set before the app module graph is evaluated.
import "../globals.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import { isTokenBlacklisted, blacklistToken } from "../utils/token.helper.js";
import app from "../app/app.js";

// A protected endpoint that runs validateCookie + requireRole("admin") before
// any database access — perfect for testing the JWT layer in isolation.
const PROTECTED = "/api/admin/organization";
const SECRET = process.env.SECRET_KEY || "test-fallback-secret";

// ── Prometheus metrics endpoint ───────────────────────────────────────────────
describe("GET /metrics", () => {
  it("returns 200 with Prometheus text format", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("nodejs_version_info");
  });

  it("includes the custom HTTP duration histogram", async () => {
    const res = await request(app).get("/metrics");
    expect(res.text).toContain("http_request_duration_seconds");
  });
});

// ── JWT auth middleware — rejection paths ─────────────────────────────────────
// All cases short-circuit before MongoDB is touched.
describe("JWT auth middleware — rejection paths", () => {
  it("returns 401 NO_TOKEN when Authorization header is absent", async () => {
    const res = await request(app).get(PROTECTED);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("NO_TOKEN");
  });

  it("returns 401 NO_TOKEN when Authorization scheme is not Bearer", async () => {
    const res = await request(app)
      .get(PROTECTED)
      .set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("NO_TOKEN");
  });

  it("returns 401 INVALID_TOKEN for a malformed token string", async () => {
    const res = await request(app)
      .get(PROTECTED)
      .set("Authorization", "Bearer not.a.valid.jwt");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 INVALID_TOKEN for a JWT signed with the wrong secret", async () => {
    const token = jwt.sign({ userId: "user123", role: "admin" }, "wrong-secret", { expiresIn: "1h" });
    const res = await request(app)
      .get(PROTECTED)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 TOKEN_EXPIRED for an already-expired JWT", async () => {
    // Manually set exp to 60 seconds in the past to guarantee expiry
    const token = jwt.sign(
      { userId: "user123", role: "admin", exp: Math.floor(Date.now() / 1000) - 60 },
      SECRET
    );
    const res = await request(app)
      .get(PROTECTED)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });
});

// ── isTokenBlacklisted — unit ─────────────────────────────────────────────────
// Uses a mock Redis to test all three branches without a live Redis instance.
describe("isTokenBlacklisted — unit", () => {
  it("returns false when Redis is unavailable (fail-open safety)", async () => {
    const orig = globalThis.redis;
    globalThis.redis = { get: async () => { throw new Error("Connection refused"); } };
    const result = await isTokenBlacklisted("any-token");
    expect(result).toBe(false);
    globalThis.redis = orig;
  });

  it("returns false when the token hash is not present in Redis", async () => {
    const orig = globalThis.redis;
    globalThis.redis = { get: async () => null };
    const result = await isTokenBlacklisted("any-token");
    expect(result).toBe(false);
    globalThis.redis = orig;
  });

  it("returns true when Redis marks the token hash as revoked", async () => {
    const orig = globalThis.redis;
    globalThis.redis = { get: async () => "1" };
    const result = await isTokenBlacklisted("any-token");
    expect(result).toBe(true);
    globalThis.redis = orig;
  });
});

// ── blacklistToken — unit ─────────────────────────────────────────────────────
describe("blacklistToken — unit", () => {
  it("does not call Redis.set for a string that is not a JWT", async () => {
    const orig = globalThis.redis;
    const setCalls = [];
    globalThis.redis = { set: async (...args) => setCalls.push(args) };
    await blacklistToken("not-a-jwt");
    expect(setCalls).toHaveLength(0);
    globalThis.redis = orig;
  });

  it("does not call Redis.set for an already-expired token (TTL ≤ 0)", async () => {
    const orig = globalThis.redis;
    const setCalls = [];
    globalThis.redis = { set: async (...args) => setCalls.push(args) };
    const expiredToken = jwt.sign(
      { userId: "u1", role: "admin", exp: Math.floor(Date.now() / 1000) - 60 },
      SECRET
    );
    await blacklistToken(expiredToken);
    expect(setCalls).toHaveLength(0);
    globalThis.redis = orig;
  });

  it("calls Redis.set with bl: prefix, value '1', and positive EX for a live token", async () => {
    const orig = globalThis.redis;
    const setCalls = [];
    globalThis.redis = { set: async (...args) => setCalls.push(args) };
    const liveToken = jwt.sign({ userId: "u1", role: "admin" }, SECRET, { expiresIn: "1h" });
    await blacklistToken(liveToken);
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0][0]).toMatch(/^bl:/);       // Redis key has blacklist prefix
    expect(setCalls[0][1]).toBe("1");             // value is the sentinel
    expect(setCalls[0][2]).toHaveProperty("EX");  // TTL is set
    expect(setCalls[0][2].EX).toBeGreaterThan(0); // TTL is positive (not yet expired)
    globalThis.redis = orig;
  });
});
