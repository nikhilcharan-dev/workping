/**
 * Tests for LLM Observability & Model Drift Detection
 */

import {
  LLMMetrics,
  LLMObservabilityTracker,
  getObservabilityTracker,
} from "../../utils/llm.observability.js";

describe("LLMMetrics", () => {
  test("should create metric with default values", () => {
    const metric = new LLMMetrics({
      intent: "GREETING",
      confidence: 0.85,
      latency_ms: 120,
    });

    expect(metric.operation).toBe("intent");
    expect(metric.intent).toBe("GREETING");
    expect(metric.confidence).toBe(0.85);
    expect(metric.latency_ms).toBe(120);
    expect(metric.success).toBe(true);
    expect(metric.provider).toBe("ollama");
  });

  test("should track failure metrics", () => {
    const metric = new LLMMetrics({
      operation: "intent",
      intent: "LEAVE_REQUEST",
      confidence: 0.5,
      latency_ms: 3000,
      success: false,
      error: "LLM timeout",
    });

    expect(metric.success).toBe(false);
    expect(metric.error).toBe("LLM timeout");
  });
});

describe("LLMObservabilityTracker", () => {
  let tracker;

  beforeEach(() => {
    tracker = new LLMObservabilityTracker(100);
  });

  test("should record metrics", () => {
    const metric = new LLMMetrics({
      intent: "GREETING",
      confidence: 0.9,
      latency_ms: 100,
    });

    tracker.record(metric);
    expect(tracker.metrics.length).toBe(1);
    expect(tracker.metrics[0].intent).toBe("GREETING");
  });

  test("should reject non-LLMMetrics objects", () => {
    expect(() => {
      tracker.record({ intent: "GREETING" });
    }).toThrow();
  });

  test("should maintain sliding window", () => {
    const smallTracker = new LLMObservabilityTracker(5);

    for (let i = 0; i < 10; i++) {
      const metric = new LLMMetrics({
        intent: "GREETING",
        confidence: 0.8,
        latency_ms: 100,
      });
      smallTracker.record(metric);
    }

    expect(smallTracker.metrics.length).toBe(5);
  });

  describe("getConfidenceTrend", () => {
    test("should return insufficient_data when < 5 metrics", () => {
      const metric = new LLMMetrics({
        intent: "GREETING",
        confidence: 0.85,
        latency_ms: 100,
      });
      tracker.record(metric);

      const trend = tracker.getConfidenceTrend(null, "intent");
      expect(trend.status).toBe("insufficient_data");
      expect(trend.count).toBe(1);
    });

    test("should detect stable confidence", () => {
      for (let i = 0; i < 10; i++) {
        const metric = new LLMMetrics({
          operation: "intent",
          intent: "GREETING",
          confidence: 0.82 + Math.random() * 0.04, // 0.82-0.86
          latency_ms: 100,
          success: true,
        });
        tracker.record(metric);
      }

      const trend = tracker.getConfidenceTrend(null, "intent");
      expect(trend.status).toBe("ok");
      expect(trend.trend).toBe("stable");
      expect(trend.drift_detected).toBe(false);
    });

    test("should detect degrading confidence", () => {
      // Add older metrics with high confidence
      for (let i = 0; i < 5; i++) {
        const metric = new LLMMetrics({
          operation: "intent",
          intent: "GREETING",
          confidence: 0.95,
          latency_ms: 100,
          success: true,
        });
        tracker.record(metric);
      }

      // Add recent metrics with low confidence
      for (let i = 0; i < 5; i++) {
        const metric = new LLMMetrics({
          operation: "intent",
          intent: "GREETING",
          confidence: 0.75,
          latency_ms: 100,
          success: true,
        });
        tracker.record(metric);
      }

      const trend = tracker.getConfidenceTrend(null, "intent");
      expect(trend.trend).toBe("degrading");
      expect(trend.drift_detected).toBe(true);
      expect(trend.degradation_pct).toBeGreaterThan(0);
    });

    test("should filter by specific intent", () => {
      for (let i = 0; i < 5; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
            intent: "GREETING",
            confidence: 0.9,
            latency_ms: 100,
            success: true,
          })
        );
      }

      for (let i = 0; i < 5; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
            intent: "LEAVE_REQUEST",
            confidence: 0.7,
            latency_ms: 150,
            success: true,
          })
        );
      }

      const greetingTrend = tracker.getConfidenceTrend("GREETING", "intent");
      const leaveTrend = tracker.getConfidenceTrend("LEAVE_REQUEST", "intent");

      expect(greetingTrend.older_batch_avg).toBeGreaterThan(0.85);
      expect(leaveTrend.older_batch_avg).toBeLessThan(0.75);
    });
  });

  describe("getLatencyStats", () => {
    test("should return empty stats for no metrics", () => {
      const stats = tracker.getLatencyStats("intent");
      expect(stats.count).toBe(0);
      expect(stats.p50).toBe(0);
      expect(stats.p95).toBe(0);
      expect(stats.p99).toBe(0);
    });

    test("should calculate percentiles correctly", () => {
      const latencies = [50, 75, 100, 125, 150, 175, 200, 225, 250, 500];

      for (const lat of latencies) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
            latency_ms: lat,
            success: true,
          })
        );
      }

      const stats = tracker.getLatencyStats("intent");
      expect(stats.count).toBe(10);
      expect(stats.p50).toBeGreaterThanOrEqual(100);
      expect(stats.p50).toBeLessThanOrEqual(150);
      expect(stats.p95).toBeGreaterThan(stats.p50);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
      expect(stats.max).toBe(500);
    });

    test("should exclude failed metrics", () => {
      tracker.record(
        new LLMMetrics({
          operation: "intent",
          latency_ms: 100,
          success: true,
        })
      );

      tracker.record(
        new LLMMetrics({
          operation: "intent",
          latency_ms: 5000,
          success: false,
        })
      );

      const stats = tracker.getLatencyStats("intent");
      expect(stats.count).toBe(1);
      expect(stats.p50).toBeLessThan(500); // 5000ms timeout excluded
    });
  });

  describe("getSuccessRateByIntent", () => {
    test("should calculate success rates", () => {
      for (let i = 0; i < 8; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
            intent: "GREETING",
            success: true,
          })
        );
      }

      for (let i = 0; i < 2; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
            intent: "GREETING",
            success: false,
          })
        );
      }

      const rates = tracker.getSuccessRateByIntent("intent");
      expect(rates.GREETING.success_rate).toBe(80);
      expect(rates.GREETING.total).toBe(10);
      expect(rates.GREETING.failures).toBe(2);
    });
  });

  describe("getProviderHealth", () => {
    test("should track provider success rates", () => {
      for (let i = 0; i < 9; i++) {
        tracker.record(
          new LLMMetrics({
            provider: "ollama",
            success: true,
          })
        );
      }

      tracker.record(
        new LLMMetrics({
          provider: "ollama",
          success: false,
        })
      );

      const health = tracker.getProviderHealth();
      expect(health.ollama.health).toBe(90);
      expect(health.ollama.requests).toBe(10);
      expect(health.ollama.failures).toBe(1);
    });

    test("should report multiple providers", () => {
      for (let i = 0; i < 5; i++) {
        tracker.record(
          new LLMMetrics({
            provider: "ollama",
            success: true,
          })
        );
        tracker.record(
          new LLMMetrics({
            provider: "bedrock",
            success: true,
          })
        );
      }

      const health = tracker.getProviderHealth();
      expect(Object.keys(health)).toContain("ollama");
      expect(Object.keys(health)).toContain("bedrock");
      expect(health.ollama.requests).toBe(5);
      expect(health.bedrock.requests).toBe(5);
    });
  });

  describe("getRecentOperations", () => {
    test("should return recent operations in reverse order", () => {
      for (let i = 0; i < 5; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
            intent: `INTENT_${i}`,
          })
        );
      }

      const recent = tracker.getRecentOperations(10);
      expect(recent.length).toBe(5);
      expect(recent[0].intent).toBe("INTENT_4"); // Most recent first
      expect(recent[4].intent).toBe("INTENT_0");
    });

    test("should filter by operation", () => {
      for (let i = 0; i < 3; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
          })
        );
      }

      for (let i = 0; i < 2; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "response",
          })
        );
      }

      const intentOps = tracker.getRecentOperations(10, {
        operation: "intent",
      });
      expect(intentOps.length).toBe(3);
    });

    test("should filter by success status", () => {
      tracker.record(new LLMMetrics({ success: true }));
      tracker.record(new LLMMetrics({ success: false }));
      tracker.record(new LLMMetrics({ success: true }));

      const successful = tracker.getRecentOperations(10, { success: true });
      expect(successful.length).toBe(2);

      const failed = tracker.getRecentOperations(10, { success: false });
      expect(failed.length).toBe(1);
    });

    test("should respect limit parameter", () => {
      for (let i = 0; i < 100; i++) {
        tracker.record(
          new LLMMetrics({
            operation: "intent",
          })
        );
      }

      const recent = tracker.getRecentOperations(10);
      expect(recent.length).toBe(10);
    });
  });
});

describe("getObservabilityTracker (singleton)", () => {
  test("should return same instance on multiple calls", () => {
    const tracker1 = getObservabilityTracker();
    const tracker2 = getObservabilityTracker();
    expect(tracker1).toBe(tracker2);
  });
});
