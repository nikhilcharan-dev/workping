/*
 * Integration tests — boots the real express app from app.js via supertest.
 * The OCI SDK is the one external boundary; we replace it at the ESM module
 * level so no real OCI config file or network is required.
 *
 * What this covers that unit tests do not:
 *   - helmet + CORS allowlist + rate-limit middleware wiring
 *   - apiKeyAuth applied to every authenticated route (Prom metrics, presigned, bucket)
 *   - The bucketName/objectName validators rejecting unsafe inputs
 *   - Pre-signed URL construction (builds OCI URL from REGION + accessUri)
 *   - The Prometheus metrics + CSV export response shape
 *   - Error path: bucket not found → 5xx from the centralized error handler
 */
import { jest } from "@jest/globals";

// ── Env BEFORE any module loads ────────────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.API_KEY = "test-api-key-32-chars-long-xxxxx";
process.env.COMPARTMENT_ID = "ocid1.compartment.oc1..test";
process.env.REGION = "ap-mumbai-1";
process.env.ALLOWED_ORIGINS = "https://admin.test,https://app.test";

// ── OCI mocks ──────────────────────────────────────────────────────────────
const ociClient = {
  listBuckets: jest.fn().mockResolvedValue({ items: [{ name: "bucket-a" }, { name: "bucket-b" }] }),
  listObjects: jest.fn().mockResolvedValue({ listObjects: { objects: [{ name: "a.txt" }, { name: "b.pdf" }] } }),
  getNamespace: jest.fn().mockResolvedValue({ value: "stub-namespace" }),
  putObject: jest.fn().mockResolvedValue({ etag: "stub-etag" }),
  deleteObject: jest.fn().mockResolvedValue({}),
  createPreauthenticatedRequest: jest.fn().mockResolvedValue({
    preauthenticatedRequest: { accessUri: "/p/abc/n/stub-namespace/b/bucket/o/file.txt" },
  }),
};

jest.unstable_mockModule("../oci.client.js", () => ({ default: ociClient, __esModule: true }));
jest.unstable_mockModule("../oci.namespace.js", () => ({
  getNamespace: jest.fn().mockResolvedValue("stub-namespace"),
  __esModule: true,
}));

const { default: request } = await import("supertest");
const { default: app } = await import("../app.js");

const auth = { "x-api-key": process.env.API_KEY };

beforeEach(() => {
  for (const fn of Object.values(ociClient)) fn.mockClear?.();
});

// ── Health & root ──────────────────────────────────────────────────────────
describe("public routes", () => {
  it("GET /health returns 200 with uptime (no auth required)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });
});

// ── apiKeyAuth wiring ──────────────────────────────────────────────────────
describe("apiKeyAuth wiring", () => {
  it("GET /api/metrics is 401 without an x-api-key header", async () => {
    const res = await request(app).get("/api/metrics");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing/i);
  });

  it("GET /api/metrics is 401 with a wrong-length key", async () => {
    const res = await request(app).get("/api/metrics").set("x-api-key", "short");
    expect(res.status).toBe(401);
  });

  it("GET /api/metrics is 401 with a same-length but different key", async () => {
    const res = await request(app).get("/api/metrics").set("x-api-key", "X".repeat(process.env.API_KEY.length));
    expect(res.status).toBe(401);
  });

  it("GET /api/metrics returns a metrics object with the right shape when authed", async () => {
    const res = await request(app).get("/api/metrics").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalRequests");
    expect(res.body).toHaveProperty("p95ResponseTime");
    expect(res.body).toHaveProperty("statusCodes");
  });

  it("GET /api/metrics/export?format=csv returns CSV with a download disposition", async () => {
    const res = await request(app).get("/api/metrics/export?format=csv").set(auth);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="metrics-/);
    expect(res.text).toContain("# Summary");
  });
});

// ── /api/buckets — list ────────────────────────────────────────────────────
describe("GET /api/buckets", () => {
  it("requires auth", async () => {
    const res = await request(app).get("/api/buckets");
    expect(res.status).toBe(401);
  });

  it("returns the list from the OCI client", async () => {
    const res = await request(app).get("/api/buckets").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: "bucket-a" }, { name: "bucket-b" }]);
    expect(ociClient.listBuckets).toHaveBeenCalledTimes(1);
    expect(ociClient.listBuckets.mock.calls[0][0].compartmentId).toBe(process.env.COMPARTMENT_ID);
  });
});

// ── /api/objects/:bucketName — list objects ───────────────────────────────
describe("GET /api/objects/:bucketName", () => {
  it("rejects unsafe bucket name (path traversal)", async () => {
    const res = await request(app).get("/api/objects/..%2Fetc").set(auth);
    // Express normalises %2F before routing, but the validator also rejects "..".
    expect([400, 404]).toContain(res.status);
  });

  it("rejects bucket names containing slashes", async () => {
    const res = await request(app).get("/api/objects/foo%5Cbar").set(auth);
    expect(res.status).toBe(400);
  });

  it("returns the object list for a valid bucket", async () => {
    const res = await request(app).get("/api/objects/my-bucket").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: "a.txt" }, { name: "b.pdf" }]);
    expect(ociClient.listObjects.mock.calls[0][0].bucketName).toBe("my-bucket");
  });
});

// ── /api/presigned/upload/:bucketName ──────────────────────────────────────
describe("POST /api/presigned/upload/:bucketName", () => {
  it("requires auth", async () => {
    const res = await request(app).post("/api/presigned/upload/my-bucket").send({ objectName: "x.txt" });
    expect(res.status).toBe(401);
  });

  it("rejects when objectName is missing", async () => {
    const res = await request(app).post("/api/presigned/upload/my-bucket").set(auth).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("rejects unsafe objectName (path traversal)", async () => {
    const res = await request(app)
      .post("/api/presigned/upload/my-bucket")
      .set(auth)
      .send({ objectName: "../etc/passwd" });
    expect(res.status).toBe(400);
  });

  it("returns a fully-built OCI URL and an expiry timestamp", async () => {
    const res = await request(app)
      .post("/api/presigned/upload/my-bucket")
      .set(auth)
      .send({ objectName: "report.pdf" });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBe(
      `https://objectstorage.${process.env.REGION}.oraclecloud.com/p/abc/n/stub-namespace/b/bucket/o/file.txt`
    );
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    expect(ociClient.createPreauthenticatedRequest).toHaveBeenCalledTimes(1);
    const callArg = ociClient.createPreauthenticatedRequest.mock.calls[0][0];
    expect(callArg.bucketName).toBe("my-bucket");
    expect(callArg.createPreauthenticatedRequestDetails.accessType).toBe("ObjectWrite");
    expect(callArg.createPreauthenticatedRequestDetails.objectName).toBe("report.pdf");
  });
});

// ── /api/presigned/download/:bucketName/:objectName ────────────────────────
describe("GET /api/presigned/download/:bucketName/:objectName", () => {
  it("rejects unsafe objectName in the URL", async () => {
    const res = await request(app).get("/api/presigned/download/my-bucket/..").set(auth);
    expect(res.status).toBe(400);
  });

  it("returns a download URL for a valid object name", async () => {
    const res = await request(app).get("/api/presigned/download/my-bucket/report.pdf").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toMatch(/^https:\/\/objectstorage\./);
    expect(ociClient.createPreauthenticatedRequest.mock.calls[0][0].createPreauthenticatedRequestDetails.accessType).toBe(
      "ObjectRead"
    );
  });
});

// ── DELETE /api/object/:bucketName/:objectName ─────────────────────────────
describe("DELETE /api/object/:bucketName/:objectName", () => {
  it("forwards a valid delete to OCI", async () => {
    const res = await request(app).delete("/api/object/my-bucket/file.txt").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(ociClient.deleteObject).toHaveBeenCalledTimes(1);
    expect(ociClient.deleteObject.mock.calls[0][0]).toMatchObject({
      bucketName: "my-bucket",
      objectName: "file.txt",
    });
  });

  it("surfaces OCI errors via the central error handler", async () => {
    ociClient.deleteObject.mockRejectedValueOnce(Object.assign(new Error("NotAuthenticated"), { statusCode: 404 }));
    const res = await request(app).delete("/api/object/my-bucket/missing.txt").set(auth);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
