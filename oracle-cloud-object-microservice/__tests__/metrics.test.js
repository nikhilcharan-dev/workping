import { jest } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const METRICS_FILE = path.join(__dirname, "..", "data", "metrics.json");

async function freshMetrics() {
  try {
    await fs.unlink(METRICS_FILE);
  } catch {
    /* not yet created */
  }
  return import(`../middleware/metrics.js?t=${Date.now()}-${Math.random()}`);
}

function fakeReqRes({ method = "GET", baseUrl = "/api/files", routePath = "/upload", status = 200, durationMs = 5 } = {}) {
  const listeners = {};
  const res = {
    statusCode: status,
    on(event, cb) {
      listeners[event] = cb;
    },
    _finish() {
      // Simulate elapsed time by waiting durationMs
      return new Promise((resolve) => setTimeout(() => {
        listeners.finish?.();
        resolve();
      }, durationMs));
    },
  };
  const req = { method, baseUrl, route: { path: routePath } };
  return { req, res };
}

describe("metricsMiddleware — counters", () => {
  it("increments totalRequests once per request", async () => {
    const { metricsMiddleware, getMetrics } = await freshMetrics();
    const initial = getMetrics().totalRequests;

    const { req, res } = fakeReqRes({ status: 200 });
    metricsMiddleware(req, res, () => {});
    await res._finish();

    expect(getMetrics().totalRequests).toBe(initial + 1);
  });

  it("buckets status codes into 2xx / 3xx / 4xx / 5xx", async () => {
    const { metricsMiddleware, getMetrics } = await freshMetrics();

    for (const status of [200, 201, 302, 404, 401, 500, 503]) {
      const { req, res } = fakeReqRes({ status });
      metricsMiddleware(req, res, () => {});
      await res._finish();
    }

    const m = getMetrics().statusCodes;
    expect(m["2xx"]).toBe(2);
    expect(m["3xx"]).toBe(1);
    expect(m["4xx"]).toBe(2);
    expect(m["5xx"]).toBe(2);
  });

  it("computes a non-zero error rate when 4xx/5xx are present", async () => {
    const { metricsMiddleware, getMetrics } = await freshMetrics();

    for (const status of [200, 200, 500, 404]) {
      const { req, res } = fakeReqRes({ status });
      metricsMiddleware(req, res, () => {});
      await res._finish();
    }

    const m = getMetrics();
    // 2 errors of 4 = 50%
    expect(m.errorRate).toBeCloseTo(50, 0);
  });

  it("aggregates per-route stats keyed by 'METHOD baseUrl routePath'", async () => {
    const { metricsMiddleware, getMetrics } = await freshMetrics();

    for (let i = 0; i < 3; i++) {
      const { req, res } = fakeReqRes({ method: "POST", baseUrl: "/api/files", routePath: "/upload", status: 201 });
      metricsMiddleware(req, res, () => {});
      await res._finish();
    }
    const { req, res } = fakeReqRes({ method: "GET", baseUrl: "/api/files", routePath: "/list", status: 200 });
    metricsMiddleware(req, res, () => {});
    await res._finish();

    const routes = getMetrics().routes;
    const upload = routes.find((r) => r.method === "POST" && r.route.endsWith("/upload"));
    const list = routes.find((r) => r.method === "GET" && r.route.endsWith("/list"));
    expect(upload.requests).toBe(3);
    expect(list.requests).toBe(1);
  });

  it("skips /api/metrics, /api/metrics/export, and / from being counted", async () => {
    const { metricsMiddleware, getMetrics } = await freshMetrics();
    const before = getMetrics().totalRequests;

    for (const baseUrl of ["/api/metrics", "/api/metrics/export", ""]) {
      const routePath = baseUrl === "" ? "/" : "";
      const { req, res } = fakeReqRes({ baseUrl, routePath, status: 200 });
      metricsMiddleware(req, res, () => {});
      await res._finish();
    }

    expect(getMetrics().totalRequests).toBe(before);
  });
});

describe("metrics — p95 calculation", () => {
  it("returns 0 when no samples have been recorded", async () => {
    const { getMetrics } = await freshMetrics();
    expect(getMetrics().p95ResponseTime).toBe(0);
  });

  it("produces a non-negative p95 after a batch of requests", async () => {
    const { metricsMiddleware, getMetrics } = await freshMetrics();
    for (let i = 0; i < 20; i++) {
      const { req, res } = fakeReqRes({ status: 200 });
      metricsMiddleware(req, res, () => {});
      await res._finish();
    }
    expect(getMetrics().p95ResponseTime).toBeGreaterThanOrEqual(0);
  });
});

describe("metrics — CSV export shape", () => {
  it("produces summary, routes, and daily-history sections", async () => {
    const { metricsMiddleware, getMetricsCSV } = await freshMetrics();
    const { req, res } = fakeReqRes({ status: 200 });
    metricsMiddleware(req, res, () => {});
    await res._finish();

    const csv = getMetricsCSV();
    expect(csv).toContain("# Summary");
    expect(csv).toContain("# Routes");
    expect(csv).toContain("# Daily History");
    expect(csv).toContain("Total Requests");
    expect(csv).toContain("p95 Response Time");
  });
});

describe("metrics — getMetrics shape", () => {
  it("returns the documented top-level keys", async () => {
    const { getMetrics } = await freshMetrics();
    const m = getMetrics();
    expect(m).toHaveProperty("uptimeMs");
    expect(m).toHaveProperty("uptimeFormatted");
    expect(m).toHaveProperty("totalRequests");
    expect(m).toHaveProperty("avgResponseTime");
    expect(m).toHaveProperty("p95ResponseTime");
    expect(m).toHaveProperty("statusCodes");
    expect(m).toHaveProperty("errorRate");
    expect(m).toHaveProperty("routes");
    expect(m).toHaveProperty("dailyHistory");
  });
});

describe("metrics — persistence", () => {
  it("saveToDisk writes a JSON snapshot", async () => {
    const { metricsMiddleware, saveToDisk } = await freshMetrics();
    const { req, res } = fakeReqRes({ status: 201 });
    metricsMiddleware(req, res, () => {});
    await res._finish();
    await saveToDisk();

    const raw = await fs.readFile(METRICS_FILE, "utf-8");
    const snapshot = JSON.parse(raw);
    expect(snapshot.totalRequests).toBeGreaterThan(0);
    expect(snapshot).toHaveProperty("statusCodeCounts");
    expect(snapshot).toHaveProperty("savedAt");
  });
});

afterAll(async () => {
  try {
    await fs.unlink(METRICS_FILE);
  } catch {
    /* ignore */
  }
});
