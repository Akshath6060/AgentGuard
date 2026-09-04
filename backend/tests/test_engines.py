import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.policy_engine import evaluate
from app.services.risk_engine import assess, hybrid

RULES={"limits":{"per_transaction":1_500_000,"daily":7_500_000,"monthly":20_000_000},"categories":{"allowed":["airline","hotel"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review","unknown_international":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}

class EngineTests(unittest.TestCase):
    def test_known_low_risk_is_approved(self):
        request={"amount":845_000,"merchant":{"name":"IndiGo","category":"airline","country":"IN"},"merchant_known":True}
        policy=evaluate(RULES,request,{"daily":0,"monthly":0})
        risk=assess(request,RULES,{"merchant_known":True,"category_known":True,"recent_failures":0,"same_merchant_attempts":0,"normal_pattern":True})
        self.assertEqual(policy["result"],"pass");self.assertEqual(risk["band"],"low")

    def test_unknown_international_requires_review(self):
        request={"amount":340_000,"merchant":{"name":"New Supplier","category":"hotel","country":"SG"},"merchant_known":False}
        policy=evaluate(RULES,request,{"daily":0,"monthly":0})
        risk=assess(request,RULES,{"merchant_known":False,"category_known":True,"recent_failures":0,"same_merchant_attempts":0,"normal_pattern":False})
        self.assertEqual(policy["result"],"review");self.assertEqual(risk["band"],"medium")

    def test_blocked_category_is_hard_block(self):
        request={"amount":800_000,"merchant":{"name":"Exchange","category":"cryptocurrency","country":"IN"},"merchant_known":False}
        result=evaluate(RULES,request,{"daily":0,"monthly":0})
        self.assertEqual(result["result"],"block");self.assertIn("CATEGORY_BLOCKED",[c["code"] for c in result["checks"] if c["result"]=="block"])

    def test_llm_cannot_override_deterministic_block(self):
        result=hybrid({"result":"block"},{"score":5,"band":"low","version":"test","signals":[]},{"decision":"ALLOW","riskScore":0})
        self.assertEqual(result["decision"],"blocked")

    def test_llm_block_without_rule_requires_review_below_critical(self):
        result=hybrid({"result":"pass"},{"score":40,"band":"medium","version":"test","signals":[]},{"decision":"BLOCK","riskScore":70})
        self.assertEqual(result["decision"],"review")

if __name__=="__main__":unittest.main()
