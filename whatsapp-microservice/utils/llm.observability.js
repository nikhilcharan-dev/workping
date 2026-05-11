/**
 * LLM Observability & Model Drift Detection
 * =========================================
 * Tracks intent classification confidence scores and LLM response latency
 * for model drift detection and performance monitoring.
 */

/**
 * Represents a single LLM operation (intent detection or response generation)
 */
export class LLMMetrics {
  constructor({
    timestamp = new Date().toISOString(),
    operation = "intent", // "intent" or "response"
    intent = null,
    confidence = 0.0,
    latency_ms = 0,
    success = true,
    tokens_used = 0,
    provider = "ollama", // ollama, bedrock, openai, groq, etc.
    organization_id = "default",
    user_id = null,
    error = null,
  } = {}) {
    this.timestamp = timestamp;
    this.operation = operation; // "intent" or "response"
    this.intent = intent; // e.g., "GREETING", "LEAVE_REQUEST", etc.
    this.confidence = confidence; // 0.0–1.0 for intent classification
    this.latency_ms = latency_ms; // LLM request roundtrip time
    this.success = success; // Did the LLM call succeed?
    this.tokens_used = tokens_used; // Prompt + completion tokens
    this.provider = provider;
    this.organization_id = organization_id;
    this.user_id = user_id;
    this.error = error; // Error message if !success
  }
}

/**
 * Tracks LLM metrics for observability and drift detection
 */
export class LLMObservabilityTracker {
  constructor(windowSize = 1000) {
    this.metrics = [];
    this.windowSize = windowSize;
  }

  /**
   * Record a new LLM operation
   */
  record(metrics) {
    if (!(metrics instanceof LLMMetrics)) {
      throw new Error("Expected LLMMetrics instance");
    }
    this.metrics.push(metrics);

    // Maintain sliding window
    if (this.metrics.length > this.windowSize) {
      this.metrics.shift();
    }
  }

  /**
   * Get confidence trend for a specific intent (drift detection)
   * Compares older batch vs recent batch to detect degradation
   */
  getConfidenceTrend(intent = null, operation = "intent") {
    const filtered = this.metrics.filter((m) => {
      if (operation && m.operation !== operation) return false;
      if (intent && m.intent !== intent) return false;
      return m.success; // Only successful operations
    });

    if (filtered.length < 5) {
      return {
        status: "insufficient_data",
        operation,
        intent,
        count: filtered.length,
      };
    }

    const mid = Math.floor(filtered.length / 2);
    const olderBatch = filtered.slice(0, mid);
    const recentBatch = filtered.slice(mid);

    const olderAvg =
      olderBatch.reduce((sum, m) => sum + m.confidence, 0) / olderBatch.length;
    const recentAvg =
      recentBatch.reduce((sum, m) => sum + m.confidence, 0) /
      recentBatch.length;

    const degradation = olderAvg - recentAvg;
    const driftDetected = degradation > 0.05; // >5% drop = drift

    return {
      status: "ok",
      operation,
      intent,
      trend: driftDetected ? "degrading" : "stable",
      older_batch_avg: parseFloat(olderAvg.toFixed(3)),
      recent_batch_avg: parseFloat(recentAvg.toFixed(3)),
      degradation_pct: parseFloat((degradation * 100).toFixed(1)),
      drift_detected: driftDetected,
      batch_size: mid,
    };
  }

  /**
   * Get latency percentiles (P50, P95, P99) for SLA monitoring
   */
  getLatencyStats(operation = "intent") {
    const latencies = this.metrics
      .filter((m) => m.operation === operation && m.success)
      .map((m) => m.latency_ms)
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return {
        operation,
        count: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        mean: 0,
        max: 0,
      };
    }

    const percentile = (arr, p) => {
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return parseFloat(arr[Math.max(0, idx)].toFixed(2));
    };

    const mean =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    return {
      operation,
      count: latencies.length,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      mean: parseFloat(mean.toFixed(2)),
      max: parseFloat(Math.max(...latencies).toFixed(2)),
    };
  }

  /**
   * Get success rate for each intent
   */
  getSuccessRateByIntent(operation = "intent") {
    const intents = {};

    for (const m of this.metrics) {
      if (m.operation !== operation) continue;

      if (!intents[m.intent]) {
        intents[m.intent] = { success: 0, total: 0 };
      }

      intents[m.intent].total++;
      if (m.success) intents[m.intent].success++;
    }

    const result = {};
    for (const [intent, counts] of Object.entries(intents)) {
      result[intent] = {
        success_rate: parseFloat(
          ((counts.success / counts.total) * 100).toFixed(1)
        ),
        total: counts.total,
        failures: counts.total - counts.success,
      };
    }

    return result;
  }

  /**
   * Get provider health (success rate by LLM provider)
   */
  getProviderHealth() {
    const providers = {};

    for (const m of this.metrics) {
      if (!providers[m.provider]) {
        providers[m.provider] = { success: 0, total: 0 };
      }

      providers[m.provider].total++;
      if (m.success) providers[m.provider].success++;
    }

    const result = {};
    for (const [provider, counts] of Object.entries(providers)) {
      result[provider] = {
        health: counts.total === 0 ? 0 : parseFloat(((counts.success / counts.total) * 100).toFixed(1)),
        requests: counts.total,
        failures: counts.total - counts.success,
      };
    }

    return result;
  }

  /**
   * Get recent operations (audit log)
   */
  getRecentOperations(limit = 100, filter = {}) {
    const { operation, intent, success } = filter;

    let filtered = this.metrics.slice(-limit);

    if (operation) {
      filtered = filtered.filter((m) => m.operation === operation);
    }
    if (intent) {
      filtered = filtered.filter((m) => m.intent === intent);
    }
    if (typeof success === "boolean") {
      filtered = filtered.filter((m) => m.success === success);
    }

    // Return most recent first
    return filtered.reverse();
  }
}

// Global singleton
let _tracker = null;

export function getObservabilityTracker() {
  if (!_tracker) {
    _tracker = new LLMObservabilityTracker(1000);
  }
  return _tracker;
}
