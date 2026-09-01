import hashlib
import secrets
from datetime import datetime, timezone
from bson import ObjectId


def now():
    return datetime.now(timezone.utc)


def public_id(prefix: str, size: int = 8):
    return f"{prefix}_{secrets.token_urlsafe(size).replace('-', '').replace('_', '')[:size]}"


def secret(prefix: str):
    raw = f"{prefix}_{secrets.token_urlsafe(32)}"
    return raw, raw[:12], hashlib.sha256(raw.encode()).hexdigest()


def secret_hash(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def clean(value):
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if k != "_id"}
    if isinstance(value, ObjectId):
        return str(value)
    return value

