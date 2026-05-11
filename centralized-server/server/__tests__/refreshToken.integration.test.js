// Integration tests for refresh-token rotation against a real MongoDB replica set.
// Covers the persistence layer that the unit-level auth tests don't exercise:
//   • rotateRefreshToken atomically consumes the old token (single-use)
//   • revokeAllTokens removes every refresh doc for a user
//   • generateTokenPair produces longer-lived tokens for mobile UA
//
// globals.js must be first so globalThis.asyncHandler / AppError / redis are set
// before app modules are evaluated.
import "../globals.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  generateTokenPair,
  rotateRefreshToken,
  revokeAllTokens,
} from "../utils/token.helper.js";
import { connectTestDB, disconnectTestDB, clearCollections } from "./setup/db.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

beforeAll(async () => { await connectTestDB(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnectTestDB(); });

const SECRET = process.env.SECRET_KEY || "test-fallback-secret";

function mkUser() {
  return { userId: new mongoose.Types.ObjectId().toString(), role: "admin" };
}

function mkReq({ mobile = false } = {}) {
  return {
    headers: { "user-agent": mobile ? "WorkPing Agent/1.0" : "Mozilla/5.0" },
  };
}

describe("generateTokenPair", () => {
  it("persists a refresh-token document and returns matching tokens", async () => {
    const user = mkUser();
    const { accessToken, refreshToken } = await generateTokenPair(user, mkReq());

    const stored = await RefreshToken.findOne({ token: refreshToken });
    expect(stored).not.toBeNull();
    expect(stored.userId.toString()).toBe(user.userId);
    expect(stored.role).toBe("admin");
    expect(stored.platform).toBe("web");
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const decoded = jwt.verify(accessToken, SECRET);
    expect(decoded.userId).toBe(user.userId);
    expect(decoded.role).toBe("admin");
  });

  it("uses the mobile platform tag when User-Agent is 'WorkPing Agent'", async () => {
    const user = mkUser();
    const { refreshToken } = await generateTokenPair(user, mkReq({ mobile: true }));
    const stored = await RefreshToken.findOne({ token: refreshToken });
    expect(stored.platform).toBe("mobile");
    // Mobile refresh tokens expire ~30 days out — must be > 14 days from now
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(fourteenDays);
  });
});

describe("rotateRefreshToken", () => {
  it("returns null for an unknown token string", async () => {
    const out = await rotateRefreshToken("does-not-exist");
    expect(out).toBeNull();
  });

  it("issues a new pair and consumes the old token (single-use)", async () => {
    const user = mkUser();
    const first = await generateTokenPair(user, mkReq());

    const rotated = await rotateRefreshToken(first.refreshToken);
    expect(rotated).not.toBeNull();
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(rotated.userId).toBe(user.userId);
    expect(rotated.role).toBe("admin");

    // The old token must no longer exist in storage
    const old = await RefreshToken.findOne({ token: first.refreshToken });
    expect(old).toBeNull();

    // The new token must exist
    const fresh = await RefreshToken.findOne({ token: rotated.refreshToken });
    expect(fresh).not.toBeNull();
  });

  it("rejects an expired refresh token (TTL index simulation via past expiresAt)", async () => {
    // Insert a doc whose expiresAt is already in the past.
    // (We don't wait for Mongo's TTL monitor — findOneAndDelete will return
    // the doc but rotateRefreshToken treats past expiresAt as invalid.)
    const expiredToken = "expired-token-" + Date.now();
    await RefreshToken.create({
      token: expiredToken,
      userId: new mongoose.Types.ObjectId(),
      role: "admin",
      platform: "web",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const out = await rotateRefreshToken(expiredToken);
    expect(out).toBeNull();
  });

  it("rejecting the second rotation when the first already consumed the token", async () => {
    const user = mkUser();
    const first = await generateTokenPair(user, mkReq());
    await rotateRefreshToken(first.refreshToken);
    const second = await rotateRefreshToken(first.refreshToken);
    expect(second).toBeNull();
  });
});

describe("revokeAllTokens", () => {
  it("deletes every refresh-token doc for the given userId", async () => {
    const user = mkUser();
    await generateTokenPair(user, mkReq());
    await generateTokenPair(user, mkReq());
    await generateTokenPair(user, mkReq({ mobile: true }));

    expect(await RefreshToken.countDocuments({ userId: user.userId })).toBe(3);

    await revokeAllTokens(user.userId);

    expect(await RefreshToken.countDocuments({ userId: user.userId })).toBe(0);
  });

  it("does not touch other users' tokens", async () => {
    const alice = mkUser();
    const bob = mkUser();
    await generateTokenPair(alice, mkReq());
    await generateTokenPair(bob, mkReq());

    await revokeAllTokens(alice.userId);

    expect(await RefreshToken.countDocuments({ userId: alice.userId })).toBe(0);
    expect(await RefreshToken.countDocuments({ userId: bob.userId })).toBe(1);
  });
});
