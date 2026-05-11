import { jest } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "..", "data", "analytics.json");

let snapshot = null;

beforeAll(async () => {
  try {
    snapshot = await fs.readFile(DATA_FILE, "utf-8");
  } catch {
    snapshot = null;
  }
});

afterAll(async () => {
  if (snapshot !== null) {
    await fs.writeFile(DATA_FILE, snapshot);
  } else {
    try {
      await fs.unlink(DATA_FILE);
    } catch {
      /* ignore */
    }
  }
});

beforeEach(async () => {
  try {
    await fs.unlink(DATA_FILE);
  } catch {
    /* ignore — fresh state */
  }
});

describe("analytics.logEmailEvent", () => {
  it("creates the analytics file on first event and increments totalSent", async () => {
    const { logEmailEvent, getStats } = await import(`../utils/analytics.js?t=${Date.now()}-1`);
    await logEmailEvent("otp", "success");
    const stats = await getStats();
    expect(stats.totalSent).toBe(1);
    expect(stats.success).toBe(1);
    expect(stats.failure).toBe(0);
    expect(stats.byType.otp).toBe(1);
  });

  it("splits success vs failure counters", async () => {
    const { logEmailEvent, getStats } = await import(`../utils/analytics.js?t=${Date.now()}-2`);
    await logEmailEvent("otp", "success");
    await logEmailEvent("otp", "failure");
    await logEmailEvent("otp", "failure");
    const stats = await getStats();
    expect(stats.success).toBe(1);
    expect(stats.failure).toBe(2);
    expect(stats.totalSent).toBe(3);
  });

  it("increments per-type counters independently", async () => {
    const { logEmailEvent, getStats } = await import(`../utils/analytics.js?t=${Date.now()}-3`);
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
    const { logEmailEvent, getStats } = await import(`../utils/analytics.js?t=${Date.now()}-4`);
    await logEmailEvent("nonexistent-type-xyz", "success");
    const stats = await getStats();
    expect(stats.byType.raw).toBe(1);
    expect(stats.totalSent).toBe(1);
  });

  it("updates lastUpdated to a valid ISO timestamp", async () => {
    const { logEmailEvent, getStats } = await import(`../utils/analytics.js?t=${Date.now()}-5`);
    const before = new Date().toISOString();
    await logEmailEvent("otp", "success");
    const stats = await getStats();
    expect(typeof stats.lastUpdated).toBe("string");
    expect(new Date(stats.lastUpdated).toISOString()).toBe(stats.lastUpdated);
    expect(stats.lastUpdated >= before).toBe(true);
  });

  it("persists state across module reloads (file is the source of truth)", async () => {
    const m1 = await import(`../utils/analytics.js?t=${Date.now()}-6a`);
    await m1.logEmailEvent("otp", "success");
    await m1.logEmailEvent("otp", "success");

    const m2 = await import(`../utils/analytics.js?t=${Date.now()}-6b`);
    const stats = await m2.getStats();
    expect(stats.totalSent).toBe(2);
    expect(stats.byType.otp).toBe(2);
  });
});

describe("analytics.getStats", () => {
  it("returns the initial shape when the file does not exist", async () => {
    const { getStats } = await import(`../utils/analytics.js?t=${Date.now()}-7`);
    const stats = await getStats();
    expect(stats).toMatchObject({
      totalSent: 0,
      success: 0,
      failure: 0,
      byType: expect.objectContaining({
        otp: expect.any(Number),
        forgotPassword: expect.any(Number),
        greeting: expect.any(Number),
        alert: expect.any(Number),
        notification: expect.any(Number),
        raw: expect.any(Number),
      }),
    });
  });
});
