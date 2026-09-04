from pymongo import DeleteMany, InsertOne
from ...database import db
from ...utils import now
from .chunking_service import chunk_text
from .embedding_service import embed


async def index_policy(policy: dict) -> dict:
    text = policy.get("content") or policy.get("source_text") or policy.get("description") or policy.get("name", "")
    chunks = chunk_text(text)
    try:
        vectors = await embed(chunks) if chunks else []
        docs = [{
            "policy_id": policy["policy_id"], "policy_version": policy["version"],
            "workspace_id": policy["workspace_id"], "organization_id": policy["workspace_id"],
            "policy_title": policy["name"], "category": policy.get("category", "other"),
            "chunk_index": index, "text": value, "embedding": vectors[index], "created_at": now(),
        } for index, value in enumerate(chunks)]
        operations = [DeleteMany({"workspace_id": policy["workspace_id"], "policy_id": policy["policy_id"]})]
        operations.extend(InsertOne(doc) for doc in docs)
        await db.policy_chunks.bulk_write(operations, ordered=True)
        indexed = now()
        await db.policies.update_one({"_id": policy["_id"]}, {"$set": {"chunks": len(docs), "embedding_status": "indexed", "last_indexed_at": indexed, "updated_at": indexed}})
        return {"status": "indexed", "chunks": len(docs), "last_indexed_at": indexed}
    except Exception as exc:
        await db.policies.update_one({"_id": policy["_id"]}, {"$set": {"chunks": 0, "embedding_status": "indexing_failed", "indexing_error": str(exc)[:300], "updated_at": now()}})
        raise
