from fastapi import HTTPException
from pymongo import ReturnDocument
from ..database import db
from ..integrations.razorpay import create_order
from ..utils import now
from ..config import get_settings
from .audit_service import audit

settings = get_settings()

async def initiate(transaction_id, workspace_id, actor, request_id):
    tx = await db.transactions.find_one_and_update(
        {"workspace_id": workspace_id, "transaction_id": transaction_id, "decision_state": {"$in": ["approved", "approved_by_human"]}, "payment.status": "not_initiated"},
        {"$set": {"payment.status": "processing", "updated_at": now()}}, return_document=ReturnDocument.AFTER,
    )
    if not tx:
        existing = await db.transactions.find_one({"workspace_id": workspace_id, "transaction_id": transaction_id})
        if existing and existing.get("payment", {}).get("status") in {"processing", "succeeded"}:
            return existing["payment"]
        raise HTTPException(409, "Payment cannot be initiated from this state")
    await audit(workspace_id, actor, "payment.initiated", "transaction", transaction_id, request_id)
    try:
        order = await create_order(tx["amount"]["minor"], tx["amount"]["currency"], transaction_id)
        status = "succeeded" if order.get("status") in {"paid", "captured"} else "processing"
        payment = {"provider": "razorpay", "status": status, "provider_order_id": order["id"], "updated_at": now()}
        await db.transactions.update_one({"_id": tx["_id"]}, {"$set": {"payment": payment, "updated_at": now()}})
        if status == "succeeded":
            await audit(workspace_id, {"type": "system", "id": "razorpay"}, "payment.succeeded", "transaction", transaction_id, request_id, {"provider_order_id": order["id"]})
        if settings.payment_mode == "razorpay" and status == "processing":
            return {**payment, "checkout": {"key_id": settings.razorpay_key_id, "order_id": order["id"], "amount": tx["amount"]["minor"], "currency": tx["amount"]["currency"]}}
        return payment
    except Exception:
        payment={"provider":"razorpay","status":"failed","failure_code":"PROVIDER_REQUEST_FAILED","updated_at":now()}
        await db.transactions.update_one({"_id": tx["_id"]}, {"$set": {"payment":payment, "updated_at": now()}})
        await audit(workspace_id, {"type": "system", "id": "razorpay"}, "payment.failed", "transaction", transaction_id, request_id)
        return payment
