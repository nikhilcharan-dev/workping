/**
 * Validates that all required environment variables are present.
 * Exits the process with a clear error message if any are missing,
 * preventing the server from starting in a misconfigured state.
 */

const REQUIRED_VARS = [
  // Server
  "PORT",
  "MODE",
  "SECRET_KEY",
  "JWT_EXPIRES_IN",
  // Database
  "MONGODB_URI",
  // Redis
  "REDIS_HOST",
  "REDIS_PORT",
  // Microservices
  "IMAGE_CLASSIFICATION_URI",
  "PHONE_PE",
  "WHATSAPP_URI",
  "MAIL_SERVICE_URI",
  "ORACLE_CLOUD_URI",
  // CORS
  "CLIENT_URL",
  "APP_URL",
];

export default function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("[Startup] Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error("\nCopy .env.example to .env and fill in all values.");
    process.exit(1);
  }
}
