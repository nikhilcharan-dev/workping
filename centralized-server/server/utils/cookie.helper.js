const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

// In production the API and frontend are on different origins (cross-site).
// Cookies must be SameSite=None; Secure for the browser to accept them.
// Relying on req.secure / x-forwarded-proto is fragile when the VM reverse
// proxy doesn't forward that header, so we derive it from MODE instead.
const IS_PRODUCTION = process.env.MODE === "production";

export function getCookieOptions(_req, { httpOnly = true } = {}) {
  return {
    httpOnly,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "none" : "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function setAuthCookie(res, req, token, options = {}) {
  res.cookie("accessToken", token, getCookieOptions(req, options));
}

export function clearAuthCookie(res, req) {
  res.clearCookie("accessToken", getCookieOptions(req));
}
