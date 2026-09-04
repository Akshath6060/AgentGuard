"""Shared in-process fixed-window rate limiting.

Sufficient for a single-instance deployment and the demo environment. A multi-instance
deployment should back this with Redis so the window is shared across workers.
"""
from collections import defaultdict, deque
from time import monotonic
from fastapi import HTTPException, Request

_buckets: dict[str, deque] = defaultdict(deque)


def client_key(request: Request, scope: str) -> str:
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    host = forwarded or (request.client.host if request.client else "unknown")
    return f"{scope}:{host}"


def consume(key: str, limit: int, window: int = 60) -> bool:
    cutoff = monotonic() - window
    bucket = _buckets[key]
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= limit:
        return False
    bucket.append(monotonic())
    return True


def limiter(scope: str, limit: int, message: str, window: int = 60):
    """Build a FastAPI dependency that rate limits by client address."""
    async def dependency(request: Request):
        if not consume(client_key(request, scope), limit, window):
            raise HTTPException(429, message)
    return dependency
