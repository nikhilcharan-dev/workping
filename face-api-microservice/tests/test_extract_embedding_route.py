"""
Tests for /api/v1/extract-embedding — debug route returning the raw 512-D vector.
"""

import base64
import pytest
from fastapi.testclient import TestClient


def _b64() -> str:
    return base64.b64encode(b"tiny").decode()


@pytest.fixture
def client(face_app_module):
    with TestClient(face_app_module.app) as c:
        yield c


def test_extract_embedding_returns_512_dim_vector(client):
    res = client.post("/api/v1/extract-embedding", json={"image_base64": _b64()})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["dim"] == 512
    assert isinstance(body["embedding"], list)
    assert len(body["embedding"]) == 512


def test_extract_embedding_rejects_invalid_base64(client):
    res = client.post(
        "/api/v1/extract-embedding", json={"image_base64": "!!!not-base64!!!"}
    )
    assert res.status_code == 400


def test_extract_embedding_rejects_missing_field(client):
    res = client.post("/api/v1/extract-embedding", json={})
    assert res.status_code == 422
