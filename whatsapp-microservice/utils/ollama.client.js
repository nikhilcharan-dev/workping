import axios from "axios";

let config = {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "qwen2.5:3b",
};

let ollamaAxios = axios.create({
    baseURL: config.baseUrl,
    timeout: 30000,
});

export function getConfig() {
    return { ...config };
}

export function updateConfig(updates) {
    if (updates.baseUrl) {
        config.baseUrl = updates.baseUrl;
        ollamaAxios = axios.create({ baseURL: config.baseUrl, timeout: 30000 });
    }
    if (updates.model) config.model = updates.model;
    return getConfig();
}

/**
 * Generate a completion from Ollama.
 * @param {string} prompt - The full prompt to send
 * @param {object} options - Optional generation parameters
 * @returns {string} The generated text
 */
export async function generate(prompt, options = {}) {
    const res = await ollamaAxios.post("/api/generate", {
        model: config.model,
        prompt,
        stream: false,
        options: {
            temperature: options.temperature ?? 0.3,
            num_predict: options.maxTokens ?? 256,
            ...options,
        },
    });
    return res.data.response.trim();
}

/**
 * Chat completion with message history.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @returns {string}
 */
export async function chat(messages, options = {}) {
    const res = await ollamaAxios.post("/api/chat", {
        model: config.model,
        messages,
        stream: false,
        options: {
            temperature: options.temperature ?? 0.4,
            num_predict: options.maxTokens ?? 512,
            ...options,
        },
    });
    return res.data.message.content.trim();
}

/**
 * Health check - verify Ollama is reachable and model is loaded.
 */
export async function healthCheck() {
    try {
        const res = await ollamaAxios.get("/api/tags");
        const models = res.data.models || [];
        const loaded = models.some((m) => m.name.startsWith(config.model.split(":")[0]));
        return { ok: true, model: config.model, loaded };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}
