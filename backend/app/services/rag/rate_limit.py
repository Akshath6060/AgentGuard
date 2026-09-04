from ...config import get_settings
from ..rate_limit import consume
from fastapi import HTTPException, Request

settings = get_settings()


async def ai_rate_limit(request: Request):
    """AI/RAG endpoints are limited per client address and workspace."""
    host = request.client.host if request.client else "unknown"
    key = f"ai:{host}:{request.headers.get('X-Workspace-ID', '')}"
    if not consume(key, settings.ai_rate_limit_per_minute):
        raise HTTPException(429, "AI endpoint rate limit exceeded")
