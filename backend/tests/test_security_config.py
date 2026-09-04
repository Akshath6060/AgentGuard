import sys
import unittest
from pathlib import Path

import jwt

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.security import create_token, settings


class ProductionConfigTests(unittest.TestCase):
    def test_production_rejects_placeholder_secret(self):
        config = Settings(app_env="production", allowed_origins="https://console.example.com")
        with self.assertRaisesRegex(RuntimeError, "JWT_SECRET"):
            config.validate_runtime()

    def test_production_accepts_explicit_secure_origin(self):
        config = Settings(app_env="production", jwt_secret="a-secure-random-value-with-more-than-32-characters", allowed_origins="https://console.example.com")
        config.validate_runtime()
        self.assertEqual(config.cors_origins, ["https://console.example.com"])


class AccessTokenTests(unittest.TestCase):
    def test_token_has_expected_security_claims(self):
        token = create_token("usr_test")
        claims = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], issuer=settings.jwt_issuer, audience=settings.jwt_audience)
        self.assertEqual(claims["sub"], "usr_test")
        self.assertEqual(claims["type"], "access")
        self.assertTrue(claims["jti"])


if __name__ == "__main__":
    unittest.main()
