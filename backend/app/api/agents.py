from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import db
from ..schemas import AgentCreate, AgentPatch, CredentialCreate
from ..security import current_user, require
from ..utils import clean, now, public_id, secret
from ..services.audit_service import audit

router = APIRouter(prefix="/v1/agents", tags=["agents"])

@router.get("")
async def list_agents(user=Depends(current_user)):
    docs=await db.agents.find({"workspace_id": user["workspace_id"]}).sort("created_at", -1).to_list(200)
    current=now();day=current.replace(hour=0,minute=0,second=0,microsecond=0);month=day.replace(day=1)
    for agent in docs:
        pipeline=[{"$match":{"workspace_id":user["workspace_id"],"agent_id":agent["agent_id"],"decision_state":{"$in":["approved","approved_by_human"]},"created_at":{"$gte":month}}},{"$group":{"_id":None,"monthly":{"$sum":"$amount.minor"},"today":{"$sum":{"$cond":[{"$gte":["$created_at",day]},"$amount.minor",0]}}}}]
        rows=await (await db.transactions.aggregate(pipeline)).to_list(1);spend=rows[0] if rows else {"today":0,"monthly":0}
        policy=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":agent.get("policy_id"),"status":"active"},sort=[("version",-1)])
        limit=(policy or {}).get("rules",{}).get("limits",{}).get("monthly") or 0
        agent["spend"]={"today":spend.get("today",0),"monthly":spend.get("monthly",0),"percent":min(100,round(spend.get("monthly",0)*100/limit)) if limit else 0}
    return {"items": clean(docs)}

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
    month=now().replace(day=1,hour=0,minute=0,second=0,microsecond=0)
    rows=await (await db.transactions.aggregate([{"$match":{"workspace_id":user["workspace_id"],"agent_id":agent_id,"decision_state":{"$in":["approved","approved_by_human"]},"created_at":{"$gte":month}}},{"$group":{"_id":None,"monthly":{"$sum":"$amount.minor"}}}])).to_list(1)
    monthly=rows[0]["monthly"] if rows else 0;limit=(policy or {}).get("rules",{}).get("limits",{}).get("monthly") or 0
    return {**clean(doc), "policy": clean(policy) if policy else None, "spend":{"monthly":monthly,"remaining":max(0,limit-monthly),"percent":min(100,round(monthly*100/limit)) if limit else 0}, "recent_transactions": clean(txs)}

@router.patch("/{agent_id}")
async def patch_agent(agent_id: str, body: AgentPatch, request:Request, user=Depends(require("agents.manage"))):
    doc = await db.agents.find_one_and_update({"workspace_id":user["workspace_id"],"agent_id":agent_id},{"$set":{**body.model_dump(exclude_none=True),"updated_at":now()}},return_document=True)
    if not doc: raise HTTPException(404,"Agent not found")
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"agent.updated","agent",agent_id,request.state.request_id,{"fields":list(body.model_dump(exclude_none=True))})
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

@router.post("/{agent_id}/credentials/rotate", status_code=201)
async def rotate_credential(agent_id:str,body:CredentialCreate,request:Request,user=Depends(require("agents.manage"))):
    if not await db.agents.find_one({"workspace_id":user["workspace_id"],"agent_id":agent_id}):raise HTTPException(404,"Agent not found")
    await db.agent_credentials.update_many({"workspace_id":user["workspace_id"],"agent_id":agent_id,"environment":body.environment,"revoked_at":None},{"$set":{"revoked_at":now()}})
    raw,prefix,hashed=secret("agc");doc={"credential_id":public_id("cred"),"workspace_id":user["workspace_id"],"agent_id":agent_id,"prefix":prefix,"secret_hash":hashed,"environment":body.environment,"created_at":now(),"last_used_at":None,"revoked_at":None}
    await db.agent_credentials.insert_one(doc);await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"agent.credential_rotated","agent",agent_id,request.state.request_id,{"prefix":prefix})
    return {**clean({k:v for k,v in doc.items() if k!="secret_hash"}),"secret":raw}

@router.get("/{agent_id}/credentials")
async def list_credentials(agent_id:str,user=Depends(current_user)):
    if not await db.agents.find_one({"workspace_id":user["workspace_id"],"agent_id":agent_id}): raise HTTPException(404,"Agent not found")
    docs=await db.agent_credentials.find({"workspace_id":user["workspace_id"],"agent_id":agent_id}).sort("created_at",-1).to_list(200)
    return {"items":clean(docs)}
