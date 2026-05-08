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

router.get("/start", (req, res) => {
    const { platform } = req.query;
    const state = platform === "mobile" ? "mobile" : "web";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent&state=${state}`;
    res.redirect(url);
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
        // Exchange code for tokens
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

        // Get user profile
        const userInfoRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const { id: googleId, email, verified_email, name, picture } = userInfoRes.data;

        if (!verified_email) {
            return res.status(400).send("Email not verified by Google");
        }

        // Check if account exists
        let account = await Account.findOne({ email });

        let profileId;

        if (!account) {
            // SIGN UP — admin only for new OAuth registrations
            account = await Account.create({
                email,
                emailVerified: true,
                role: "admin",
                providers: {
                    google: {
                        id: googleId,
                        linked: true,
                    },
                },
            });

            const admin = await Admin.create({
                name,
                email,
                emailVerified: true,
                profileImageUrl: picture,
            });

            profileId = admin._id;
        } else {
            // SIGN IN — link provider if not already linked
            if (!account.providers.google?.linked) {
                account.providers.google = {
                    id: googleId,
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
        const token = jwt.sign({ userId: profileId, role: account.role }, process.env.SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });

        // Set httpOnly cookie (same as normal login)
        // const isLive = process.env.MODE === "production";
        // res.cookie("accessToken", token, {
        //     httpOnly: true,
        //     secure: isLive,
        //     sameSite: isLive ? "none" : "lax",
        //     maxAge: 1000 * 60 * 60 * 24
        // });
        setAuthCookie(res, req, token);

        if (isMobile) {
            // Mobile: redirect to app deep link with token
            return res.redirect(`reback://auth?token=${encodeURIComponent(token)}&role=${account.role}`);
        }

        // Web: send back to frontend via postMessage
        const safeToken = JSON.stringify(token);
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
            return res.redirect(`reback://auth?error=${encodeURIComponent("Google OAuth failed")}`);
        }
        res.status(500).send("OAuth Error");
    }
});

export default router;
