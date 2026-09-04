from fastapi import APIRouter,Depends,HTTPException,Request
from pymongo import ReturnDocument
from ..database import db
from ..config import get_settings
from ..schemas import WorkspaceCreate,WorkspaceMemberAdd,WorkspaceMemberPatch,WorkspacePatch
from ..security import current_user,require
from ..utils import clean,now,public_id
from ..services.audit_service import audit

router=APIRouter(prefix="/v1/workspaces",tags=["workspaces"])
settings=get_settings()

@router.get("")
async def list_workspaces(user=Depends(current_user)):
    memberships=await db.memberships.find({"user_id":user["user_id"],"status":"active"}).to_list(100)
    roles={item["workspace_id"]:item["role"] for item in memberships}
    docs=await db.workspaces.find({"workspace_id":{"$in":list(roles)},"status":"active"}).sort("created_at",1).to_list(100)
    return {"items":[{**clean(item),"role":roles[item["workspace_id"]]} for item in docs]}

@router.post("",status_code=201)
async def create_workspace(body:WorkspaceCreate,request:Request,user=Depends(current_user)):
    created=now();workspace={"workspace_id":public_id("ws"),"name":body.name.strip(),"environment":body.environment,"default_currency":body.default_currency,"status":"active","created_at":created,"updated_at":created}
    membership={"user_id":user["user_id"],"workspace_id":workspace["workspace_id"],"role":"admin","status":"active","created_at":created,"updated_at":created}
    try:
        await db.workspaces.insert_one(workspace);await db.memberships.insert_one(membership)
        await db.provider_connections.insert_one({"workspace_id":workspace["workspace_id"],"provider":"razorpay","environment":body.environment,"status":"connected" if settings.payment_ready_for(body.environment) else "mock","updated_at":created})
    except Exception:
        await db.provider_connections.delete_many({"workspace_id":workspace["workspace_id"]});await db.memberships.delete_many({"workspace_id":workspace["workspace_id"]});await db.workspaces.delete_one({"workspace_id":workspace["workspace_id"]})
        raise
    await audit(workspace["workspace_id"],{"type":"user","id":user["user_id"]},"workspace.created","workspace",workspace["workspace_id"],request.state.request_id)
    return {**clean(workspace),"role":"admin"}
@router.get("/current")
async def current(user=Depends(current_user)):
    workspace=await db.workspaces.find_one({"workspace_id":user["workspace_id"],"status":"active"})
    if not workspace:raise HTTPException(404,"Workspace not found")
    connection=await db.provider_connections.find_one({"workspace_id":user["workspace_id"],"provider":"razorpay"})
    return {**clean(workspace),"provider_connection":clean(connection) if connection else {"provider":"razorpay","status":"mock"}}
@router.patch("/current")
async def update(body:WorkspacePatch,request:Request,user=Depends(require("settings.manage"))):
    changes=body.model_dump(exclude_none=True);changes["updated_at"]=now()
    workspace=await db.workspaces.find_one_and_update({"workspace_id":user["workspace_id"],"status":"active"},{"$set":changes},return_document=True)
    if not workspace:raise HTTPException(404,"Workspace not found")
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"workspace.updated","workspace",user["workspace_id"],request.state.request_id,{"fields":list(changes)})
    return clean(workspace)

@router.get("/current/members")
async def list_members(user=Depends(require("settings.manage"))):
    memberships=await db.memberships.find({"workspace_id":user["workspace_id"],"status":"active"}).sort("created_at",1).to_list(200)
    users=await db.users.find({"user_id":{"$in":[item["user_id"] for item in memberships]}},{"password_hash":0}).to_list(200)
    by_id={item["user_id"]:item for item in users}
    return {"items":[{**clean(by_id.get(item["user_id"],{"user_id":item["user_id"]})),"role":item["role"],"membership_status":item["status"]} for item in memberships]}

@router.post("/current/members",status_code=201)
async def add_member(body:WorkspaceMemberAdd,request:Request,user=Depends(require("settings.manage"))):
    member=await db.users.find_one({"email":body.email.lower(),"status":"active"},{"password_hash":0})
    if not member:raise HTTPException(404,"The user must register before being added to a workspace")
    existing=await db.memberships.find_one({"workspace_id":user["workspace_id"],"user_id":member["user_id"]})
    if existing and existing.get("status")=="active":raise HTTPException(409,"User is already a member of this workspace")
    created=now()
    await db.memberships.update_one({"workspace_id":user["workspace_id"],"user_id":member["user_id"]},{"$set":{"role":body.role,"status":"active","updated_at":created},"$setOnInsert":{"created_at":created}},upsert=True)
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"workspace.member_added","user",member["user_id"],request.state.request_id,{"role":body.role})
    return {**clean(member),"role":body.role,"membership_status":"active"}

async def ensure_admin_remains(workspace_id,user_id,new_role=None):
    membership=await db.memberships.find_one({"workspace_id":workspace_id,"user_id":user_id,"status":"active"})
    if not membership:raise HTTPException(404,"Workspace member not found")
    if membership["role"]=="admin" and new_role!="admin":
        admins=await db.memberships.count_documents({"workspace_id":workspace_id,"role":"admin","status":"active"})
        if admins<=1:raise HTTPException(409,"A workspace must retain at least one admin")
    return membership

@router.patch("/current/members/{member_user_id}")
async def update_member(member_user_id:str,body:WorkspaceMemberPatch,request:Request,user=Depends(require("settings.manage"))):
    await ensure_admin_remains(user["workspace_id"],member_user_id,body.role)
    membership=await db.memberships.find_one_and_update({"workspace_id":user["workspace_id"],"user_id":member_user_id,"status":"active"},{"$set":{"role":body.role,"updated_at":now()}},return_document=ReturnDocument.AFTER)
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"workspace.member_role_changed","user",member_user_id,request.state.request_id,{"role":body.role})
    return clean(membership)

@router.delete("/current/members/{member_user_id}",status_code=204)
async def remove_member(member_user_id:str,request:Request,user=Depends(require("settings.manage"))):
    await ensure_admin_remains(user["workspace_id"],member_user_id)
    await db.memberships.update_one({"workspace_id":user["workspace_id"],"user_id":member_user_id,"status":"active"},{"$set":{"status":"inactive","updated_at":now()}})
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"workspace.member_removed","user",member_user_id,request.state.request_id)
    return None
