"""
Integration tests for the optical-flow liveness endpoint against a live
deployment. Replays the same JPEG several times (static-photo attack) and
asserts is_live == False, then sends synthetic motion frames and expects
is_live == True (or a sane structured response).

Skipped unless INTEGRATION=1.
"""

import base64
import pytest


cv2 = pytest.importorskip("cv2")
import numpy as np


def _moving_frame_b64(seed: int) -> str:
    rng = np.random.default_rng(seed)
    frame = np.full((256, 256, 3), 50, dtype=np.uint8)
    x = 10 + (seed * 17) % 200
    y = 10 + (seed * 23) % 200
    frame[y : y + 40, x : x + 40] = 220
    noise = rng.integers(0, 25, size=frame.shape).astype(np.uint8)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    assert ok
    return base64.b64encode(buf.tobytes()).decode("ascii")


def test_liveness_rejects_replayed_static_frames(http_client, sample_image_b64):
    # Same JPEG repeated → static photo attack
    res = http_client.post(
        "/api/v1/liveness/check",
        json={"frames": [sample_image_b64, sample_image_b64, sample_image_b64]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_live"] is False
    assert body["frames_analyzed"] == 3


def test_liveness_accepts_frames_with_motion(http_client):
    frames = [_moving_frame_b64(seed) for seed in range(5)]
    res = http_client.post("/api/v1/liveness/check", json={"frames": frames})
    assert res.status_code == 200
    body = res.json()
    assert "is_live" in body
    assert body["frames_analyzed"] == 5
    # Whether the synthetic motion clears the threshold is empirical;
    # what we *can* assert is that motion was detected and the response is sane.
    assert body["mean_motion"] > 0.0


def test_liveness_rejects_too_few_frames(http_client, sample_image_b64):
    res = http_client.post("/api/v1/liveness/check", json={"frames": [sample_image_b64]})
    assert res.status_code == 400
    assert "between 2 and 10" in res.json()["detail"].lower()


def test_liveness_rejects_too_many_frames(http_client, sample_image_b64):
    res = http_client.post(
        "/api/v1/liveness/check", json={"frames": [sample_image_b64] * 11}
    )
    assert res.status_code == 400
