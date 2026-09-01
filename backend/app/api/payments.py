import json
from fastapi import APIRouter,Header,HTTPException,Request
from pymongo.errors import DuplicateKeyError
from ..database import db
from ..integrations.razorpay import verify_webhook
from ..utils import now
router=APIRouter(prefix="/v1/payments",tags=["payments"])
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

