from datetime import timedelta
import secrets
import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, Request
from jwt import InvalidTokenError
from .config import get_settings
from .database import db
from .utils import now, secret_hash

settings = get_settings()
ROLE_PERMISSIONS = {
    "admin": {"read", "agents.manage", "policies.manage", "approvals.decide", "keys.manage", "settings.manage"},
    "approver": {"read", "approvals.decide"},
    "developer": {"read", "keys.manage"},
    "viewer": {"read"},
}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    issued = now()
    exp = issued + timedelta(minutes=settings.jwt_expire_minutes)
    claims = {"sub": user_id, "iat": issued, "exp": exp, "jti": secrets.token_urlsafe(16), "type": "access", "iss": settings.jwt_issuer, "aud": settings.jwt_audience}
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def current_user(request: Request, authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(authorization[7:], settings.jwt_secret, algorithms=[settings.jwt_algorithm], issuer=settings.jwt_issuer, audience=settings.jwt_audience)
        if payload.get("type") != "access" or not payload.get("sub"):
            raise InvalidTokenError("Invalid token type")
    except InvalidTokenError as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    user = await db.users.find_one({"user_id": payload.get("sub"), "status": "active"})
    if not user:
        raise HTTPException(401, "User is unavailable")
    workspace_id = request.headers.get("X-Workspace-ID")
    membership = await db.memberships.find_one({"user_id": user["user_id"], "workspace_id": workspace_id, "status": "active"})
    if not membership:
        raise HTTPException(403, "No access to this workspace")
    return {"user_id": user["user_id"], "email": user["email"], "name": user.get("name"), "workspace_id": workspace_id, "role": membership["role"]}


def require(permission: str):
    async def dependency(user=Depends(current_user)):
        if permission not in ROLE_PERMISSIONS.get(user["role"], set()):
            raise HTTPException(403, "Insufficient permission")
        return user
    return dependency


async def agent_identity(x_agent_key: str | None = Header(None)):
    if not x_agent_key:
        raise HTTPException(401, "Agent credential required")
    credential = await db.agent_credentials.find_one({"secret_hash": secret_hash(x_agent_key), "revoked_at": None})
    if not credential:
        raise HTTPException(401, "Invalid or revoked agent credential")
    await db.agent_credentials.update_one({"_id": credential["_id"]}, {"$set": {"last_used_at": now()}})
    return credential
