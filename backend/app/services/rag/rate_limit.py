from collections import defaultdict, deque
from time import monotonic
from fastapi import HTTPException, Request
from ...config import get_settings

settings = get_settings()
_requests: dict[str, deque] = defaultdict(deque)


async def ai_rate_limit(request: Request):
    key = f"{request.client.host if request.client else 'unknown'}:{request.headers.get('X-Workspace-ID', '')}"
    cutoff = monotonic() - 60
    bucket = _requests[key]
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= settings.ai_rate_limit_per_minute:
        raise HTTPException(429, "AI endpoint rate limit exceeded")
    bucket.append(monotonic())
