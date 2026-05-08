"""
Face API Load Test
------------------
Tests concurrent image processing on the DGX B200 GPU-backed face recognition API.

Flow per request:
  POST /detect  →  ticket_id  →  poll /ticket/{id}  →  result

Metrics collected:
  - Queue latency (time to receive ticket)
  - Processing latency (time until result ready)
  - Total round-trip time
  - GPU throughput (req/s)
  - Match confidence & success rate
"""

import asyncio
import aiohttp
import base64
import time
import statistics
import sys
import io
from dataclasses import dataclass

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path
from typing import Optional

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_URL          = "https://upskillbackend.adityauniversity.in"
FACE_API_BASE     = f"{BASE_URL}/proxy/faceapi/api/v1"
DETECT_ENDPOINT   = f"{FACE_API_BASE}/detect"
TICKET_ENDPOINT   = f"{FACE_API_BASE}/ticket"

USER_ID           = "69e3811842433f38b1b7f933"
ORGANIZATION_ID   = "69e3811642433f38b1b7f902"
TEST_IMAGE_PATH   = Path(__file__).parent / "test_img.jpeg"

# Concurrency sweep — each level runs TOTAL_REQUESTS requests
CONCURRENCY_LEVELS = [5, 10, 20, 50]
TOTAL_REQUESTS     = 30   # requests per concurrency level

POLL_TIMEOUT_S     = 60   # max seconds to wait for a ticket result
POLL_INTERVAL_S    = 0.3  # seconds between polls

# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class Result:
    worker_id: int
    queue_ms: float         = 0.0   # time to get ticket_id
    process_ms: float       = 0.0   # time from ticket to completed
    total_ms: float         = 0.0
    embedding_ms: Optional[float] = None
    search_ms: Optional[float]    = None
    confidence: Optional[float]   = None
    matched: Optional[bool]       = None
    error: Optional[str]          = None
    http_status: int              = 0
    timed_out: bool               = False

# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_image_b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()

async def poll_ticket(session: aiohttp.ClientSession, ticket_id: str) -> dict:
    """Poll until status != 'processing', or timeout."""
    deadline = time.monotonic() + POLL_TIMEOUT_S
    while time.monotonic() < deadline:
        async with session.get(f"{TICKET_ENDPOINT}/{ticket_id}") as resp:
            data = await resp.json()
        status = data.get("status")
        if status == "completed":
            return data
        if status not in ("processing", "queued"):
            return data   # unexpected status — return as-is
        await asyncio.sleep(POLL_INTERVAL_S)
    return {"status": "timeout"}

async def single_request(
    session: aiohttp.ClientSession,
    worker_id: int,
    image_b64: str,
    user_id: str,
    org_id: str,
    semaphore: asyncio.Semaphore,
) -> Result:
    r = Result(worker_id=worker_id)
    async with semaphore:
        t0 = time.monotonic()
        try:
            # ── Step 1: enqueue detect ─────────────────────────────────────
            payload = {
                "image_base64": image_b64,
                "user_id":       user_id,
                "organization_id": org_id,
            }
            async with session.post(DETECT_ENDPOINT, json=payload) as resp:
                r.http_status = resp.status
                resp.raise_for_status()
                queued = await resp.json()

            t1 = time.monotonic()
            r.queue_ms = (t1 - t0) * 1000

            ticket_id = queued.get("ticket_id")
            if not ticket_id:
                r.error = f"No ticket_id in response: {queued}"
                return r

            # ── Step 2: poll for result ────────────────────────────────────
            result_data = await poll_ticket(session, ticket_id)
            t2 = time.monotonic()

            r.process_ms = (t2 - t1) * 1000
            r.total_ms   = (t2 - t0) * 1000

            if result_data.get("status") == "timeout":
                r.timed_out = True
                r.error = "Poll timeout"
                return r

            inner = result_data.get("result", {})
            r.matched      = inner.get("success")
            r.confidence   = inner.get("confidence")
            r.embedding_ms = inner.get("embedding_time_ms")
            r.search_ms    = inner.get("search_time_ms")
            if not r.matched and inner.get("error"):
                r.error = inner["error"]

        except aiohttp.ClientError as exc:
            r.error = f"HTTP error: {exc}"
        except Exception as exc:
            r.error = f"Unexpected: {exc}"

    return r

# ─── Runner ───────────────────────────────────────────────────────────────────

async def run_level(
    concurrency: int,
    total: int,
    image_b64: str,
    user_id: str,
    org_id: str,
) -> list[Result]:
    semaphore = asyncio.Semaphore(concurrency)
    connector = aiohttp.TCPConnector(limit=concurrency + 10, ssl=False)
    timeout   = aiohttp.ClientTimeout(total=120)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [
            single_request(session, i, image_b64, user_id, org_id, semaphore)
            for i in range(total)
        ]
        results = await asyncio.gather(*tasks)

    return list(results)

# ─── Reporting ────────────────────────────────────────────────────────────────

def percentile(data: list[float], p: float) -> float:
    if not data:
        return 0.0
    data = sorted(data)
    k = (len(data) - 1) * p / 100
    lo, hi = int(k), min(int(k) + 1, len(data) - 1)
    return data[lo] + (data[hi] - data[lo]) * (k - lo)

def print_stats(concurrency: int, results: list[Result], wall_s: float):
    ok      = [r for r in results if r.error is None and not r.timed_out]
    errors  = [r for r in results if r.error]
    timeouts= [r for r in results if r.timed_out]
    matched = [r for r in ok if r.matched]

    totals  = [r.total_ms   for r in ok]
    queues  = [r.queue_ms   for r in ok]
    procs   = [r.process_ms for r in ok]
    embs    = [r.embedding_ms for r in ok if r.embedding_ms]
    confs   = [r.confidence   for r in ok if r.confidence is not None]

    print(f"\n{'═'*60}")
    print(f"  Concurrency : {concurrency:>4}  |  Requests: {len(results)}")
    print(f"  Wall time   : {wall_s:.2f}s  |  Throughput: {len(results)/wall_s:.2f} req/s")
    print(f"  Success     : {len(ok)}/{len(results)}  |  Matched: {len(matched)}/{len(ok)}")
    if errors:
        print(f"  Errors      : {len(errors)}")
        for r in errors[:3]:
            print(f"    worker {r.worker_id}: {r.error}")
    if timeouts:
        print(f"  Timeouts    : {len(timeouts)}")
    if not totals:
        print("  No successful results to report latencies.")
        return

    print(f"\n  ┌{'─'*40}┐")
    print(f"  │ Latency (ms)          p50    p95    p99 │")
    print(f"  │ Total round-trip  {percentile(totals,50):>6.0f} {percentile(totals,95):>6.0f} {percentile(totals,99):>6.0f} │")
    print(f"  │ Queue (to ticket) {percentile(queues,50):>6.0f} {percentile(queues,95):>6.0f} {percentile(queues,99):>6.0f} │")
    print(f"  │ GPU processing    {percentile(procs,50):>6.0f} {percentile(procs,95):>6.0f} {percentile(procs,99):>6.0f} │")
    if embs:
        print(f"  │ Embedding (GPU)   {percentile(embs,50):>6.0f} {percentile(embs,95):>6.0f} {percentile(embs,99):>6.0f} │")
    if confs:
        print(f"  │ Confidence (avg)  {statistics.mean(confs):>6.3f}                   │")
    print(f"  └{'─'*40}┘")

# ─── Entrypoint ───────────────────────────────────────────────────────────────

async def main():
    print("Face API Load Test — DGX B200")
    print(f"  Target : {FACE_API_BASE}")
    print(f"  User   : imran.khan@workping.live  ({USER_ID})")
    print(f"  Image  : {TEST_IMAGE_PATH.name}")
    print(f"  Levels : {CONCURRENCY_LEVELS} (×{TOTAL_REQUESTS} requests each)")

    if not TEST_IMAGE_PATH.exists():
        print(f"\n[ERROR] Test image not found: {TEST_IMAGE_PATH}", file=sys.stderr)
        sys.exit(1)

    print("\n[1/1] Encoding image …", end=" ", flush=True)
    image_b64 = load_image_b64(TEST_IMAGE_PATH)
    print(f"OK  ({len(image_b64) // 1024} KB base64)")

    for concurrency in CONCURRENCY_LEVELS:
        print(f"\nRunning concurrency={concurrency} …", end=" ", flush=True)
        t0 = time.monotonic()
        results = await run_level(concurrency, TOTAL_REQUESTS, image_b64, USER_ID, ORGANIZATION_ID)
        wall = time.monotonic() - t0
        print(f"done in {wall:.1f}s")
        print_stats(concurrency, results, wall)

    print(f"\n{'═'*60}")
    print("Load test complete.")

if __name__ == "__main__":
    asyncio.run(main())
