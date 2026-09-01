from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import db
from ..schemas import PolicyCreate, PolicyVersionCreate, PolicyDraft
from ..security import current_user, require
from ..utils import clean, now, public_id
from ..services.audit_service import audit
from ..services.ai_policy_service import generate

router=APIRouter(prefix="/v1/policies",tags=["policies"])
@router.get("")
async def list_policies(user=Depends(current_user)): return {"items":clean(await db.policies.find({"workspace_id":user["workspace_id"]}).sort([("policy_id",1),("version",-1)]).to_list(200))}
@router.post("")
async def create_policy(body:PolicyCreate,request:Request,user=Depends(require("policies.manage"))):
    doc={"policy_id":public_id("pol"),"workspace_id":user["workspace_id"],"name":body.name,"version":1,"status":"draft","rules":body.rules.model_dump(),"source_text":body.source_text,"created_by":user["user_id"],"created_at":now(),"updated_at":now()}
    await db.policies.insert_one(doc); await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.created","policy",doc["policy_id"],request.state.request_id)
    return clean(doc)
@router.post("/generate-draft")
async def generate_draft(body:PolicyDraft,user=Depends(require("policies.manage"))):
    rules,meta=generate(body.text); return {"rules":rules,"generation":meta}
@router.get("/{policy_id}")
async def get_policy(policy_id:str,user=Depends(current_user)):
    items=await db.policies.find({"workspace_id":user["workspace_id"],"policy_id":policy_id}).sort("version",-1).to_list(100)
    if not items: raise HTTPException(404,"Policy not found")
    return {"policy":clean(items[0]),"versions":clean(items)}
@router.post("/{policy_id}/versions")
async def version(policy_id:str,body:PolicyVersionCreate,user=Depends(require("policies.manage"))):
    old=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":policy_id},sort=[("version",-1)])
    if not old: raise HTTPException(404,"Policy not found")
    doc={**{k:v for k,v in old.items() if k!="_id"},"version":old["version"]+1,"status":"draft","rules":body.rules.model_dump(),"source_text":body.source_text,"created_by":user["user_id"],"created_at":now(),"updated_at":now()}
    await db.policies.insert_one(doc); return clean(doc)
@router.post("/{policy_id}/publish")
async def publish(policy_id:str,request:Request,user=Depends(require("policies.manage"))):
    draft=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":policy_id,"status":"draft"},sort=[("version",-1)])
    if not draft: raise HTTPException(404,"Draft policy not found")
    await db.policies.update_many({"workspace_id":user["workspace_id"],"policy_id":policy_id,"status":"active"},{"$set":{"status":"superseded","updated_at":now()}})
    await db.policies.update_one({"_id":draft["_id"]},{"$set":{"status":"active","published_at":now(),"updated_at":now()}})
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.published","policy",policy_id,request.state.request_id,{"version":draft["version"]})
    draft["status"]="active"; return clean(draft)

