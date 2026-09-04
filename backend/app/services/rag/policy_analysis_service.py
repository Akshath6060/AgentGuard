import json
import re
from typing import Literal
import httpx
from pydantic import BaseModel, Field
from ...config import get_settings

settings = get_settings()


class PolicyAnalysis(BaseModel):
    decision: Literal["ALLOW", "REQUIRE_APPROVAL", "BLOCK"]
    riskScore: int = Field(ge=0, le=100)
    summary: str
    reasons: list[str]
    policyViolations: list[str]
    requiredApprovals: list[str]
    recommendation: str
    confidence: float = Field(ge=0, le=1)


SYSTEM_PROMPT = """You are a policy analysis component, never a payment executor. Evaluate only the transaction and retrieved policy evidence supplied. Do not invent company policies or assume missing rules. Clearly state insufficient evidence. Prefer REQUIRE_APPROVAL when evidence is ambiguous. Return only JSON matching: {decision: ALLOW|REQUIRE_APPROVAL|BLOCK, riskScore: 0-100, summary: string, reasons: string[], policyViolations: string[], requiredApprovals: string[], recommendation: string, confidence: 0-1}. Never execute or instruct execution of a payment."""


def _fallback(policies: list[dict], reason: str = "AI analysis unavailable") -> dict:
    decision = "REQUIRE_APPROVAL" if policies else "ALLOW"
    return PolicyAnalysis(decision=decision, riskScore=45 if policies else 20, summary=reason, reasons=[reason], policyViolations=[], requiredApprovals=["Human policy review"] if policies else [], recommendation="Apply deterministic controls and obtain human review for material risk.", confidence=0.25).model_dump()


async def analyze(transaction: dict, policies: list[dict]) -> dict:
    if settings.llm_provider == "mock":
        evidence=" ".join(p.get("text","") for p in policies).lower()
        amount=transaction.get("amount",0)/100
        vendor=transaction.get("merchant",{}).get("verification_status","unverified")
        reasons=[]; approvals=[]; violations=[]; decision="ALLOW"; score=15
        if vendor in {"blocked","suspicious"}:
            decision="BLOCK";score=95;reasons.append("Vendor is blocked or suspicious")
        elif vendor in {"new","unverified"} and any(x in evidence for x in ("unverified vendor","newly registered","new vendor")):
            decision="REQUIRE_APPROVAL";score=65;reasons.append("Retrieved vendor policy requires human approval");approvals.append("Vendor verification approval")
        thresholds=[int(x.replace(",","")) for x in re.findall(r"(?:₹|inr\s*)([\d,]+)",evidence,re.I)]
        if thresholds and amount>min(thresholds) and any(x in evidence for x in ("require manager approval","require finance","manual approval","human approval")):
            decision="REQUIRE_APPROVAL";score=max(score,60);reasons.append("Amount crosses an approval threshold in retrieved policy");approvals.append("Manager or finance approval")
        if "must be rejected" in evidence and vendor in {"blocked","suspicious"}:
            violations.append("Security merchant restriction")
        summary="; ".join(reasons) if reasons else "No violation found in the retrieved policy evidence."
        return PolicyAnalysis(decision=decision,riskScore=score,summary=summary,reasons=reasons,policyViolations=violations,requiredApprovals=list(dict.fromkeys(approvals)),recommendation="Do not execute payment." if decision=="BLOCK" else "Obtain approval before payment." if decision=="REQUIRE_APPROVAL" else "Deterministic controls may allow payment.",confidence=.72 if policies else .3).model_dump()
    try:
        payload = {"transaction": transaction, "retrievedPolicies": policies}
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", headers={"Authorization": f"Bearer {settings.openai_api_key}"}, json={"model": settings.llm_model, "temperature": 0, "response_format": {"type":"json_schema","json_schema":{"name":"agentguard_policy_analysis","strict":True,"schema":PolicyAnalysis.model_json_schema()}}, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": json.dumps(payload, default=str)}]})
            response.raise_for_status()
            parsed = json.loads(response.json()["choices"][0]["message"]["content"])
            return PolicyAnalysis.model_validate(parsed).model_dump()
    except Exception:
        return _fallback(policies)
