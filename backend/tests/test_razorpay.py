import hashlib
import hmac
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.integrations import razorpay


class RazorpaySignatureTests(unittest.TestCase):
    def test_checkout_signature_is_verified(self):
        secret = "test-secret"
        signature = hmac.new(secret.encode(), b"order_123|pay_456", hashlib.sha256).hexdigest()
        with patch.object(razorpay.settings, "razorpay_key_secret", secret):
            self.assertTrue(razorpay.verify_payment_signature("order_123", "pay_456", signature))
            self.assertFalse(razorpay.verify_payment_signature("order_123", "pay_wrong", signature))


if __name__ == "__main__":
    unittest.main()


class WebhookSignatureTests(unittest.TestCase):
    def test_webhook_requires_configured_secret(self):
        """Without a shared secret the caller cannot be authenticated, so reject."""
        with patch.object(razorpay.settings, "razorpay_webhook_secret", ""):
            with patch.object(razorpay.settings, "payment_mode", "mock"):
                self.assertFalse(razorpay.verify_webhook(b'{"event":"payment.captured"}', "any-signature"))
            with patch.object(razorpay.settings, "payment_mode", "razorpay"):
                self.assertFalse(razorpay.verify_webhook(b'{"event":"payment.captured"}', "any-signature"))

    def test_webhook_accepts_only_matching_hmac(self):
        secret = "webhook-secret"
        body = b'{"event":"payment.captured"}'
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        with patch.object(razorpay.settings, "razorpay_webhook_secret", secret):
            self.assertTrue(razorpay.verify_webhook(body, signature))
            self.assertFalse(razorpay.verify_webhook(body, "0" * 64))
            self.assertFalse(razorpay.verify_webhook(b'{"event":"tampered"}', signature))
            self.assertFalse(razorpay.verify_webhook(body, ""))
