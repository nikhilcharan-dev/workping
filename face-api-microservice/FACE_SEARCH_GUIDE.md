# Face Search Implementation: 1:1 and 1:N

## Overview

WorkPing's face recognition system supports two search modes:

- **1:1 Verification**: Single-user face verification (known employee ID)
- **1:N Identification**: Organization-wide face search (unknown employee ID)

Both modes use **InsightFace AntelopeV2** for embedding extraction and **FAISS IndexFlatIP** for 1:N bulk search, with integrated observability for model drift detection.

---

## Architecture

### 1:1 Face Verification (Single-User Match)

**Use Case**: Attendance punch-in when employee ID is known

```
Mobile Camera Frame
    ↓
[Image Validation] → Size checks
    ↓
[InsightFace Extract] → 512-D ArcFace R100 embedding
    ↓
[Redis Cache Check] → Retrieve stored employee embedding
    ↓
[Cosine Similarity] → Compare embeddings via dot product
    ↓
[Threshold Check] → Score ≥ 0.6 → MATCH
    ↓
[Metrics Record] → Confidence score + latency to analytics
```

**Key Features**:
- Direct numpy dot product comparison (fast, O(1))
- Redis embedding cache (5-min TTL)
- MongoDB fallback for cache miss
- Threshold: 0.6 (tunable per deployment)

**Endpoint**:
```
POST /api/v1/detect
{
  "image_base64": "...",
  "user_id": "emp_123",
  "organization_id": "org_1"
}
```

**Response**:
```json
{
  "status": "queued",
  "ticket_id": "uuid",
  "position": 42
}

// Poll /api/v1/ticket/{ticket_id}
{
  "status": "completed",
  "result": {
    "success": true,
    "person": {"id": "emp_123", "name": "...", "department": "..."},
    "confidence": 0.876,
    "embedding_time_ms": 245.5,
    "search_time_ms": 12.3,
    "total_time_ms": 257.8
  }
}
```

---

### 1:N Face Identification (Org-Wide Search)

**Use Case**: Kiosk-mode attendance where employee doesn't know their ID

```
Mobile Camera Frame
    ↓
[Image Validation] → Size checks
    ↓
[InsightFace Extract] → 512-D ArcFace R100 embedding
    ↓
[FAISS IndexFlatIP Search] → Find top-k similar employees
    ↓
[Threshold Filter] → Keep matches with score ≥ 0.6
    ↓
[Return Top-k] → Ranked list of probable employees
    ↓
[Metrics Record] → Confidence score + index size to analytics
```

**Key Features**:
- FAISS IndexFlatIP (Inner Product on L2-normalized vectors = cosine similarity)
- Per-organization index (~1,000s of employees)
- Index persisted to disk for fast startup
- Threshold: 0.6 (tunable per deployment)
- Returns top-k (default 5) candidates

**Endpoint**:
```
POST /api/v1/faiss/search
{
  "image_base64": "...",
  "organization_id": "org_1",
  "top_k": 5
}
```

**Response**:
```json
{
  "matches": [
    {"employee_id": "emp_123", "score": 0.923},
    {"employee_id": "emp_456", "score": 0.812},
    {"employee_id": "emp_789", "score": 0.701}
  ],
  "index_size": 1024,
  "threshold": 0.6,
  "confidence": 0.923,
  "total_time_ms": 287.5
}
```

---

## Dependencies

### Required Packages

| Package | Purpose | Justification |
|---------|---------|---------------|
| `insightface` | Face detection + ArcFace embeddings | State-of-the-art; AntelopeV2 is modern & optimized |
| `onnxruntime-gpu` | Model inference (ONNX models) | GPU acceleration for embedding extraction |
| `faiss-cpu` | 1:N vector similarity search | Fast, proven for 1M+ vector search; production-grade |
| `numpy` | Vector operations | Required by InsightFace and FAISS |
| `opencv-python-headless` | Image I/O and optical flow | Liveness detection + image preprocessing |
| `motor` | Async MongoDB driver | Async embedding storage |
| `redis[hiredis]` | Caching + task queue | In-memory cache (5-min TTL) + inference queue |
| `fastapi` | HTTP API framework | Async, modern, well-tested |
| `uvicorn` | ASGI server | FastAPI requirement |
| `scipy` | Statistical operations | Liveness detection (motion analysis) |
| `pydantic` | Request validation | FastAPI dependency |

**Note**: Both `faiss-cpu` and `insightface` are **actively used** and **not redundant**.

---

## Unified Search Engine

### FaceSearchEngine Class

```python
from face_search import get_search_engine

engine = get_search_engine()

# 1:1 Search
result = engine.search_1to1(
    query_embedding=query_emb,          # 512-D numpy array
    reference_embedding=ref_emb,        # 512-D numpy array
    organization_id="org_1",
    employee_id="emp_123",
    emb_time_ms=245.5
)

# 1:N Search
result = engine.search_1toN(
    query_embedding=query_emb,
    faiss_matches=[
        {"employee_id": "emp_123", "score": 0.92},
        {"employee_id": "emp_456", "score": 0.78}
    ],
    organization_id="org_1",
    emb_time_ms=245.5,
    search_time_ms=42.0,
    index_size=1024
)
```

### SearchResult Fields

```python
@dataclass
class SearchResult:
    success: bool                    # Did it match above threshold?
    matches: List[dict]             # [{employee_id, score}]
    confidence_score: float         # Best match score (0-1)
    search_type: str               # "1:1" or "1:N"
    emb_time_ms: float            # Embedding extraction latency
    search_time_ms: float         # Similarity search latency
    total_time_ms: float          # Total end-to-end latency
    threshold: float              # Cosine similarity threshold
```

---

## Observability & Model Drift Detection

### Search Metrics Tracking

Every search (1:1 and 1:N) is automatically logged with:

```python
@dataclass
class SearchMetrics:
    timestamp: str               # ISO format
    search_type: str            # "1:1" or "1:N"
    organization_id: str
    employee_id: Optional[str]
    confidence_score: float     # Best match confidence
    success: bool              # Matched above threshold?
    emb_latency_ms: float     # Embedding extraction time
    search_latency_ms: float  # Search time
    total_latency_ms: float   # Total time
    query_index_size: int     # FAISS index size (1 for 1:1)
```

### Analytics Endpoints

#### 1. Confidence Trend & Drift Detection

```
GET /api/v1/analytics/search-metrics?search_type=1:1
```

Detects model drift by comparing older vs. recent confidence scores:

```json
{
  "timestamp": "2025-01-15T10:30:00",
  "1:1": {
    "confidence_trend": {
      "status": "ok",
      "trend": "stable",
      "older_batch_avg": 0.876,
      "recent_batch_avg": 0.872,
      "drift_detected": false
    },
    "latency_stats": {
      "p50": 120.5,
      "p95": 285.3,
      "p99": 512.1
    }
  },
  "1:N": {
    "confidence_trend": {...},
    "latency_stats": {...}
  }
}
```

**Interpretation**:
- `trend: "stable"` → No model drift
- `trend: "degrading"` → Recent confidence scores are lower; investigate embedding quality
- `drift_detected: true` → Confidence dropped >5% recently

#### 2. Search History (Audit Log)

```
GET /api/v1/analytics/search-history?search_type=1:1&limit=100
```

Returns recent searches for debugging and auditing:

```json
{
  "count": 50,
  "search_type_filter": "1:1",
  "history": [
    {
      "timestamp": "2025-01-15T10:29:45",
      "search_type": "1:1",
      "organization_id": "org_1",
      "employee_id": "emp_123",
      "confidence_score": 0.876,
      "success": true,
      "total_latency_ms": 257.8,
      "emb_latency_ms": 245.5,
      "search_latency_ms": 12.3,
      "index_size": 1
    }
  ]
}
```

---

## Performance Characteristics

### 1:1 Verification

| Metric | Typical Value |
|--------|---------------|
| Embedding extraction | 100–300 ms |
| Cosine similarity (1 vector) | 0.1–5 ms |
| **Total latency** | **100–305 ms** |
| Memory per embedding | 2 KB (512×float32) |

### 1:N Identification

| Metric | 1,000 Employees | 10,000 Employees |
|--------|-----------------|-----------------|
| Embedding extraction | 100–300 ms | 100–300 ms |
| FAISS search | 5–20 ms | 10–50 ms |
| **Total latency** | **105–320 ms** | **110–350 ms** |
| Index size (RAM) | ~2 MB | ~20 MB |
| Index persistence | ~2 MB disk | ~20 MB disk |

**Note**: FAISS IndexFlatIP scales linearly with vector count but remains <50ms for millions of vectors on modern hardware.

---

## Testing

Run the unified search tests:

```bash
pytest tests/test_unified_search.py -v
```

### Test Coverage

- ✅ 1:1 match/no-match scenarios
- ✅ 1:N identification with top-k results
- ✅ Threshold sensitivity
- ✅ Metrics recording (confidence, latency)
- ✅ Model drift detection
- ✅ Latency percentile calculations (P50, P95, P99)

---

## Configuration

### Environment Variables

```bash
# Threshold tuning
THRESHOLD=0.65                          # Default: 0.6 (higher = stricter)

# Inference workers
INFERENCE_WORKERS=4                     # Default: CPU count (async pool)

# Rate limiting
RATE_LIMIT_REQUESTS=30                  # Max requests per window
RATE_LIMIT_WINDOW_SECONDS=60           # Window duration (seconds)

# FAISS index persistence
FAISS_PERSIST_DIR=/tmp/faiss_indexes   # Where to save/load indexes

# Cache TTL
# CACHE_TTL is hardcoded to 300s (5 minutes) in cache.py
```

---

## Troubleshooting

### High Confidence Drift

**Problem**: Recent `/api/v1/analytics/search-metrics` shows `drift_detected: true`

**Diagnosis**:
1. Check `/api/v1/analytics/search-history` for false negatives
2. Verify image quality (lighting, face angle)
3. Check InsightFace model is loaded: `GET /api/v1/health` → `"inference_provider": "cuda"` or `"tensorrt"`

**Fix**:
- Retrain with fresher enrollment images
- Adjust `THRESHOLD` down (more permissive, but more false positives)

### Slow 1:N Searches

**Problem**: `/api/v1/faiss/search` latency > 500ms

**Diagnosis**:
1. Check FAISS index size: `response["index_size"]`
2. Check if FAISS loaded from disk (fast) vs rebuilt (slow):
   - Rebuilt indices take 1–5s per 1,000 employees
3. Check GPU availability: `GET /api/v1/health` → `"gpu_available": true/false`

**Fix**:
- Rebuild FAISS index: `POST /api/v1/faiss/index/build?organization_id=org_1`
- Ensure TensorRT/CUDA is available for GPU acceleration

### Memory Usage

**Problem**: Memory grows unbounded

**Diagnosis**:
1. FAISS indices per org: `N_orgs × N_employees × 512 × 4 bytes`
2. SearchMetricsTracker: ~1,000 recent searches (small, ~100 KB)
3. Redis embedding cache: Depends on active employee count

**Fix**:
- Limit SearchMetricsTracker window (see code: `window_size = 1000`)
- Increase Redis memory allocation
- Archive old metrics to data warehouse

---

## Related Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System-wide design
- [API Docs](./API.md) — Full endpoint reference
- [Deployment Guide](./DEPLOYMENT.md) — Kubernetes/Docker setup
