"""
Tests for the check_rate_limit helper.

Uses monkeypatch to control the fake redis behaviour for incr so we can drive
the request count past the configured RATE_LIMIT_REQUESTS threshold.
"""

import pytest
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_rate_limit_within_window_does_not_raise(face_app_module, monkeypatch):
    redis = face_app_module._get_redis()

    async def fake_incr(_k):
        return 1

    async def fake_expire(*_a, **_kw):
        return True

    monkeypatch.setattr(redis, "incr", fake_incr)
    monkeypatch.setattr(redis, "expire", fake_expire)
    # Should not raise
    await face_app_module.check_rate_limit("user-1")


@pytest.mark.asyncio
async def test_rate_limit_exceeded_raises_429(face_app_module, monkeypatch):
    redis = face_app_module._get_redis()

    async def fake_incr(_k):
        # Return a count above the limit
        return face_app_module.RATE_LIMIT_REQUESTS + 5

    monkeypatch.setattr(redis, "incr", fake_incr)

    with pytest.raises(HTTPException) as exc:
        await face_app_module.check_rate_limit("user-2")
    assert exc.value.status_code == 429
    assert "rate limit exceeded" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_rate_limit_fails_open_on_redis_error(face_app_module, monkeypatch):
    """Redis outage must NOT block legitimate requests — the helper swallows
    non-HTTP exceptions and returns silently."""
    redis = face_app_module._get_redis()

    async def fake_incr(_k):
        raise RuntimeError("redis down")

    monkeypatch.setattr(redis, "incr", fake_incr)
    # Must not raise
    await face_app_module.check_rate_limit("user-3")
