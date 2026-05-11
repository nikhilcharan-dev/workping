// globals.js must be first — sets globalThis.asyncHandler / AppError / redis
// before the app module graph is evaluated.
import "../globals.js";
import request from "supertest";
import app from "../app/app.js";
import { connectTestDB, disconnectTestDB, clearCollections } from "./setup/db.js";

// connectTestDB() replaces globalThis.redis with an in-memory mock AND connects
// Mongoose to the containerised MongoDB started in globalSetup.js.
beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnectTestDB(); });

const ADMIN = {
  name: "Test Admin",
  email: "test.admin@example.com",
  password: "Secure@Pass1",
  number: "9876543210",
};

// ── Register ──────────────────────────────────────────────────────────────────
describe("POST /api/admin/auth/register", () => {
  it("creates a new admin and returns 201 with tokens and profile", async () => {
    const res = await request(app).post("/api/admin/auth/register").send(ADMIN);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("success");
    expect(res.body.data).toMatchObject({
      email: ADMIN.email,
      name: ADMIN.name,
    });
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    // Password must never appear in the response
    expect(res.body.data.password).toBeUndefined();
  });

  it("returns 409 when the same email is registered twice", async () => {
    await request(app).post("/api/admin/auth/register").send(ADMIN);
    const res = await request(app).post("/api/admin/auth/register").send(ADMIN);

    expect(res.status).toBe(409);
    expect(res.body.type).toBe("error");
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
describe("POST /api/admin/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/admin/auth/register").send(ADMIN);
  });

  it("returns 200 with access and refresh tokens for valid credentials", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("success");
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: ADMIN.email, password: "WrongPass@99" });

    expect(res.status).toBe(401);
    expect(res.body.type).toBe("error");
  });

  it("returns 401 for a non-existent email", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: "nobody@example.com", password: ADMIN.password });

    expect(res.status).toBe(401);
  });
});

// ── Token → protected route ───────────────────────────────────────────────────
describe("Access token from register", () => {
  it("is accepted on GET /verify-cookie and returns the correct profile", async () => {
    const regRes = await request(app).post("/api/admin/auth/register").send(ADMIN);
    const { token } = regRes.body.data;

    const res = await request(app)
      .get("/verify-cookie")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(ADMIN.email);
    expect(res.body.data.role).toBe("admin");
  });
});

// ── Refresh token rotation ────────────────────────────────────────────────────
describe("POST /api/auth/refresh", () => {
  it("issues a new token pair for a valid refresh token", async () => {
    const regRes = await request(app).post("/api/admin/auth/register").send(ADMIN);
    const { refreshToken } = regRes.body.data;

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Token is rotated — the new refresh token must differ from the consumed one
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("rejects the same refresh token on second use (single-use rotation)", async () => {
    const regRes = await request(app).post("/api/admin/auth/register").send(ADMIN);
    const { refreshToken } = regRes.body.data;

    await request(app).post("/api/auth/refresh").send({ refreshToken });
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it("returns 401 for a completely invalid refresh token string", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "not-a-real-token" });

    expect(res.status).toBe(401);
  });
});

// ── Logout + token revocation ─────────────────────────────────────────────────
describe("POST /api/admin/auth/logout", () => {
  it("blacklists the access token — subsequent use returns 401 TOKEN_REVOKED", async () => {
    const regRes = await request(app).post("/api/admin/auth/register").send(ADMIN);
    const { token } = regRes.body.data;

    // Token works before logout
    const before = await request(app)
      .get("/verify-cookie")
      .set("Authorization", `Bearer ${token}`);
    expect(before.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post("/api/admin/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Same token is now blacklisted
    const after = await request(app)
      .get("/verify-cookie")
      .set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(401);
    expect(after.body.code).toBe("TOKEN_REVOKED");
  });
});
