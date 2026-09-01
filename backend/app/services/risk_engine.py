def assess(request, policy_rules, history):
    amount = request["amount"]
    cap = policy_rules.get("limits", {}).get("per_transaction") or amount
    definitions = [
        ("UNKNOWN_MERCHANT", not history["merchant_known"], 25, "Merchant has not previously succeeded in this workspace."),
        ("INTERNATIONAL_TRANSACTION", request["merchant"]["country"] != "IN", 20, "Merchant is outside the home country."),
        ("HIGH_LIMIT_UTILIZATION", cap > 0 and amount >= cap * .7, 20, "Amount is at least 70% of the transaction limit."),
        ("REPEATED_ATTEMPTS", history["same_merchant_attempts"] >= 2, 20, "Multiple recent attempts target this merchant."),
        ("UNUSUAL_CATEGORY", not history["category_known"], 20, "Category is new for this agent."),
        ("RECENT_FAILURES", history["recent_failures"] > 0, 15, "Agent has recent failed decisions."),
        ("TRUSTED_MERCHANT", history["merchant_known"], -10, "Merchant has successful history."),
        ("NORMAL_PATTERN", history["normal_pattern"], -10, "Amount is consistent with successful history."),
    ]
    signals = [{"code": c, "triggered": bool(t), "weight": w, "explanation": e} for c, t, w, e in definitions]
    score = max(0, min(100, sum(s["weight"] for s in signals if s["triggered"])))
    band = "high" if score >= 60 else "medium" if score >= 30 else "low"
    return {"score": score, "band": band, "version": "risk-v1", "signals": signals}

