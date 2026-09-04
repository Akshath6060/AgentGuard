import asyncio
from datetime import timedelta
from app.database import db,ensure_indexes,client
from app.security import hash_password
from app.utils import now,secret

WS="ws_demo";SWS="ws_sandbox";USER="usr_admin"
POLICIES=[
 ("pol_travel","Travel Policy",{"limits":{"per_transaction":1500000,"daily":7500000,"monthly":20000000},"categories":{"allowed":["airline","hotel","transport"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review","unknown_international":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_procurement","Procurement Policy",{"limits":{"per_transaction":5000000,"daily":10000000,"monthly":30000000},"categories":{"allowed":["industrial components","supplies"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review","unknown_international":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_marketing","Marketing Policy",{"limits":{"per_transaction":2000000,"daily":5000000,"monthly":8000000},"categories":{"allowed":["advertising","software"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_investment","Investment Policy",{"limits":{"per_transaction":10000000,"daily":20000000,"monthly":50000000},"categories":{"allowed":["securities"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review"},"international":{"allowed":False},"repeated_failures":{"threshold":3,"action":"block"}}),
 ("pol_operations","Operations Policy",{"limits":{"per_transaction":1200000,"daily":4000000,"monthly":12000000},"categories":{"allowed":["software","utilities","support"],"blocked":["cryptocurrency","gift cards"]},"merchant_rules":{"unknown":"review"},"international":{"allowed":True},"repeated_failures":{"threshold":3,"action":"review"}}),
 ("pol_shopping","Shopping Policy",{"limits":{"per_transaction":1000000,"daily":3000000,"monthly":9000000},"categories":{"allowed":["office supplies","electronics","food"],"blocked":["cryptocurrency","gift cards"]},"merchant_rules":{"unknown":"review","unknown_international":"review"},"international":{"allowed":False},"repeated_failures":{"threshold":3,"action":"review"}}),]
AGENTS=[("agt_travel_01","TravelAgent","travel","pol_travel"),("agt_procure_04","ProcurementAgent","procurement","pol_procurement"),("agt_mktg_02","MarketingAgent","marketing","pol_marketing"),("agt_invest_01","InvestmentAgent","investment","pol_investment"),("agt_support_05","SupportAgent","support","pol_operations"),("agt_finance_06","FinanceAgent","finance","pol_operations"),("agt_subs_07","SubscriptionBot","subscription","pol_operations"),("agt_shop_03","ShoppingAgent","shopping","pol_shopping")]
async def seed():
    await ensure_indexes();t=now()
    await db.workspaces.update_one({"workspace_id":WS},{"$set":{"workspace_id":WS,"name":"AgentGuard Demo","environment":"test","default_currency":"INR","status":"active","created_at":t}},upsert=True)
    await db.users.update_one({"user_id":USER},{"$set":{"user_id":USER,"email":"demo@agentguard.app","name":"Demo Admin","password_hash":hash_password("AgentGuard123!"),"status":"active","created_at":t}},upsert=True)
    await db.memberships.update_one({"user_id":USER,"workspace_id":WS},{"$set":{"user_id":USER,"workspace_id":WS,"role":"admin","status":"active"}},upsert=True)
    await db.provider_connections.update_one({"workspace_id":WS,"provider":"razorpay"},{"$set":{"workspace_id":WS,"provider":"razorpay","environment":"test","status":"connected","account_reference":"Razorpay Test Mode","updated_at":t}},upsert=True)
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
    await db.approvals.update_one({"transaction_id":"AGTX-DEMO-REVIEW"},{"$set":{"approval_id":"apr_demo_review","transaction_id":"AGTX-DEMO-REVIEW","workspace_id":WS,"status":"pending","reason_codes":["UNKNOWN_INTERNATIONAL_MERCHANT"],"requested_at":t,"expires_at":t+timedelta(days=7),"decided_by":None,"decided_at":None,"comment":None,"version":1,"created_at":t}},upsert=True)
    merchant_sets={
        "agt_travel_01":[("Air India","airline","IN"),("Taj Hotels","hotel","IN"),("Uber","transport","IN")],
        "agt_procure_04":[("Acme Components","industrial components","IN"),("Office Depot","supplies","IN"),("Global Parts","industrial components","SG")],
        "agt_mktg_02":[("Google Ads","advertising","IN"),("Meta Ads","advertising","IN"),("Canva","software","AU")],
        "agt_invest_01":[("NSE Clearing","securities","IN"),("BSE Clearing","securities","IN"),("Crypto Hub","cryptocurrency","IN")],
        "agt_support_05":[("Zendesk","support","US"),("Freshdesk","support","IN"),("Twilio","software","US")],
        "agt_finance_06":[("Zoho Books","software","IN"),("AWS","utilities","IN"),("Unknown SaaS","software","US")],
        "agt_subs_07":[("Adobe","software","IN"),("GitHub","software","US"),("Slack","software","US")],
        "agt_shop_03":[("Amazon Business","office supplies","IN"),("Croma","electronics","IN"),("Swiggy","food","IN")],
    }
    for i in range(48):
        aid,name,_,pid=AGENTS[i%len(AGENTS)]; merchant,category,country=merchant_sets[aid][(i//len(AGENTS))%3]
        decision="blocked" if category=="cryptocurrency" or i%13==0 else "review" if i%9==0 or country!="IN" and i%4==0 else "approved"
        state={"approved":"approved","review":"review_pending","blocked":"blocked"}[decision];score={"approved":14+(i%12),"review":42+(i%14),"blocked":76+(i%18)}[decision];band={"approved":"low","review":"medium","blocked":"high"}[decision]
        amount=175000+(i%8)*215000;created=t-timedelta(hours=i*7+1);txid=f"AGTX-HIST-{41000+i}"
        policy=next(p for p in POLICIES if p[0]==pid);reason="CATEGORY_BLOCKED" if category=="cryptocurrency" else "UNKNOWN_INTERNATIONAL_MERCHANT" if decision=="review" and country!="IN" else "REPEATED_ATTEMPTS" if decision=="review" else "TRANSACTION_LIMIT" if decision=="blocked" else "WITHIN_LIMIT"
        doc={"transaction_id":txid,"workspace_id":WS,"agent_id":aid,"amount":{"minor":amount,"currency":"INR"},"merchant":{"name":merchant,"category":category,"country":country},"purpose":f"Automated {name} purchase","intent":{"description":f"{name} requested a governed payment to {merchant}","justification":"Selected using configured business workflow and price constraints."},"policy_evaluation":{"policy_id":pid,"policy_version":1,"policy_snapshot":policy[2],"checks":[{"code":"CATEGORY_ALLOWED","result":"block" if category=="cryptocurrency" else "pass","observed":category,"threshold":None,"explanation":"Evaluated against the assigned policy."}]},"risk":{"score":score,"band":band,"version":"risk-v1","signals":[{"code":reason,"triggered":decision!="approved","weight":25 if decision=="review" else 70 if decision=="blocked" else 0,"explanation":"Seeded explainable risk signal."}]},"decision":decision,"decision_state":state,"reason_codes":[reason],"payment":{"provider":"razorpay","status":"succeeded" if decision=="approved" else "not_initiated","provider_order_id":f"order_demo_{41000+i}" if decision=="approved" else None},"idempotency_key":f"history-{41000+i}","allowed_actions":["view"],"request_id":"req_seed_history","trace":[{"step":"policy_evaluation","duration_ms":2.1},{"step":"risk_assessment","duration_ms":1.4}],"total_decision_latency_ms":5.8,"created_at":created,"updated_at":created}
        await db.transactions.update_one({"workspace_id":WS,"transaction_id":txid},{"$set":doc},upsert=True)
        await db.audit_events.update_one({"event_id":f"evt_hist_{41000+i}"},{"$set":{"event_id":f"evt_hist_{41000+i}","workspace_id":WS,"actor":{"type":"agent","id":aid},"action":f"authorization.{decision if decision!='review' else 'review_required'}","object":{"type":"transaction","id":txid},"metadata":{"merchant":merchant,"amount_minor":amount,"reason_codes":[reason]},"request_id":"req_seed_history","created_at":created}},upsert=True)
        if decision=="review" and i<32:
            await db.approvals.update_one({"transaction_id":txid},{"$set":{"approval_id":f"apr_hist_{41000+i}","transaction_id":txid,"workspace_id":WS,"status":"pending","reason_codes":[reason],"requested_at":created,"expires_at":t+timedelta(days=7,hours=i),"decided_by":None,"decided_at":None,"comment":None,"version":1,"created_at":created}},upsert=True)
    await db.workspaces.update_one({"workspace_id":SWS},{"$set":{"workspace_id":SWS,"name":"AgentGuard Sandbox","environment":"test","default_currency":"INR","status":"active","created_at":t}},upsert=True)
    await db.memberships.update_one({"user_id":USER,"workspace_id":SWS},{"$set":{"user_id":USER,"workspace_id":SWS,"role":"admin","status":"active"}},upsert=True)
    await db.provider_connections.update_one({"workspace_id":SWS,"provider":"razorpay"},{"$set":{"workspace_id":SWS,"provider":"razorpay","environment":"test","status":"connected","account_reference":"Razorpay Test Mode","updated_at":t}},upsert=True)
    sandbox_rules={"limits":{"per_transaction":500000,"daily":1500000,"monthly":5000000},"categories":{"allowed":["software","office supplies"],"blocked":["cryptocurrency"]},"merchant_rules":{"unknown":"review"},"international":{"allowed":False},"repeated_failures":{"threshold":3,"action":"review"}}
    await db.policies.update_one({"workspace_id":SWS,"policy_id":"pol_sandbox","version":1},{"$set":{"workspace_id":SWS,"policy_id":"pol_sandbox","name":"Sandbox Policy","version":1,"status":"active","rules":sandbox_rules,"created_by":USER,"created_at":t,"updated_at":t}},upsert=True)
    for aid,name in [("agt_sandbox_01","TestPurchaseAgent"),("agt_sandbox_02","QAAgent")]:
        await db.agents.update_one({"workspace_id":SWS,"agent_id":aid},{"$set":{"workspace_id":SWS,"agent_id":aid,"name":name,"description":"Isolated sandbox agent","type":"custom","status":"active","policy_id":"pol_sandbox","risk":{"score":10,"band":"low"},"created_at":t,"updated_at":t}},upsert=True)
    for i in range(8):
        decision=["approved","approved","review","blocked"][i%4];state={"approved":"approved","review":"review_pending","blocked":"blocked"}[decision];created=t-timedelta(hours=i*9+2);txid=f"AGTX-SANDBOX-{i+1:03d}"
        doc={"transaction_id":txid,"workspace_id":SWS,"agent_id":"agt_sandbox_01" if i%2==0 else "agt_sandbox_02","amount":{"minor":125000+i*25000,"currency":"INR"},"merchant":{"name":["Figma","Notion","New Vendor","Crypto Test"][i%4],"category":["software","software","office supplies","cryptocurrency"][i%4],"country":"IN"},"purpose":"Sandbox API test","intent":{"description":"Test isolated authorization flow","justification":"QA scenario"},"policy_evaluation":{"policy_id":"pol_sandbox","policy_version":1,"policy_snapshot":sandbox_rules,"checks":[]},"risk":{"score":{"approved":12,"review":45,"blocked":82}[decision],"band":{"approved":"low","review":"medium","blocked":"high"}[decision],"version":"risk-v1","signals":[]},"decision":decision,"decision_state":state,"reason_codes":[{"approved":"WITHIN_LIMIT","review":"UNKNOWN_MERCHANT","blocked":"CATEGORY_BLOCKED"}[decision]],"payment":{"provider":"razorpay","status":"succeeded" if decision=="approved" else "not_initiated"},"idempotency_key":f"sandbox-{i}","allowed_actions":["view"],"request_id":"req_seed_sandbox","trace":[],"total_decision_latency_ms":4.2,"created_at":created,"updated_at":created}
        await db.transactions.update_one({"workspace_id":SWS,"transaction_id":txid},{"$set":doc},upsert=True)
        if decision=="review":await db.approvals.update_one({"transaction_id":txid},{"$set":{"approval_id":f"apr_sandbox_{i}","transaction_id":txid,"workspace_id":SWS,"status":"pending","reason_codes":["UNKNOWN_MERCHANT"],"requested_at":created,"expires_at":t+timedelta(days=7),"decided_by":None,"decided_at":None,"comment":None,"version":1,"created_at":created}},upsert=True)
    print("Seed complete. Login: demo@agentguard.app / AgentGuard123!")
    for aid,raw in credentials:print(f"{aid} credential (shown once): {raw}")
    await client.close()
if __name__=="__main__":asyncio.run(seed())
