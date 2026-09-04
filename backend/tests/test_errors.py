import json
import sys
import unittest
from pathlib import Path

from pydantic import BaseModel, ValidationError, field_validator

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.errors import serialize_validation_errors
from app.schemas import AuthorizationRequest, Register


class ValidationSerializationTests(unittest.TestCase):
    """A field_validator raising ValueError puts the exception object in ctx.
    That is not JSON serializable and previously turned a 422 into a 500."""

    def _errors_for(self, model, payload):
        with self.assertRaises(ValidationError) as caught:
            model(**payload)
        return serialize_validation_errors(caught.exception.errors())

    def test_custom_validator_errors_are_json_serializable(self):
        class Sample(BaseModel):
            value: str

            @field_validator("value")
            @classmethod
            def must_have_digit(cls, v):
                if not any(c.isdigit() for c in v):
                    raise ValueError("must include a number")
                return v

        details = self._errors_for(Sample, {"value": "nodigits"})
        json.dumps(details)
        self.assertIn("must include a number", details[0]["msg"])

    def test_weak_password_serializes(self):
        details = self._errors_for(Register, {"name": "Ada Lovelace", "email": "ada@example.com", "password": "weakweak", "workspace_name": "Ada WS"})
        json.dumps(details)

    def test_card_data_in_metadata_serializes(self):
        payload = {
            "agent_id": "agt_1", "amount": 1000, "currency": "INR",
            "merchant": {"name": "M", "category": "flights", "country": "IN", "verification_status": "verified"},
            "purpose": "p", "idempotency_key": "abcdef", "metadata": {"card_number": "4111111111111111"},
        }
        details = self._errors_for(AuthorizationRequest, payload)
        json.dumps(details)

    def test_no_raw_exception_objects_remain(self):
        details = self._errors_for(Register, {"name": "Ada Lovelace", "email": "ada@example.com", "password": "weakweak", "workspace_name": "Ada WS"})
        for item in details:
            for value in item.get("ctx", {}).values():
                self.assertIsInstance(value, str)


if __name__ == "__main__":
    unittest.main()
