import { chat } from "../utils/llm.provider.js";
import { INTENT_SYSTEM_PROMPT, INTENT_FEW_SHOT } from "../utils/intent.prompts.js";
import { getObservabilityTracker, LLMMetrics } from "../utils/llm.observability.js";
import { logger } from "../utils/logger.js";

/**
 * Detect intent using Ollama LLM with few-shot prompting.
 * Falls back to UNKNOWN if LLM is unreachable or returns invalid JSON.
 * Records confidence scores and latency for model drift detection.
 */
export async function detectIntent(text, { userId = null, organizationId = "default" } = {}) {
  const startTime = Date.now();
  let result = { intent: "UNKNOWN", confidence: 0.5 };
  let success = false;
  let error = null;

  try {
    const messages = [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      ...INTENT_FEW_SHOT,
      { role: "user", content: text },
    ];

    const raw = await chat(messages, { temperature: 0.1, maxTokens: 64 });
    const latencyMs = Date.now() - startTime;

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn("[INTENT] No JSON found in LLM response");
      result = { intent: "UNKNOWN", confidence: 0.5 };
    } else {
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.intent || typeof parsed.confidence !== "number") {
        result = { intent: "UNKNOWN", confidence: 0.5 };
      } else {
        result = parsed;
        success = true;
      }
    }

    // Record metrics for observability
    const tracker = getObservabilityTracker();
    tracker.record(
      new LLMMetrics({
        operation: "intent",
        intent: result.intent,
        confidence: result.confidence,
        latency_ms: latencyMs,
        success,
        provider: process.env.LLM_PROVIDER || "ollama",
        organization_id: organizationId,
        user_id: userId,
      })
    );

    return result;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    error = err.message;

    console.error("[INTENT] Detection failed:", error);

    // Record failure metric
    const tracker = getObservabilityTracker();
    tracker.record(
      new LLMMetrics({
        operation: "intent",
        intent: "UNKNOWN",
        confidence: 0.5,
        latency_ms: latencyMs,
        success: false,
        provider: process.env.LLM_PROVIDER || "ollama",
        organization_id: organizationId,
        user_id: userId,
        error,
      })
    );

    return result;
  }
}
