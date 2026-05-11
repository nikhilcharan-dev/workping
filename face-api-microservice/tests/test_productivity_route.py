"""
Tests for GET /api/v1/analytics/productivity — derived insights endpoint.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(face_app_module):
    with TestClient(face_app_module.app) as c:
        yield c


def test_productivity_with_insufficient_data_returns_trend_insufficient(client, face_app_module):
    # Fresh StatsTracker — no entries
    face_app_module.stats = face_app_module.StatsTracker()
    res = client.get("/api/v1/analytics/productivity", params={"organization_id": "org-x"})
    assert res.status_code == 200
    body = res.json()
    assert body["organization_id"] == "org-x"
    assert body["insights"]["confidence_trend"] == "insufficient_data"
    assert body["insights"]["avg_confidence_score"] == 0.0


def test_productivity_with_enough_entries_computes_trend(client, face_app_module):
    face_app_module.stats = face_app_module.StatsTracker()
    # 10 entries with descending accuracy → trend should be "improving"
    # (StatsTracker stores newest-first via appendleft, so the *first half* of
    # the deque is the most recent.)
    for i, acc in enumerate([0.95, 0.94, 0.93, 0.92, 0.91, 0.6, 0.55, 0.5, 0.45, 0.4]):
        face_app_module.stats.add_entry(f"e-{i}", acc, 100.0, success=acc > 0.6)
    res = client.get("/api/v1/analytics/productivity", params={"organization_id": "org-y"})
    assert res.status_code == 200
    body = res.json()
    assert body["insights"]["confidence_trend"] in ("improving", "stable")
    assert body["insights"]["avg_confidence_score"] > 0.0
    assert body["insights"]["p95_inference_latency_ms"] >= 0.0


def test_productivity_period_days_param_echoed(client, face_app_module):
    face_app_module.stats = face_app_module.StatsTracker()
    res = client.get(
        "/api/v1/analytics/productivity",
        params={"organization_id": "org-z", "days": 7},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["period_days"] == 7
