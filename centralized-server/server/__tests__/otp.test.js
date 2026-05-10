// globals.js must be first so globalThis.asyncHandler is defined before the
// app module graph (controllers) is evaluated.
import "../globals.js";
import request from "supertest";
import app from "../app/app.js";

// Email validation happens inside the controller before calling the mailer
// service, so these paths return 400 without requiring a live mailer instance.
// Tests that exercise the full OTP send/verify flow belong in the integration
// suite that runs against real Redis + mailer.

describe("POST /api/otp/send-email-otp", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/otp/send-email-otp").send({});
    expect(res.status).toBe(400);
    expect(res.body.type).toBe("error");
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app).post("/api/otp/send-email-otp").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/otp/verify-email-otp", () => {
  it("returns 400 when both email and otp are missing", async () => {
    const res = await request(app).post("/api/otp/verify-email-otp").send({});
    expect(res.status).toBe(400);
    expect(res.body.type).toBe("error");
  });

  it("returns 400 when otp field is missing", async () => {
    const res = await request(app).post("/api/otp/verify-email-otp").send({ email: "user@example.com" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await request(app).post("/api/otp/verify-email-otp").send({ email: "bad-email", otp: "123456" });
    expect(res.status).toBe(400);
  });
});

// Phone OTP endpoints are stubs — they accept any input and always return 200.
// They are intentionally left unimplemented (no phone OTP provider integrated yet).
describe("POST /api/otp/send-phone-otp (stub)", () => {
  it("returns 200 regardless of input", async () => {
    const res = await request(app).post("/api/otp/send-phone-otp").send({ phone: "9876543210" });
    expect(res.status).toBe(200);
  });

  it("returns 200 even with no body (stub has no validation)", async () => {
    const res = await request(app).post("/api/otp/send-phone-otp").send({});
    expect(res.status).toBe(200);
  });
});

describe("POST /api/otp/verify-phone-otp (stub)", () => {
  it("returns 200 regardless of input", async () => {
    const res = await request(app).post("/api/otp/verify-phone-otp").send({ phone: "9876543210", otp: "123456" });
    expect(res.status).toBe(200);
  });
});
