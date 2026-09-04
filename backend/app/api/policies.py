from fastapi import APIRouter, Depends, HTTPException, Request
from ..database import db
from ..schemas import PolicyCreate, PolicyVersionCreate, PolicyDraft, PolicyPatch
from ..security import current_user, require
from ..utils import clean, now, public_id
from ..services.audit_service import audit
from ..services.ai_policy_service import generate
from ..services.rag.indexing_service import index_policy
from ..services.rag.rate_limit import ai_rate_limit

router=APIRouter(prefix="/v1/policies",tags=["policies"])
@router.get("")
async def list_policies(q:str|None=None,category:str|None=None,status:str|None=None,user=Depends(current_user)):
    query={"workspace_id":user["workspace_id"]}
    if q: query["$text"]={"$search":q}
    if category: query["category"]=category
    if status: query["status"]=status
    docs=await db.policies.find(query).sort([("updated_at",-1)]).to_list(200)
    return {"items":clean(docs)}
@router.post("")
async def create_policy(body:PolicyCreate,request:Request,user=Depends(require("policies.manage"))):
    content=body.content or body.source_text or body.description
    doc={"policy_id":public_id("pol"),"workspace_id":user["workspace_id"],"organization_id":user["workspace_id"],"name":body.name,"title":body.name,"description":body.description,"category":body.category,"content":content,"source_text":body.source_text,"source_file":None,"version":1,"status":"draft","rules":body.rules.model_dump(),"chunks":0,"embedding_status":"pending","created_by":user["user_id"],"created_at":now(),"updated_at":now()}
    await db.policies.insert_one(doc); await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.created","policy",doc["policy_id"],request.state.request_id)
    if content:
        try: await index_policy(doc)
        except Exception: pass
    return clean(doc)
@router.post("/generate-draft")
async def generate_draft(body:PolicyDraft,user=Depends(require("policies.manage"))):
    rules,meta=generate(body.text); return {"rules":rules,"generation":meta}
@router.get("/{policy_id}")
async def get_policy(policy_id:str,user=Depends(current_user)):
    items=await db.policies.find({"workspace_id":user["workspace_id"],"policy_id":policy_id}).sort("version",-1).to_list(100)
    if not items: raise HTTPException(404,"Policy not found")
    used=await db.transactions.find({"workspace_id":user["workspace_id"],"rag.retrieved_policies.policy_id":policy_id},{"transaction_id":1,"decision":1,"risk.score":1,"created_at":1}).sort("created_at",-1).limit(50).to_list(50)
    return {"policy":clean(items[0]),"versions":clean(items),"transactions_used":clean(used)}
@router.put("/{policy_id}")
async def update_policy(policy_id:str,body:PolicyPatch,request:Request,user=Depends(require("policies.manage"))):
    policy=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":policy_id},sort=[("version",-1)])
    if not policy: raise HTTPException(404,"Policy not found")
    changes=body.model_dump(exclude_none=True)
    if "rules" in changes: changes["rules"]=body.rules.model_dump()
    if "name" in changes: changes["title"]=changes["name"]
    changes.update({"embedding_status":"pending" if any(k in changes for k in ("content","name","description","category")) else policy.get("embedding_status","pending"),"updated_at":now()})
    if changes.get("status")=="disabled":
        changes.update({"embedding_status":"disabled","chunks":0})
    elif changes.get("status")=="active" and policy.get("status")=="disabled":
        changes["embedding_status"]="pending"
    await db.policies.update_one({"_id":policy["_id"]},{"$set":changes}); policy.update(changes)
    if changes.get("status")=="disabled":
        await db.policy_chunks.delete_many({"workspace_id":user["workspace_id"],"policy_id":policy_id})
    elif changes.get("embedding_status")=="pending":
        try: await index_policy(policy)
        except Exception: pass
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.updated","policy",policy_id,request.state.request_id)
    return clean(policy)
@router.delete("/{policy_id}",status_code=204)
async def delete_policy(policy_id:str,request:Request,user=Depends(require("policies.manage"))):
    result=await db.policies.delete_many({"workspace_id":user["workspace_id"],"policy_id":policy_id})
    if not result.deleted_count: raise HTTPException(404,"Policy not found")
    await db.policy_chunks.delete_many({"workspace_id":user["workspace_id"],"policy_id":policy_id})
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.deleted","policy",policy_id,request.state.request_id)
@router.post("/{policy_id}/index",dependencies=[Depends(ai_rate_limit)])
async def index(policy_id:str,request:Request,user=Depends(require("policies.manage"))):
    policy=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":policy_id},sort=[("version",-1)])
    if not policy: raise HTTPException(404,"Policy not found")
    if policy.get("status")=="disabled": raise HTTPException(409,"Enable the policy before indexing")
    try: result=await index_policy(policy)
    except Exception as exc: raise HTTPException(503,"Policy indexing failed") from exc
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.indexed","policy",policy_id,request.state.request_id,result)
    return result
@router.post("/{policy_id}/versions")
async def version(policy_id:str,body:PolicyVersionCreate,user=Depends(require("policies.manage"))):
    old=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":policy_id},sort=[("version",-1)])
    if not old: raise HTTPException(404,"Policy not found")
    doc={**{k:v for k,v in old.items() if k!="_id"},"version":old["version"]+1,"status":"draft","rules":body.rules.model_dump(),"source_text":body.source_text,"content":body.source_text or old.get("content",""),"embedding_status":"pending","chunks":0,"created_by":user["user_id"],"created_at":now(),"updated_at":now()}
    await db.policies.insert_one(doc); return clean(doc)
@router.post("/{policy_id}/publish")
async def publish(policy_id:str,request:Request,user=Depends(require("policies.manage"))):
    draft=await db.policies.find_one({"workspace_id":user["workspace_id"],"policy_id":policy_id,"status":"draft"},sort=[("version",-1)])
    if not draft: raise HTTPException(404,"Draft policy not found")
    await db.policies.update_many({"workspace_id":user["workspace_id"],"policy_id":policy_id,"status":"active"},{"$set":{"status":"superseded","updated_at":now()}})
    await db.policies.update_one({"_id":draft["_id"]},{"$set":{"status":"active","published_at":now(),"updated_at":now()}})
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"policy.published","policy",policy_id,request.state.request_id,{"version":draft["version"]})
    draft["status"]="active"
    try: await index_policy(draft)
    except Exception: pass
    return clean(draft)
