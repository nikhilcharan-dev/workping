"""
Tests for POST /api/v1/faiss/search — 1:N identification route.
"""

import base64
import pytest
import numpy as np
from fastapi.testclient import TestClient


def _b64() -> str:
    return base64.b64encode(b"tiny payload").decode()


@pytest.fixture
def client(face_app_module):
    with TestClient(face_app_module.app) as c:
        yield c


def test_faiss_search_on_empty_org_returns_no_matches(client):
    res = client.post(
        "/api/v1/faiss/search",
        json={"image_base64": _b64(), "organization_id": "unknown-org", "top_k": 5},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["matches"] == []
    assert body["index_size"] == 0
    assert body["threshold"] == pytest.approx(0.6, abs=1e-3)


def test_faiss_search_returns_self_for_enrolled_query(client, face_app_module):
    """Enroll an employee, then search — the stubbed embedder returns the same
    deterministic vector for any image, so the search MUST return that employee
    with score ≈ 1.0."""
    # Enroll
    enroll = client.post(
        "/api/v1/enroll",
        json={
            "image_base64": _b64(),
            "employee_id": "emp-search-self",
            "organization_id": "org-faiss-test",
        },
    )
    assert enroll.status_code == 200

    # Search
    search = client.post(
        "/api/v1/faiss/search",
        json={"image_base64": _b64(), "organization_id": "org-faiss-test", "top_k": 1},
    )
    assert search.status_code == 200
    body = search.json()
    assert body["index_size"] >= 1
    assert len(body["matches"]) >= 1
    top = body["matches"][0]
    assert top["employee_id"] == "emp-search-self"
    assert top["score"] >= 0.99


def test_faiss_search_rejects_oversize_image(client, face_app_module):
    oversize = "A" * (face_app_module.MAX_IMAGE_B64_LEN + 1)
    res = client.post(
        "/api/v1/faiss/search",
        json={"image_base64": oversize, "organization_id": "x"},
    )
    assert res.status_code == 413


def test_faiss_index_build_returns_indexed_count(client, face_app_module):
    """Stubbed load_embeddings returns []; the route should still succeed and
    report indexed=0."""
    res = client.post(
        "/api/v1/faiss/index/build", params={"organization_id": "org-empty-build"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["organization_id"] == "org-empty-build"
    assert body["indexed"] == 0
