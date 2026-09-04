import hashlib
import hmac
import httpx
from ..config import get_settings

settings = get_settings()


async def create_order(amount: int, currency: str, receipt: str):
    if settings.payment_mode == "mock":
        return {"id": f"order_mock_{receipt}", "status": "paid", "amount": amount, "currency": currency}
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post("https://api.razorpay.com/v1/orders", auth=(settings.razorpay_key_id, settings.razorpay_key_secret), json={"amount": amount, "currency": currency, "receipt": receipt})
        response.raise_for_status()
        return response.json()


def verify_webhook(body: bytes, signature: str):
    """Webhooks are only trusted when a shared secret is configured and the HMAC matches.

    Without a configured secret there is no way to authenticate the caller, so the
    event is rejected rather than trusted - an unsigned webhook could otherwise
    rewrite the payment state of any transaction.
    """
    if not settings.razorpay_webhook_secret or not signature:
        return False
    expected = hmac.new(settings.razorpay_webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_payment_signature(order_id: str, payment_id: str, signature: str):
    if not settings.razorpay_key_secret:
        return False
    message = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
