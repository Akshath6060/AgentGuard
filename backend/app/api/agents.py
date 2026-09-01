from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import db
from ..schemas import AgentCreate, AgentPatch, CredentialCreate
from ..security import current_user, require
from ..utils import clean, now, public_id, secret
from ..services.audit_service import audit

router = APIRouter(prefix="/v1/agents", tags=["agents"])

@router.get("")
async def list_agents(user=Depends(current_user)):
    return {"items": clean(await db.agents.find({"workspace_id": user["workspace_id"]}).sort("created_at", -1).to_list(200))}

@router.post("", status_code=201)
async def create_agent(body: AgentCreate, request: Request, user=Depends(require("agents.manage"))):
    doc = {"agent_id": public_id("agt"), "workspace_id": user["workspace_id"], **body.model_dump(), "status": "active", "risk": {"score": 0, "band": "low"}, "created_at": now(), "updated_at": now()}
    await db.agents.insert_one(doc); await audit(user["workspace_id"], {"type":"user","id":user["user_id"]}, "agent.created", "agent", doc["agent_id"], request.state.request_id)
    return clean(doc)

@router.get("/{agent_id}")
async def get_agent(agent_id: str, user=Depends(current_user)):
    doc = await db.agents.find_one({"workspace_id": user["workspace_id"], "agent_id": agent_id})
    if not doc: raise HTTPException(404, "Agent not found")
    policy = await db.policies.find_one({"workspace_id": user["workspace_id"], "policy_id": doc.get("policy_id"), "status":"active"}, sort=[("version",-1)])
    txs = await db.transactions.find({"workspace_id":user["workspace_id"],"agent_id":agent_id}).sort("created_at",-1).to_list(10)
    return {**clean(doc), "policy": clean(policy) if policy else None, "recent_transactions": clean(txs)}

@router.patch("/{agent_id}")
async def patch_agent(agent_id: str, body: AgentPatch, user=Depends(require("agents.manage"))):
    doc = await db.agents.find_one_and_update({"workspace_id":user["workspace_id"],"agent_id":agent_id},{"$set":{**body.model_dump(exclude_none=True),"updated_at":now()}},return_document=True)
    if not doc: raise HTTPException(404,"Agent not found")
    return clean(doc)

async def lifecycle(agent_id, status, request, user):
    doc = await db.agents.find_one_and_update({"workspace_id":user["workspace_id"],"agent_id":agent_id,"status":{"$ne":"revoked"}},{"$set":{"status":status,"updated_at":now()}},return_document=True)
    if not doc: raise HTTPException(404,"Agent not found or revoked")
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},f"agent.{status}","agent",agent_id,request.state.request_id)
    return clean(doc)

@router.post("/{agent_id}/pause")
async def pause(agent_id:str, request:Request,user=Depends(require("agents.manage"))): return await lifecycle(agent_id,"paused",request,user)
@router.post("/{agent_id}/resume")
async def resume(agent_id:str, request:Request,user=Depends(require("agents.manage"))): return await lifecycle(agent_id,"active",request,user)

@router.post("/{agent_id}/credentials", status_code=201)
async def credential(agent_id:str, body:CredentialCreate, request:Request,user=Depends(require("agents.manage"))):
    if not await db.agents.find_one({"workspace_id":user["workspace_id"],"agent_id":agent_id}): raise HTTPException(404,"Agent not found")
    raw,prefix,hashed=secret("agc")
    doc={"credential_id":public_id("cred"),"workspace_id":user["workspace_id"],"agent_id":agent_id,"prefix":prefix,"secret_hash":hashed,"environment":body.environment,"created_at":now(),"last_used_at":None,"revoked_at":None}
    await db.agent_credentials.insert_one(doc); await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"agent.credential_created","agent",agent_id,request.state.request_id,{"prefix":prefix})
    return {**clean(doc),"secret":raw,"secret_hash":None}

@router.post("/{agent_id}/credentials/{credential_id}/revoke")
async def revoke_credential(agent_id:str,credential_id:str,request:Request,user=Depends(require("agents.manage"))):
    result=await db.agent_credentials.update_one({"workspace_id":user["workspace_id"],"agent_id":agent_id,"credential_id":credential_id,"revoked_at":None},{"$set":{"revoked_at":now()}})
    if not result.modified_count: raise HTTPException(404,"Active credential not found")
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"agent.credential_revoked","agent",agent_id,request.state.request_id)
    return {"status":"revoked"}

