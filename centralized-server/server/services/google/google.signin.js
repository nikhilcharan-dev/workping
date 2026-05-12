import axios from "axios";
import { Router } from "express";
import jwt from "jsonwebtoken";
import Account from "#models/Account.js";
import Admin from "#models/Admin.js";
import User from "#models/User.js";
import { setAuthCookie } from "#utils/cookie.helper.js";

const router = Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const SCOPE = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// Resolve a Google profile into an account + JWT. Shared by the legacy
// server-side callback exchange and the PKCE exchange endpoint.
async function finalizeGoogleAuth(req, res, profile) {
  const { id: googleId, email, verified_email, name, picture } = profile;

  if (!verified_email) {
    return { error: { status: 400, message: "Email not verified by Google" } };
  }

  let account = await Account.findOne({ email });
  let profileId;

  if (!account) {
    account = await Account.create({
      email,
      emailVerified: true,
      role: "admin",
      providers: { google: { id: googleId, linked: true } },
    });
    const admin = await Admin.create({
      name,
      email,
      emailVerified: true,
      profileImageUrl: picture,
    });
    profileId = admin._id;
  } else {
    if (!account.providers.google?.linked) {
      account.providers.google = { id: googleId, linked: true };
      await account.save();
    }
    if (account.role === "admin") {
      const admin = await Admin.findOne({ email });
      profileId = admin?._id;
    } else {
      const user = await User.findOne({ email });
      profileId = user?._id;
    }
    if (!profileId) {
      return { error: { status: 404, message: "Profile not found for this account" } };
    }
  }

  const token = jwt.sign({ userId: profileId, role: account.role }, process.env.SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  setAuthCookie(res, req, token);
  return { token, role: account.role };
}

router.get("/start", (req, res) => {
  const { platform, state: clientState, code_challenge, code_challenge_method } = req.query;
  const platformTag = platform === "mobile" ? "mobile" : "web";
  // Pack the client's nonce into the upstream state so Google echoes it back
  // and the callback can return it to the client for CSRF binding.
  const state = clientState ? `${platformTag}.${clientState}` : platformTag;
  let url =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}` +
    `&redirect_uri=${REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline&prompt=consent` +
    `&state=${encodeURIComponent(state)}`;
  // Forward PKCE challenge so Google binds the issued code to the client's
  // verifier — the server never sees the verifier, only /pkce/exchange does.
  if (code_challenge) {
    url +=
      `&code_challenge=${encodeURIComponent(code_challenge)}` +
      `&code_challenge_method=${encodeURIComponent(code_challenge_method || "S256")}`;
  }
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const { code, state, error: upstreamError, error_description } = req.query;
  const stateStr = typeof state === "string" ? state : "";
  const dotIdx = stateStr.indexOf(".");
  const platformTag = dotIdx >= 0 ? stateStr.slice(0, dotIdx) : stateStr;
  const clientState = dotIdx >= 0 ? stateStr.slice(dotIdx + 1) : "";
  const isMobile = platformTag === "mobile";
  const mobileStateParam = clientState ? `&state=${encodeURIComponent(clientState)}` : "";

  if (!code) {
    // Mobile PKCE: surface the upstream error via the deep link, otherwise the
    // browser session resolves on the server URL and the app never sees it.
    if (isMobile && clientState) {
      const message = error_description || upstreamError || "Authorization code missing";
      return res.redirect(
        `workping://auth?error=${encodeURIComponent(message)}${mobileStateParam}`
      );
    }
    return isMobile
      ? res.status(400).json({ error: "Authorization code missing" })
      : res.status(400).send("Authorization code missing");
  }

  // PKCE flow: the upstream code is bound to a verifier the server doesn't
  // hold. Hand the code back to the client so it can finish at /pkce/exchange.
  if (isMobile && clientState) {
    return res.redirect(
      `workping://auth?code=${encodeURIComponent(code)}&provider=google${mobileStateParam}`
    );
  }

  try {
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      },
    });

    const accessToken = tokenRes.data.access_token;

    const userInfoRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await finalizeGoogleAuth(req, res, userInfoRes.data);
    if (result.error) {
      return res.status(result.error.status).send(result.error.message);
    }

    if (isMobile) {
      return res.redirect(
        `workping://auth?token=${encodeURIComponent(result.token)}&role=${result.role}${mobileStateParam}`
      );
    }

    const safeToken = JSON.stringify(result.token);
    const targetOrigin = JSON.stringify(CLIENT_URL);
    res.status(200).send(`
            <script>
                if (window.opener) {
                    window.opener.postMessage({
                        token: ${safeToken},
                        message: "oauth_success"
                    }, ${targetOrigin});
                }
                window.close();
            </script>
        `);
  } catch (error) {
    console.error("Google OAuth error:", error.response?.data || error.message);
    if (isMobile) {
      return res.redirect(
        `workping://auth?error=${encodeURIComponent("Google OAuth failed")}${mobileStateParam}`
      );
    }
    res.status(500).send("OAuth Error");
  }
});

// PKCE exchange: client posts the upstream code plus its verifier. Server
// forwards both to Google — Google validates SHA256(verifier) == challenge
// before issuing the access token, which binds the exchange to the client
// that initiated /start.
router.post("/pkce/exchange", async (req, res) => {
  const { code, code_verifier } = req.body || {};
  if (!code || !code_verifier) {
    return res.status(400).json({ error: "code and code_verifier required" });
  }

  try {
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier,
      },
    });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: "Google access token missing" });
    }

    const userInfoRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await finalizeGoogleAuth(req, res, userInfoRes.data);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    return res.json({ token: result.token, role: result.role });
  } catch (error) {
    console.error("Google PKCE exchange error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Google OAuth exchange failed" });
  }
});

export default router;
