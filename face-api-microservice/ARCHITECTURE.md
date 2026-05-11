# System Architecture: Face Recognition API

This document outlines the technical design, component interactions, and performance optimizations of the Face Recognition API.

## Design Philosophy
- **Performance First**: Native GPU acceleration and efficient FAISS indexing.
- **Persistent-by-design**: Automated volume-mapped persistence for indices and models.
- **Workflow-centric**: Integrated "Dump-to-Process" queue for batch updates.
- **High Observability**: Real-time B&W dashboard with live WebSocket streaming.

## System Components

### 1. API Layer (FastAPI)
Acts as the orchestration layer, handling requests for:
- **Detection**: Real-time inference using InsightFace.
- **Management (CRUD)**: Direct modification of the FAISS vector space.
- **Monitoring**: Live metrics streaming via WebSockets.

### 2. Inference Engine (InsightFace)
- **Model**: `AntelopeV2` (SCRFD for detection, ArcFace for embeddings).
- **Optimization**: Singleton pattern deployment with ONNX Runtime. Automatic CUDA detection for GPU offloading.
- **Latency**: ~150–450ms end-to-end with GPU enabled. On CPU (current OCI VM deployment) total latency is ~2,500–4,000ms; see `INFERENCE.md` for full benchmarks.

### 3. Vector Database (FAISS)
- **Strategy**: `IndexFlatIP` (Inner Product) for high-precision similarity search with normalized embeddings.
- **Persistence**: Hybrid storage using `.bin` (FAISS) and `.npy` (Labels) files, synchronized via atomic disk writes.

### 4. Real-time Bridge (WebSockets)
- **Broadcasting**: Asynchronous event emitter pattern to notify dashboard clients of every inference and index update.
- **State**: In-memory `deque` buffers the last 50 transactions to minimize database overhead.

## Data Workflow
1. **Manual Seeding**: User drops images into `image_dump/`. Seeder script extracts embeddings, updates the index, and moves successful images to `dumped/`.
2. **Real-time Recognition**: Mobile client sends base64 image. API detects, searches FAISS, records match metrics, and broadcasts to the Dashboard.
3. **Control**: Admin uses `/faiss/add` or `/faiss/delete` to refine the identity database in real-time.

## Performance
- **Current deployment (CPU)**: ~1–2 req/s on the 4 vCPU OCI VMs; adequate for low-concurrency SMB check-ins.
- **GPU (when enabled)**: ~6.4 req/s — see `INFERENCE.md` for measured load-test results.
- **Index Search**: Sub-1ms for up to 10k identities (flat FAISS index).
- **Cold Boot**: Optimized via Docker volume mounting for models, bypassing redundant downloads.
