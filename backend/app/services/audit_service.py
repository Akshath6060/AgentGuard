from ..database import db
from ..utils import now, public_id


async def audit(workspace_id, actor, action, object_type, object_id, request_id, metadata=None):
    event = {
        "event_id": public_id("evt"), "workspace_id": workspace_id, "actor": actor,
        "action": action, "object": {"type": object_type, "id": object_id},
        "metadata": metadata or {}, "request_id": request_id, "created_at": now(),
    }
    await db.audit_events.insert_one(event)
    return event

