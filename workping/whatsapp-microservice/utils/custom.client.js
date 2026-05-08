import axios from "axios";

/*
 * CUSTOM / OPENAI-COMPATIBLE PROVIDER
 * ------------------------------------
 * This client is the catch-all for any provider that exposes an HTTP API.
 * Set CUSTOM_MODEL_REQUEST_FORMAT to match your provider's wire format:
 *
 *   "openai"  — OpenAI Chat Completions format. Works with:
 *               • OpenAI          (CUSTOM_MODEL_BASE_URL=https://api.openai.com/v1)
 *               • Groq            (https://api.groq.com/openai/v1)
 *               • Together AI     (https://api.together.xyz/v1)
 *               • OpenRouter      (https://openrouter.ai/api/v1)
 *               • Anthropic*      (https://api.anthropic.com/v1) — needs claude-* model name
 *               • Azure OpenAI    (https://<resource>.openai.azure.com/openai/deployments/<model>)
 *               • Mistral         (https://api.mistral.ai/v1)
 *               • Google Gemini** (https://generativelanguage.googleapis.com/v1beta/openai)
 *
 *   "ollama"  — Ollama native format. Use when pointing at a remote Ollama instance.
 *
 *   "raw"     — Passthrough. Whatever is in options{} is merged into the body.
 *               Useful for deeply custom or proprietary model servers.
 *
 * * Anthropic native API has a different auth header (x-api-key) — use "openai"
 *   format via their OpenAI-compatible endpoint instead.
 * ** Gemini OpenAI compat endpoint requires `?key=<GEMINI_API_KEY>` in the URL,
 *    not a Bearer header. Append the key to CUSTOM_MODEL_BASE_URL for simplicity.
 */

let config = {
    baseUrl: process.env.CUSTOM_MODEL_BASE_URL || "http://localhost:8000",
    chatEndpoint: process.env.CUSTOM_MODEL_CHAT_ENDPOINT || "/v1/chat/completions",
    generateEndpoint: process.env.CUSTOM_MODEL_GENERATE_ENDPOINT || "/v1/completions",
    apiKey: process.env.CUSTOM_MODEL_API_KEY || "",
    modelName: process.env.CUSTOM_MODEL_NAME || "my-model",
    // "openai" | "ollama" | "raw" — see block comment above
    requestFormat: process.env.CUSTOM_MODEL_REQUEST_FORMAT || "openai",
    timeout: parseInt(process.env.CUSTOM_MODEL_TIMEOUT || "60000", 10),
};

let customAxios = createAxiosInstance();

function createAxiosInstance() {
    const headers = { "Content-Type": "application/json" };
    if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
    return axios.create({
        baseURL: config.baseUrl,
        timeout: config.timeout,
        headers,
    });
}

export function getConfig() {
    return {
        baseUrl: config.baseUrl,
        chatEndpoint: config.chatEndpoint,
        generateEndpoint: config.generateEndpoint,
        apiKey: config.apiKey ? config.apiKey.slice(0, 6) + "****" : "",
        modelName: config.modelName,
        requestFormat: config.requestFormat,
        timeout: config.timeout,
    };
}

export function getRawConfig() {
    return { ...config };
}

export function updateConfig(updates) {
    let needsReconnect = false;
    if (updates.baseUrl) {
        config.baseUrl = updates.baseUrl;
        needsReconnect = true;
    }
    if (updates.chatEndpoint) config.chatEndpoint = updates.chatEndpoint;
    if (updates.generateEndpoint) config.generateEndpoint = updates.generateEndpoint;
    if (updates.apiKey !== undefined) {
        config.apiKey = updates.apiKey;
        needsReconnect = true;
    }
    if (updates.modelName) config.modelName = updates.modelName;
    if (updates.requestFormat) config.requestFormat = updates.requestFormat;
    if (updates.timeout) {
        config.timeout = parseInt(updates.timeout, 10);
        needsReconnect = true;
    }
    if (needsReconnect) customAxios = createAxiosInstance();
    return getConfig();
}

/**
 * Build request body based on the configured format.
 */
function buildChatBody(messages, options) {
    switch (config.requestFormat) {
        case "openai":
            return {
                model: config.modelName,
                messages,
                max_tokens: options.maxTokens ?? 512,
                temperature: options.temperature ?? 0.4,
            };
        case "ollama":
            return {
                model: config.modelName,
                messages,
                stream: false,
                options: {
                    temperature: options.temperature ?? 0.4,
                    num_predict: options.maxTokens ?? 512,
                },
            };
        case "raw":
        default:
            // Raw mode: send messages and options as-is, let the user's server handle it
            return {
                model: config.modelName,
                messages,
                ...options,
            };
    }
}

/**
 * Extract the response text based on the configured format.
 */
function extractResponse(data) {
    // OpenAI format
    if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
    }
    // Ollama chat format
    if (data.message?.content) {
        return data.message.content.trim();
    }
    // Ollama generate format
    if (data.response) {
        return data.response.trim();
    }
    // Plain text field
    if (data.text) {
        return data.text.trim();
    }
    // Raw output field
    if (data.output) {
        return (typeof data.output === "string" ? data.output : JSON.stringify(data.output)).trim();
    }
    // Fallback: stringify the whole response
    return JSON.stringify(data);
}

/**
 * Chat completion via custom self-hosted model.
 */
export async function chat(messages, options = {}) {
    const body = buildChatBody(messages, options);
    const res = await customAxios.post(config.chatEndpoint, body);
    return extractResponse(res.data);
}

/**
 * Simple text generation (wraps chat with a single user message).
 */
export async function generate(prompt, options = {}) {
    if (config.generateEndpoint !== config.chatEndpoint) {
        // Use dedicated generate endpoint if different from chat
        const body =
            config.requestFormat === "ollama"
                ? {
                      model: config.modelName,
                      prompt,
                      stream: false,
                      options: { temperature: options.temperature ?? 0.3, num_predict: options.maxTokens ?? 256 },
                  }
                : {
                      model: config.modelName,
                      prompt,
                      max_tokens: options.maxTokens ?? 256,
                      temperature: options.temperature ?? 0.3,
                  };
        const res = await customAxios.post(config.generateEndpoint, body);
        return extractResponse(res.data);
    }
    return chat([{ role: "user", content: prompt }], options);
}

/**
 * Health check - verify the custom model server is reachable.
 */
export async function healthCheck() {
    if (!config.baseUrl) {
        return { ok: false, error: "Custom model base URL not configured" };
    }
    try {
        // Try common health endpoints
        try {
            await customAxios.get("/health");
        } catch {
            await customAxios.get("/");
        }
        return { ok: true, model: config.modelName, provider: "custom" };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}
