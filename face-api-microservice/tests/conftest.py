"""
Pytest bootstrap for the face-api-microservice.

`app.py` imports InsightFace, FAISS, Motor, and Redis at module load — none of
which are appropriate to load inside a unit test (model files are ~700 MB,
Mongo+Redis aren't running in CI). We replace those modules with lightweight
stand-ins BEFORE app.py is imported, so the tests exercise the real pure-Python
logic (validate_image_b64, _analyze_liveness_frames, FAISSIndex math) against
real numpy/cv2 without needing the GPU stack.
"""

import sys
import types
import pytest
import numpy as np


def _install_stubs():
    # ── Stub: embedding ────────────────────────────────────────────────
    embedding = types.ModuleType("embedding")

    def get_face_embedding_from_bytes(_image_bytes):
        # Deterministic fake embedding for predictable tests
        rng = np.random.default_rng(seed=42)
        v = rng.standard_normal(512).astype(np.float32)
        return v / (np.linalg.norm(v) or 1.0)

    embedding.get_face_embedding_from_bytes = get_face_embedding_from_bytes
    embedding.load_face_app = lambda: None
    embedding.is_gpu_available = lambda: False
    embedding._active_provider = "CPUExecutionProvider"
    sys.modules["embedding"] = embedding

    # ── Stub: db ───────────────────────────────────────────────────────
    db = types.ModuleType("db")

    class _AsyncCursor:
        async def to_list(self, *_a, **_kw):
            return []

    class _FakeColl:
        async def find_one(self, *_a, **_kw):
            return None

        def find(self, *_a, **_kw):
            return _AsyncCursor()

        async def insert_one(self, *_a, **_kw):
            return None

        async def delete_one(self, *_a, **_kw):
            return None

        async def update_one(self, *_a, **_kw):
            return None

    db.get_embeddings_collection = lambda: _FakeColl()
    sys.modules["db"] = db

    # ── Stub: cache ────────────────────────────────────────────────────
    cache = types.ModuleType("cache")

    class _FakeRedis:
        async def incr(self, _k):
            return 1

        async def expire(self, *_a, **_kw):
            return True

        async def get(self, _k):
            return None

        async def set(self, *_a, **_kw):
            return True

        async def setex(self, *_a, **_kw):
            return True

        async def delete(self, *_a, **_kw):
            return True

        async def lpush(self, *_a, **_kw):
            return 1

        async def rpop(self, *_a, **_kw):
            return None

        async def brpop(self, *_a, **_kw):
            return None

        async def blpop(self, *_a, **_kw):
            # Block "forever" by sleeping — the inference worker awaits this.
            # We make it return None promptly so the worker idles in its loop
            # without spinning hot. The TestClient teardown cancels the task.
            import asyncio as _asyncio
            await _asyncio.sleep(0.05)
            return None

    cache.embedding_key = lambda org, emp: f"emb:{org}:{emp}"
    cache.cache_get = lambda *_a, **_kw: None
    cache.cache_set = lambda *_a, **_kw: None
    cache.cache_del = lambda *_a, **_kw: None
    cache.CACHE_TTL = 3600
    cache._get_redis = lambda: _FakeRedis()
    sys.modules["cache"] = cache


_install_stubs()


@pytest.fixture(scope="session")
def face_app_module():
    """Imports app.py with the heavy modules stubbed out."""
    import app  # noqa: E402  — import after stubs are installed
    return app
