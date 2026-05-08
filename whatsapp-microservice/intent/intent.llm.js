import { chat } from "../utils/llm.provider.js";
import { INTENT_SYSTEM_PROMPT, INTENT_FEW_SHOT } from "../utils/intent.prompts.js";

/**
 * Detect intent using Ollama LLM with few-shot prompting.
 * Falls back to UNKNOWN if LLM is unreachable or returns invalid JSON.
 */
export async function detectIntent(text) {
    try {
        const messages = [
            { role: "system", content: INTENT_SYSTEM_PROMPT },
            ...INTENT_FEW_SHOT,
            { role: "user", content: text },
        ];

        const raw = await chat(messages, { temperature: 0.1, maxTokens: 64 });

        const jsonMatch = raw.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            console.warn("[INTENT] No JSON found in LLM response");
            return { intent: "UNKNOWN", confidence: 0.5 };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.intent || typeof parsed.confidence !== "number") {
            return { intent: "UNKNOWN", confidence: 0.5 };
        }

        return parsed;
    } catch (err) {
        console.error("[INTENT] Detection failed:", err.message);
        return { intent: "UNKNOWN", confidence: 0.5 };
    }
}
