import "dotenv/config.js";

const PHONEPE_CONFIG = {
    baseUrl: process.env.PHONEPE_BASE_URL,
    redirectUri: process.env.PHONEPE_REDIRECT_URI,

    clientId: process.env.PHONEPE_CLIENT_ID,
    clientSecret: process.env.PHONEPE_CLIENT_SECRET,
    clientVersion: process.env.PHONEPE_CLIENT_VERSION,
    grantType: process.env.PHONEPE_GRANT_TYPE,

    authBaseUrl: process.env.PHONEPE_AUTH_BASE_URL,
};

export default PHONEPE_CONFIG;
