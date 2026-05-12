"""
Unified Face Search Module (1:1 and 1:N)
=========================================
Handles both single-user verification (1:1) and org-level identification (1:N)
with integrated metrics collection for confidence scores and latency tracking.
"""

import numpy as np
import time
from collections import deque
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime

@dataclass
class SearchResult:
    success: bool
    matches: List[dict]  # [{employee_id, score}] for 1:N; [{employee_id, score}] for 1:1
    confidence_score: float
    search_type: str  # "1:1" or "1:N"
    emb_time_ms: float
    search_time_ms: float
    total_time_ms: float
    threshold: float


@dataclass
class SearchMetrics:
    """Metrics for dashboard observability."""
    timestamp: str
    search_type: str  # "1:1" or "1:N"
    organization_id: str
    employee_id: Optional[str]
    confidence_score: float
    success: bool
    emb_latency_ms: float
    search_latency_ms: float
    total_latency_ms: float
    query_index_size: int  # FAISS index size for 1:N, 1 for 1:1


class SearchMetricsTracker:
    """Track search metrics for observability and model drift detection."""

    def __init__(self):
        self.metrics: deque = deque(maxlen=1000)

    def record(self, metrics: SearchMetrics):
        self.metrics.append(metrics)

    def get_confidence_trend(self, search_type: str) -> dict:
        """Analyze confidence score trend for drift detection."""
        filtered = [m for m in self.metrics if m.search_type == search_type]
        if len(filtered) < 5:
            return {"status": "insufficient_data", "avg_confidence": 0.0}

        # Split into recent and older batches
        mid = len(filtered) // 2
        older_avg = np.mean([m.confidence_score for m in filtered[:mid]])
        recent_avg = np.mean([m.confidence_score for m in filtered[mid:]])

        trend = "degrading" if recent_avg < older_avg - 0.05 else "stable"
        return {
            "status": "ok",
            "trend": trend,
            "older_batch_avg": round(older_avg, 3),
            "recent_batch_avg": round(recent_avg, 3),
            "drift_detected": recent_avg < older_avg - 0.05
        }

    def get_latency_stats(self, search_type: str) -> dict:
        """P95 latency for SLA monitoring."""
        filtered = [m.total_latency_ms for m in self.metrics if m.search_type == search_type]
        if not filtered:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0}

        return {
            "p50": round(float(np.percentile(filtered, 50)), 2),
            "p95": round(float(np.percentile(filtered, 95)), 2),
            "p99": round(float(np.percentile(filtered, 99)), 2),
        }


class FaceSearchEngine:
    """Unified 1:1 and 1:N face search with metrics."""

    def __init__(self, threshold: float = 0.6):
        self.threshold = threshold
        self.metrics = SearchMetricsTracker()

    def search_1to1(
        self,
        query_embedding: np.ndarray,
        reference_embedding: np.ndarray,
        organization_id: str,
        employee_id: str,
        emb_time_ms: float,
    ) -> SearchResult:
        """
        1:1 verification: Compare query against single employee.
        Used when employee_id is known (e.g., attendance punch-in).
        """
        start_search = time.time()

        # Normalize vectors
        q = query_embedding.astype(np.float32)
        r = reference_embedding.astype(np.float32)

        q_norm = np.linalg.norm(q)
        r_norm = np.linalg.norm(r)

        if q_norm > 0:
            q = q / q_norm
        if r_norm > 0:
            r = r / r_norm

        # Cosine similarity via dot product
        score = float(np.dot(q, r))
        success = score >= self.threshold

        search_time_ms = (time.time() - start_search) * 1000
        total_time_ms = emb_time_ms + search_time_ms

        result = SearchResult(
            success=success,
            matches=[{"employee_id": employee_id, "score": round(score, 4)}] if success else [],
            confidence_score=score,
            search_type="1:1",
            emb_time_ms=emb_time_ms,
            search_time_ms=search_time_ms,
            total_time_ms=total_time_ms,
            threshold=self.threshold,
        )

        # Record metrics
        metrics = SearchMetrics(
            timestamp=datetime.now().isoformat(),
            search_type="1:1",
            organization_id=organization_id,
            employee_id=employee_id,
            confidence_score=score,
            success=success,
            emb_latency_ms=emb_time_ms,
            search_latency_ms=search_time_ms,
            total_latency_ms=total_time_ms,
            query_index_size=1,
        )
        self.metrics.record(metrics)

        return result

    def search_1toN(
        self,
        query_embedding: np.ndarray,
        faiss_matches: List[dict],
        organization_id: str,
        emb_time_ms: float,
        search_time_ms: float,
        index_size: int,
    ) -> SearchResult:
        """
        1:N identification: Search against org's FAISS index.
        Returns top matches when employee_id is unknown (e.g., kiosk mode).
        """
        total_time_ms = emb_time_ms + search_time_ms

        # Best match confidence from FAISS results
        confidence_score = faiss_matches[0]["score"] if faiss_matches else 0.0
        success = len(faiss_matches) > 0 and confidence_score >= self.threshold

        result = SearchResult(
            success=success,
            matches=faiss_matches,
            confidence_score=confidence_score,
            search_type="1:N",
            emb_time_ms=emb_time_ms,
            search_time_ms=search_time_ms,
            total_time_ms=total_time_ms,
            threshold=self.threshold,
        )

        # Record metrics (employee_id is the best match if available)
        best_emp_id = faiss_matches[0]["employee_id"] if faiss_matches else "unknown"
        metrics = SearchMetrics(
            timestamp=datetime.now().isoformat(),
            search_type="1:N",
            organization_id=organization_id,
            employee_id=best_emp_id,
            confidence_score=confidence_score,
            success=success,
            emb_latency_ms=emb_time_ms,
            search_latency_ms=search_time_ms,
            total_latency_ms=total_time_ms,
            query_index_size=index_size,
        )
        self.metrics.record(metrics)

        return result


# Global singleton
_search_engine = None


def get_search_engine() -> FaceSearchEngine:
    global _search_engine
    if _search_engine is None:
        _search_engine = FaceSearchEngine(threshold=0.6)
    return _search_engine
