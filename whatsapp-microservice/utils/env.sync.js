import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env");

/**
 * Read .env file and parse into key-value pairs.
 * Preserves comments and blank lines.
 */
function readEnvFile() {
  try {
    return readFileSync(ENV_PATH, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Whitelist of allowed environment variables for .env sync.
 * Only these keys can be updated via the dashboard.
 * DO NOT include sensitive keys like credentials, tokens, or secrets.
 */
const ALLOWED_ENV_KEYS = new Set([
  "LLM_PROVIDER",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "BEDROCK_MODEL_ID",
  "BEDROCK_MODEL_NAME",
  "AWS_REGION",
]);

/**
 * Validate environment variable keys and values.
 * Prevents injection of sensitive credentials.
 * @param {Record<string, string>} updates - Key-value pairs to validate
 * @throws {Error} If validation fails
 */
function validateEnvUpdates(updates) {
  for (const [key, value] of Object.entries(updates)) {
    // Only allow whitelisted keys
    if (!ALLOWED_ENV_KEYS.has(key)) {
      throw new Error(`Environment variable '${key}' is not allowed to be modified via dashboard`);
    }

    // Validate value is a non-empty string
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Environment variable '${key}' must be a non-empty string`);
    }

    // Prevent shell injection by disallowing certain characters
    if (/[;|&$`\n\r]/.test(value)) {
      throw new Error(`Environment variable '${key}' contains invalid characters`);
    }
  }
}

/**
 * Update or add key=value pairs in .env file.
 * Preserves comments, ordering, and unrelated lines.
 * Only allows whitelisted keys for security.
 * @param {Record<string, string>} updates - Key-value pairs to write
 * @throws {Error} If validation fails
 */
export function syncToEnv(updates) {
  // Validate all updates before modifying the file
  validateEnvUpdates(updates);

  const content = readEnvFile();
  const lines = content.split("\n");
  const keysToUpdate = new Set(Object.keys(updates));
  const updatedKeys = new Set();

  // Update existing lines
  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith("#")) return line;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return line;

    const key = line.slice(0, eqIndex).trim();
    if (keysToUpdate.has(key)) {
      updatedKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Append any new keys that weren't already in the file
  for (const key of keysToUpdate) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${updates[key]}`);
    }
  }

  writeFileSync(ENV_PATH, newLines.join("\n"), "utf-8");
  // Log all .env modifications for audit purposes
  logger.info(`[ENV-SYNC-AUDIT] Updated keys: ${Array.from(keysToUpdate).join(", ")}`);
}

/**
 * Build the env updates object from provider configs.
 */
export function buildEnvUpdates(provider, config) {
  if (provider === "ollama") {
    const updates = {};
    updates.LLM_PROVIDER = "ollama";
    if (config.baseUrl) updates.OLLAMA_BASE_URL = config.baseUrl;
    if (config.model) updates.OLLAMA_MODEL = config.model;
    return updates;
  }

  if (provider === "bedrock") {
    const updates = {};
    updates.LLM_PROVIDER = "bedrock";
    if (config.region) updates.AWS_REGION = config.region;
    if (config.accessKeyId) updates.AWS_ACCESS_KEY_ID = config.accessKeyId;
    if (config.secretAccessKey) updates.AWS_SECRET_ACCESS_KEY = config.secretAccessKey;
    if (config.modelId) updates.BEDROCK_MODEL_ID = config.modelId;
    if (config.modelName) updates.BEDROCK_MODEL_NAME = config.modelName;
    return updates;
  }

  if (provider === "custom") {
    const updates = {};
    updates.LLM_PROVIDER = "custom";
    if (config.baseUrl) updates.CUSTOM_MODEL_BASE_URL = config.baseUrl;
    if (config.chatEndpoint) updates.CUSTOM_MODEL_CHAT_ENDPOINT = config.chatEndpoint;
    if (config.generateEndpoint) updates.CUSTOM_MODEL_GENERATE_ENDPOINT = config.generateEndpoint;
    if (config.apiKey) updates.CUSTOM_MODEL_API_KEY = config.apiKey;
    if (config.modelName) updates.CUSTOM_MODEL_NAME = config.modelName;
    if (config.requestFormat) updates.CUSTOM_MODEL_REQUEST_FORMAT = config.requestFormat;
    if (config.timeout) updates.CUSTOM_MODEL_TIMEOUT = String(config.timeout);
    return updates;
  }

  return {};
}

/**
 * Sync the active provider setting to .env without touching provider-specific keys.
 */
export function syncProviderToEnv(provider) {
  syncToEnv({ LLM_PROVIDER: provider });
}
