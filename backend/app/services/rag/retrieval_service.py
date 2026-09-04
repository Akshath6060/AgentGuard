import math
from ...config import get_settings
from ...database import db
from ...utils import clean
from .embedding_service import embed

settings = get_settings()


def transaction_query(agent: dict, request: dict, history: dict) -> str:
    merchant = request["merchant"]
    return (
        f"{agent.get('name', request.get('agent_id'))} {agent.get('type', 'AI')} agent with role {agent.get('description', 'autonomous agent')} "
        f"attempting {request['amount'] / 100:.2f} {request['currency']} payment to {merchant['verification_status']} vendor "
        f"{merchant['name']} in {merchant['category']} for {request['purpose']}. Payment type {request.get('payment_type', 'one_time')}. "
        f"Merchant known: {history.get('merchant_known')}; recent failures: {history.get('recent_failures')}. "
        "Determine spending limits, approvals, vendor restrictions, security rules and payment policy."
    )


async def retrieve(workspace_id: str, query: str, limit: int | None = None) -> list[dict]:
    limit = limit or settings.rag_top_k
    query_vector = (await embed([query]))[0]
    pipeline = [{"$vectorSearch": {"index": settings.mongodb_vector_index, "path": "embedding", "queryVector": query_vector, "numCandidates": max(limit * 10, 50), "limit": limit, "filter": {"workspace_id": workspace_id}}}, {"$project": {"_id": 0, "policy_id": 1, "policy_title": 1, "category": 1, "chunk_index": 1, "text": 1, "similarity_score": {"$meta": "vectorSearchScore"}}}]
    try:
        return clean(await (await db.policy_chunks.aggregate(pipeline)).to_list(limit))
    except Exception:
        # Local MongoDB and Atlas clusters without a vector index remain demo-safe.
        docs = await db.policy_chunks.find({"workspace_id": workspace_id}, {"embedding": 1, "policy_id": 1, "policy_title": 1, "category": 1, "chunk_index": 1, "text": 1}).to_list(1000)
        norm_q = math.sqrt(sum(x * x for x in query_vector)) or 1
        for doc in docs:
            vector = doc.pop("embedding", [])
            norm = math.sqrt(sum(x * x for x in vector)) or 1
            doc["similarity_score"] = sum(a * b for a, b in zip(query_vector, vector)) / (norm_q * norm)
        return clean(sorted(docs, key=lambda item: item["similarity_score"], reverse=True)[:limit])
