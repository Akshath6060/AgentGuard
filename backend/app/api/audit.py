from fastapi import APIRouter,Depends,Query
from ..database import db
from ..security import current_user
from ..utils import clean
router=APIRouter(prefix="/v1/audit-events",tags=["audit"])
@router.get("")
async def events(action:str|None=None,object_id:str|None=None,limit:int=Query(100,ge=1,le=500),user=Depends(current_user)):
    q={"workspace_id":user["workspace_id"]}
    if action:q["action"]=action
    if object_id:q["object.id"]=object_id
    return {"items":clean(await db.audit_events.find(q).sort("created_at",-1).limit(limit).to_list(limit))}

