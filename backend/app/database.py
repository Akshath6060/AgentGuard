from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from .config import get_settings

settings = get_settings()
client = AsyncMongoClient(settings.mongodb_uri, tz_aware=True)
db = client[settings.mongodb_db_name]


async def ensure_indexes(database=None):
    d = database or db
    await d.transactions.create_index([("workspace_id", ASCENDING), ("transaction_id", ASCENDING)], unique=True)
    await d.transactions.create_index([("workspace_id", ASCENDING), ("agent_id", ASCENDING), ("idempotency_key", ASCENDING)], unique=True)
    await d.transactions.create_index([("workspace_id", ASCENDING), ("created_at", DESCENDING)])
    await d.transactions.create_index([("workspace_id", ASCENDING), ("agent_id", ASCENDING), ("created_at", DESCENDING)])
    await d.transactions.create_index([("workspace_id", ASCENDING), ("decision", ASCENDING), ("created_at", DESCENDING)])
    await d.agents.create_index([("workspace_id", ASCENDING), ("agent_id", ASCENDING)], unique=True)
    await d.agents.create_index([("workspace_id", ASCENDING), ("status", ASCENDING)])
    await d.policies.create_index([("workspace_id", ASCENDING), ("policy_id", ASCENDING), ("version", ASCENDING)], unique=True)
    await d.approvals.create_index("approval_id", unique=True)
    await d.approvals.create_index("transaction_id", unique=True)
    await d.approvals.create_index([("workspace_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)])
    await d.audit_events.create_index("event_id", unique=True)
    await d.audit_events.create_index([("workspace_id", ASCENDING), ("created_at", DESCENDING)])
    await d.agent_credentials.create_index("prefix", unique=True)
    await d.api_keys.create_index("prefix", unique=True)
    await d.webhook_events.create_index([("provider", ASCENDING), ("event_id", ASCENDING)], unique=True)
    await d.memberships.create_index([("user_id", ASCENDING), ("workspace_id", ASCENDING)], unique=True)
