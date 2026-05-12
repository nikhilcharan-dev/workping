import axios from "axios";
import { Router } from "express";
import jwt from "jsonwebtoken";
import Account from "#models/Account.js";
import Admin from "#models/Admin.js";
import User from "#models/User.js";
import { setAuthCookie } from "#utils/cookie.helper.js";
import logger from "#utils/logger.js";

const router = Router();

const MS_CLIENT_ID = process.env.MS_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const MS_REDIRECT_URI = process.env.MS_REDIRECT_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const SCOPE = ["openid", "profile", "email", "https://graph.microsoft.com/User.Read"].join(" ");

// Resolve a Microsoft profile into an account + JWT. Shared by the legacy
// server-side callback exchange and the PKCE exchange endpoint.
async function finalizeMicrosoftAuth(req, res, profile) {
  const { mail, userPrincipalName, displayName, id } = profile;
  const email = mail || userPrincipalName;
  const microsoftId = id;

  if (!email || !microsoftId) {
    return { error: { status: 400, message: "Invalid Microsoft profile data" } };
  }

  let account = await Account.findOne({ email });
  let profileId;

  if (!account) {
    account = await Account.create({
      email,
      emailVerified: true,
      role: "admin",
      providers: { microsoft: { id: microsoftId, linked: true } },
    });
    const admin = await Admin.create({
      name: displayName,
      email,
      emailVerified: true,
    });
    profileId = admin._id;
  } else {
    if (!account.providers?.microsoft?.linked) {
      account.providers.microsoft = { id: microsoftId, linked: true };
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
  // Pack the client's nonce into the upstream state so Microsoft echoes it back
  // and the callback can return it to the client for CSRF binding.
  const state = clientState ? `${platformTag}.${clientState}` : platformTag;
  let authUrl =
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
    `?client_id=${MS_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&state=${encodeURIComponent(state)}`;
  // Forward PKCE challenge so Microsoft binds the issued code to the client's
  // verifier — the server never sees the verifier, only /pkce/exchange does.
  if (code_challenge) {
    authUrl +=
      `&code_challenge=${encodeURIComponent(code_challenge)}` +
      `&code_challenge_method=${encodeURIComponent(code_challenge_method || "S256")}`;
  }

  res.redirect(authUrl);
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
      `workping://auth?code=${encodeURIComponent(code)}&provider=microsoft${mobileStateParam}`
    );
  }

  try {
    const tokenRes = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        redirect_uri: MS_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

    if (!accessToken) {
      return res.status(400).send("Microsoft access token missing");
    }

    const profileRes = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await finalizeMicrosoftAuth(req, res, profileRes.data);
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
  } catch (err) {
    logger.error("Microsoft OAuth Error:", err.response?.data || err.message);
    if (isMobile) {
      return res.redirect(
        `workping://auth?error=${encodeURIComponent("Microsoft OAuth failed")}${mobileStateParam}`
      );
    }
    res.status(500).json({ error: "Microsoft OAuth failed" });
  }
});

// PKCE exchange: client posts the upstream code plus its verifier. Server
// forwards both to Microsoft — Microsoft validates SHA256(verifier) ==
// challenge before issuing the access token, which binds the exchange to the
// client that initiated /start.
router.post("/pkce/exchange", async (req, res) => {
  const { code, code_verifier } = req.body || {};
  if (!code || !code_verifier) {
    return res.status(400).json({ error: "code and code_verifier required" });
  }

  try {
    const tokenRes = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        redirect_uri: MS_REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: "Microsoft access token missing" });
    }

    const profileRes = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await finalizeMicrosoftAuth(req, res, profileRes.data);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    return res.json({ token: result.token, role: result.role });
  } catch (err) {
    logger.error("Microsoft PKCE exchange error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Microsoft OAuth exchange failed" });
  }
});

export default router;
