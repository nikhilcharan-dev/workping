"""
Tests for StatsTracker — the in-memory rolling-window stats used by the
WebSocket dashboard and /api/v1/analytics/productivity.
"""

import pytest


def test_initial_state_is_empty(face_app_module):
    s = face_app_module.StatsTracker()
    assert s.total_processed == 0
    assert s.total_matches == 0
    assert s.total_latency == 0.0
    assert list(s.history) == []
    a = s.get_analytics()
    assert a["total_processed"] == 0
    assert a["avg_latency"] == 0
    assert a["match_rate"] == 0


def test_add_entry_increments_processed_and_returns_entry_shape(face_app_module):
    s = face_app_module.StatsTracker()
    entry = s.add_entry("emp-1", 0.92, 123.456, success=True)

    assert s.total_processed == 1
    assert s.total_matches == 1
    assert s.total_latency == pytest.approx(123.456)
    # Returned entry shape
    assert entry["label"] == "emp-1"
    assert entry["status"] == "MATCH"
    assert entry["accuracy"] == 0.92  # rounded to 3
    assert entry["time_ms"] == 123.46  # rounded to 2
    assert "timestamp" in entry


def test_unsuccessful_match_records_unknown_status_and_not_counted_as_match(face_app_module):
    s = face_app_module.StatsTracker()
    entry = s.add_entry("Unknown", 0.31, 88.0, success=False)
    assert entry["status"] == "UNKNOWN"
    assert s.total_processed == 1
    assert s.total_matches == 0


def test_history_is_bounded_to_history_limit_capacity(face_app_module):
    s = face_app_module.StatsTracker()
    cap = face_app_module.HISTORY_LIMIT
    for i in range(cap + 5):
        s.add_entry(f"emp-{i}", 0.8, 10.0, success=True)
    assert len(s.history) == cap
    # Newest entries pushed to the left (appendleft)
    assert s.history[0]["label"] == f"emp-{cap + 4}"


def test_analytics_computes_avg_latency_and_match_rate(face_app_module):
    s = face_app_module.StatsTracker()
    s.add_entry("a", 0.9, 100.0, success=True)
    s.add_entry("b", 0.3, 200.0, success=False)
    s.add_entry("c", 0.8, 300.0, success=True)
    a = s.get_analytics()
    assert a["total_processed"] == 3
    assert a["avg_latency"] == pytest.approx(200.0, rel=1e-3)
    # 2 of 3 successful → 66.7%
    assert a["match_rate"] == pytest.approx(66.7, abs=0.1)


def test_analytics_includes_uptime_seconds(face_app_module):
    s = face_app_module.StatsTracker()
    a = s.get_analytics()
    assert "uptime" in a
    assert isinstance(a["uptime"], int)
    assert a["uptime"] >= 0
