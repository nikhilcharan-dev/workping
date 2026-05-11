"""
Tests for POST /api/v1/enroll route.

The conftest stubs the embedding/db/cache modules, so calling the endpoint
exercises the real validate_image_b64 + FAISS add path while the fake collection
swallows the upsert.
"""

import base64
import pytest
from fastapi.testclient import TestClient


def _tiny_b64() -> str:
    return base64.b64encode(b"tiny payload — not a real image").decode()


@pytest.fixture
def client(face_app_module):
    with TestClient(face_app_module.app) as c:
        yield c


def test_enroll_rejects_missing_required_fields(client):
    res = client.post("/api/v1/enroll", json={"image_base64": _tiny_b64()})
    assert res.status_code == 422  # FastAPI validation error from pydantic


def test_enroll_rejects_invalid_base64(client):
    res = client.post(
        "/api/v1/enroll",
        json={
            "image_base64": "!!!not valid base64!!!",
            "employee_id": "emp-1",
            "organization_id": "org-1",
        },
    )
    assert res.status_code == 400
    assert "base64" in res.json()["detail"].lower()


def test_enroll_rejects_oversize_payload(client, face_app_module):
    oversize = "A" * (face_app_module.MAX_IMAGE_B64_LEN + 1)
    res = client.post(
        "/api/v1/enroll",
        json={
            "image_base64": oversize,
            "employee_id": "emp-1",
            "organization_id": "org-1",
        },
    )
    assert res.status_code == 413


def test_enroll_success_path_adds_to_faiss_index(client, face_app_module):
    # The stubbed embedder returns a deterministic 512-D unit vector,
    # so enroll should succeed and the FAISS index should grow.
    before = face_app_module.faiss_index.size("org-enroll-test")

    res = client.post(
        "/api/v1/enroll",
        json={
            "image_base64": _tiny_b64(),
            "employee_id": "emp-42",
            "organization_id": "org-enroll-test",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["employee_id"] == "emp-42"

    after = face_app_module.faiss_index.size("org-enroll-test")
    assert after == before + 1
