import speakeasy from "speakeasy";
import QRCode from "qrcode";

export const createController = (config) => {
  // Validate config
  if (!config || typeof config.saveSecret !== "function" || typeof config.getSecret !== "function") {
    throw new Error('2FA Service requires "saveSecret" and "getSecret" async functions in config.');
  }

  const { saveSecret, getSecret, isVerified, enable2FA, appName = "MyApp" } = config;

  return {
    async setup(req, res) {
      try {
        const userId = req.user ? req.user.userId : req.body.userId; // adjust based on auth
        if (!userId) {
          return res.status(400).json({ error: "User ID is required" });
        }
        if (isVerified(userId)) {
          return res.status(403).json({ error: "Authentication already exists" });
        }
        const secret = speakeasy.generateSecret({
          name: `${appName}: Administrator`,
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        await saveSecret(userId, secret.base32);

        res.json({
          message: "2FA setup initiated",
          secret: secret.base32, // Optional: for manual entry
          qrCode: qrCodeUrl,
        });
      } catch (error) {
        console.error("2FA Setup Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },

    async verify(req, res) {
      try {
        const { code: token, userId } = req.body;
        const id = userId || (req.user ? req.user.userId : null);

        if (!id || !token) {
          return res.status(400).json({ error: "User ID and Token are required" });
        }

        const secret = await getSecret(id);

        // Use constant-time verification: always call speakeasy.totp.verify
        // to avoid timing attacks that distinguish 'no 2FA' from 'wrong code'
        let verified;
        if (secret) {
          verified = speakeasy.totp.verify({
            secret: secret,
            encoding: "base32",
            token: token,
            window: 1, // Allow 1 step (30s) leeway either side, creating a 90s window.
          });
        } else {
          // Use a dummy secret to maintain constant execution time
          verified = speakeasy.totp.verify({
            secret: "JBSWY3DPEBLW64TMMQ======",
            encoding: "base32",
            token: token,
            window: 1,
          });
        }

        if (verified && secret) {
          // Optional: Mark 2FA as enabled in DB if it was pending
          if (config.enable2FA && typeof config.enable2FA === "function") {
            enable2FA(id);
          }

          res.json({ verified: true, message: "2FA verified successfully" });
        } else {
          // Generic error message applies to both no secret and wrong code
          res.status(401).json({ verified: false, error: "2FA verification failed" });
        }
      } catch (error) {
        console.error("2FA Verify Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },

    async validate(req, res) {
      // Similar to verify, but might be used for login
      // For plug-and-play, verify and validate are essentially the same operation: check token against stored secret.
      return this.verify(req, res);
    },

    async reAuthenticate(req, res) {
      try {
        const { code: token, userId } = req.body;
        const id = userId || (req.user ? req.user.userId : null);

        if (!id || !token) {
          return res.status(400).json({ error: "User ID and Token are required" });
        }

        const secret = await getSecret(id);
        // Use constant-time verification to avoid timing attacks
        let verified;
        if (secret) {
          verified = speakeasy.totp.verify({
            secret: secret,
            encoding: "base32",
            token: token,
            window: 1,
          });
        } else {
          // Use a dummy secret to maintain constant execution time
          verified = speakeasy.totp.verify({
            secret: "JBSWY3DPEBLW64TMMQ======",
            encoding: "base32",
            token: token,
            window: 1,
          });
        }

        if (verified && secret) {
          res.json({ verified: true, message: "Re-authentication successful" });
        } else {
          res.status(401).json({ verified: false, error: "Re-authentication failed" });
        }
      } catch (error) {
        console.error("2FA Re-authenticate Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },

    async reset(req, res) {
      try {
        const userId = req.user ? req.user.userId : req.body.userId;
        if (!userId) {
          return res.status(400).json({ error: "User ID is required" });
        }

        if (config.reset2FA && typeof config.reset2FA === "function") {
          await config.reset2FA(userId);
        } else {
          // Fallback to clearing secret if reset2FA not provided
          await saveSecret(userId, null);
        }

        res.json({ message: "2FA has been reset successfully" });
      } catch (error) {
        console.error("2FA Reset Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  };
};
