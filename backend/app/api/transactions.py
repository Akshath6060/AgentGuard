from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from ..database import db
from ..security import current_user
from ..utils import clean

router=APIRouter(prefix="/v1/transactions",tags=["transactions"])
def actions(tx,role):
    result=["view"]
    if tx.get("decision_state")=="review_pending" and role in {"admin","approver"}: result += ["approve","reject"]
    return result
@router.get("")
async def list_transactions(q:str|None=None,agent_id:str|None=None,decision:str|None=None,risk_band:str|None=None,status:str|None=None,from_date:datetime|None=None,to_date:datetime|None=None,limit:int=Query(50,ge=1,le=200),cursor:datetime|None=None,user=Depends(current_user)):
    query={"workspace_id":user["workspace_id"]}
    if q: query["$or"]=[{"transaction_id":{"$regex":q,"$options":"i"}},{"merchant.name":{"$regex":q,"$options":"i"}},{"agent_id":{"$regex":q,"$options":"i"}}]
    if agent_id:query["agent_id"]=agent_id
    if decision:query["decision"]=decision
    if risk_band:query["risk.band"]=risk_band
    if status:query["decision_state"]=status
    dates={}
    if from_date:dates["$gte"]=from_date
    if to_date:dates["$lte"]=to_date
    if cursor:dates["$lt"]=cursor
    if dates:query["created_at"]=dates
    docs=await db.transactions.find(query).sort("created_at",-1).limit(limit+1).to_list(limit+1)
    has_more=len(docs)>limit; docs=docs[:limit]
    return {"items":[{**clean(d),"allowed_actions":actions(d,user["role"])} for d in docs],"next_cursor":docs[-1]["created_at"] if has_more else None}
@router.get("/{transaction_id}")
async def detail(transaction_id:str,user=Depends(current_user)):
    tx=await db.transactions.find_one({"workspace_id":user["workspace_id"],"transaction_id":transaction_id})
    if not tx:raise HTTPException(404,"Transaction not found")
    return {**clean(tx),"allowed_actions":actions(tx,user["role"])}

