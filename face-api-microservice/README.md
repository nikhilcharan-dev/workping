# WorkPing Biometric Service

Python microservice for face recognition enrollment, 1:1 verification, 1:N kiosk identification, and Phase 1 liveness detection. Runs InsightFace AntelopeV2 (SCRFD detection + ArcFace R100 embeddings) with FAISS-backed per-organisation indexes and an async Redis inference queue.

## Tech Stack

- **Runtime**: Python 3.10
- **Framework**: FastAPI
- **Server**: Uvicorn (ASGI, async)
- **Face Detection**: InsightFace AntelopeV2 — SCRFD face detector + ArcFace R100 (512-dim L2-normalised embeddings)
- **Vector Search**: FAISS `IndexFlatIP` (faiss-cpu) — per-org in-memory index for 1:N kiosk-mode identification
- **Numerical compute**: NumPy (cosine similarity, embedding arithmetic)
- **Liveness detection**: OpenCV (opencv-python-headless) — Farneback dense optical-flow PAD
- **Scientific utilities**: scipy
- **Inference runtime**: onnxruntime-gpu (CUDA auto-detected; falls back to CPU ONNX)
- **Database**: MongoDB via Motor (async driver) — enrolled embeddings
- **Cache / Queue**: Redis (`redis[hiredis]`) — embedding cache, BLPOP inference task queue, result ticket TTL

## Key Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/enroll` | Extract 512-dim embedding and upsert into MongoDB + FAISS index |
| `POST` | `/api/v1/detect` | Submit face verification task to Redis queue; returns `ticket_id` |
| `GET` | `/api/v1/ticket/{ticket_id}` | Poll async inference result |
| `POST` | `/api/v1/faiss/search` | 1:N FAISS bulk identification (kiosk mode) |
| `POST` | `/api/v1/faiss/index/build` | Rebuild per-org FAISS index from MongoDB |
| `POST` | `/api/v1/liveness/check` | Phase 1 PAD — multi-frame Farneback optical-flow spoofing detection |
| `GET` | `/api/v1/analytics/productivity` | Per-org AI productivity insights (confidence trends, P95 latency, efficiency) |
| `GET` | `/api/v1/embeddings/{employee_id}` | Check enrollment status |
| `DELETE` | `/api/v1/embeddings/{employee_id}` | Remove embedding |
| `GET` | `/dashboard` | Live inference monitor (WebSocket) |

## Inference Architecture

```
HTTP POST /api/v1/detect
    │  (validate + rate-limit)
    ▼
Redis RPUSH face_tasks_queue
    │
    ▼
inference_worker (asyncio)
    │  BLPOP — non-blocking
    ▼
ThreadPoolExecutor
    │  SCRFD + ArcFace R100 (ONNX)
    ▼
cosine_similarity(query_emb, stored_emb)
    │
    ▼
Redis SETEX ticket:<uuid>  TTL=300s

Client polls GET /api/v1/ticket/{ticket_id}
```

HTTP latency is fully decoupled from GPU/CPU inference latency. Multiple worker replicas sharing the same Redis queue scale horizontally.

## Liveness Detection — Phase 1

`POST /api/v1/liveness/check` accepts 2–5 sequential base64 frames captured ~150 ms apart.

`_analyze_liveness_frames()` computes Farneback dense optical flow (`cv2.calcOpticalFlowFarneback`) between consecutive frames. A static photo or screen-replay attack produces near-zero inter-frame motion variance; a live face produces natural micro-movements above the empirical thresholds (`mean_motion > 0.08`, `variance > 0.0005`). Returns `is_live`, `confidence`, `mean_motion`, and `motion_variance`.

Phase 2 will integrate a dedicated ML-based Silent Face Anti-Spoofing (SilentFace ONNX) model.

## AI Productivity Insights

`GET /api/v1/analytics/productivity` aggregates per-org metrics from the `StatsTracker` rolling deque: `avg_confidence_score`, `confidence_trend` (improving / stable), `p95_inference_latency_ms`, `system_efficiency_pct`, and `faiss_index_size`.

## Getting Started

```bash
cd face-api-microservice
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set MONGO_URI, REDIS_URL, API_KEY
uvicorn app:app --reload --port 8001
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | `redis://:<password>@<host>:6379` |
| `API_KEY` | Shared secret for inter-service calls |
| `INFERENCE_WORKERS` | ThreadPoolExecutor size (default: CPU count) |
| `RATE_LIMIT_REQUESTS` | Max inferences per user per window (default: 30) |
| `CACHE_TTL` | Embedding cache TTL in seconds |

## Related Services

- [workping-api](../centralized-server/server) — calls `/api/v1/detect` and `/api/v1/enroll`
- [workping-admin](../admin-ui) — enrollment UI (react-webcam capture)
- [workping-mobile](../mobile-app) — GPS-validated face check-in
