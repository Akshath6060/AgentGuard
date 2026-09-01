import asyncio
from datetime import timedelta
from app.database import db,ensure_indexes,client
from app.security import hash_password
from app.utils import now,secret

WS="ws_demo";USER="usr_admin"
POLICIES=[
 ("pol_travel","Travel Policy",{"limits":{"per_transaction":1500000,"daily":7500000,"monthly":20000000},"categories":{"allowed":["airline","hotel","transport"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review","unknown_international":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_procurement","Procurement Policy",{"limits":{"per_transaction":5000000,"daily":10000000,"monthly":30000000},"categories":{"allowed":["industrial components","supplies"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review","unknown_international":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_marketing","Marketing Policy",{"limits":{"per_transaction":2000000,"daily":5000000,"monthly":8000000},"categories":{"allowed":["advertising","software"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_investment","Investment Policy",{"limits":{"per_transaction":10000000,"daily":20000000,"monthly":50000000},"categories":{"allowed":["securities"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review"},"international":{"allowed":False},"repeated_failures":{"threshold":3,"action":"block"}}),]
AGENTS=[("agt_travel_01","TravelAgent","travel","pol_travel"),("agt_procure_04","ProcurementAgent","procurement","pol_procurement"),("agt_mktg_02","MarketingAgent","marketing","pol_marketing"),("agt_invest_01","InvestmentAgent","investment","pol_investment")]
async def seed():
    await ensure_indexes();t=now()
    await db.workspaces.update_one({"workspace_id":WS},{"$set":{"workspace_id":WS,"name":"AgentGuard Demo","environment":"test","default_currency":"INR","status":"active","created_at":t}},upsert=True)
    await db.users.update_one({"user_id":USER},{"$set":{"user_id":USER,"email":"admin@agentguard.local","name":"Demo Admin","password_hash":hash_password("AgentGuard123!"),"status":"active","created_at":t}},upsert=True)
    await db.memberships.update_one({"user_id":USER,"workspace_id":WS},{"$set":{"user_id":USER,"workspace_id":WS,"role":"admin","status":"active"}},upsert=True)
    for pid,name,rules in POLICIES:await db.policies.update_one({"workspace_id":WS,"policy_id":pid,"version":1},{"$set":{"workspace_id":WS,"policy_id":pid,"name":name,"version":1,"status":"active","rules":rules,"created_by":USER,"created_at":t,"updated_at":t}},upsert=True)
    credentials=[]
    for aid,name,typ,pid in AGENTS:
        await db.agents.update_one({"workspace_id":WS,"agent_id":aid},{"$set":{"workspace_id":WS,"agent_id":aid,"name":name,"description":f"Demo {typ} agent","type":typ,"status":"active","policy_id":pid,"risk":{"score":0,"band":"low"},"created_at":t,"updated_at":t}},upsert=True)
        old=await db.agent_credentials.find_one({"workspace_id":WS,"agent_id":aid,"revoked_at":None})
        if not old:
            raw,prefix,hashed=secret("agc");await db.agent_credentials.insert_one({"credential_id":f"cred_{aid}","workspace_id":WS,"agent_id":aid,"prefix":prefix,"secret_hash":hashed,"environment":"test","created_at":t,"last_used_at":None,"revoked_at":None});credentials.append((aid,raw))
    samples=[
        ("AGTX-DEMO-APPROVED","agt_travel_01",845000,"IndiGo","airline","IN","approved","approved",12,"low","succeeded","pol_travel"),
        ("AGTX-DEMO-REVIEW","agt_procure_04",3400000,"New International Supplier","industrial components","SG","review","review_pending",45,"medium","not_initiated","pol_procurement"),
        ("AGTX-DEMO-BLOCKED","agt_invest_01",8000000,"Demo Crypto Exchange","cryptocurrency","IN","blocked","blocked",75,"high","not_initiated","pol_investment"),
    ]
    for txid,aid,amount,merchant,category,country,decision,state,score,band,payment,pid in samples:
        policy=next(p for p in POLICIES if p[0]==pid)
        doc={"transaction_id":txid,"workspace_id":WS,"agent_id":aid,"amount":{"minor":amount,"currency":"INR"},"merchant":{"name":merchant,"category":category,"country":country},"purpose":"Seeded demo scenario","intent":{"description":"Reproducible demo authorization","justification":"Seed data"},"policy_evaluation":{"policy_id":pid,"policy_version":1,"policy_snapshot":policy[2],"checks":[]},"risk":{"score":score,"band":band,"version":"risk-v1","signals":[]},"decision":decision,"decision_state":state,"reason_codes":["CATEGORY_BLOCKED"] if decision=="blocked" else ["UNKNOWN_INTERNATIONAL_MERCHANT"] if decision=="review" else ["WITHIN_LIMIT","KNOWN_MERCHANT","CATEGORY_ALLOWED"],"payment":{"provider":"razorpay","status":payment},"idempotency_key":f"seed-{decision}","allowed_actions":["view"],"request_id":"req_seed","trace":[],"total_decision_latency_ms":0,"created_at":t-timedelta(days=1),"updated_at":t-timedelta(days=1)}
        await db.transactions.update_one({"workspace_id":WS,"transaction_id":txid},{"$set":doc},upsert=True)
    await db.approvals.update_one({"transaction_id":"AGTX-DEMO-REVIEW"},{"$set":{"approval_id":"apr_demo_review","transaction_id":"AGTX-DEMO-REVIEW","workspace_id":WS,"status":"pending","reason_codes":["UNKNOWN_INTERNATIONAL_MERCHANT"],"requested_at":t,"expires_at":t+timedelta(hours=24),"decided_by":None,"decided_at":None,"comment":None,"version":1,"created_at":t}},upsert=True)
    print("Seed complete. Login: admin@agentguard.local / AgentGuard123!")
    for aid,raw in credentials:print(f"{aid} credential (shown once): {raw}")
    await client.close()
if __name__=="__main__":asyncio.run(seed())
