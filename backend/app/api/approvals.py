from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo import ReturnDocument
from ..database import db
from ..schemas import ApprovalDecision
from ..security import current_user,require
from ..utils import clean,now
from ..services.audit_service import audit
from ..services.payment_service import initiate
from ..services.authorization_service import _spend

router=APIRouter(prefix="/v1/approvals",tags=["approvals"])
@router.get("")
async def approvals(status:str="pending",user=Depends(current_user)):
    docs=await db.approvals.find({"workspace_id":user["workspace_id"],"status":status}).sort("created_at",-1).to_list(200)
    ids=[d["transaction_id"] for d in docs]; txs=await db.transactions.find({"workspace_id":user["workspace_id"],"transaction_id":{"$in":ids}}).to_list(200); by={t["transaction_id"]:t for t in txs}
    can_decide=user["role"] in {"admin","approver"}
    return {"items":[{**clean(a),"transaction":clean(by.get(a["transaction_id"])),"allowed_actions":["view","approve","reject"] if can_decide else ["view"]} for a in docs]}
@router.post("/{approval_id}/decision")
async def decide(approval_id:str,body:ApprovalDecision,request:Request,user=Depends(require("approvals.decide"))):
    existing=await db.approvals.find_one({"workspace_id":user["workspace_id"],"approval_id":approval_id})
    if not existing:raise HTTPException(404,"Approval not found")
    if existing["status"]!="pending" or existing["version"]!=body.version:raise HTTPException(409,"This approval has already been decided")
    if existing["expires_at"]<=now():
        await db.approvals.update_one({"_id":existing["_id"],"status":"pending"},{"$set":{"status":"expired","decided_at":now()},"$inc":{"version":1}})
        await db.transactions.update_one({"workspace_id":user["workspace_id"],"transaction_id":existing["transaction_id"],"decision_state":"review_pending"},{"$set":{"decision_state":"expired","updated_at":now()}})
        raise HTTPException(409,"Approval has expired")
    tx=await db.transactions.find_one({"workspace_id":user["workspace_id"],"transaction_id":existing["transaction_id"],"decision_state":"review_pending"})
    if not tx:raise HTTPException(409,"Transaction is no longer pending review")
    agent=await db.agents.find_one({"workspace_id":user["workspace_id"],"agent_id":tx["agent_id"],"status":"active"})
    if body.decision=="approve" and not agent:raise HTTPException(409,"Agent is no longer active")
    if body.decision=="approve":
        spend=await _spend(user["workspace_id"],tx["agent_id"]); limits=tx.get("policy_evaluation",{}).get("policy_snapshot",{}).get("limits",{}); amount=tx["amount"]["minor"]
        if (limits.get("daily") is not None and spend["daily"]+amount>limits["daily"]) or (limits.get("monthly") is not None and spend["monthly"]+amount>limits["monthly"]):raise HTTPException(409,"Spending availability changed; approval can no longer be completed")
    new_status="approved" if body.decision=="approve" else "rejected"
    approval=await db.approvals.find_one_and_update({"_id":existing["_id"],"status":"pending","version":body.version},{"$set":{"status":new_status,"decided_by":user["user_id"],"decided_at":now(),"comment":body.comment},"$inc":{"version":1}},return_document=ReturnDocument.AFTER)
    if not approval:raise HTTPException(409,"This approval has already been decided")
    state="approved_by_human" if body.decision=="approve" else "rejected_by_human"
    updated=await db.transactions.update_one({"_id":tx["_id"],"decision_state":"review_pending"},{"$set":{"decision_state":state,"approval.status":new_status,"updated_at":now()}})
    if not updated.modified_count:raise HTTPException(409,"Transaction state changed concurrently")
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},f"approval.{new_status}","transaction",tx["transaction_id"],request.state.request_id,{"approval_id":approval_id,"previous_state":"review_pending","new_state":state,"comment":body.comment})
    payment=None
    if body.decision=="approve":payment=await initiate(tx["transaction_id"],user["workspace_id"],{"type":"user","id":user["user_id"]},request.state.request_id)
    return {"approval":clean(approval),"transaction_id":tx["transaction_id"],"decision_state":state,"payment":clean(payment)}
