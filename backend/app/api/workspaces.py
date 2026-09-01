from fastapi import APIRouter,Depends,HTTPException,Request
from ..database import db
from ..schemas import WorkspacePatch
from ..security import current_user,require
from ..utils import clean,now
from ..services.audit_service import audit

router=APIRouter(prefix="/v1/workspaces",tags=["workspaces"])
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
