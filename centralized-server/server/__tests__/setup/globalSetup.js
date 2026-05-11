import { MongoDBContainer } from "@testcontainers/mongodb";

export default async function globalSetup() {
  // Set every var that validateEnv() requires before app.js is evaluated in workers.
  // Non-sensitive placeholders are fine — the test process never routes real traffic.
  const defaults = {
    PORT: "5001",
    MODE: "test",
    SECRET_KEY: "test-integration-secret-do-not-use-in-prod",
    JWT_EXPIRES_IN: "1h",
    REDIS_HOST: "localhost",
    REDIS_PORT: "6379",
    IMAGE_CLASSIFICATION_URI: "http://localhost:8001",
    PHONE_PE: "http://localhost:3001",
    WHATSAPP_URI: "http://localhost:3002",
    MAIL_SERVICE_URI: "http://localhost:3003",
    ORACLE_CLOUD_URI: "http://localhost:8000",
    CLIENT_URL: "http://localhost:5173",
    APP_URL: "http://localhost:5001",
  };

  for (const [key, val] of Object.entries(defaults)) {
    process.env[key] ??= val;
  }

  // Start a single-node MongoDB replica set in Docker (replica set is required
  // because the register controller uses mongoose sessions + transactions).
  const container = await new MongoDBContainer("mongo:7")
    .withReplicaSet("rs0")
    .start();

  process.env.MONGO_TEST_URI = container.getReplicaSetConnectionString();
  // MONGODB_URI must pass validateEnv() — the test workers override the actual
  // Mongoose connection URI in beforeAll, so this value is never used to connect.
  process.env.MONGODB_URI = process.env.MONGO_TEST_URI;

  // globalSetup and globalTeardown run in the same Jest process — safe to share via global.
  global.__MONGO_CONTAINER__ = container;

  console.log(`[Integration] MongoDB container ready: ${process.env.MONGO_TEST_URI}`);
}
