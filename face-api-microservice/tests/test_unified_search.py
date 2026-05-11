"""
Tests for unified 1:1 and 1:N face search with metrics.
"""

import pytest
import numpy as np
from face_search import FaceSearchEngine, SearchResult, SearchMetrics, SearchMetricsTracker


@pytest.fixture
def search_engine():
    return FaceSearchEngine(threshold=0.6)


@pytest.fixture
def sample_embedding():
    """Generate a normalized 512-D embedding."""
    emb = np.random.randn(512).astype(np.float32)
    emb = emb / np.linalg.norm(emb)
    return emb


class TestSearch1to1:
    """Test 1:1 face verification."""

    def test_1to1_match(self, search_engine, sample_embedding):
        """Test successful 1:1 match."""
        query = sample_embedding.copy()
        reference = sample_embedding.copy()

        result = search_engine.search_1to1(
            query_embedding=query,
            reference_embedding=reference,
            organization_id="org1",
            employee_id="emp1",
            emb_time_ms=50.0,
        )

        assert result.success is True
        assert result.search_type == "1:1"
        assert len(result.matches) == 1
        assert result.matches[0]["employee_id"] == "emp1"
        assert result.confidence_score >= 0.99  # identical embeddings

    def test_1to1_no_match(self, search_engine, sample_embedding):
        """Test unsuccessful 1:1 match."""
        query = sample_embedding.copy()
        reference = np.random.randn(512).astype(np.float32)
        reference = reference / np.linalg.norm(reference)

        result = search_engine.search_1to1(
            query_embedding=query,
            reference_embedding=reference,
            organization_id="org1",
            employee_id="emp1",
            emb_time_ms=50.0,
        )

        assert result.success is False
        assert result.confidence_score < search_engine.threshold

    def test_1to1_metrics_recorded(self, search_engine, sample_embedding):
        """Test that 1:1 search records metrics."""
        initial_count = len(search_engine.metrics.metrics)

        search_engine.search_1to1(
            query_embedding=sample_embedding,
            reference_embedding=sample_embedding,
            organization_id="org1",
            employee_id="emp1",
            emb_time_ms=50.0,
        )

        assert len(search_engine.metrics.metrics) == initial_count + 1
        metric = search_engine.metrics.metrics[-1]
        assert metric.search_type == "1:1"
        assert metric.organization_id == "org1"
        assert metric.employee_id == "emp1"

    def test_1to1_threshold_sensitivity(self, search_engine, sample_embedding):
        """Test threshold-based matching."""
        query = sample_embedding.copy()
        # Create a reference with ~0.8 similarity
        reference = sample_embedding * 0.8 + np.random.randn(512).astype(np.float32) * 0.2
        reference = reference / np.linalg.norm(reference)

        result = search_engine.search_1to1(
            query_embedding=query,
            reference_embedding=reference,
            organization_id="org1",
            employee_id="emp1",
            emb_time_ms=50.0,
        )

        # Should match if confidence >= 0.6
        assert result.confidence_score >= 0.6


class TestSearch1toN:
    """Test 1:N face identification."""

    def test_1toN_with_matches(self, search_engine, sample_embedding):
        """Test successful 1:N search with matches."""
        faiss_matches = [
            {"employee_id": "emp1", "score": 0.92},
            {"employee_id": "emp2", "score": 0.78},
            {"employee_id": "emp3", "score": 0.65},
        ]

        result = search_engine.search_1toN(
            query_embedding=sample_embedding,
            faiss_matches=faiss_matches,
            organization_id="org1",
            emb_time_ms=50.0,
            search_time_ms=30.0,
            index_size=100,
        )

        assert result.success is True
        assert result.search_type == "1:N"
        assert len(result.matches) == 3
        assert result.matches[0]["employee_id"] == "emp1"
        assert result.confidence_score == 0.92

    def test_1toN_no_matches(self, search_engine, sample_embedding):
        """Test 1:N search with no matches."""
        result = search_engine.search_1toN(
            query_embedding=sample_embedding,
            faiss_matches=[],
            organization_id="org1",
            emb_time_ms=50.0,
            search_time_ms=30.0,
            index_size=100,
        )

        assert result.success is False
        assert len(result.matches) == 0
        assert result.confidence_score == 0.0

    def test_1toN_below_threshold(self, search_engine, sample_embedding):
        """Test 1:N with matches below threshold."""
        faiss_matches = [
            {"employee_id": "emp1", "score": 0.55},
        ]

        result = search_engine.search_1toN(
            query_embedding=sample_embedding,
            faiss_matches=faiss_matches,
            organization_id="org1",
            emb_time_ms=50.0,
            search_time_ms=30.0,
            index_size=100,
        )

        assert result.success is False
        assert result.confidence_score == 0.55

    def test_1toN_metrics_recorded(self, search_engine, sample_embedding):
        """Test that 1:N search records metrics."""
        faiss_matches = [{"employee_id": "emp1", "score": 0.85}]

        search_engine.search_1toN(
            query_embedding=sample_embedding,
            faiss_matches=faiss_matches,
            organization_id="org1",
            emb_time_ms=50.0,
            search_time_ms=30.0,
            index_size=50,
        )

        metric = search_engine.metrics.metrics[-1]
        assert metric.search_type == "1:N"
        assert metric.query_index_size == 50
        assert metric.total_latency_ms == pytest.approx(80.0, abs=1.0)


class TestMetricsTracker:
    """Test search metrics tracking and analytics."""

    def test_confidence_trend_insufficient_data(self):
        """Test trend detection with insufficient data."""
        tracker = SearchMetricsTracker()
        trend = tracker.get_confidence_trend("1:1")
        assert trend["status"] == "insufficient_data"

    def test_confidence_trend_stable(self):
        """Test stable confidence detection."""
        tracker = SearchMetricsTracker()

        # Add 10 metrics with stable confidence ~0.8
        for i in range(10):
            metric = SearchMetrics(
                timestamp="2025-01-01T00:00:00",
                search_type="1:1",
                organization_id="org1",
                employee_id="emp1",
                confidence_score=0.80 + (0.02 if i % 2 else 0),
                success=True,
                emb_latency_ms=50.0,
                search_latency_ms=30.0,
                total_latency_ms=80.0,
                query_index_size=1,
            )
            tracker.record(metric)

        trend = tracker.get_confidence_trend("1:1")
        assert trend["status"] == "ok"
        assert trend["trend"] == "stable"

    def test_confidence_trend_degrading(self):
        """Test degrading confidence detection."""
        tracker = SearchMetricsTracker()

        # Add early metrics with high confidence
        for i in range(5):
            metric = SearchMetrics(
                timestamp="2025-01-01T00:00:00",
                search_type="1:1",
                organization_id="org1",
                employee_id="emp1",
                confidence_score=0.95,
                success=True,
                emb_latency_ms=50.0,
                search_latency_ms=30.0,
                total_latency_ms=80.0,
                query_index_size=1,
            )
            tracker.record(metric)

        # Add recent metrics with low confidence
        for i in range(5):
            metric = SearchMetrics(
                timestamp="2025-01-01T00:10:00",
                search_type="1:1",
                organization_id="org1",
                employee_id="emp1",
                confidence_score=0.65,
                success=True,
                emb_latency_ms=50.0,
                search_latency_ms=30.0,
                total_latency_ms=80.0,
                query_index_size=1,
            )
            tracker.record(metric)

        trend = tracker.get_confidence_trend("1:1")
        assert trend["drift_detected"] is True

    def test_latency_stats(self):
        """Test latency percentile calculations."""
        tracker = SearchMetricsTracker()

        latencies = [30, 35, 40, 45, 50, 55, 60, 65, 70, 100]
        for lat in latencies:
            metric = SearchMetrics(
                timestamp="2025-01-01T00:00:00",
                search_type="1:1",
                organization_id="org1",
                employee_id="emp1",
                confidence_score=0.8,
                success=True,
                emb_latency_ms=lat * 0.6,
                search_latency_ms=lat * 0.4,
                total_latency_ms=float(lat),
                query_index_size=1,
            )
            tracker.record(metric)

        stats = tracker.get_latency_stats("1:1")
        assert stats["p50"] > 0
        assert stats["p95"] > stats["p50"]
        assert stats["p99"] >= stats["p95"]


class TestSearchResult:
    """Test SearchResult data structure."""

    def test_result_fields(self, search_engine, sample_embedding):
        """Test that SearchResult has all required fields."""
        result = search_engine.search_1to1(
            query_embedding=sample_embedding,
            reference_embedding=sample_embedding,
            organization_id="org1",
            employee_id="emp1",
            emb_time_ms=50.0,
        )

        assert hasattr(result, "success")
        assert hasattr(result, "matches")
        assert hasattr(result, "confidence_score")
        assert hasattr(result, "search_type")
        assert hasattr(result, "emb_time_ms")
        assert hasattr(result, "search_time_ms")
        assert hasattr(result, "total_time_ms")
        assert hasattr(result, "threshold")

        assert result.total_time_ms >= result.emb_time_ms
