"""
Tests for the FAISSIndex class — pure in-memory FAISS IndexFlatIP wrapper used
for org-level 1:N face identification.
"""

import numpy as np
import pytest


def _unit(seed: int, dim: int = 512) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.standard_normal(dim).astype(np.float32)
    return v / np.linalg.norm(v)


def test_size_zero_when_org_unknown(face_app_module):
    idx = face_app_module.FAISSIndex()
    assert idx.size("does-not-exist") == 0


def test_add_then_size(face_app_module):
    idx = face_app_module.FAISSIndex()
    idx.add("org-1", "emp-1", _unit(1))
    idx.add("org-1", "emp-2", _unit(2))
    assert idx.size("org-1") == 2


def test_search_returns_self_with_score_one_for_identical_query(face_app_module):
    idx = face_app_module.FAISSIndex()
    v = _unit(99)
    idx.add("org-1", "emp-99", v)

    hits = idx.search("org-1", v, k=1)
    assert len(hits) == 1
    assert hits[0]["employee_id"] == "emp-99"
    # Cosine similarity of a unit vector with itself = 1.0
    assert hits[0]["score"] >= 0.99


def test_search_filters_by_threshold(face_app_module):
    """Random distinct vectors should produce scores well below THRESHOLD=0.6,
    so a search with a completely unrelated query returns nothing."""
    idx = face_app_module.FAISSIndex()
    for i in range(5):
        idx.add("org-1", f"emp-{i}", _unit(i))

    # A query that isn't any stored vector — expect no result above threshold
    query = _unit(1000)
    hits = idx.search("org-1", query, k=5)
    for h in hits:
        assert h["score"] >= face_app_module.THRESHOLD


def test_search_empty_org_returns_empty_list(face_app_module):
    idx = face_app_module.FAISSIndex()
    assert idx.search("empty-org", _unit(1)) == []


def test_rebuild_replaces_index(face_app_module):
    idx = face_app_module.FAISSIndex()
    idx.add("org-1", "emp-old", _unit(1))
    assert idx.size("org-1") == 1

    records = [
        {"employee_id": f"emp-new-{i}", "embedding": _unit(i + 10).tolist()}
        for i in range(3)
    ]
    idx.rebuild("org-1", records)
    assert idx.size("org-1") == 3
    # Old employee_id must no longer appear
    hits = idx.search("org-1", _unit(1), k=5)
    assert "emp-old" not in {h["employee_id"] for h in hits}


def test_k_is_clamped_to_index_size(face_app_module):
    idx = face_app_module.FAISSIndex()
    idx.add("org-1", "emp-1", _unit(1))
    idx.add("org-1", "emp-2", _unit(2))
    # Ask for top-100 but only 2 exist — should not crash, returns at most 2.
    hits = idx.search("org-1", _unit(1), k=100)
    assert len(hits) <= 2
