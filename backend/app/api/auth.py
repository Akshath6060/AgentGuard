import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.errors import DuplicateKeyError
from ..config import get_settings
from ..database import db
from ..schemas import Login, Register
from ..security import create_token, current_user, hash_password, verify_password
from ..services.audit_service import audit
from ..services.rate_limit import limiter
from ..utils import clean, now, public_id

settings = get_settings()
router = APIRouter(prefix="/v1/auth", tags=["auth"])
login_rate_limit = limiter("login", settings.login_rate_limit_per_minute, "Too many sign-in attempts. Try again in a minute.")
register_rate_limit = limiter("register", settings.register_rate_limit_per_minute, "Too many sign-up attempts. Try again in a minute.")

# Comparing against a real hash keeps the response time for an unknown email
# indistinguishable from a wrong password, so accounts cannot be enumerated.
_DUMMY_HASH = bcrypt.hashpw(b"agentguard-timing-equalizer", bcrypt.gensalt()).decode()

async def session_payload(user):
    memberships = await db.memberships.find({"user_id": user["user_id"], "status": "active"}).to_list(100)
    ids = [m["workspace_id"] for m in memberships]
    workspaces = await db.workspaces.find({"workspace_id": {"$in": ids}, "status": "active"}).to_list(100)
    roles = {m["workspace_id"]: m["role"] for m in memberships}
    public_user = {key: user.get(key) for key in ("user_id", "email", "name", "status")}
    return {"access_token": create_token(user["user_id"]), "token_type": "bearer", "user": clean(public_user), "workspaces": [{**clean(w), "role": roles[w["workspace_id"]]} for w in workspaces]}

@router.post("/login", dependencies=[Depends(login_rate_limit)])
async def login(body: Login):
    user = await db.users.find_one({"email": body.email.lower(), "status": "active"})
    if not verify_password(body.password, user["password_hash"] if user else _DUMMY_HASH) or not user:
        raise HTTPException(401, "Invalid email or password")
    return await session_payload(user)

@router.post("/register", status_code=201, dependencies=[Depends(register_rate_limit)])
async def register(body:Register,request:Request):
    email=body.email.lower();created=now();user_id=public_id("usr");workspace_id=public_id("ws")
    user={"user_id":user_id,"email":email,"name":body.name.strip(),"password_hash":hash_password(body.password),"status":"active","created_at":created,"updated_at":created}
    workspace={"workspace_id":workspace_id,"name":body.workspace_name.strip(),"environment":"test","default_currency":"INR","status":"active","created_at":created,"updated_at":created}
    membership={"user_id":user_id,"workspace_id":workspace_id,"role":"admin","status":"active","created_at":created,"updated_at":created}
    try:
        await db.users.insert_one(user);await db.workspaces.insert_one(workspace);await db.memberships.insert_one(membership)
    except Exception as exc:
        await db.memberships.delete_many({"user_id":user_id});await db.workspaces.delete_one({"workspace_id":workspace_id});await db.users.delete_one({"user_id":user_id})
        if isinstance(exc, DuplicateKeyError):raise HTTPException(409,"An account with this email already exists") from exc
        raise
    await audit(workspace_id,{"type":"user","id":user_id},"workspace.created","workspace",workspace_id,request.state.request_id,{"source":"registration"})
    return await session_payload(user)

@router.get("/me")
async def me(user=Depends(current_user)): return user

@router.post("/logout", status_code=204)
async def logout(user=Depends(current_user)): return None
