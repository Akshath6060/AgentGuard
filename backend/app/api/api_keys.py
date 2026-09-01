from fastapi import APIRouter,Depends,HTTPException,Request
from ..database import db
from ..schemas import APIKeyCreate
from ..security import current_user,require
from ..utils import clean,now,public_id,secret
from ..services.audit_service import audit
router=APIRouter(prefix="/v1/api-keys",tags=["api-keys"])
@router.get("")
async def keys(user=Depends(current_user)):
    docs=await db.api_keys.find({"workspace_id":user["workspace_id"]}).sort("created_at",-1).to_list(100)
    return {"items":[clean({k:v for k,v in d.items() if k!="secret_hash"}) for d in docs]}
@router.post("",status_code=201)
async def create(body:APIKeyCreate,request:Request,user=Depends(require("keys.manage"))):
    raw,prefix,hashed=secret("agk");doc={"key_id":public_id("key"),"prefix":prefix,"secret_hash":hashed,"workspace_id":user["workspace_id"],**body.model_dump(),"created_by":user["user_id"],"created_at":now(),"last_used_at":None,"revoked_at":None}
    await db.api_keys.insert_one(doc);await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"api_key.created","api_key",doc["key_id"],request.state.request_id,{"prefix":prefix})
    return {**clean({k:v for k,v in doc.items() if k!="secret_hash"}),"secret":raw}
@router.delete("/{key_id}")
async def revoke(key_id:str,request:Request,user=Depends(require("keys.manage"))):
    result=await db.api_keys.update_one({"workspace_id":user["workspace_id"],"key_id":key_id,"revoked_at":None},{"$set":{"revoked_at":now()}})
    if not result.modified_count:raise HTTPException(404,"Active API key not found")
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"api_key.revoked","api_key",key_id,request.state.request_id);return {"status":"revoked"}
