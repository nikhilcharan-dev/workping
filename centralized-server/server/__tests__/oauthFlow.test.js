import "../globals.js";
import request from "supertest";
import axios from "axios";
import app from "../app/app.js";
import Account from "#models/Account.js";
import Admin from "#models/Admin.js";
import User from "#models/User.js";

jest.mock("axios");

describe("Google OAuth Flow", () => {
  let googleRouter;

  beforeEach(async () => {
    await Account.deleteMany({});
    await Admin.deleteMany({});
    await User.deleteMany({});
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/oauth/google/callback";
    process.env.CLIENT_URL = "http://localhost:5173";
  });

  afterEach(async () => {
    await Account.deleteMany({});
    await Admin.deleteMany({});
    await User.deleteMany({});
  });

  describe("GET /oauth/google/start", () => {
    it("redirects to Google auth endpoint for web platform", async () => {
      const res = await request(app).get("/oauth/google/start").query({ platform: "web" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(res.headers.location).toContain("client_id=test-client-id");
    });

    it("includes correct scope in redirect URL", async () => {
      const res = await request(app).get("/oauth/google/start").query({ platform: "web" });

      expect(res.headers.location).toContain("userinfo.profile");
      expect(res.headers.location).toContain("userinfo.email");
    });

    it("includes offline access in auth request", async () => {
      const res = await request(app).get("/oauth/google/start").query({ platform: "web" });

      expect(res.headers.location).toContain("access_type=offline");
    });

    it("sets state parameter for mobile platform", async () => {
      const res = await request(app).get("/oauth/google/start").query({ platform: "mobile" });

      expect(res.headers.location).toContain("state=mobile");
    });

    it("sets state parameter for web platform", async () => {
      const res = await request(app).get("/oauth/google/start").query({ platform: "web" });

      expect(res.headers.location).toContain("state=web");
    });
  });

  describe("GET /oauth/google/callback", () => {
    it("returns error when authorization code is missing", async () => {
      const res = await request(app).get("/oauth/google/callback").query({ state: "web" });

      expect(res.status).toBe(400);
      expect(res.text).toContain("Authorization code missing");
    });

    it("returns JSON error for mobile when code is missing", async () => {
      const res = await request(app).get("/oauth/google/callback").query({ state: "mobile" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Authorization code missing");
    });

    it("creates new admin account on first OAuth sign-up", async () => {
      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-123",
          email: "newuser@gmail.com",
          verified_email: true,
          name: "New User",
          picture: "https://example.com/pic.jpg",
        },
      });

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      expect(res.status).toBe(200);

      const account = await Account.findOne({ email: "newuser@gmail.com" });
      expect(account).toBeDefined();
      expect(account.role).toBe("admin");
      expect(account.emailVerified).toBe(true);
      expect(account.providers.google.linked).toBe(true);

      const admin = await Admin.findOne({ email: "newuser@gmail.com" });
      expect(admin).toBeDefined();
      expect(admin.name).toBe("New User");
    });

    it("links Google provider to existing account on sign-in", async () => {
      const existingAccount = await Account.create({
        email: "existing@gmail.com",
        password: "hashed-password",
        role: "admin",
        emailVerified: true,
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-456",
          email: "existing@gmail.com",
          verified_email: true,
          name: "Existing User",
          picture: "https://example.com/pic.jpg",
        },
      });

      await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      const updated = await Account.findById(existingAccount._id);
      expect(updated.providers.google.linked).toBe(true);
      expect(updated.providers.google.id).toBe("google-456");
    });

    it("returns error when Google email is not verified", async () => {
      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-789",
          email: "unverified@gmail.com",
          verified_email: false,
          name: "Unverified User",
        },
      });

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      expect(res.status).toBe(400);
      expect(res.text).toContain("Email not verified by Google");
    });

    it("returns error when profile lookup fails", async () => {
      const existingAccount = await Account.create({
        email: "existing@example.com",
        role: "admin",
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-999",
          email: "existing@example.com",
          verified_email: true,
          name: "Existing",
        },
      });

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      expect(res.status).toBe(404);
      expect(res.text).toContain("Profile not found");
    });

    it("sets httpOnly cookie for successful auth", async () => {
      const existingAdmin = await Admin.create({
        name: "Test Admin",
        email: "test@gmail.com",
      });

      await Account.create({
        email: "test@gmail.com",
        password: "hashed",
        role: "admin",
        emailVerified: true,
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-test",
          email: "test@gmail.com",
          verified_email: true,
          name: "Test Admin",
        },
      });

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("returns postMessage response for web platform with token", async () => {
      const existingAdmin = await Admin.create({
        name: "Web User",
        email: "web@gmail.com",
      });

      await Account.create({
        email: "web@gmail.com",
        role: "admin",
        emailVerified: true,
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-web",
          email: "web@gmail.com",
          verified_email: true,
          name: "Web User",
        },
      });

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      expect(res.status).toBe(200);
      expect(res.text).toContain("window.opener.postMessage");
      expect(res.text).toContain("oauth_success");
      expect(res.text).toContain("window.close()");
    });

    it("redirects to mobile deep link for mobile platform", async () => {
      const existingAdmin = await Admin.create({
        name: "Mobile User",
        email: "mobile@gmail.com",
      });

      await Account.create({
        email: "mobile@gmail.com",
        role: "admin",
        emailVerified: true,
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "google-mobile",
          email: "mobile@gmail.com",
          verified_email: true,
          name: "Mobile User",
        },
      });

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "mobile" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reback://auth");
      expect(res.headers.location).toContain("token=");
    });

    it("handles axios errors gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network error"));

      const res = await request(app)
        .get("/oauth/google/callback")
        .query({ code: "mock-code", state: "web" });

      expect(res.status).toBe(500);
    });
  });
});

describe("Microsoft OAuth Flow", () => {
  beforeEach(async () => {
    await Account.deleteMany({});
    await Admin.deleteMany({});
    await User.deleteMany({});
    jest.clearAllMocks();
    process.env.MS_CLIENT_ID = "test-ms-client";
    process.env.MS_CLIENT_SECRET = "test-ms-secret";
    process.env.MS_REDIRECT_URI = "http://localhost:3000/oauth/microsoft/callback";
    process.env.CLIENT_URL = "http://localhost:5173";
  });

  afterEach(async () => {
    await Account.deleteMany({});
    await Admin.deleteMany({});
    await User.deleteMany({});
  });

  describe("GET /oauth/microsoft/start", () => {
    it("redirects to Microsoft auth endpoint", async () => {
      const res = await request(app).get("/oauth/microsoft/start").query({ platform: "web" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      expect(res.headers.location).toContain("client_id=test-ms-client");
    });

    it("includes correct Microsoft scopes", async () => {
      const res = await request(app).get("/oauth/microsoft/start").query({ platform: "web" });

      expect(res.headers.location).toContain("openid");
      expect(res.headers.location).toContain("profile");
      expect(res.headers.location).toContain("email");
    });
  });

  describe("GET /oauth/microsoft/callback", () => {
    it("creates new admin account for Microsoft OAuth sign-up", async () => {
      axios.post.mockResolvedValueOnce({
        data: { access_token: "ms-mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "microsoft-123",
          mail: "msuser@outlook.com",
          displayName: "MS User",
          userPrincipalName: "msuser@outlook.com",
        },
      });

      const res = await request(app)
        .get("/oauth/microsoft/callback")
        .query({ code: "mock-ms-code", state: "web" });

      expect(res.status).toBe(200);

      const account = await Account.findOne({ email: "msuser@outlook.com" });
      expect(account).toBeDefined();
      expect(account.providers.microsoft.linked).toBe(true);

      const admin = await Admin.findOne({ email: "msuser@outlook.com" });
      expect(admin).toBeDefined();
      expect(admin.name).toBe("MS User");
    });

    it("links Microsoft provider to existing account", async () => {
      const existingAccount = await Account.create({
        email: "existing@outlook.com",
        role: "admin",
        emailVerified: true,
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "ms-mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "microsoft-456",
          mail: "existing@outlook.com",
          displayName: "Existing MS User",
          userPrincipalName: "existing@outlook.com",
        },
      });

      await request(app)
        .get("/oauth/microsoft/callback")
        .query({ code: "mock-ms-code", state: "web" });

      const updated = await Account.findById(existingAccount._id);
      expect(updated.providers.microsoft.linked).toBe(true);
    });

    it("returns error when access token is missing", async () => {
      axios.post.mockResolvedValueOnce({
        data: {},
      });

      const res = await request(app)
        .get("/oauth/microsoft/callback")
        .query({ code: "mock-ms-code", state: "web" });

      expect(res.status).toBe(400);
      expect(res.text).toContain("access token missing");
    });

    it("returns error when profile data is incomplete", async () => {
      axios.post.mockResolvedValueOnce({
        data: { access_token: "ms-mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "microsoft-789",
        },
      });

      const res = await request(app)
        .get("/oauth/microsoft/callback")
        .query({ code: "mock-ms-code", state: "web" });

      expect(res.status).toBe(400);
      expect(res.text).toContain("Invalid Microsoft profile data");
    });

    it("handles mobile state parameter correctly", async () => {
      const existingAdmin = await Admin.create({
        name: "Mobile MS User",
        email: "mobile@outlook.com",
      });

      await Account.create({
        email: "mobile@outlook.com",
        role: "admin",
        emailVerified: true,
      });

      axios.post.mockResolvedValueOnce({
        data: { access_token: "ms-mock-token" },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: "microsoft-mobile",
          mail: "mobile@outlook.com",
          displayName: "Mobile User",
          userPrincipalName: "mobile@outlook.com",
        },
      });

      const res = await request(app)
        .get("/oauth/microsoft/callback")
        .query({ code: "mock-ms-code", state: "mobile" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reback://auth");
    });
  });
});
