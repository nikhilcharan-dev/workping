import logging
import os
import redis.asyncio as aioredis

log = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes

_redis: aioredis.Redis | None = None

# Cache errors are recoverable (caller falls back to MongoDB / re-computation),
# so we log them but don't propagate. Tracking the counter exposes the failure
# rate to operators — a steady non-zero rate signals a Redis incident even
# when the service appears healthy.
cache_failures = 0


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            password=os.getenv("REDIS_PASSWORD") or None,
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
            health_check_interval=30,
        )
    return _redis


def embedding_key(organization_id: str) -> str:
    return f"face:embeddings:{organization_id}"


async def cache_get(key: str) -> str | None:
    try:
        return await _get_redis().get(key)
    except Exception as e:
        global cache_failures
        cache_failures += 1
        log.warning("cache_get failed for key=%s (failure #%d): %s", key, cache_failures, e)
        return None


async def cache_set(key: str, value: str, ttl: int = CACHE_TTL) -> None:
    try:
        await _get_redis().setex(key, ttl, value)
    except Exception as e:
        global cache_failures
        cache_failures += 1
        log.warning("cache_set failed for key=%s (failure #%d): %s", key, cache_failures, e)


async def cache_del(key: str) -> None:
    try:
        await _get_redis().delete(key)
    except Exception as e:
        global cache_failures
        cache_failures += 1
        log.warning("cache_del failed for key=%s (failure #%d): %s", key, cache_failures, e)
