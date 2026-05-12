"""
Internal authentication for the face-api microservice.

This service is server-to-server only — it is called by centralized-server, not
by browsers or mobile clients directly. Every sensitive endpoint requires the
X-Internal-Secret header to match the configured INTERNAL_SECRET env var.

Comparison is timing-safe. If INTERNAL_SECRET is unset at boot, the process
fails to start instead of running with an open door.
"""

import hmac
import logging
import os
import sys

from fastapi import Header, HTTPException, status

log = logging.getLogger(__name__)

_INTERNAL_SECRET = os.environ.get("INTERNAL_SECRET")

if not _INTERNAL_SECRET and os.environ.get("FACE_API_ENV", "production") != "test":
    log.error("INTERNAL_SECRET is not set. Refusing to start — endpoints would fail open.")
    sys.exit(1)


def require_internal_secret(x_internal_secret: str | None = Header(default=None)):
    """FastAPI dependency that gates a route on the shared internal secret."""
    if not _INTERNAL_SECRET:
        # Defensive: shouldn't reach here outside test mode, but keep fail-closed.
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service not configured")
    if not x_internal_secret or not isinstance(x_internal_secret, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if not hmac.compare_digest(x_internal_secret, _INTERNAL_SECRET):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
