from fastapi import APIRouter, Depends, HTTPException
from ..database import db
from ..schemas import Login
from ..security import create_token, current_user, verify_password
from ..utils import clean

router = APIRouter(prefix="/v1/auth", tags=["auth"])

@router.post("/login")
async def login(body: Login):
    user = await db.users.find_one({"email": body.email.lower(), "status": "active"})
    if not user or not verify_password(body.password, user["password_hash"]): raise HTTPException(401, "Invalid email or password")
    memberships = await db.memberships.find({"user_id": user["user_id"], "status": "active"}).to_list(20)
    ids = [m["workspace_id"] for m in memberships]
    workspaces = await db.workspaces.find({"workspace_id": {"$in": ids}, "status": "active"}).to_list(20)
    roles = {m["workspace_id"]: m["role"] for m in memberships}
    return {"access_token": create_token(user["user_id"]), "token_type": "bearer", "user": clean(user), "workspaces": [{**clean(w), "role": roles[w["workspace_id"]]} for w in workspaces]}

@router.get("/me")
async def me(user=Depends(current_user)): return user

@router.post("/logout", status_code=204)
async def logout(user=Depends(current_user)): return None

