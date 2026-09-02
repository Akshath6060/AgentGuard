from datetime import datetime
import re
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
    if q:
        pattern = re.escape(q)
        matching_agents = await db.agents.find(
            {"workspace_id": user["workspace_id"], "name": {"$regex": pattern, "$options": "i"}},
            {"agent_id": 1},
        ).to_list(200)
        query["$or"] = [
            {"transaction_id": {"$regex": pattern, "$options": "i"}},
            {"merchant.name": {"$regex": pattern, "$options": "i"}},
            {"agent_id": {"$regex": pattern, "$options": "i"}},
        ]
        if matching_agents:
            query["$or"].append({"agent_id": {"$in": [agent["agent_id"] for agent in matching_agents]}})
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
    agent_ids=list({d["agent_id"] for d in docs});agents=await db.agents.find({"workspace_id":user["workspace_id"],"agent_id":{"$in":agent_ids}}).to_list(len(agent_ids) or 1);names={a["agent_id"]:a["name"] for a in agents}
    return {"items":[{**clean(d),"agent_name":names.get(d["agent_id"],d["agent_id"]),"allowed_actions":actions(d,user["role"])} for d in docs],"next_cursor":docs[-1]["created_at"] if has_more else None}
@router.get("/{transaction_id}")
async def detail(transaction_id:str,user=Depends(current_user)):
    tx=await db.transactions.find_one({"workspace_id":user["workspace_id"],"transaction_id":transaction_id})
    if not tx:raise HTTPException(404,"Transaction not found")
    agent=await db.agents.find_one({"workspace_id":user["workspace_id"],"agent_id":tx["agent_id"]})
    return {**clean(tx),"agent_name":agent.get("name",tx["agent_id"]) if agent else tx["agent_id"],"allowed_actions":actions(tx,user["role"])}
