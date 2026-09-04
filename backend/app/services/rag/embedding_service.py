import hashlib
import math
import httpx
from ...config import get_settings

settings = get_settings()


def _mock_embedding(text: str) -> list[float]:
    """Deterministic local embedding for tests/demo; production should use OpenAI + Atlas."""
    vector = [0.0] * settings.embedding_dimensions
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode()).digest()
        vector[int.from_bytes(digest[:4], "big") % len(vector)] += -1.0 if digest[4] & 1 else 1.0
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


async def embed(texts: list[str]) -> list[list[float]]:
    if settings.embedding_provider == "mock":
        return [_mock_embedding(text) for text in texts]
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": settings.embedding_model, "input": texts, "dimensions": settings.embedding_dimensions},
        )
        response.raise_for_status()
        rows = sorted(response.json()["data"], key=lambda item: item["index"])
        return [row["embedding"] for row in rows]
