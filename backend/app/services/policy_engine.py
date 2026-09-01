def _check(code, result, observed=None, threshold=None, explanation=""):
    return {"code": code, "result": result, "observed": observed, "threshold": threshold, "explanation": explanation}


def evaluate(rules, request, spend, recent_failures=0):
    checks = []
    amount = request["amount"]
    limits = rules.get("limits", {})
    for code, key, observed in [
        ("TRANSACTION_LIMIT", "per_transaction", amount),
        ("DAILY_LIMIT", "daily", spend.get("daily", 0) + amount),
        ("MONTHLY_LIMIT", "monthly", spend.get("monthly", 0) + amount),
    ]:
        threshold = limits.get(key)
        result = "pass" if threshold is None or observed <= threshold else "block"
        checks.append(_check(code, result, observed, threshold, "Within configured limit." if result == "pass" else "Configured spending limit exceeded."))
    category = request["merchant"]["category"].lower()
    cats = rules.get("categories", {})
    blocked = {x.lower() for x in cats.get("blocked", [])}
    allowed = {x.lower() for x in cats.get("allowed", [])}
    if category in blocked:
        checks.append(_check("CATEGORY_BLOCKED", "block", category, explanation="Merchant category is explicitly prohibited."))
    elif allowed and category not in allowed:
        checks.append(_check("CATEGORY_ALLOWED", "block", category, sorted(allowed), "Merchant category is not permitted."))
    else:
        checks.append(_check("CATEGORY_ALLOWED", "pass", category, explanation="Merchant category is permitted."))
    international = request["merchant"]["country"] != "IN"
    if international and not rules.get("international", {}).get("allowed", True):
        checks.append(_check("INTERNATIONAL_ALLOWED", "block", True, False, "International payments are disabled."))
    else:
        checks.append(_check("INTERNATIONAL_ALLOWED", "pass", international, explanation="Geography rule passed."))
    unknown = request.get("merchant_known") is False
    merchant_rules = rules.get("merchant_rules", {})
    if unknown:
        action = merchant_rules.get("unknown_international" if international else "unknown", "review")
        checks.append(_check("UNKNOWN_INTERNATIONAL_MERCHANT" if international else "UNKNOWN_MERCHANT", action if action != "allow" else "pass", True, explanation="Merchant has no successful workspace history."))
    threshold = int(rules.get("repeated_failures", {}).get("threshold", 3))
    if recent_failures >= threshold:
        checks.append(_check("REPEATED_FAILURES", rules.get("repeated_failures", {}).get("action", "review"), recent_failures, threshold, "Recent failed attempts reached the configured threshold."))
    outcome = "block" if any(c["result"] == "block" for c in checks) else "review" if any(c["result"] == "review" for c in checks) else "pass"
    return {"result": outcome, "checks": checks}

