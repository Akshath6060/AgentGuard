from datetime import timedelta
from fastapi import APIRouter,Depends
from ..database import db
from ..security import current_user
from ..utils import now,clean
router=APIRouter(prefix="/v1/dashboard",tags=["dashboard"])
@router.get("/overview")
async def overview(range:str="7d",user=Depends(current_user)):
    days={"7d":7,"30d":30,"90d":90}.get(range,7);start=now()-timedelta(days=days);match={"workspace_id":user["workspace_id"],"created_at":{"$gte":start}}
    totals=await db.transactions.aggregate([{"$match":match},{"$group":{"_id":None,"total":{"$sum":1},"approved":{"$sum":{"$cond":[{"$eq":["$decision","approved"]},1,0]}},"review":{"$sum":{"$cond":[{"$eq":["$decision","review"]},1,0]}},"blocked":{"$sum":{"$cond":[{"$eq":["$decision","blocked"]},1,0]}},"approved_spend":{"$sum":{"$cond":[{"$in":["$decision_state",["approved","approved_by_human"]]},"$amount.minor",0]}}}}}]).to_list(1)
    risk=await db.transactions.aggregate([{"$match":match},{"$group":{"_id":"$risk.band","count":{"$sum":1}}}]).to_list(10)
    trend=await db.transactions.aggregate([{"$match":match},{"$group":{"_id":{"$dateToString":{"format":"%Y-%m-%d","date":"$created_at"}},"amount":{"$sum":{"$cond":[{"$in":["$decision_state",["approved","approved_by_human"]]},"$amount.minor",0]}},"count":{"$sum":1}}},{"$sort":{"_id":1}}]).to_list(days)
    recent=await db.audit_events.find({"workspace_id":user["workspace_id"]}).sort("created_at",-1).limit(8).to_list(8)
    base=totals[0] if totals else {"total":0,"approved":0,"review":0,"blocked":0,"approved_spend":0}
    return {**clean(base),"currency":"INR","risk_distribution":{r["_id"]:r["count"] for r in risk if r["_id"]},"approval_pending":await db.approvals.count_documents({"workspace_id":user["workspace_id"],"status":"pending"}),"recent_activity":clean(recent),"spend_trend":[{"date":x["_id"],"amount_minor":x["amount"],"count":x["count"]} for x in trend]}

