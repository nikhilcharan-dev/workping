"""
Integration-test fixtures for the face-api-microservice.

These tests talk to a REAL running deployment of the service (with the actual
InsightFace antelopev2 model, Mongo, and Redis). Run with:

    INTEGRATION=1 BIOMETRIC_URL=http://localhost:8000 pytest tests/integration/

When INTEGRATION env var is unset, every test in this subtree is skipped so
the default `pytest tests/` invocation (unit tests against stubbed deps)
remains fast and fully offline.
"""

import os
import base64
import pathlib
import pytest
import httpx


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
SAMPLE_IMAGE = REPO_ROOT / "test_img.jpeg"


def pytest_collection_modifyitems(config, items):
    """Auto-skip every integration test when INTEGRATION env is missing."""
    if os.environ.get("INTEGRATION") == "1":
        return
    skip_marker = pytest.mark.skip(
        reason="Integration tests require INTEGRATION=1 and a running face-api service"
    )
    for item in items:
        item.add_marker(skip_marker)


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.environ.get("BIOMETRIC_URL", "http://localhost:8000").rstrip("/")


@pytest.fixture(scope="session")
def sample_image_b64() -> str:
    if not SAMPLE_IMAGE.exists():
        pytest.skip(f"Sample image not found at {SAMPLE_IMAGE}")
    return base64.b64encode(SAMPLE_IMAGE.read_bytes()).decode("ascii")


@pytest.fixture(scope="session")
def http_client(base_url):
    # Forward INTERNAL_SECRET on every request — every sensitive endpoint
    # now requires it. The integration runner must export it before invoking
    # pytest (same secret the running service is configured with).
    headers = {}
    if os.environ.get("INTERNAL_SECRET"):
        headers["X-Internal-Secret"] = os.environ["INTERNAL_SECRET"]
    with httpx.Client(base_url=base_url, timeout=30.0, headers=headers) as c:
        # Verify the service is actually reachable before running tests
        try:
            r = c.get("/api/v1/health")
            r.raise_for_status()
        except Exception as e:
            pytest.skip(f"Face-api service not reachable at {base_url}: {e}")
        yield c
