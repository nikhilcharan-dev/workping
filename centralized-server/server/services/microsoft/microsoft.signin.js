import axios from "axios";
import { Router } from "express";
import jwt from "jsonwebtoken";
import Account from "#models/Account.js";
import Admin from "#models/Admin.js";
import User from "#models/User.js";
import { setAuthCookie } from "#utils/cookie.helper.js";

const router = Router();

const MS_CLIENT_ID = process.env.MS_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const MS_REDIRECT_URI = process.env.MS_REDIRECT_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const SCOPE = ["openid", "profile", "email", "https://graph.microsoft.com/User.Read"].join(" ");

router.get("/start", (req, res) => {
  const { platform } = req.query;
  const state = platform === "mobile" ? "mobile" : "web";
  const authUrl =
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
    `?client_id=${MS_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&state=${state}`;

  res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const isMobile = state === "mobile";

  if (!code) {
    return isMobile
      ? res.status(400).json({ error: "Authorization code missing" })
      : res.status(400).send("Authorization code missing");
  }

  try {
    // Exchange code
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

    // Fetch profile
    const profileRes = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { mail, userPrincipalName, displayName, id } = profileRes.data;

    const email = mail || userPrincipalName;
    const microsoftId = id;

    if (!email || !microsoftId) {
      return res.status(400).send("Invalid Microsoft profile data");
    }

    // Find existing account
    let account = await Account.findOne({ email });

    let profileId;

    if (!account) {
      // SIGN UP — admin only for new OAuth registrations
      account = await Account.create({
        email,
        emailVerified: true,
        role: "admin",
        providers: {
          microsoft: {
            id: microsoftId,
            linked: true,
          },
        },
      });

      const admin = await Admin.create({
        name: displayName,
        email,
        emailVerified: true,
      });

      profileId = admin._id;
    } else {
      // SIGN IN + LINK IF NOT LINKED
      if (!account.providers?.microsoft?.linked) {
        account.providers.microsoft = {
          id: microsoftId,
          linked: true,
        };
        await account.save();
      }

      // Look up the correct profile based on role
      if (account.role === "admin") {
        const admin = await Admin.findOne({ email });
        profileId = admin?._id;
      } else {
        const user = await User.findOne({ email });
        profileId = user?._id;
      }

      if (!profileId) {
        return res.status(404).send("Profile not found for this account");
      }
    }

    // Issue JWT with same payload structure as normal auth
    const appToken = jwt.sign({ userId: profileId, role: account.role }, process.env.SECRET_KEY, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    // Set httpOnly cookie (same as normal login)
    // const isLive = process.env.MODE === "production";
    // res.cookie("accessToken", appToken, {
    //     httpOnly: true,
    //     secure: isLive,
    //     sameSite: isLive ? "none" : "lax",
    //     maxAge: 1000 * 60 * 60 * 24
    // });
    setAuthCookie(res, req, appToken);

    if (isMobile) {
      // Mobile: redirect to app deep link with token
      return res.redirect(`reback://auth?token=${encodeURIComponent(appToken)}&role=${account.role}`);
    }

    // Web: send back to frontend via postMessage
    const safeToken = JSON.stringify(appToken);
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
    console.error("Microsoft OAuth Error:", err.response?.data || err.message);
    if (isMobile) {
      return res.redirect(`reback://auth?error=${encodeURIComponent("Microsoft OAuth failed")}`);
    }
    res.status(500).json({ error: "Microsoft OAuth failed" });
  }
});

export default router;
