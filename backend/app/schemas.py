from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Register(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    workspace_name: str = Field(min_length=2, max_length=100)

    @field_validator("name", "workspace_name")
    @classmethod
    def nonblank_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Must contain at least two non-space characters")
        return value

    @field_validator("password")
    @classmethod
    def strong_password(cls, value):
        if not any(char.islower() for char in value) or not any(char.isupper() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Password must include uppercase, lowercase, and a number")
        return value


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


class RazorpayPaymentVerification(BaseModel):
    transaction_id: str = Field(min_length=3, max_length=128)
    razorpay_order_id: str = Field(min_length=3, max_length=128)
    razorpay_payment_id: str = Field(min_length=3, max_length=128)
    razorpay_signature: str = Field(min_length=16, max_length=256)


class APIKeyCreate(BaseModel):
    name: str = Field(default="Developer key", max_length=80)
    environment: Literal["test", "live"] = "test"
    scopes: list[str] = ["authorizations:create"]


class WorkspacePatch(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    default_currency: str | None = Field(None, min_length=3, max_length=3)

    @field_validator("default_currency")
    @classmethod
    def currency_upper(cls, value):
        return value.upper() if value else value


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    environment: Literal["test", "live"] = "test"
    default_currency: str = Field(default="INR", min_length=3, max_length=3)

    @field_validator("name")
    @classmethod
    def nonblank_workspace_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Must contain at least two non-space characters")
        return value

    @field_validator("default_currency")
    @classmethod
    def create_currency_upper(cls, value):
        return value.upper()


WorkspaceRole = Literal["admin", "approver", "developer", "viewer"]


class WorkspaceMemberAdd(BaseModel):
    email: EmailStr
    role: WorkspaceRole = "viewer"


class WorkspaceMemberPatch(BaseModel):
    role: WorkspaceRole
