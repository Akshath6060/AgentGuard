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
