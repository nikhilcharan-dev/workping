"""
Tests for the detect → ticket lookup async flow.

The detect endpoint validates the image, rate-limits the user, then enqueues a
task on Redis and returns a ticket ID. The stubbed FakeRedis from conftest
returns success for setex/rpush/llen/incr so the route can be exercised end-to-end
without a live Redis server.
"""

import base64
import json
import pytest
from fastapi.testclient import TestClient


def _tiny_b64() -> str:
    return base64.b64encode(b"tiny payload").decode()


@pytest.fixture
def client(face_app_module):
    with TestClient(face_app_module.app) as c:
        yield c


def test_detect_returns_ticket_id_for_valid_payload(client):
    res = client.post(
        "/api/v1/detect",
        json={
            "image_base64": _tiny_b64(),
            "user_id": "user-1",
            "organization_id": "org-1",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "queued"
    assert "ticket_id" in body
    assert isinstance(body["ticket_id"], str)
    # Position is reported as the queue length after the rpush
    assert "position" in body


def test_detect_rejects_invalid_base64(client):
    res = client.post(
        "/api/v1/detect",
        json={
            "image_base64": "!!!nope!!!",
            "user_id": "u-1",
            "organization_id": "o-1",
        },
    )
    assert res.status_code == 400


def test_detect_rejects_missing_user_id(client):
    res = client.post(
        "/api/v1/detect",
        json={"image_base64": _tiny_b64(), "organization_id": "o-1"},
    )
    assert res.status_code == 422


def test_ticket_lookup_returns_404_when_unknown(client):
    res = client.get("/api/v1/ticket/does-not-exist")
    assert res.status_code == 404


def test_ticket_lookup_returns_stored_payload(client, face_app_module, monkeypatch):
    """If the fake redis returns a payload, /ticket/{id} should parse and return it."""
    # Force the FakeRedis get() to return a known payload for this test
    stored = json.dumps({"status": "completed", "result": {"success": True}})

    redis = face_app_module._get_redis()

    async def fake_get(_key):
        return stored

    monkeypatch.setattr(redis, "get", fake_get)
    res = client.get("/api/v1/ticket/some-ticket-id")
    assert res.status_code == 200
    assert res.json() == {"status": "completed", "result": {"success": True}}
