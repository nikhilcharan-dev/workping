"""
Tests for input validation helpers in app.py.

Exercises validate_image_b64 against the real implementation (no mocking) via
the conftest-stubbed app module.
"""

import base64
import pytest
from fastapi import HTTPException


def _make_b64(byte_count: int) -> str:
    """Produce a base64 string whose decoded payload is exactly byte_count bytes."""
    return base64.b64encode(b"A" * byte_count).decode("ascii")


def test_accepts_small_valid_payload(face_app_module):
    # ~10 KB decoded — well under the 5 MB cap
    payload = _make_b64(10 * 1024)
    out = face_app_module.validate_image_b64(payload)
    assert isinstance(out, (bytes, bytearray))
    assert len(out) == 10 * 1024


def test_rejects_non_base64(face_app_module):
    with pytest.raises(HTTPException) as exc:
        face_app_module.validate_image_b64("!!! this is not base64 !!!")
    assert exc.value.status_code == 400
    assert "base64" in exc.value.detail.lower()


def test_rejects_oversize_base64_string(face_app_module):
    # Exceed MAX_IMAGE_B64_LEN (default 7 MB of chars)
    oversize = "A" * (face_app_module.MAX_IMAGE_B64_LEN + 1)
    with pytest.raises(HTTPException) as exc:
        face_app_module.validate_image_b64(oversize)
    assert exc.value.status_code == 413


def test_rejects_oversize_decoded_payload(face_app_module):
    # Encoded length is within MAX_IMAGE_B64_LEN but decodes to > 5 MB.
    # 5 MB + 1 byte = 5242881; needs ~6990508 base64 chars (under 7 MB cap).
    big_payload = b"X" * (5 * 1024 * 1024 + 1)
    encoded = base64.b64encode(big_payload).decode("ascii")
    # Confirm we're under the string cap so we test the decoded-size branch.
    assert len(encoded) <= face_app_module.MAX_IMAGE_B64_LEN
    with pytest.raises(HTTPException) as exc:
        face_app_module.validate_image_b64(encoded)
    assert exc.value.status_code == 413


def test_accepts_payload_at_exactly_5mb(face_app_module):
    # Boundary: exactly 5 MB should pass (the check is `> MAX_IMAGE_BYTES`).
    exact_5mb = b"Y" * (5 * 1024 * 1024)
    encoded = base64.b64encode(exact_5mb).decode("ascii")
    if len(encoded) > face_app_module.MAX_IMAGE_B64_LEN:
        pytest.skip("encoded form exceeds MAX_IMAGE_B64_LEN under current config")
    out = face_app_module.validate_image_b64(encoded)
    assert len(out) == 5 * 1024 * 1024
