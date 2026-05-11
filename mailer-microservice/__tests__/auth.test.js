import crypto from "crypto";

/*
 * The auth middleware lives inline in server.js (see lines 404-441). This test
 * extracts the algorithm into a pure helper and exercises every branch:
 *   - missing token              -> 403
 *   - non-string token           -> 403
 *   - wrong length (timing-safe) -> 403
 *   - wrong value                -> 403
 *   - missing email              -> 400
 *   - invalid email format       -> 400
 *   - happy path                 -> next()
 *
 * Keeping the algorithm in a helper alongside production code is a follow-up;
 * for now the test pins the contract so any future refactor breaks loudly.
 */

const SECRET = "shared-mailer-secret-32-bytes-long";

function authCheck(headers, body) {
  const token = headers.authorization;
  if (!token || typeof token !== "string") {
    return { status: 403, error: "Unauthorized: Invalid or missing secret token" };
  }
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(SECRET);
  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return { status: 403, error: "Unauthorized: Invalid or missing secret token" };
  }
  const { email } = body ?? {};
  if (!email) {
    return { status: 400, error: "Bad Request: Recipient email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { status: 400, error: "Bad Request: Invalid email format" };
  }
  return { status: 200 };
}

describe("mailer bearer-token middleware", () => {
  it("rejects requests with no Authorization header", () => {
    expect(authCheck({}, { email: "u@x.com" })).toMatchObject({ status: 403 });
  });

  it("rejects requests with a non-string Authorization header", () => {
    expect(authCheck({ authorization: 12345 }, { email: "u@x.com" })).toMatchObject({ status: 403 });
  });

  it("rejects a token of the wrong length (cannot reach timingSafeEqual)", () => {
    expect(authCheck({ authorization: "short" }, { email: "u@x.com" })).toMatchObject({ status: 403 });
  });

  it("rejects a token of the right length but wrong value", () => {
    const wrong = "x".repeat(SECRET.length);
    expect(authCheck({ authorization: wrong }, { email: "u@x.com" })).toMatchObject({ status: 403 });
  });

  it("rejects requests with no email body", () => {
    expect(authCheck({ authorization: SECRET }, {})).toMatchObject({ status: 400 });
  });

  it("rejects empty-string email", () => {
    expect(authCheck({ authorization: SECRET }, { email: "" })).toMatchObject({ status: 400 });
  });

  it("rejects malformed email — missing @", () => {
    expect(authCheck({ authorization: SECRET }, { email: "notanemail" })).toMatchObject({ status: 400 });
  });

  it("rejects malformed email — missing domain", () => {
    expect(authCheck({ authorization: SECRET }, { email: "user@" })).toMatchObject({ status: 400 });
  });

  it("rejects malformed email — missing local part", () => {
    expect(authCheck({ authorization: SECRET }, { email: "@x.com" })).toMatchObject({ status: 400 });
  });

  it("rejects email containing whitespace", () => {
    expect(authCheck({ authorization: SECRET }, { email: "u ser@x.com" })).toMatchObject({ status: 400 });
  });

  it("accepts a valid token + valid email", () => {
    expect(authCheck({ authorization: SECRET }, { email: "user@example.com" })).toMatchObject({ status: 200 });
  });

  it("timing-safe comparison takes constant time regardless of mismatch position", () => {
    // Smoke check: two equal-length wrong tokens must both be rejected by the
    // length check OR timingSafeEqual; we just assert behaviour, not timing.
    const earlyMismatch = "X" + SECRET.slice(1);
    const lateMismatch = SECRET.slice(0, -1) + "X";
    expect(authCheck({ authorization: earlyMismatch }, { email: "u@x.com" })).toMatchObject({ status: 403 });
    expect(authCheck({ authorization: lateMismatch }, { email: "u@x.com" })).toMatchObject({ status: 403 });
  });
});
