from datetime import timedelta
from time import perf_counter
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
from ..database import db
from ..utils import now, public_id, clean
from .audit_service import audit
from .policy_engine import evaluate
from .risk_engine import assess
from .payment_service import initiate


async def _history(workspace_id, agent_id, req):
    merchant = req["merchant"]["name"]
    category = req["merchant"]["category"]
    since = now() - timedelta(days=30)
    merchant_known = await db.transactions.find_one({"workspace_id": workspace_id, "merchant.name": {"$regex": f"^{merchant}$", "$options": "i"}, "payment.status": "succeeded"}) is not None
    category_known = await db.transactions.find_one({"workspace_id": workspace_id, "agent_id": agent_id, "merchant.category": category}) is not None
    recent_failures = await db.transactions.count_documents({"workspace_id": workspace_id, "agent_id": agent_id, "decision": "blocked", "created_at": {"$gte": since}})
    attempts = await db.transactions.count_documents({"workspace_id": workspace_id, "agent_id": agent_id, "merchant.name": merchant, "created_at": {"$gte": now() - timedelta(hours=1)}})
    return {"merchant_known": merchant_known, "category_known": category_known, "recent_failures": recent_failures, "same_merchant_attempts": attempts, "normal_pattern": merchant_known and req["amount"] < 1_000_000}


async def _spend(workspace_id, agent_id):
    current = now()
    day = current.replace(hour=0, minute=0, second=0, microsecond=0)
    month = day.replace(day=1)
    pipeline = [{"$match": {"workspace_id": workspace_id, "agent_id": agent_id, "decision_state": {"$in": ["approved", "approved_by_human"]}, "created_at": {"$gte": month}}}, {"$group": {"_id": None, "monthly": {"$sum": "$amount.minor"}, "daily": {"$sum": {"$cond": [{"$gte": ["$created_at", day]}, "$amount.minor", 0]}}}}]
    rows = await db.transactions.aggregate(pipeline).to_list(1)
    return rows[0] if rows else {"daily": 0, "monthly": 0}


def response(tx):
    approval = tx.get("approval")
    return clean({"transaction_id": tx["transaction_id"], "decision": tx["decision"], "decision_state": tx["decision_state"], "risk": {k: tx["risk"][k] for k in ["score", "band", "version"]}, "reason_codes": tx["reason_codes"], "policy": {"id": tx["policy_evaluation"]["policy_id"], "version": tx["policy_evaluation"]["policy_version"]}, "approval": approval, "allowed_actions": tx.get("allowed_actions", ["view"]), "request_id": tx["request_id"], "created_at": tx["created_at"]})


async def authorize(req, credential, request_id):
    start = perf_counter(); trace = []
    workspace_id, agent_id = credential["workspace_id"], req["agent_id"]
    if credential["agent_id"] != agent_id:
        raise HTTPException(403, "Credential is not valid for this agent")
    agent = await db.agents.find_one({"workspace_id": workspace_id, "agent_id": agent_id})
    trace.append({"step": "agent_authentication", "duration_ms": round((perf_counter() - start) * 1000, 3)})
    if not agent: raise HTTPException(404, "Agent not found")
    if agent["status"] != "active": raise HTTPException(409, "Agent is not active")
    existing = await db.transactions.find_one({"workspace_id": workspace_id, "agent_id": agent_id, "idempotency_key": req["idempotency_key"]})
    if existing and existing.get("decision") not in {None, "evaluating"}: return response(existing)
    transaction_id = public_id("AGTX", 10).upper()
    received = now()
    placeholder = {"transaction_id": transaction_id, "workspace_id": workspace_id, "agent_id": agent_id, "idempotency_key": req["idempotency_key"], "decision": "evaluating", "decision_state": "evaluating", "request_id": request_id, "created_at": received, "updated_at": received}
    try: await db.transactions.insert_one(placeholder)
    except DuplicateKeyError:
        existing = await db.transactions.find_one({"workspace_id": workspace_id, "agent_id": agent_id, "idempotency_key": req["idempotency_key"]})
        if existing and existing.get("decision") != "evaluating": return response(existing)
        raise HTTPException(409, "Authorization with this idempotency key is still evaluating")
    await audit(workspace_id, {"type": "agent", "id": agent_id}, "authorization.received", "transaction", transaction_id, request_id)
    mark = perf_counter()
    policy = await db.policies.find_one({"workspace_id": workspace_id, "policy_id": agent.get("policy_id"), "status": "active"}, sort=[("version", -1)])
    if not policy:
        await db.transactions.update_one({"_id": placeholder["_id"]}, {"$set": {"decision": "blocked", "decision_state": "evaluation_failed", "reason_codes": ["POLICY_NOT_FOUND"], "updated_at": now()}})
        raise HTTPException(409, "No active policy assigned")
    trace.append({"step": "policy_resolution", "duration_ms": round((perf_counter() - mark) * 1000, 3)})
    history = await _history(workspace_id, agent_id, req); spend = await _spend(workspace_id, agent_id)
    req["merchant_known"] = history["merchant_known"]
    mark = perf_counter(); policy_result = evaluate(policy["rules"], req, spend, history["recent_failures"])
    trace.append({"step": "policy_evaluation", "duration_ms": round((perf_counter() - mark) * 1000, 3)})
    mark = perf_counter(); risk = assess(req, policy["rules"], history)
    trace.append({"step": "risk_assessment", "duration_ms": round((perf_counter() - mark) * 1000, 3)})
    decision = "blocked" if policy_result["result"] == "block" or risk["band"] == "high" else "review" if policy_result["result"] == "review" or risk["band"] == "medium" else "approved"
    state = {"approved": "approved", "review": "review_pending", "blocked": "blocked"}[decision]
    reason_codes = [c["code"] for c in policy_result["checks"] if c["result"] != "pass"] or [s["code"] for s in risk["signals"] if s["triggered"] and s["weight"] > 0] or ["WITHIN_LIMIT", "CATEGORY_ALLOWED"]
    approval_summary = None
    if decision == "review":
        approval_summary = {"approval_id": public_id("apr"), "status": "pending", "expires_at": now() + timedelta(hours=24)}
    document = {**placeholder, "amount": {"minor": req["amount"], "currency": req["currency"]}, "merchant": req["merchant"], "purpose": req["purpose"], "intent": req["intent"], "metadata": req["metadata"], "policy_evaluation": {"policy_id": policy["policy_id"], "policy_version": policy["version"], "policy_snapshot": policy["rules"], "checks": policy_result["checks"]}, "risk": risk, "decision": decision, "decision_state": state, "reason_codes": reason_codes, "approval": approval_summary, "payment": {"provider": "razorpay", "status": "not_initiated"}, "allowed_actions": ["view"], "trace": trace, "total_decision_latency_ms": round((perf_counter() - start) * 1000, 3), "updated_at": now()}
    await db.transactions.replace_one({"_id": placeholder["_id"]}, document)
    if approval_summary:
        await db.approvals.insert_one({**approval_summary, "transaction_id": transaction_id, "workspace_id": workspace_id, "reason_codes": reason_codes, "requested_at": received, "created_at": received, "decided_by": None, "decided_at": None, "comment": None, "version": 1})
    action = {"approved": "authorization.approved", "review": "authorization.review_required", "blocked": "authorization.blocked"}[decision]
    await audit(workspace_id, {"type": "agent", "id": agent_id}, action, "transaction", transaction_id, request_id, {"reason_codes": reason_codes})
    if decision == "approved":
        document["payment"] = await initiate(transaction_id, workspace_id, {"type": "agent", "id": agent_id}, request_id)
    return response(document)
