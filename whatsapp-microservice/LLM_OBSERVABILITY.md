# WhatsApp Chatbot — LLM Observability & Model Drift Detection

## Overview

WorkPing's WhatsApp chatbot includes **integrated LLM observability** that automatically tracks:

- **Intent classification confidence scores** — How confident is the model when detecting user intent?
- **Response generation latency** — How long does the LLM take to generate a response?
- **Model drift detection** — Are we seeing degradation in recent confidence scores?
- **Provider health monitoring** — Is our LLM provider (Ollama, Bedrock, etc.) performing well?
- **Failure tracking** — When do intent detection or response generation fail, and why?

This enables **real-time monitoring** of LLM behavior and **early detection** of model degradation.

---

## Architecture

### Automatic Metrics Collection

Every LLM operation (intent detection or response generation) is automatically logged:

```
User Message
  ↓
[Intent Detection] (intent/intent.llm.js)
  ├─ Extract intent + confidence via LLM
  ├─ Record metrics: latency_ms, confidence, success/failure
  └─ Return intent
    
[Response Generation] (response/llm.generator.js)
  ├─ Build context + conversation history
  ├─ Call LLM for response
  ├─ Record metrics: latency_ms, intent, success/failure
  └─ Return response
    
[Metrics Recorded]
  ├─ Timestamp (ISO format)
  ├─ Operation type (intent | response)
  ├─ Intent classification (e.g., GREETING, LEAVE_REQUEST)
  ├─ Confidence score (0.0–1.0)
  ├─ Latency (milliseconds)
  ├─ Success/failure status
  ├─ LLM provider (ollama, bedrock, openai, etc.)
  ├─ User ID
  └─ Error message (if failed)
```

### LLMMetrics Data Structure

```javascript
class LLMMetrics {
  timestamp: "2025-01-15T10:30:45.123Z"    // ISO timestamp
  operation: "intent" | "response"          // What type of LLM call?
  intent: "GREETING"                        // Detected intent (null for response)
  confidence: 0.92                          // 0.0–1.0, confidence in intent
  latency_ms: 245.3                         // Roundtrip time to LLM
  success: true                             // Did the LLM call succeed?
  tokens_used: 150                          // Prompt + completion tokens
  provider: "ollama"                        // Which LLM provider?
  organization_id: "default"                // Multi-tenant org ID
  user_id: "91xxxxxxxxxx"                   // WhatsApp phone number
  error: null                               // Error message if !success
}
```

---

## Analytics Endpoints

All analytics endpoints are **protected by dashboard authentication** (`x-dashboard-token` header).

### 1. Confidence Trends & Model Drift Detection

```
GET /api/dashboard/llm/metrics?operation=intent&intent=GREETING
```

Detects model drift by comparing older vs. recent confidence scores:

**Response**:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "intent_detection": {
    "status": "ok",
    "trend": "stable",
    "intent": "GREETING",
    "older_batch_avg": 0.876,
    "recent_batch_avg": 0.872,
    "degradation_pct": 0.4,
    "drift_detected": false,
    "batch_size": 50
  },
  "response_generation": {
    "status": "ok",
    "trend": "degrading",
    "drift_detected": true,
    "older_batch_avg": 0.88,
    "recent_batch_avg": 0.80,
    "degradation_pct": 8.0
  },
  "success_by_intent": {
    "GREETING": { "success_rate": 98.5, "total": 200, "failures": 3 },
    "LEAVE_REQUEST": { "success_rate": 95.0, "total": 100, "failures": 5 },
    "UNKNOWN": { "success_rate": 85.0, "total": 50, "failures": 8 }
  },
  "provider_health": {
    "ollama": { "health": 99.0, "requests": 300, "failures": 3 },
    "bedrock": { "health": 98.5, "requests": 200, "failures": 3 }
  },
  "latency_stats": {
    "intent_detection": {
      "p50": 120.5,
      "p95": 285.3,
      "p99": 512.1,
      "mean": 165.2,
      "max": 3240.0
    },
    "response_generation": {
      "p50": 250.3,
      "p95": 750.5,
      "p99": 1200.0,
      "mean": 420.1,
      "max": 5000.0
    }
  }
}
```

**Interpretation**:
- `trend: "stable"` → No model drift
- `trend: "degrading"` → Recent confidence is lower; investigate
- `drift_detected: true` → Confidence dropped >5%; escalate alert
- `success_rate < 90%` → High failure rate for this intent; check LLM

---

### 2. Search History (Audit Log)

```
GET /api/dashboard/llm/history?limit=100&operation=intent&success=false
```

Returns recent LLM operations for debugging and auditing.

**Response**:
```json
{
  "count": 10,
  "limit": 100,
  "filters": {
    "operation": "intent",
    "intent": "all",
    "success": false
  },
  "history": [
    {
      "timestamp": "2025-01-15T10:29:45.123Z",
      "operation": "intent",
      "intent": "UNKNOWN",
      "confidence": 0.42,
      "latency_ms": 3250.0,
      "success": false,
      "provider": "ollama",
      "user_id": "91xxxxxxxxxx",
      "tokens_used": 0,
      "error": "LLM request timeout after 3s"
    },
    {
      "timestamp": "2025-01-15T10:29:30.456Z",
      "operation": "intent",
      "intent": "UNKNOWN",
      "confidence": 0.50,
      "latency_ms": 125.3,
      "success": false,
      "provider": "ollama",
      "user_id": "91xxxxxxxxxx",
      "tokens_used": 0,
      "error": "Invalid JSON in response"
    }
  ]
}
```

**Use Cases**:
- Debug why specific intents are failing
- Investigate low-confidence detections
- Audit which users experienced errors
- Check if a provider is having outages

---

### 3. Quick Drift Summary (Dashboard Widget)

```
GET /api/dashboard/llm/drift-summary
```

Single endpoint for dashboard status indicator.

**Response**:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "status": "degraded",
  "drift_detected": true,
  "alerts": [
    {
      "type": "drift",
      "severity": "high",
      "message": "Intent classification confidence degraded by 8.0%",
      "older_avg": 0.876,
      "recent_avg": 0.805
    },
    {
      "type": "provider",
      "severity": "warning",
      "message": "ollama provider health: 85%",
      "failures": 15
    }
  ],
  "summary": {
    "intent_confidence": 0.805,
    "response_confidence": 0.820,
    "provider_health": {
      "ollama": { "health": 85, "requests": 300, "failures": 15 },
      "bedrock": { "health": 98.5, "requests": 200, "failures": 3 }
    }
  }
}
```

**Status Values**:
- `"healthy"` — All metrics OK, no alerts
- `"degraded"` — Warnings (e.g., health < 90%)
- `"critical"` — Severe issues (e.g., provider health < 50%)

---

## Integration Points

### 1. Intent Detection (intent/intent.llm.js)

```javascript
import { detectIntent } from "./intent/intent.llm.js";

const result = await detectIntent(userMessage, {
  userId: phoneNumber,
  organizationId: "org_1",
});

// Automatically logged:
// - operation: "intent"
// - intent: result.intent
// - confidence: result.confidence
// - latency_ms: (computed)
// - success: (computed from parsing)
```

### 2. Response Generation (response/llm.generator.js)

```javascript
import { generateLLMResponse } from "./response/llm.generator.js";

const response = await generateLLMResponse(strategy, context, internalMessage, {
  organizationId: "org_1",
});

// Automatically logged:
// - operation: "response"
// - intent: context.intent.intent
// - confidence: context.intent.confidence
// - latency_ms: (computed)
// - success: (computed from error handling)
```

### 3. Message Pipeline (pipeline/message.pipeline.js)

Both `detectIntent()` and `generateLLMResponse()` automatically record metrics. **No additional code required** — observability is transparent.

---

## Model Drift Detection Algorithm

### How It Works

1. **Collect Metrics**: Every intent detection/response is logged
2. **Batch Splitting**: Recent 1,000 operations split into two equal halves
   - Older half: operations from 500–1,000 records ago
   - Recent half: operations from 0–500 records ago
3. **Compare Averages**:
   - Older batch avg confidence: 0.876
   - Recent batch avg confidence: 0.805
   - Degradation: 0.876 - 0.805 = 0.071 (7.1%)
4. **Detect Drift**: If degradation > 5%, flag as `drift_detected: true`

### Example Scenarios

**Scenario 1: Stable Model**
```
Older batch: [0.85, 0.88, 0.86, 0.87, 0.84] → avg = 0.860
Recent batch: [0.86, 0.85, 0.87, 0.88, 0.84] → avg = 0.860
Degradation: 0% → trend = "stable", drift_detected = false ✅
```

**Scenario 2: Gradual Degradation**
```
Older batch: [0.90, 0.91, 0.89, 0.92, 0.90] → avg = 0.904
Recent batch: [0.80, 0.82, 0.81, 0.79, 0.80] → avg = 0.804
Degradation: 10% → trend = "degrading", drift_detected = true ⚠️
```

**What to Do**:
- Check if training data has changed
- Verify LLM provider is not degrading
- Check if user distribution has shifted (e.g., more typos, regional languages)
- Consider retraining or prompt tuning

---

## Performance Characteristics

### Latency Benchmarks

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Intent detection | 120–200 ms | 250–400 ms | 500–1000 ms |
| Response generation | 300–500 ms | 800–1200 ms | 2000–5000 ms |

**Note**: Latency depends on LLM provider:
- **Ollama (local)**: 150–400 ms
- **Bedrock (AWS)**: 200–600 ms
- **OpenAI API**: 400–1500 ms (network dependent)
- **Groq**: 100–300 ms (fast inference)

### Sliding Window

- Last **1,000 operations** kept in memory
- Older metrics discarded automatically
- Fits in ~100 KB RAM

---

## Configuration

### Environment Variables

```bash
# LLM Provider (used in observability logs)
LLM_PROVIDER=ollama              # Options: ollama, bedrock, openai, groq, openrouter, mistral

# Optional: Data retention
# LLM_METRICS_WINDOW=1000         # Keep last N operations (default: 1000)
```

### Alert Thresholds

Edit `llm.analytics.js` to customize:

```javascript
// Model drift threshold
const DRIFT_THRESHOLD = 0.05; // 5% degradation = drift

// Provider health warning
const PROVIDER_HEALTH_WARNING = 90; // < 90% = warning
const PROVIDER_HEALTH_CRITICAL = 50; // < 50% = critical
```

---

## Testing

```bash
# Run observability tests
npm test -- tests/unit/llm.observability.test.js

# Run with coverage
npm test -- --coverage tests/unit/llm.observability.test.js
```

Expected output:
```
LLMMetrics › should create metric with default values ✓
LLMObservabilityTracker › should record metrics ✓
LLMObservabilityTracker › getConfidenceTrend › should detect stable confidence ✓
LLMObservabilityTracker › getConfidenceTrend › should detect degrading confidence ✓
LLMObservabilityTracker › getLatencyStats › should calculate percentiles correctly ✓
...
✓ 25 tests passed
```

---

## Dashboard Integration

### Sample Dashboard Widgets

**1. Status Indicator**
```
GET /api/dashboard/llm/drift-summary

Display:
├─ Status: 🟢 Healthy / 🟡 Degraded / 🔴 Critical
├─ Drift Alerts: [list]
├─ Intent Confidence: 0.805 (was 0.876)
├─ Response Confidence: 0.820
└─ Provider Health: ollama: 85%, bedrock: 98%
```

**2. Confidence Trend Chart**
```
GET /api/dashboard/llm/metrics?operation=intent

Display:
├─ Older Batch Avg: 0.876 ─── [Line Chart] ─── Recent Batch Avg: 0.805
├─ Trend: Degrading ⚠️
├─ Degradation: 8% over last 500 operations
└─ Alert: [Contact ML team if drops further]
```

**3. Latency SLA Monitor**
```
GET /api/dashboard/llm/metrics

Display:
├─ Intent Detection P95: 285 ms (SLA: 500 ms) ✓
├─ Response Generation P95: 750 ms (SLA: 1000 ms) ✓
└─ Provider Response Time: ollama: 165 ms avg, bedrock: 320 ms avg
```

**4. Error Audit Log**
```
GET /api/dashboard/llm/history?success=false

Display:
├─ Total Failures (last 100 ops): 3
├─ Failure Rate: 3%
├─ Recent Errors:
│  ├─ 2025-01-15 10:29:45 — Intent detection timeout (ollama)
│  ├─ 2025-01-15 10:29:30 — Invalid JSON response
│  └─ 2025-01-15 10:28:15 — bedrock provider unavailable
└─ Action: Check LLM provider status
```

---

## Troubleshooting

### High Drift Detected

```
Problem: drift_detected = true, degradation_pct = 12%

Diagnosis:
1. Check provider health: GET /api/dashboard/llm/metrics
2. Review error logs: GET /api/dashboard/llm/history?success=false
3. Check user message distribution: changed language? typos?
4. Check prompt freshness: was INTENT_SYSTEM_PROMPT modified?

Action:
- If provider errors: switch to backup provider
- If prompt degraded: revert to previous version
- If user behavior changed: retrain on new examples
```

### High Latency (P95 > 1000 ms)

```
Problem: response_generation.latency_stats.p95 = 1500 ms

Diagnosis:
1. Check which provider: GET /api/dashboard/llm/metrics
2. Is it consistent? GET /api/dashboard/llm/history?operation=response
3. Network latency? (bedrock/openai are slower than ollama)

Action:
- For Ollama: Check CPU/GPU, increase workers
- For AWS Bedrock: Check VPC routing, increase concurrency
- For OpenAI: Use streaming, batch requests
```

### Provider Health < 50%

```
Problem: provider_health.ollama.health = 45%

Diagnosis:
1. Check recent errors: GET /api/dashboard/llm/history?operation=intent
2. Check failure pattern: continuous or intermittent?
3. Check provider logs: is Ollama service running?

Action:
- Restart Ollama: systemctl restart ollama
- Switch to backup: POST /api/dashboard/provider { "provider": "bedrock" }
- Scale horizontally: add more Ollama replicas
```

---

## Related Docs

- [Face Search Observability](../face-api-microservice/FACE_SEARCH_GUIDE.md) — Similar pattern for face recognition
- [WhatsApp Chatbot Architecture](./server.js) — Main server overview
- [Intent System Prompts](./utils/intent.prompts.js) — LLM prompt engineering
- [Message Pipeline](./pipeline/message.pipeline.js) — Full request flow
