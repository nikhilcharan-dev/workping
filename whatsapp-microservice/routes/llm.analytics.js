/**
 * LLM Analytics Routes
 * ====================
 * Endpoints for observability, model drift detection, and performance monitoring.
 * All routes are protected by requireAuth middleware from the main server.
 */

import express from "express";
import { getObservabilityTracker } from "../utils/llm.observability.js";

const router = express.Router();

/**
 * GET /api/dashboard/llm/metrics
 * Confidence trends and model drift detection
 * Query params:
 *   - operation: "intent" | "response" | null (default: all)
 *   - intent: Filter by specific intent (e.g., "GREETING", "LEAVE_REQUEST")
 */
router.get("/llm/metrics", (req, res) => {
  const { operation, intent } = req.query;
  const tracker = getObservabilityTracker();

  const response = {
    timestamp: new Date().toISOString(),
    intent_detection: tracker.getConfidenceTrend(intent, "intent"),
    response_generation: tracker.getConfidenceTrend(intent, "response"),
    success_by_intent: tracker.getSuccessRateByIntent("intent"),
    provider_health: tracker.getProviderHealth(),
    latency_stats: {
      intent_detection: tracker.getLatencyStats("intent"),
      response_generation: tracker.getLatencyStats("response"),
    },
  };

  // Filter based on operation param if provided
  if (operation === "intent") {
    return res.json({
      timestamp: response.timestamp,
      intent_detection: response.intent_detection,
      success_by_intent: response.success_by_intent,
      latency_stats: { intent_detection: response.latency_stats.intent_detection },
      provider_health: response.provider_health,
    });
  }

  if (operation === "response") {
    return res.json({
      timestamp: response.timestamp,
      response_generation: response.response_generation,
      latency_stats: { response_generation: response.latency_stats.response_generation },
      provider_health: response.provider_health,
    });
  }

  res.json(response);
});

/**
 * GET /api/dashboard/llm/history
 * Recent LLM operations for audit trail and debugging
 * Query params:
 *   - limit: Number of recent operations to return (default: 100, max: 500)
 *   - operation: "intent" | "response" | null
 *   - intent: Filter by specific intent
 *   - success: "true" | "false" | null (show failures or successes)
 */
router.get("/llm/history", (req, res) => {
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(1, isNaN(parsedLimit) ? 100 : parsedLimit), 500);
  const { operation, intent, success } = req.query;

  const successFilter =
    success === "true" ? true : success === "false" ? false : null;

  const tracker = getObservabilityTracker();
  const filter = {
    operation: operation || null,
    intent: intent || null,
    success: successFilter,
  };

  const history = tracker.getRecentOperations(limit, filter);

  res.json({
    count: history.length,
    limit,
    filters: {
      operation: operation || "all",
      intent: intent || "all",
      success: successFilter === null ? "all" : successFilter,
    },
    history: history.map((m) => ({
      timestamp: m.timestamp,
      operation: m.operation,
      intent: m.intent,
      confidence: parseFloat(m.confidence.toFixed(3)),
      latency_ms: parseFloat(m.latency_ms.toFixed(2)),
      success: m.success,
      provider: m.provider,
      user_id: m.user_id,
      tokens_used: m.tokens_used,
      error: m.error,
    })),
  });
});

/**
 * GET /api/dashboard/llm/drift-summary
 * Quick summary for dashboard — are we detecting model drift?
 */
router.get("/llm/drift-summary", (req, res) => {
  const tracker = getObservabilityTracker();

  const intentTrend = tracker.getConfidenceTrend(null, "intent");
  const responseTrend = tracker.getConfidenceTrend(null, "response");

  const alerts = [];

  if (intentTrend.drift_detected) {
    alerts.push({
      type: "drift",
      severity: "high",
      message: `Intent classification confidence degraded by ${intentTrend.degradation_pct}%`,
      older_avg: intentTrend.older_batch_avg,
      recent_avg: intentTrend.recent_batch_avg,
    });
  }

  if (responseTrend.drift_detected) {
    alerts.push({
      type: "drift",
      severity: "medium",
      message: `Response generation confidence degraded by ${responseTrend.degradation_pct}%`,
      older_avg: responseTrend.older_batch_avg,
      recent_avg: responseTrend.recent_batch_avg,
    });
  }

  const providerHealth = tracker.getProviderHealth();
  for (const [provider, health] of Object.entries(providerHealth)) {
    if (health.health < 90) {
      alerts.push({
        type: "provider",
        severity: health.health < 50 ? "critical" : "warning",
        message: `${provider} provider health: ${health.health}%`,
        failures: health.failures,
      });
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    status: alerts.length === 0 ? "healthy" : alerts[0].severity === "critical" ? "critical" : "degraded",
    drift_detected: intentTrend.drift_detected || responseTrend.drift_detected,
    alerts,
    summary: {
      intent_confidence: intentTrend.status === "ok" ? intentTrend.recent_batch_avg : null,
      response_confidence: responseTrend.status === "ok" ? responseTrend.recent_batch_avg : null,
      provider_health: providerHealth,
    },
  });
});

export default router;
