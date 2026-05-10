import axios from "axios";
import PHONEPE_CONFIG from "./phonepe.env.js";

const AUTH_BASE_URI = PHONEPE_CONFIG.authBaseUrl;
const API_PATH = "/v1/oauth/token";

class AUTH_CONFIG {
  constructor() {
    this.key = null;
    this.expiresAt = null;
  }

  setKey(key, expiresAt) {
    this.key = key;
    this.expiresAt = expiresAt;
  }

  isExpired() {
    return !this.key || !this.expiresAt || Date.now() >= this.expiresAt;
  }

  getKey() {
    return this.key;
  }
}

const auth = new AUTH_CONFIG();

const generateAuthorisationToken = async () => {
  try {
    const res = await axios.post(
      AUTH_BASE_URI + API_PATH,
      new URLSearchParams({
        client_version: PHONEPE_CONFIG.clientVersion,
        client_secret: PHONEPE_CONFIG.clientSecret,
        client_id: PHONEPE_CONFIG.clientId,
        grant_type: PHONEPE_CONFIG.grantType,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_at } = res.data;
    auth.setKey(access_token, expires_at);

    return access_token;
  } catch (err) {
    console.error("Failed to generate PhonePe authorisation token:", err?.response?.data || err.message);
    throw new Error("Authentication with PhonePe failed");
  }
};

const getAuthorisationToken = async () => {
  if (auth.isExpired()) {
    return await generateAuthorisationToken();
  }
  return auth.getKey();
};

export default getAuthorisationToken;
