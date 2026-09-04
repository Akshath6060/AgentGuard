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
    band = "critical" if score >= 81 else "high" if score >= 61 else "medium" if score >= 31 else "low"
    return {"score": score, "band": band, "version": "risk-v2", "signals": signals}


def hybrid(policy_result, transaction_risk, rag_analysis):
    """Rules are authoritative; AI is advisory and cannot directly release funds."""
    deterministic_block = policy_result["result"] == "block"
    deterministic_review = policy_result["result"] == "review"
    rag_score = int(rag_analysis.get("riskScore", 0))
    score = min(100, round(transaction_risk["score"] * .65 + rag_score * .35))
    if deterministic_block:
        decision = "blocked"
    elif deterministic_review:
        decision = "review"
    elif score >= 81 and rag_analysis.get("decision") == "BLOCK":
        decision = "blocked"
    elif score >= 61 or rag_analysis.get("decision") in {"BLOCK", "REQUIRE_APPROVAL"}:
        decision = "review"
    else:
        decision = "approved"
    band = "critical" if score >= 81 else "high" if score >= 61 else "medium" if score >= 31 else "low"
    return {**transaction_risk, "score": score, "band": band, "version": "hybrid-risk-v1", "components": {"transaction_risk": transaction_risk["score"], "rag_policy_risk": rag_score, "deterministic_result": policy_result["result"]}, "decision": decision}
