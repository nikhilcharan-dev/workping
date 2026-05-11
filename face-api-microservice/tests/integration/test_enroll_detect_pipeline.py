"""
End-to-end pipeline tests against a live face-api deployment:
  1. /api/v1/enroll       — InsightFace AntelopeV2 extracts a real 512-D embedding
                            and Mongo persists it.
  2. /api/v1/detect       — Submits the same image and gets a ticket back.
  3. /api/v1/ticket/{id}  — Polls until the inference worker writes a result
                            (success=True, score ≥ THRESHOLD).
  4. /api/v1/faiss/search — Confirms the embedding is reachable via 1:N search.
  5. cleanup              — DELETE /api/v1/embeddings/{employee_id}.

These tests need: the real InsightFace stack, MongoDB, and Redis (with at least
one inference worker running in the same process). They are skipped unless
INTEGRATION=1 is set.
"""

import time
import uuid
import pytest


def _wait_for_ticket(client, ticket_id, timeout=30.0):
    """Poll /ticket/{id} until status is completed or failed."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = client.get(f"/api/v1/ticket/{ticket_id}")
        if r.status_code == 200:
            data = r.json()
            if data.get("status") in ("completed", "failed"):
                return data
        time.sleep(0.5)
    pytest.fail(f"Ticket {ticket_id} did not complete within {timeout}s")


@pytest.fixture
def enrolled_employee(http_client, sample_image_b64):
    """Enroll a fresh employee for the test, yield the IDs, then clean up."""
    employee_id = f"itest-emp-{uuid.uuid4().hex[:8]}"
    organization_id = f"itest-org-{uuid.uuid4().hex[:8]}"

    res = http_client.post(
        "/api/v1/enroll",
        json={
            "image_base64": sample_image_b64,
            "employee_id": employee_id,
            "organization_id": organization_id,
        },
    )
    assert res.status_code == 200, f"Enroll failed: {res.text}"
    body = res.json()
    assert body["success"] is True
    assert body["employee_id"] == employee_id

    yield (employee_id, organization_id)

    # Cleanup
    http_client.delete(f"/api/v1/embeddings/{employee_id}")


def test_health_reports_status_and_provider(http_client):
    res = http_client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["inference_provider"] in ("cpu", "cuda", "tensorrt", "CPUExecutionProvider")


def test_enroll_persists_and_is_listable(http_client, enrolled_employee):
    employee_id, organization_id = enrolled_employee

    # Registered-check endpoint
    status = http_client.get(f"/api/v1/embeddings/{employee_id}")
    assert status.status_code == 200
    assert status.json()["registered"] is True

    # Should appear in the org's listing
    listing = http_client.get(
        "/api/v1/embeddings", params={"organization_id": organization_id}
    )
    assert listing.status_code == 200
    ids = [e["employee_id"] for e in listing.json()["employees"]]
    assert employee_id in ids


def test_detect_round_trip_matches_enrolled_employee(http_client, enrolled_employee, sample_image_b64):
    employee_id, organization_id = enrolled_employee

    submit = http_client.post(
        "/api/v1/detect",
        json={
            "image_base64": sample_image_b64,
            "user_id": employee_id,
            "organization_id": organization_id,
        },
    )
    assert submit.status_code == 200
    submit_body = submit.json()
    assert submit_body["status"] == "queued"
    ticket_id = submit_body["ticket_id"]

    result = _wait_for_ticket(http_client, ticket_id)
    assert result["status"] == "completed", result
    payload = result["result"]
    assert payload["success"] is True, payload
    assert payload["confidence"] >= 0.6
    assert payload["person"]["id"] == employee_id


def test_faiss_search_finds_enrolled_employee(http_client, enrolled_employee, sample_image_b64):
    employee_id, organization_id = enrolled_employee
    res = http_client.post(
        "/api/v1/faiss/search",
        json={
            "image_base64": sample_image_b64,
            "organization_id": organization_id,
            "top_k": 3,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["index_size"] >= 1
    ids = [m["employee_id"] for m in body["matches"]]
    assert employee_id in ids
    assert body["matches"][0]["score"] >= 0.6


def test_delete_embedding_removes_from_listing(http_client, sample_image_b64):
    """Direct test of DELETE — registers a temporary employee, deletes it, asserts gone."""
    employee_id = f"itest-del-{uuid.uuid4().hex[:8]}"
    organization_id = f"itest-org-{uuid.uuid4().hex[:8]}"

    http_client.post(
        "/api/v1/enroll",
        json={
            "image_base64": sample_image_b64,
            "employee_id": employee_id,
            "organization_id": organization_id,
        },
    ).raise_for_status()

    deleted = http_client.delete(f"/api/v1/embeddings/{employee_id}")
    assert deleted.status_code == 200
    assert deleted.json()["success"] is True

    status = http_client.get(f"/api/v1/embeddings/{employee_id}")
    assert status.json()["registered"] is False


def test_rate_limit_returns_429_after_burst(http_client, sample_image_b64):
    """Submit a flood of detect calls for a single user_id and expect 429.
    The window is RATE_LIMIT_REQUESTS / RATE_LIMIT_WINDOW_SECONDS (default 30/60).
    """
    user_id = f"itest-rl-{uuid.uuid4().hex[:8]}"
    organization_id = f"itest-org-{uuid.uuid4().hex[:8]}"
    hit_429 = False
    # Send slightly more than the default RATE_LIMIT_REQUESTS=30
    for _ in range(40):
        r = http_client.post(
            "/api/v1/detect",
            json={
                "image_base64": sample_image_b64,
                "user_id": user_id,
                "organization_id": organization_id,
            },
        )
        if r.status_code == 429:
            hit_429 = True
            break
    assert hit_429, "Did not see a 429 even after 40 rapid detect calls"
