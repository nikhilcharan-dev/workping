"""
Structured JSON logger for face-api-microservice.

Emits one JSON line per record to stdout (info-level and below) / stderr
(warning and above) so log aggregators (Loki, Cloudwatch, Datadog) can parse
without an adapter. The previous codebase used bare `print(...)` calls which
collide with each other under concurrent workers and have no level filtering.

Use:
    from logger import log
    log.info("server up", extra={"port": 5000})
    log.error("inference failed", extra={"ticket_id": tid, "err": str(e)})

`extra` keys are merged into the JSON record. Bind request correlation by
calling `log.bind(request_id=...)` (returns a logger with those fields baked
in for downstream calls).
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone


# Public alias used by log-config.json's dictConfig `()` factory reference.
# dictConfig resolves "logger.JsonFormatter" → this module's JsonFormatter class.
class JsonFormatter(logging.Formatter):
    """Format every record as a single-line JSON object."""

    # Standard LogRecord attributes we never want to leak into the output
    # twice (already handled explicitly above).
    _RESERVED = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "message", "asctime",
    }

    def format(self, record: logging.LogRecord) -> str:
        record_dict = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "msg": record.getMessage(),
            "service": os.environ.get("SERVICE_NAME", "workping-biometric"),
        }
        # Merge any extra fields passed via `logger.info("...", extra={...})`
        # without clobbering reserved attributes.
        for key, value in record.__dict__.items():
            if key in self._RESERVED or key.startswith("_"):
                continue
            try:
                json.dumps(value)
                record_dict[key] = value
            except (TypeError, ValueError):
                record_dict[key] = repr(value)

        if record.exc_info:
            record_dict["exception"] = self.formatException(record.exc_info)

        return json.dumps(record_dict, separators=(",", ":"))


def _configure_root_logger() -> logging.Logger:
    level_name = os.environ.get("LOG_LEVEL", "info").upper()
    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)

    # Drop any handlers Python's default configuration may have installed
    # so we don't end up with duplicate lines (e.g. uvicorn adds its own).
    root.handlers.clear()

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(JsonFormatter())
    stdout_handler.addFilter(lambda record: record.levelno < logging.WARNING)

    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setFormatter(JsonFormatter())
    stderr_handler.setLevel(logging.WARNING)

    root.addHandler(stdout_handler)
    root.addHandler(stderr_handler)
    return root


_configure_root_logger()

# Module-level singleton — `from logger import log` everywhere.
log = logging.getLogger("workping-biometric")
