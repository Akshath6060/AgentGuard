from typing import Any, Literal
import re
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
    description: str = Field(default="", max_length=500)
    category: Literal["payment", "security", "agent", "vendor", "approval", "finance", "subscription", "refund", "other"] = "other"
    content: str = Field(default="", max_length=200_000)
    rules: PolicyRules = PolicyRules()
    source_text: str | None = None

    @field_validator("name", "description", "content", "source_text")
    @classmethod
    def strip_policy_text(cls, value):
        return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value).strip() if isinstance(value, str) else value


class PolicyVersionCreate(BaseModel):
    rules: PolicyRules
    source_text: str | None = None


class PolicyPatch(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)
    category: Literal["payment", "security", "agent", "vendor", "approval", "finance", "subscription", "refund", "other"] | None = None
    content: str | None = Field(None, max_length=200_000)
    rules: PolicyRules | None = None
    status: Literal["draft", "active", "disabled"] | None = None

    @field_validator("name", "description", "content")
    @classmethod
    def strip_policy_patch_text(cls, value):
        return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value).strip() if isinstance(value, str) else value


class PolicyDraft(BaseModel):
    text: str = Field(min_length=10, max_length=5000)


class Merchant(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    country: str = Field(min_length=2, max_length=2)
    verification_status: Literal["verified", "unverified", "new", "blocked", "suspicious"] = "unverified"

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
    payment_type: Literal["one_time", "subscription", "refund"] = "one_time"

    @field_validator("currency")
    @classmethod
    def currency_upper(cls, value):
        return value.upper()

    @field_validator("metadata")
    @classmethod
    def reject_payment_secrets(cls, value):
        forbidden={"card","card_number","pan","cvv","cvc","expiry","razorpay_key_secret"}
        if any(str(key).lower() in forbidden for key in value):
            raise ValueError("Sensitive payment credentials must not be included in metadata")
        return value


class RAGSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    limit: int = Field(default=5, ge=1, le=20)


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
