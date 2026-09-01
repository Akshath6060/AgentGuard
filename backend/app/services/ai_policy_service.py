import re
from ..schemas import PolicyRules


def generate(text: str):
    lower = text.lower()
    amounts = [int(x.replace(",", "")) * 100 for x in re.findall(r"₹\s*([\d,]+)", text)]
    per = amounts[0] if amounts else None
    daily = amounts[1] if len(amounts) > 1 else None
    monthly = amounts[2] if len(amounts) > 2 else None
    known = [c for c in ["airline", "hotel", "transport", "food", "software", "advertising", "electronics", "cryptocurrency"] if c in lower or (c == "airline" and "flight" in lower)]
    blocked = [c for c in known if any(word in lower for word in [f"never allow {c}", f"block {c}", f"prohibit {c}"])]
    allowed = [c for c in known if c not in blocked]
    merchant_rules = {}
    if "unknown international" in lower:
        merchant_rules["unknown_international"] = "review" if any(x in lower for x in ["approval", "review"]) else "block"
    elif "unknown merchant" in lower:
        merchant_rules["unknown"] = "review" if any(x in lower for x in ["approval", "review"]) else "block"
    rules = PolicyRules(limits={"per_transaction": per, "daily": daily, "monthly": monthly}, categories={"allowed": allowed, "blocked": blocked}, merchant_rules=merchant_rules)
    return rules.model_dump(), {"provider": "deterministic-fallback", "requires_confirmation": True}
