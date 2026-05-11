"""
Tests for the Phase 1 anti-spoofing liveness detector.

The detector uses Farneback dense optical flow over consecutive frames; a
static photo or screen-replay produces near-zero motion, while a live face
exhibits natural micro-movement above the empirical threshold.

These tests use synthetic frames (no real face needed) — what we verify is
the binary decision the algorithm makes given (a) identical frames and
(b) frames with injected motion.
"""

import io
import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")


def _encode_jpeg(arr: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", arr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    assert ok
    return buf.tobytes()


def _solid_frame(value: int) -> np.ndarray:
    return np.full((128, 128), value, dtype=np.uint8)


def _moving_frame(seed: int) -> np.ndarray:
    """Frame with a bright shifting square — produces measurable optical flow."""
    rng = np.random.default_rng(seed)
    frame = np.full((128, 128), 50, dtype=np.uint8)
    # Draw a square at a position that depends on seed → motion across frames
    x = 10 + (seed * 13) % 80
    y = 10 + (seed * 19) % 80
    frame[y : y + 30, x : x + 30] = 220
    # Add some texture so the flow estimator has gradients to track
    noise = (rng.integers(0, 30, size=frame.shape)).astype(np.uint8)
    return np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)


def test_returns_decode_failed_when_fewer_than_two_frames(face_app_module):
    out = face_app_module._analyze_liveness_frames([_encode_jpeg(_solid_frame(128))])
    assert out["is_live"] is False
    assert out["confidence"] == 0.0
    assert out["reason"] == "decode_failed"


def test_returns_decode_failed_when_all_frames_undecodable(face_app_module):
    out = face_app_module._analyze_liveness_frames([b"not a jpeg", b"also not a jpeg"])
    assert out["is_live"] is False
    assert out["reason"] == "decode_failed"


def test_rejects_identical_frames_as_not_live(face_app_module):
    """Replaying the same frame twice (static photo of a photo) → not live."""
    frame = _encode_jpeg(_solid_frame(128))
    out = face_app_module._analyze_liveness_frames([frame, frame, frame])
    assert out["is_live"] is False
    assert out["confidence"] < 0.5
    assert out["frames_analyzed"] == 3


def test_rejects_near_static_frames_as_not_live(face_app_module):
    """Two frames that differ by only a few pixels — below motion threshold."""
    a = _solid_frame(128)
    b = a.copy()
    b[0, 0] = 130  # 1-pixel change
    out = face_app_module._analyze_liveness_frames([_encode_jpeg(a), _encode_jpeg(b)])
    assert out["is_live"] is False


def test_accepts_moving_frames_as_live(face_app_module):
    """Frames with a translating square produce motion above the empirical threshold."""
    frames = [_encode_jpeg(_moving_frame(seed)) for seed in range(5)]
    out = face_app_module._analyze_liveness_frames(frames)
    assert out["frames_analyzed"] == 5
    assert "mean_motion" in out
    # The synthetic motion is large; this should clear the 0.08 threshold.
    assert out["mean_motion"] > 0.08
    assert out["is_live"] is True


def test_output_shape_contains_expected_fields(face_app_module):
    frames = [_encode_jpeg(_moving_frame(s)) for s in range(3)]
    out = face_app_module._analyze_liveness_frames(frames)
    for key in ("is_live", "confidence", "mean_motion", "motion_variance", "frames_analyzed"):
        assert key in out
    assert isinstance(out["is_live"], (bool, np.bool_))
    assert 0.0 <= out["confidence"] <= 1.0


def test_confidence_is_clipped_to_one(face_app_module):
    """Confidence is min(1.0, mean_motion * 3.0) — high motion saturates at 1.0."""
    # Force very high motion: alternate black/white frames
    frames = []
    for i in range(5):
        if i % 2 == 0:
            frames.append(_encode_jpeg(_solid_frame(20)))
        else:
            frames.append(_encode_jpeg(_solid_frame(230)))
    out = face_app_module._analyze_liveness_frames(frames)
    assert out["confidence"] <= 1.0
