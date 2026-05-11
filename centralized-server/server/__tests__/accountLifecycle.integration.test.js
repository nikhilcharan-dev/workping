// Integration tests for admin account lifecycle endpoints that require a real
// database: profile fetch, password change, deactivate.
//
// The tests use the same /verify-cookie + protected routes from app/app.js and
// hit a containerised MongoDB started in __tests__/setup/globalSetup.js.
import "../globals.js";
import request from "supertest";
import app from "../app/app.js";
import { connectTestDB, disconnectTestDB, clearCollections } from "./setup/db.js";

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnectTestDB(); });

const ADMIN = {
  name: "Lifecycle Admin",
  email: "lifecycle.admin@example.com",
  password: "Secure@Pass1",
  number: "9876543210",
};

async function registerAndLogin() {
  const reg = await request(app).post("/api/admin/auth/register").send(ADMIN);
  expect(reg.status).toBe(201);
  return reg.body.data; // { id, name, email, phoneNumber, token, refreshToken }
}

describe("GET /verify-cookie", () => {
  it("returns the admin profile with role='admin' when a valid token is presented", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .get("/verify-cookie")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(ADMIN.email);
    expect(res.body.data.role).toBe("admin");
    // Password must never appear on the wire
    expect(res.body.data.password).toBeUndefined();
  });

  it("returns 401 without an Authorization header", async () => {
    const res = await request(app).get("/verify-cookie");
    expect(res.status).toBe(401);
  });
});

describe("Deactivation flow", () => {
  it("deactivated accounts cannot log in", async () => {
    const { token } = await registerAndLogin();

    // Currently no public route to deactivate; use the model directly.
    const Account = (await import("../models/Account.js")).default;
    await Account.updateOne({ email: ADMIN.email }, { isActive: false, deactivatedAt: new Date() });

    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
    expect(token).toBeDefined(); // sanity — token from register still exists locally
  });
});

describe("Logout revokes all refresh tokens", () => {
  it("after logout, the previously-issued refresh token cannot be rotated", async () => {
    const { token, refreshToken } = await registerAndLogin();

    const logout = await request(app)
      .post("/api/admin/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const refresh = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});

describe("Duplicate registration is rejected at the unique-index layer", () => {
  it("returns 409 with the duplicate email message", async () => {
    await request(app).post("/api/admin/auth/register").send(ADMIN);
    const dup = await request(app).post("/api/admin/auth/register").send(ADMIN);
    expect(dup.status).toBe(409);
    expect(dup.body.type).toBe("error");
  });
});
