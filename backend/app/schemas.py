from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AgentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=500)
    type: str = Field(default="custom", max_length=40)
    policy_id: str | None = None


class AgentPatch(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=80)
    description: str | None = Field(None, max_length=500)
    type: str | None = None
    policy_id: str | None = None


class CredentialCreate(BaseModel):
    environment: Literal["test", "live"] = "test"


class Limits(BaseModel):
    per_transaction: int | None = Field(None, ge=0)
    daily: int | None = Field(None, ge=0)
    monthly: int | None = Field(None, ge=0)


class Categories(BaseModel):
    allowed: list[str] = []
    blocked: list[str] = []


class PolicyRules(BaseModel):
    limits: Limits = Limits()
    categories: Categories = Categories()
    merchant_rules: dict[str, Literal["allow", "review", "block"]] = {}
    international: dict[str, Any] = {"allowed": True}
    repeated_failures: dict[str, Any] = {"threshold": 3, "action": "review"}


class PolicyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    rules: PolicyRules
    source_text: str | None = None


class PolicyVersionCreate(BaseModel):
    rules: PolicyRules
    source_text: str | None = None


class PolicyDraft(BaseModel):
    text: str = Field(min_length=10, max_length=5000)


class Merchant(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    country: str = Field(min_length=2, max_length=2)

    @field_validator("country")
    @classmethod
    def country_upper(cls, value):
        return value.upper()


class Intent(BaseModel):
    description: str = Field(default="", max_length=1000)
    justification: str = Field(default="", max_length=1000)


class AuthorizationRequest(BaseModel):
    agent_id: str
    amount: int = Field(gt=0, le=1_000_000_000_00)
    currency: str = Field(min_length=3, max_length=3)
    merchant: Merchant
    purpose: str = Field(min_length=1, max_length=500)
    intent: Intent = Intent()
    idempotency_key: str = Field(min_length=3, max_length=128)
    metadata: dict[str, Any] = {}

    @field_validator("currency")
    @classmethod
    def currency_upper(cls, value):
        return value.upper()


class ApprovalDecision(BaseModel):
    decision: Literal["approve", "reject"]
    comment: str | None = Field(None, max_length=1000)
    version: int = Field(ge=1)


class APIKeyCreate(BaseModel):
    name: str = Field(default="Developer key", max_length=80)
    environment: Literal["test", "live"] = "test"
    scopes: list[str] = ["authorizations:create"]

