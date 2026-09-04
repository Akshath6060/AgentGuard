import json
from fastapi import APIRouter,Depends,Header,HTTPException,Request
from pymongo.errors import DuplicateKeyError
from ..database import db
from ..integrations.razorpay import verify_payment_signature,verify_webhook
from ..schemas import RazorpayPaymentVerification
from ..security import require
from ..services.audit_service import audit
from ..utils import clean,now
router=APIRouter(prefix="/v1/payments",tags=["payments"])

@router.post("/razorpay/verify")
async def verify_checkout(body:RazorpayPaymentVerification,request:Request,user=Depends(require("payments.verify"))):
    tx=await db.transactions.find_one({"workspace_id":user["workspace_id"],"transaction_id":body.transaction_id})
    if not tx:raise HTTPException(404,"Transaction not found")
    payment=tx.get("payment",{})
    if payment.get("provider_order_id")!=body.razorpay_order_id:raise HTTPException(409,"Payment order does not match this transaction")
    if payment.get("status")=="succeeded" and payment.get("provider_payment_id")==body.razorpay_payment_id:return {"transaction_id":body.transaction_id,"payment":clean(payment)}
    if tx.get("decision_state") not in {"approved","approved_by_human"} or payment.get("status")!="processing":raise HTTPException(409,"Payment cannot be verified from this state")
    if not verify_payment_signature(body.razorpay_order_id,body.razorpay_payment_id,body.razorpay_signature):raise HTTPException(400,"Invalid payment signature")
    verified={"provider":"razorpay","status":"succeeded","provider_order_id":body.razorpay_order_id,"provider_payment_id":body.razorpay_payment_id,"updated_at":now()}
    await db.transactions.update_one({"_id":tx["_id"],"payment.status":"processing"},{"$set":{"payment":verified,"updated_at":now()}})
    await audit(user["workspace_id"],{"type":"user","id":user["user_id"]},"payment.checkout_verified","transaction",body.transaction_id,request.state.request_id,{"provider_order_id":body.razorpay_order_id,"provider_payment_id":body.razorpay_payment_id})
    return {"transaction_id":body.transaction_id,"payment":clean(verified)}

@router.post("/razorpay/webhook")
async def webhook(request:Request,x_razorpay_signature:str|None=Header(None)):
    body=await request.body()
    if not x_razorpay_signature or not verify_webhook(body,x_razorpay_signature):raise HTTPException(401,"Invalid webhook signature")
    event=json.loads(body);event_id=event.get("id") or event.get("event")+":"+str(event.get("created_at"))
    try:await db.webhook_events.insert_one({"provider":"razorpay","event_id":event_id,"received_at":now()})
    except DuplicateKeyError:return {"status":"duplicate"}
    entity=event.get("payload",{}).get("payment",{}).get("entity",{});order_id=entity.get("order_id")
    states={"payment.captured":"succeeded","payment.failed":"failed"}
    if order_id and event.get("event") in states:
        await db.transactions.update_one({"payment.provider_order_id":order_id},{"$set":{"payment.status":states[event["event"]],"payment.provider_payment_id":entity.get("id"),"payment.updated_at":now(),"updated_at":now()}})
    return {"status":"accepted"}
