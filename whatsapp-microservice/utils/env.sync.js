import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
 * Update or add key=value pairs in .env file.
 * Preserves comments, ordering, and unrelated lines.
 * @param {Record<string, string>} updates - Key-value pairs to write
 */
export function syncToEnv(updates) {
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
