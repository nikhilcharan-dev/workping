/*
 * Analytics counters are stored in a Redis hash (mail:analytics) — see
 * utils/analytics.js. The previous implementation wrote to data/analytics.json
 * with an unsynchronized read-modify-write; under any concurrency that lost
 * counters. These tests pin the Redis-hash contract behind the same public
 * API (logEmailEvent, getStats).
 */
import { jest } from "@jest/globals";

// In-memory hash store mirroring the subset of node-redis used by analytics.js.
const hash = new Map();
const mockRedis = {
  hIncrBy: jest.fn(async (_key, field, increment) => {
    const current = parseInt(hash.get(field) || "0", 10);
    const next = current + increment;
    hash.set(field, String(next));
    return next;
  }),
  hSet: jest.fn(async (_key, field, value) => {
    const isNew = !hash.has(field);
    hash.set(field, String(value));
    return isNew ? 1 : 0;
  }),
  hGetAll: jest.fn(async () => Object.fromEntries(hash.entries())),
};

jest.unstable_mockModule("../config/redisConfig.js", () => ({ default: mockRedis, __esModule: true }));

const { logEmailEvent, getStats } = await import("../utils/analytics.js");

beforeEach(() => {
  hash.clear();
  mockRedis.hIncrBy.mockClear();
  mockRedis.hSet.mockClear();
  mockRedis.hGetAll.mockClear();
});

describe("analytics.logEmailEvent", () => {
  it("increments totalSent, success, and the per-type bucket on a success event", async () => {
    await logEmailEvent("otp", "success");
    const stats = await getStats();
    expect(stats.totalSent).toBe(1);
    expect(stats.success).toBe(1);
    expect(stats.failure).toBe(0);
    expect(stats.byType.otp).toBe(1);
  });

  it("splits success vs failure counters", async () => {
    await logEmailEvent("otp", "success");
    await logEmailEvent("otp", "failure");
    await logEmailEvent("otp", "failure");
    const stats = await getStats();
    expect(stats.success).toBe(1);
    expect(stats.failure).toBe(2);
    expect(stats.totalSent).toBe(3);
  });

  it("increments per-type counters independently", async () => {
    await logEmailEvent("otp", "success");
    await logEmailEvent("greeting", "success");
    await logEmailEvent("alert", "success");
    await logEmailEvent("alert", "failure");
    await logEmailEvent("notification", "success");
    const stats = await getStats();
    expect(stats.byType.otp).toBe(1);
    expect(stats.byType.greeting).toBe(1);
    expect(stats.byType.alert).toBe(2);
    expect(stats.byType.notification).toBe(1);
  });

  it("routes unknown types into the 'raw' bucket (no silent loss)", async () => {
    await logEmailEvent("nonexistent-type-xyz", "success");
    const stats = await getStats();
    expect(stats.byType.raw).toBe(1);
    expect(stats.totalSent).toBe(1);
  });

  it("updates lastUpdated to a valid ISO timestamp", async () => {
    const before = new Date().toISOString();
    await logEmailEvent("otp", "success");
    const stats = await getStats();
    expect(typeof stats.lastUpdated).toBe("string");
    expect(new Date(stats.lastUpdated).toISOString()).toBe(stats.lastUpdated);
    expect(stats.lastUpdated >= before).toBe(true);
  });

  it("uses HINCRBY so concurrent increments do not clobber each other", async () => {
    // 50 parallel writes — with the old read-modify-write JSON impl this
    // race-condition test would non-deterministically lose counters. With
    // HINCRBY the final value must equal the number of writes.
    await Promise.all(Array.from({ length: 50 }, () => logEmailEvent("otp", "success")));
    const stats = await getStats();
    expect(stats.totalSent).toBe(50);
    expect(stats.success).toBe(50);
    expect(stats.byType.otp).toBe(50);
  });
});

describe("analytics.getStats", () => {
  it("returns the initial zero shape when no events have been logged", async () => {
    const stats = await getStats();
    expect(stats).toMatchObject({
      totalSent: 0,
      success: 0,
      failure: 0,
      byType: {
        otp: 0,
        forgotPassword: 0,
        greeting: 0,
        alert: 0,
        notification: 0,
        raw: 0,
      },
    });
  });

  it("returns the initial shape on a Redis failure (fail-open read)", async () => {
    mockRedis.hGetAll.mockRejectedValueOnce(new Error("redis-down"));
    const stats = await getStats();
    expect(stats.totalSent).toBe(0);
    expect(stats.byType.otp).toBe(0);
  });
});
