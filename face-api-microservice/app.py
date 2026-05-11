"""
WorkPing Biometric Service  (workping-biometric)
================================================
Face recognition microservice built on InsightFace (AntelopeV2) and FastAPI.

FACE RECOGNITION PIPELINE
--------------------------
1. Input: base64-encoded JPEG/PNG frame from mobile camera or webcam
2. InsightFace AntelopeV2: SCRFD (face detection) + ArcFace R100 (embedding extraction)
3. Produces a 512-dimensional L2-normalised embedding vector
4. Cosine similarity via numpy dot product of unit vectors against the stored embedding
5. THRESHOLD = 0.6 — scores above this are accepted as a MATCH

INFERENCE ARCHITECTURE (async + threaded)
-----------------------------------------
HTTP endpoints push tasks onto a Redis list (face_tasks_queue) and return a ticket ID.
A background asyncio worker (inference_worker) pops tasks from the queue, calls
InsightFace in a ThreadPoolExecutor (keeps the event loop unblocked), and writes
the result back into Redis with a 5-minute TTL. The caller polls /result/<ticket_id>.

This decouples HTTP latency from GPU inference latency and allows horizontal scaling
by adding more worker replicas that share the same Redis queue.

CACHING LAYERS
--------------
- Redis embedding cache: embedding_key(org, emp) -> serialized numpy float32 array
  TTL = CACHE_TTL. Avoids a MongoDB read on every detection for active users.
- Redis ticket cache: ticket:<uuid> -> JSON result, TTL = 300s.
  Allows async polling without blocking the HTTP thread during inference.

NOTE: FAISS IndexFlatIP is used for org-level bulk search (/faiss/* routes).
      Single-user verification uses direct cosine similarity (faster for 1:1 match).
"""

import json
import numpy as np
import base64
import time
import os
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from collections import deque
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from embedding import get_face_embedding_from_bytes, load_face_app, is_gpu_available, _active_provider
from db import get_embeddings_collection
from cache import embedding_key, cache_get, cache_set, cache_del, CACHE_TTL, _get_redis
from face_search import get_search_engine

import faiss

# ---------------- CONFIG ----------------
DIM = 512          # ArcFace R100 produces 512-dim embeddings
THRESHOLD = 0.6    # Cosine similarity cutoff; tune per deployment (higher = stricter)
START_TIME = time.time()
HISTORY_LIMIT = 50

# ---------------- FAISS INDEX (org-level 1:N search) ----------------
class FAISSIndex:
    """In-memory FAISS IndexFlatIP per organization for fast 1:N identification.
    Used for kiosk-mode attendance where employee_id is unknown upfront.
    Rebuilt on startup from MongoDB; kept in sync on every enroll/delete."""

    def __init__(self):
        self._indexes: dict = {}   # org_id → faiss.IndexFlatIP
        self._id_maps: dict = {}   # org_id → list[employee_id]
        self._persist_dir = Path(os.environ.get("FAISS_PERSIST_DIR", "/tmp/faiss_indexes"))
        self._persist_dir.mkdir(parents=True, exist_ok=True)

    def _ensure(self, org_id: str):
        if org_id not in self._indexes:
            self._indexes[org_id] = faiss.IndexFlatIP(DIM)
            self._id_maps[org_id] = []

    def add(self, org_id: str, employee_id: str, embedding: np.ndarray):
        self._ensure(org_id)
        vec = embedding.astype(np.float32).reshape(1, -1)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        self._indexes[org_id].add(vec)
        self._id_maps[org_id].append(employee_id)

    def search(self, org_id: str, query: np.ndarray, k: int = 5) -> list:
        if org_id not in self._indexes or self._indexes[org_id].ntotal == 0:
            return []
        idx = self._indexes[org_id]
        ids = self._id_maps[org_id]
        q = query.astype(np.float32).reshape(1, -1)
        norm = np.linalg.norm(q)
        if norm > 0:
            q = q / norm
        k = min(k, idx.ntotal)
        distances, indices = idx.search(q, k)
        return [
            {"employee_id": ids[i], "score": round(float(d), 4)}
            for i, d in zip(indices[0], distances[0])
            if i >= 0 and float(d) >= THRESHOLD
        ]

    def rebuild(self, org_id: str, records: list):
        self._indexes[org_id] = faiss.IndexFlatIP(DIM)
        self._id_maps[org_id] = []
        for r in records:
            emb = np.array(r["embedding"], dtype=np.float32)
            self.add(org_id, r["employee_id"], emb)

    def size(self, org_id: str) -> int:
        return self._indexes[org_id].ntotal if org_id in self._indexes else 0

    def save(self, org_id: str):
        """Persist index and id_map to disk."""
        if org_id not in self._indexes:
            return
        try:
            index_path = self._persist_dir / f"{org_id}.index"
            map_path = self._persist_dir / f"{org_id}.map.json"
            faiss.write_index(self._indexes[org_id], str(index_path))
            with open(map_path, "w") as f:
                json.dump(self._id_maps[org_id], f)
        except Exception as e:
            print(f"FAISS persist warning for {org_id}: {e}")

    def load(self, org_id: str) -> bool:
        """Load index and id_map from disk. Returns True if successful."""
        try:
            index_path = self._persist_dir / f"{org_id}.index"
            map_path = self._persist_dir / f"{org_id}.map.json"
            if not index_path.exists() or not map_path.exists():
                return False
            self._indexes[org_id] = faiss.read_index(str(index_path))
            with open(map_path, "r") as f:
                self._id_maps[org_id] = json.load(f)
            return True
        except Exception as e:
            print(f"FAISS load warning for {org_id}: {e}")
            return False

faiss_index = FAISSIndex()

# 5 MB decoded → ~6.9 MB base64 chars; cap the string length conservatively
MAX_IMAGE_B64_LEN = int(os.environ.get("MAX_IMAGE_B64_BYTES", str(7 * 1024 * 1024)))
MAX_IMAGE_BYTES = 5 * 1024 * 1024   # 5 MB after decoding

# Per-user inference rate limit: max N requests per window
RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", "30"))
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))

# Liveness detection thresholds for optical flow analysis (configurable per deployment)
LIVENESS_MOTION_THRESHOLD = float(os.environ.get("LIVENESS_MOTION_THRESHOLD", "0.08"))
LIVENESS_VARIANCE_THRESHOLD = float(os.environ.get("LIVENESS_VARIANCE_THRESHOLD", "0.0005"))

# FAISS index health flag - set to False if indexes fail to load during startup
FAISS_READY = False

# ---------------- MODELS ----------------
class EnrollRequest(BaseModel):
    image_base64: str
    employee_id: str
    organization_id: str

class DetectRequest(BaseModel):
    image_base64: str
    user_id: str
    organization_id: str

class ExtractEmbeddingRequest(BaseModel):
    image_base64: str

# ---------------- STATS ----------------
class StatsTracker:
    def __init__(self):
        self.total_processed = 0
        self.total_matches = 0
        self.total_latency = 0.0
        self.history = deque(maxlen=HISTORY_LIMIT)

    def add_entry(self, label, accuracy, time_ms, success):
        self.total_processed += 1
        if success:
            self.total_matches += 1
        self.total_latency += time_ms
        entry = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "label": label,
            "accuracy": round(accuracy, 3),
            "time_ms": round(time_ms, 2),
            "status": "MATCH" if success else "UNKNOWN",
        }
        self.history.appendleft(entry)
        return entry

    def get_analytics(self):
        avg = self.total_latency / self.total_processed if self.total_processed else 0
        rate = (self.total_matches / self.total_processed * 100) if self.total_processed else 0
        return {
            "total_processed": self.total_processed,
            "avg_latency": round(avg, 2),
            "match_rate": round(rate, 1),
            "uptime": int(time.time() - START_TIME),
        }

stats = StatsTracker()

# ---------------- WEBSOCKET ----------------
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, msg: dict):
        for ws in self.active:
            await ws.send_json(msg)

manager = ConnectionManager()

# ─────── IN-MEMORY RATE LIMITER (fallback for Redis unavailability) ────────
class MemoryRateLimiter:
    def __init__(self, window_seconds: int):
        self.window_seconds = window_seconds
        self.requests: dict = {}  # user_id -> [(timestamp, count), ...]

    def is_allowed(self, user_id: str, limit: int) -> bool:
        now = time.time()
        if user_id not in self.requests:
            self.requests[user_id] = []

        # Clean old entries outside the window
        self.requests[user_id] = [
            (ts, cnt) for ts, cnt in self.requests[user_id]
            if now - ts < self.window_seconds
        ]

        # Sum requests within window
        total = sum(cnt for _, cnt in self.requests[user_id])
        if total >= limit:
            return False

        # Record this request
        self.requests[user_id].append((now, 1))
        return True

memory_limiter = MemoryRateLimiter(RATE_LIMIT_WINDOW_SECONDS)

# ─────── PROMETHEUS-STYLE METRIC (expose Redis failures) ─────────────────
rate_limit_redis_failures = 0

# ---------------- APP ----------------
app = FastAPI(title="Face Recognition API - v3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://workping.live",
        "https://www.workping.live",
        "https://admin.workping.live",
        "https://api.workping.live",
        "https://employee.workping.live",
        "https://whatsapp.workping.live",
        "https://phonepe.workping.live"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Preloading InsightFace antelopev2 model...")
load_face_app()
print("InsightFace model ready")

# 0 → use all CPU cores (keeps every GPU CUDA stream fed)
_cfg_workers = int(os.environ.get("INFERENCE_WORKERS", "0"))
INFERENCE_WORKERS = _cfg_workers if _cfg_workers > 0 else (os.cpu_count() or 8)
print(f"Inference workers: {INFERENCE_WORKERS}")

executor = ThreadPoolExecutor(max_workers=INFERENCE_WORKERS)

def do_inference(image_bytes, db_emb, org_id, req_user_id):
    start_emb = time.time()
    query_emb = get_face_embedding_from_bytes(image_bytes)
    emb_time = (time.time() - start_emb) * 1000

    search_engine = get_search_engine()
    result = search_engine.search_1to1(
        query_embedding=query_emb,
        reference_embedding=db_emb,
        organization_id=org_id,
        employee_id=req_user_id,
        emb_time_ms=emb_time,
    )

    return {
        "success": result.success,
        "score": result.confidence_score,
        "matched_id": req_user_id if result.success else "Unknown",
        "emb_time": result.emb_time_ms,
        "search_time": result.search_time_ms,
        "total_time": result.total_time_ms,
    }

async def inference_worker():
    redis = _get_redis()
    col = get_embeddings_collection()
    print("Inference Worker loop started!")
    while True:
        ticket_id = None
        try:
            item = await redis.blpop("face_tasks_queue", timeout=1)
            if not item:
                continue

            _, payload_str = item
            payload = json.loads(payload_str)
            ticket_id = payload["ticket_id"]
            user_id = payload["user_id"]
            org_id = payload["organization_id"]
            
            await redis.setex(f"ticket:{ticket_id}", 300, json.dumps({"status": "processing"}))
            
            start_total = time.time()
            
            user_emb_key = f"face:user_emb:{user_id}"
            cached_emb = await redis.get(user_emb_key)
            if cached_emb:
                db_emb = np.frombuffer(base64.b64decode(cached_emb), dtype=np.float32)
                user_found = True
            else:
                user_doc = await col.find_one({"organization_id": org_id, "employee_id": user_id}, {"_id": 0, "embedding": 1})
                if user_doc:
                    db_emb = np.array(user_doc["embedding"], dtype=np.float32)
                    await redis.setex(user_emb_key, 300, base64.b64encode(db_emb.tobytes()).decode())
                    user_found = True
                else:
                    user_found = False

            if not user_found:
                result = {"success": False, "error": "User not found"}
            else:
                image_bytes = base64.b64decode(payload["image_base64"])

                loop = asyncio.get_running_loop()
                inf_res = await loop.run_in_executor(executor, do_inference, image_bytes, db_emb, org_id, user_id)
                
                success = inf_res["success"]
                score = inf_res["score"]
                matched_id = inf_res["matched_id"]
                
                total_time = (time.time() - start_total) * 1000
                
                entry = stats.add_entry(matched_id, score, total_time, success)
                await manager.broadcast({"type": "NEW_ENTRY", "data": entry, "analytics": stats.get_analytics()})
                
                result = {
                    "success": success,
                    "person": {"id": matched_id, "name": matched_id, "department": "Engineering"} if success else None,
                    "confidence": round(score, 3),
                    "embedding_time_ms": round(inf_res["emb_time"], 2),
                    "search_time_ms": round(inf_res["search_time"], 2),
                    "total_time_ms": round(total_time, 2)
                }

            await redis.setex(f"ticket:{ticket_id}", 300, json.dumps({
                "status": "completed",
                "result": result
            }))
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Inference Worker Error: {e}")
            if ticket_id:
                try:
                    await redis.setex(f"ticket:{ticket_id}", 300, json.dumps({"status": "failed", "error": str(e)}))
                except:
                    pass
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    global FAISS_READY
    col = get_embeddings_collection()
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            orgs: dict = {}
            batch_size = 500
            cursor = col.find({}, {"_id": 0, "organization_id": 1, "employee_id": 1, "embedding": 1})
            cursor.batch_size(batch_size)
            async for doc in cursor:
                org = doc.get("organization_id", "default")
                orgs.setdefault(org, []).append(doc)

            loaded_orgs = 0
            for org_id in orgs.keys():
                if faiss_index.load(org_id):
                    loaded_orgs += 1
                else:
                    faiss_index.rebuild(org_id, orgs[org_id])
            print(f"FAISS indexes: {loaded_orgs} loaded from disk, {len(orgs) - loaded_orgs} rebuilt from MongoDB")
            FAISS_READY = True
            break
        except Exception as e:
            print(f"FAISS startup attempt {attempt + 1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
            else:
                print("FAISS startup failed after max retries. Indexes will remain empty until service restart.")

    for _ in range(INFERENCE_WORKERS):
        asyncio.create_task(inference_worker())

# ---------------- SECURITY HELPERS ----------------

def validate_image_b64(image_b64: str) -> bytes:
    """Validate base64 string size then decode. Raises HTTPException on violation."""
    if len(image_b64) > MAX_IMAGE_B64_LEN:
        raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size of 5 MB")
    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Decoded image exceeds maximum allowed size of 5 MB")
    return image_bytes


async def check_rate_limit(user_id: str):
    """Redis sliding-window rate limit per user_id. Falls back to in-memory limiter if Redis unavailable. Raises 429 when exceeded."""
    global rate_limit_redis_failures
    redis = _get_redis()
    key = f"rl:detect:{user_id}"
    try:
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS)
        if count > RATE_LIMIT_REQUESTS:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: max {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW_SECONDS}s",
            )
    except HTTPException:
        raise
    except Exception as e:
        rate_limit_redis_failures += 1
        print(f"[RateLimit] Redis unavailable (attempt {rate_limit_redis_failures}): {e}. Using in-memory fallback for user {user_id}.")
        # Fail-closed: use in-memory limiter as fallback (stricter, per-instance)
        if not memory_limiter.is_allowed(user_id, RATE_LIMIT_REQUESTS):
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded (failover mode): max {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW_SECONDS}s",
            )


# ---------------- HELPERS ----------------
async def load_embeddings(organization_id: str) -> list:
    """Return [{employee_id, embedding}] from Redis or MongoDB."""
    key = embedding_key(organization_id)
    cached = await cache_get(key)
    if cached:
        return json.loads(cached)

    col = get_embeddings_collection()
    docs = await col.find(
        {"organization_id": organization_id},
        {"_id": 0, "employee_id": 1, "embedding": 1},
    ).to_list(length=None)

    records = [{"employee_id": d["employee_id"], "embedding": d["embedding"]} for d in docs]
    await cache_set(key, json.dumps(records), CACHE_TTL)
    return records


async def bust_cache(organization_id: str, employee_id: str | None = None):
    await cache_del(embedding_key(organization_id))
    if employee_id:
        await cache_del(f"face:user_emb:{employee_id}")


# ---------------- ROUTES ----------------

@app.get("/")
async def home():
    return {"message": "Face Recognition API running", "version": "v3"}


@app.get("/api/v1/health")
async def health():
    if not FAISS_READY:
        raise HTTPException(status_code=503, detail="FAISS indexes not ready. MongoDB connection failed or startup incomplete.")
    return {
        "status": "ok",
        "gpu_available": is_gpu_available(),
        "inference_provider": _active_provider,
        "uptime_seconds": int(time.time() - START_TIME),
        "avg_latency_ms": stats.get_analytics()["avg_latency"],
    }


@app.post("/api/v1/enroll")
async def enroll(req: EnrollRequest):
    """
    Extract a 512-D embedding from the image and upsert it into MongoDB.
    Invalidates the org's Redis cache so the next detect picks up the change.
    Persists the updated FAISS index to disk.
    """
    image_bytes = validate_image_b64(req.image_base64)

    try:
        emb = get_face_embedding_from_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Face extraction failed: {e}")

    col = get_embeddings_collection()
    await col.update_one(
        {"employee_id": req.employee_id},
        {"$set": {
            "employee_id": req.employee_id,
            "organization_id": req.organization_id,
            "embedding": emb.tolist(),
        }},
        upsert=True,
    )
    await bust_cache(req.organization_id, req.employee_id)
    faiss_index.add(req.organization_id, req.employee_id, emb)
    faiss_index.save(req.organization_id)

    return {"success": True, "employee_id": req.employee_id}


@app.post("/api/v1/detect")
async def detect(req: DetectRequest):
    """
    Submits a face verification task to the Redis queue.
    """
    validate_image_b64(req.image_base64)  # size check before queuing
    await check_rate_limit(req.user_id)

    ticket_id = str(uuid.uuid4())
    redis = _get_redis()
    
    payload = {
        "ticket_id": ticket_id,
        "image_base64": req.image_base64,
        "user_id": req.user_id,
        "organization_id": req.organization_id
    }
    
    await redis.setex(f"ticket:{ticket_id}", 300, json.dumps({"status": "queued"}))
    await redis.rpush("face_tasks_queue", json.dumps(payload))
    queue_len = await redis.llen("face_tasks_queue")
    
    return {
        "status": "queued",
        "ticket_id": ticket_id,
        "position": queue_len
    }

@app.get("/api/v1/ticket/{ticket_id}")
async def get_ticket(ticket_id: str):
    redis = _get_redis()
    data = await redis.get(f"ticket:{ticket_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Ticket not found or expired")
    return json.loads(data)


@app.get("/api/v1/embeddings/{employee_id}")
async def get_embedding_status(employee_id: str):
    """Check whether a face embedding exists for a specific employee."""
    col = get_embeddings_collection()
    doc = await col.find_one({"employee_id": employee_id}, {"_id": 0, "employee_id": 1, "organization_id": 1})
    return {"registered": doc is not None}


@app.delete("/api/v1/embeddings/{employee_id}")
async def delete_embedding(employee_id: str):
    """Remove a face embedding from MongoDB and invalidate the org's cache.
    Rebuilds the FAISS index for the org."""
    col = get_embeddings_collection()
    doc = await col.find_one_and_delete({"employee_id": employee_id})
    if doc:
        org_id = doc["organization_id"]
        await bust_cache(org_id, employee_id)
        records = await col.find(
            {"organization_id": org_id},
            {"_id": 0, "employee_id": 1, "embedding": 1}
        ).to_list(length=None)
        faiss_index.rebuild(org_id, records)
        faiss_index.save(org_id)
    return {"success": True, "deleted_employee_id": employee_id}


@app.get("/api/v1/embeddings")
async def list_embeddings(organization_id: Optional[str] = None, skip: int = 0, limit: int = 50):
    """List enrolled employee IDs, optionally filtered by org."""
    col = get_embeddings_collection()
    query = {"organization_id": organization_id} if organization_id else {}
    
    total = await col.count_documents(query)
    docs = await col.find(query, {"_id": 0, "employee_id": 1, "organization_id": 1}).skip(skip).limit(limit).to_list(length=limit)
    
    return {"total": total, "skip": skip, "limit": limit, "employees": docs}


@app.post("/api/v1/extract-embedding")
async def extract_embedding(req: ExtractEmbeddingRequest):
    """Extract a 512-D embedding and return it without persisting. Useful for testing."""
    image_bytes = validate_image_b64(req.image_base64)

    try:
        emb = get_face_embedding_from_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Face extraction failed: {e}")

    return {"success": True, "embedding": emb.tolist(), "dim": len(emb)}


# ---------------- FAISS ROUTES ----------------

class FAISSSearchRequest(BaseModel):
    image_base64: str
    organization_id: str
    top_k: int = 5


@app.post("/api/v1/faiss/search")
async def faiss_bulk_search(req: FAISSSearchRequest):
    """
    1:N face identification via FAISS IndexFlatIP.
    Returns top-k employees above the cosine threshold from the org's index.
    Intended for kiosk-mode attendance where the employee scans without typing their ID.
    """
    image_bytes = validate_image_b64(req.image_base64)
    loop = asyncio.get_running_loop()

    start_emb = time.time()
    try:
        query_emb = await loop.run_in_executor(executor, get_face_embedding_from_bytes, image_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Face extraction failed: {e}")
    emb_time_ms = (time.time() - start_emb) * 1000

    start_search = time.time()
    faiss_matches = faiss_index.search(req.organization_id, query_emb, k=req.top_k)
    search_time_ms = (time.time() - start_search) * 1000

    search_engine = get_search_engine()
    result = search_engine.search_1toN(
        query_embedding=query_emb,
        faiss_matches=faiss_matches,
        organization_id=req.organization_id,
        emb_time_ms=emb_time_ms,
        search_time_ms=search_time_ms,
        index_size=faiss_index.size(req.organization_id),
    )

    return {
        "matches": result.matches,
        "index_size": faiss_index.size(req.organization_id),
        "threshold": result.threshold,
        "confidence": round(result.confidence_score, 3),
        "total_time_ms": round(result.total_time_ms, 2),
    }


@app.post("/api/v1/faiss/index/build")
async def build_faiss_index(organization_id: str):
    """Rebuild the FAISS index for an org from MongoDB. Call after bulk enrollment or data import."""
    records = await load_embeddings(organization_id)
    faiss_index.rebuild(organization_id, records)
    faiss_index.save(organization_id)
    return {
        "success": True,
        "organization_id": organization_id,
        "indexed": faiss_index.size(organization_id),
    }


# ---------------- LIVENESS DETECTION (PAD Phase 1) ----------------

class LivenessRequest(BaseModel):
    frames: List[str]            # 2–5 sequential base64 frames ~150 ms apart
    employee_id: Optional[str] = None
    organization_id: Optional[str] = None


def _analyze_liveness_frames(frames_bytes: list) -> dict:
    """
    Optical-flow Presentation Attack Detection (PAD).
    Computes inter-frame motion magnitude using Farneback dense optical flow.
    A static photo or screen replay produces near-zero motion variance; a live
    face exhibits natural micro-movements above the empirical thresholds below.
    """
    import cv2
    gray_frames = []
    for fb in frames_bytes:
        arr = np.frombuffer(fb, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is not None:
            gray_frames.append(cv2.resize(img, (128, 128)))

    if len(gray_frames) < 2:
        return {"is_live": False, "confidence": 0.0, "reason": "decode_failed"}

    motion_magnitudes = []
    for i in range(1, len(gray_frames)):
        flow = cv2.calcOpticalFlowFarneback(
            gray_frames[i - 1], gray_frames[i], None,
            pyr_scale=0.5, levels=3, winsize=15, iterations=3,
            poly_n=5, poly_sigma=1.2, flags=0,
        )
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        motion_magnitudes.append(float(np.mean(mag)))

    mean_motion = float(np.mean(motion_magnitudes))
    variance = float(np.var(motion_magnitudes))
    is_live = mean_motion > LIVENESS_MOTION_THRESHOLD and variance > LIVENESS_VARIANCE_THRESHOLD
    confidence = min(1.0, mean_motion * 3.0)
    return {
        "is_live": is_live,
        "confidence": round(confidence, 3),
        "mean_motion": round(mean_motion, 5),
        "motion_variance": round(variance, 6),
        "frames_analyzed": len(gray_frames),
    }


@app.post("/api/v1/liveness/check")
async def check_liveness(req: LivenessRequest):
    """
    Anti-spoofing liveness check (PAD Phase 1) via multi-frame optical flow.
    Send 2–5 consecutive frames from the live camera stream captured ~150 ms apart.
    A static photo or screen replay will fail: inter-frame motion will be near-zero.
    Phase 2 will replace this with a dedicated ML-based Silent Face Anti-Spoofing model.
    """
    if not (2 <= len(req.frames) <= 10):
        raise HTTPException(status_code=400, detail="Provide between 2 and 10 sequential frames")
    frames_bytes = [validate_image_b64(f) for f in req.frames]
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(executor, _analyze_liveness_frames, frames_bytes)
    return result


# ---------------- AI PRODUCTIVITY INSIGHTS ----------------

@app.get("/api/v1/analytics/productivity")
async def get_productivity_insights(organization_id: str, days: int = 30):
    """
    AI-driven workforce productivity insights derived from biometric attendance data.
    Surfaces confidence trends, inference efficiency, and attendance anomaly signals
    for the admin analytics dashboard.
    """
    hist = list(stats.history)
    analytics = stats.get_analytics()
    scores = [e["accuracy"] for e in hist if "accuracy" in e and e["accuracy"] > 0]
    latencies = [e["time_ms"] for e in hist if "time_ms" in e]

    trend = "insufficient_data"
    if len(scores) >= 5:
        mid = len(scores) // 2
        trend = "improving" if float(np.mean(scores[:mid])) > float(np.mean(scores[mid:])) else "stable"

    return {
        "organization_id": organization_id,
        "period_days": days,
        "faiss_index_size": faiss_index.size(organization_id),
        "summary": analytics,
        "insights": {
            "avg_confidence_score": round(float(np.mean(scores)), 3) if scores else 0.0,
            "confidence_trend": trend,
            "p95_inference_latency_ms": round(float(np.percentile(latencies, 95)), 2) if len(latencies) >= 5 else 0.0,
            "system_efficiency_pct": analytics["match_rate"],
            "anomaly_flags": [],
        },
    }


@app.get("/api/v1/analytics/search-metrics")
async def get_search_metrics(search_type: str = "all"):
    """
    LLM/face search observability: confidence trends and latency stats for model drift detection.
    search_type: "1:1", "1:N", or "all"
    """
    search_engine = get_search_engine()

    response = {"timestamp": str(datetime.now().isoformat())}

    if search_type in ("1:1", "all"):
        response["1:1"] = {
            "confidence_trend": search_engine.metrics.get_confidence_trend("1:1"),
            "latency_stats": search_engine.metrics.get_latency_stats("1:1"),
        }

    if search_type in ("1:N", "all"):
        response["1:N"] = {
            "confidence_trend": search_engine.metrics.get_confidence_trend("1:N"),
            "latency_stats": search_engine.metrics.get_latency_stats("1:N"),
        }

    return response


@app.get("/api/v1/analytics/search-history")
async def get_search_history(search_type: Optional[str] = None, limit: int = 100):
    """Recent search results for auditing and debugging."""
    search_engine = get_search_engine()
    history = search_engine.metrics.metrics

    if search_type:
        history = [m for m in history if m.search_type == search_type]

    # Return most recent first
    history = list(reversed(history[-limit:]))

    return {
        "count": len(history),
        "search_type_filter": search_type or "all",
        "history": [
            {
                "timestamp": m.timestamp,
                "search_type": m.search_type,
                "organization_id": m.organization_id,
                "employee_id": m.employee_id,
                "confidence_score": round(m.confidence_score, 3),
                "success": m.success,
                "total_latency_ms": round(m.total_latency_ms, 2),
                "emb_latency_ms": round(m.emb_latency_ms, 2),
                "search_latency_ms": round(m.search_latency_ms, 2),
                "index_size": m.query_index_size,
            }
            for m in history
        ],
    }


# ---------------- WEBSOCKET ----------------

@app.websocket("/ws/stats")
async def ws_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "history": list(stats.history),
            "analytics": stats.get_analytics(),
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ---------------- DASHBOARD ----------------

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Face API | Live Monitor</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter', sans-serif; }
        body { background:#000; color:#fff; min-height:100vh; display:flex; flex-direction:column; padding:2rem; }
        header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #333; padding-bottom:1.5rem; margin-bottom:2rem; }
        .branding h1 { font-weight:800; font-size:2rem; letter-spacing:-0.05em; text-transform:uppercase; }
        .branding p { font-size:0.75rem; color:#666; letter-spacing:0.1em; margin-top:0.25rem; }
        .analytics { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:2rem; }
        .stat-item { display:flex; flex-direction:column; }
        .stat-label { font-size:0.65rem; color:#666; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.5rem; }
        .stat-value { font-size:1.5rem; font-weight:600; letter-spacing:-0.02em; }
        .stat-unit { font-size:0.75rem; color:#666; margin-left:0.25rem; }
        .card { border:1px solid #222; padding:1.5rem; }
        .card h2 { font-size:0.8rem; text-transform:uppercase; letter-spacing:0.2em; color:#444; margin-bottom:1.5rem; }
        table { width:100%; border-collapse:collapse; }
        th { font-size:0.65rem; text-transform:uppercase; color:#444; padding-bottom:1rem; border-bottom:1px solid #111; font-weight:400; }
        td { padding:1rem 0; font-size:0.85rem; border-bottom:1px solid #111; }
        .badge { font-size:0.6rem; padding:0.2rem 0.6rem; border:1px solid #fff; border-radius:99px; font-weight:600; }
        .badge-UNKNOWN { border-color:#333; color:#666; }
        .live { width:8px; height:8px; background:#fff; border-radius:50%; display:inline-block; margin-right:1rem; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        #conn { font-size:0.65rem; position:fixed; bottom:2rem; right:2rem; color:#444; text-transform:uppercase; }
    </style>
</head>
<body>
    <header>
        <div class="branding">
            <h1>Monitor</h1>
            <p>v3.0.0 / MongoDB-backed Inference Pipeline</p>
        </div>
        <div class="analytics">
            <div class="stat-item"><span class="stat-label">Processed</span><span class="stat-value" id="v-proc">0</span></div>
            <div class="stat-item"><span class="stat-label">Accuracy</span><span class="stat-value" id="v-acc">0<span class="stat-unit">%</span></span></div>
            <div class="stat-item"><span class="stat-label">Lat. Avg</span><span class="stat-value" id="v-lat">0<span class="stat-unit">ms</span></span></div>
        </div>
    </header>
    <div class="card">
        <h2><span class="live"></span>Activity Log</h2>
        <table>
            <thead><tr>
                <th style="width:15%">Time</th>
                <th style="width:35%">Identity</th>
                <th style="width:20%">Confidence</th>
                <th style="width:15%">Exec</th>
                <th style="width:15%;text-align:right">Result</th>
            </tr></thead>
            <tbody id="log"></tbody>
        </table>
    </div>
    <div id="conn">Disconnected</div>
    <script>
        const log = document.getElementById('log');
        const conn = document.getElementById('conn');
        function updateAnalytics(d) {
            document.getElementById('v-proc').textContent = d.total_processed;
            document.getElementById('v-acc').textContent = d.match_rate + '%';
            document.getElementById('v-lat').textContent = d.avg_latency + 'ms';
        }
        function createRow(e) {
            const tr = document.createElement('tr');
            [e.timestamp, e.label, String(e.accuracy), e.time_ms + 'ms'].forEach((t, i) => {
                const td = document.createElement('td');
                td.textContent = t;
                if (i === 1) td.style.fontWeight = '600';
                tr.appendChild(td);
            });
            const td = document.createElement('td');
            td.style.textAlign = 'right';
            const b = document.createElement('span');
            b.className = 'badge badge-' + e.status;
            b.textContent = e.status;
            td.appendChild(b);
            tr.appendChild(td);
            return tr;
        }
        function connect() {
            const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(proto + '//' + location.host + '/ws/stats');
            ws.onopen = () => { conn.textContent = 'Connected / Live'; conn.style.color = '#fff'; };
            ws.onmessage = (ev) => {
                const msg = JSON.parse(ev.data);
                if (msg.type === 'INITIAL_STATE') {
                    log.textContent = '';
                    msg.history.forEach(e => log.appendChild(createRow(e)));
                    updateAnalytics(msg.analytics);
                } else if (msg.type === 'NEW_ENTRY') {
                    log.prepend(createRow(msg.data));
                    if (log.children.length > 50) log.lastChild.remove();
                    updateAnalytics(msg.analytics);
                }
            };
            ws.onclose = () => { conn.textContent = 'Reconnecting...'; conn.style.color = '#444'; setTimeout(connect, 3000); };
        }
        connect();
    </script>
</body>
</html>
"""
