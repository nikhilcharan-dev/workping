import * as ollamaClient from "./ollama.client.js";
import * as bedrockClient from "./bedrock.client.js";
import * as customClient from "./custom.client.js";

let activeProvider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();

function getClient() {
    switch (activeProvider) {
        case "bedrock":
            return bedrockClient;
        case "custom":
            return customClient;
        case "ollama":
        default:
            return ollamaClient;
    }
}

export function getProvider() {
    return activeProvider;
}

export function setProvider(provider) {
    const p = provider.toLowerCase();
    if (!["ollama", "bedrock", "custom"].includes(p)) {
        throw new Error(`Unknown provider: ${provider}. Use "ollama", "bedrock", or "custom".`);
    }
    activeProvider = p;
    return activeProvider;
}

export async function chat(messages, options = {}) {
    return getClient().chat(messages, options);
}

export async function generate(prompt, options = {}) {
    return getClient().generate(prompt, options);
}

export function getProviderConfig(provider) {
    const p = provider || activeProvider;
    switch (p) {
        case "bedrock":
            return { provider: "bedrock", ...bedrockClient.getConfig() };
        case "custom":
            return { provider: "custom", ...customClient.getConfig() };
        case "ollama":
            return { provider: "ollama", ...ollamaClient.getConfig() };
        default:
            return { provider: p };
    }
}

export function updateProviderConfig(provider, updates) {
    switch (provider) {
        case "bedrock":
            return { provider: "bedrock", ...bedrockClient.updateConfig(updates) };
        case "custom":
            return { provider: "custom", ...customClient.updateConfig(updates) };
        case "ollama":
            return { provider: "ollama", ...ollamaClient.updateConfig(updates) };
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export function getRawProviderConfig(provider) {
    const p = provider || activeProvider;
    switch (p) {
        case "bedrock":
            return bedrockClient.getRawConfig();
        case "custom":
            return customClient.getRawConfig();
        case "ollama":
            return ollamaClient.getConfig();
        default:
            return {};
    }
}

export async function healthCheck() {
    const result = await getClient().healthCheck();
    return { ...result, provider: activeProvider };
}
