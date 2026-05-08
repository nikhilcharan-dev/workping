import jwt from "jsonwebtoken";
import RefreshToken from "#models/RefreshToken.js";

const ACCESS_TOKEN_EXPIRY_WEB = process.env.JWT_EXPIRES_IN || "1h";
const ACCESS_TOKEN_EXPIRY_MOBILE = "7d";
const REFRESH_TOKEN_EXPIRY_WEB = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_TOKEN_EXPIRY_MOBILE = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Detect whether the request originates from the mobile app.
 */
function isMobileRequest(req) {
    const ua = req.headers["user-agent"] || "";
    return ua.includes("WorkPing Agent");
}

/**
 * Generate an access token (JWT) + refresh token pair.
 *
 * @param {{ userId: string, role: string }} payload
 * @param {import('express').Request} req
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export async function generateTokenPair(payload, req) {
    const mobile = isMobileRequest(req);
    const accessExpiry = mobile ? ACCESS_TOKEN_EXPIRY_MOBILE : ACCESS_TOKEN_EXPIRY_WEB;

    const accessToken = jwt.sign({ userId: payload.userId, role: payload.role }, process.env.SECRET_KEY, {
        expiresIn: accessExpiry,
    });

    // Create refresh token
    const refreshTokenStr = RefreshToken.generateToken();
    const refreshExpiry = mobile ? REFRESH_TOKEN_EXPIRY_MOBILE : REFRESH_TOKEN_EXPIRY_WEB;

    await RefreshToken.create({
        token: refreshTokenStr,
        userId: payload.userId,
        role: payload.role,
        platform: mobile ? "mobile" : "web",
        expiresAt: new Date(Date.now() + refreshExpiry),
    });

    return { accessToken, refreshToken: refreshTokenStr };
}

/**
 * Rotate a refresh token — consume the old one, issue a new pair.
 * Returns null if the refresh token is invalid or expired.
 *
 * @param {string} token  The refresh token string
 * @returns {Promise<{ accessToken: string, refreshToken: string, userId: string, role: string } | null>}
 */
export async function rotateRefreshToken(token) {
    // Atomically find-and-delete to prevent reuse
    const existing = await RefreshToken.findOneAndDelete({ token });

    if (!existing || existing.expiresAt < new Date()) {
        // If expired doc was already auto-deleted by TTL, findOneAndDelete returns null
        return null;
    }

    const mobile = existing.platform === "mobile";
    const accessExpiry = mobile ? ACCESS_TOKEN_EXPIRY_MOBILE : ACCESS_TOKEN_EXPIRY_WEB;

    const accessToken = jwt.sign({ userId: existing.userId.toString(), role: existing.role }, process.env.SECRET_KEY, {
        expiresIn: accessExpiry,
    });

    const newRefreshTokenStr = RefreshToken.generateToken();
    const refreshExpiry = mobile ? REFRESH_TOKEN_EXPIRY_MOBILE : REFRESH_TOKEN_EXPIRY_WEB;

    await RefreshToken.create({
        token: newRefreshTokenStr,
        userId: existing.userId,
        role: existing.role,
        platform: existing.platform,
        expiresAt: new Date(Date.now() + refreshExpiry),
    });

    return {
        accessToken,
        refreshToken: newRefreshTokenStr,
        userId: existing.userId.toString(),
        role: existing.role,
    };
}

/**
 * Revoke all refresh tokens for a user (e.g. on logout / password change).
 */
export async function revokeAllTokens(userId) {
    await RefreshToken.deleteMany({ userId });
}
