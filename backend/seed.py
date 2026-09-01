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
    print("Seed complete. Login: admin@agentguard.local / AgentGuard123!")
    for aid,raw in credentials:print(f"{aid} credential (shown once): {raw}")
    await client.close()
if __name__=="__main__":asyncio.run(seed())
