import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

let config = {
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  modelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0",
  modelName: process.env.BEDROCK_MODEL_NAME || "",
};

let client = buildClient();

function buildClient() {
  if (!config.accessKeyId || !config.secretAccessKey) return null;
  return new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function getConfig() {
  return {
    region: config.region,
    accessKeyId: config.accessKeyId ? config.accessKeyId.slice(0, 6) + "****" : "",
    secretAccessKey: config.secretAccessKey ? "****" : "",
    modelId: config.modelId,
    modelName: config.modelName,
  };
}

export function getRawConfig() {
  return { ...config };
}

export function updateConfig(updates) {
  let needsRebuild = false;
  if (updates.region) {
    config.region = updates.region;
    needsRebuild = true;
  }
  if (updates.accessKeyId && !updates.accessKeyId.includes("****")) {
    config.accessKeyId = updates.accessKeyId;
    needsRebuild = true;
  }
  if (updates.secretAccessKey && !updates.secretAccessKey.includes("****")) {
    config.secretAccessKey = updates.secretAccessKey;
    needsRebuild = true;
  }
  if (updates.modelId) config.modelId = updates.modelId;
  if (updates.modelName !== undefined) config.modelName = updates.modelName;
  if (needsRebuild) client = buildClient();
  return getConfig();
}

/**
 * Extract text from Bedrock Converse response — handles different model response formats.
 */
function extractText(response) {
  const output = response.output;

  // Standard Converse API: output.message.content[{text}]
  if (output?.message?.content) {
    for (const block of output.message.content) {
      if (typeof block.text === "string") return block.text.trim();
      if (typeof block === "string") return block.trim();
    }
  }

  // Some models: output.text directly
  if (typeof output?.text === "string") return output.text.trim();

  // Fallback: try to find any string in the response
  const json = JSON.stringify(response);
  console.error("[BEDROCK] Unexpected response format:", json.slice(0, 500));
  throw new Error("Could not extract text from Bedrock response");
}

/**
 * Chat completion via Amazon Bedrock Converse API.
 */
export async function chat(messages, options = {}) {
  if (!client) throw new Error("AWS credentials not configured");

  // Separate system messages and conversation messages
  const systemParts = [];
  const convMessages = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push({ text: m.content });
    } else {
      convMessages.push({
        role: m.role,
        content: [{ text: m.content }],
      });
    }
  }

  // Merge consecutive same-role messages (Converse API requires alternating roles)
  const merged = [];
  for (const msg of convMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content.push(msg.content[0]);
    } else {
      merged.push({ ...msg });
    }
  }

  // Ensure conversation starts with "user" role
  if (merged.length > 0 && merged[0].role !== "user") {
    merged.unshift({ role: "user", content: [{ text: "Hello" }] });
  }

  const commandInput = {
    modelId: config.modelId,
    messages: merged,
    inferenceConfig: {
      maxTokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.4,
    },
  };

  // Add system prompt if present (supported by most Converse-compatible models)
  if (systemParts.length > 0) {
    commandInput.system = systemParts;
  }

  const command = new ConverseCommand(commandInput);

  try {
    const response = await client.send(command);
    return extractText(response);
  } catch (err) {
    console.error("[BEDROCK] API error:", err.name, err.message);
    throw err;
  }
}

/**
 * Simple text generation (wraps chat with a single user message).
 */
export async function generate(prompt, options = {}) {
  return chat([{ role: "user", content: prompt }], options);
}

/**
 * Health check for Bedrock - verifies credentials are configured.
 */
export async function healthCheck() {
  if (!config.accessKeyId || !config.secretAccessKey) {
    return { ok: false, error: "AWS credentials not configured" };
  }
  return { ok: true, model: config.modelId, provider: "bedrock" };
}
