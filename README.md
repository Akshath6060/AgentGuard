# AgentGuard

AgentGuard is a governance and payment-authorization layer for autonomous AI agents. It sits before payment execution, authenticates the agent, evaluates deterministic workspace policy, scores explainable risk, and returns `approved`, `review`, or `blocked`. Only approved decisions can reach Razorpay or the local payment simulator.

```text
AI Agent -> AgentGuard Authorization API -> Policy Engine -> Risk Engine
                                                    |-> APPROVED -> Razorpay/mock
                                                    |-> REVIEW -> Human approval -> Razorpay/mock
                                                    `-> BLOCKED -> no provider call
```

This repository preserves the existing React/Vite interface and connects it to a Python/FastAPI and MongoDB backend.

## Architecture and stack

- React 19 + Vite frontend with one centralized client in `frontend/src/api/client.js`
- FastAPI and Pydantic REST API
- modern asynchronous PyMongo client and programmatic MongoDB indexes
- JWT human sessions, server-side workspace membership, and RBAC
- hashed random agent/API credentials; plaintext returned once
- deterministic versioned policy and explainable risk engines
- atomic, versioned approval decisions and authorization idempotency
- mock payments by default; Razorpay Test Mode and signed webhooks when configured
- immutable audit events and measured authorization traces

The backend separates route handlers, services, engines, database configuration, and external integrations under `backend/app/`.

## Local setup

Prerequisites: Python 3.11+, Node.js 20+, npm, and MongoDB 7+ (local or Atlas).

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed.py
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:5173`. The seed login is `demo@agentguard.app` / `AgentGuard123!`. Seed-created agent credentials are printed exactly once. Re-running the seed does not reveal existing credentials.

For Atlas, set `MONGODB_URI` to the Atlas connection string and `MONGODB_DB_NAME=agentguard`. Never commit `.env`.

## Configuration

See `backend/.env.example`. Set a random `JWT_SECRET` of at least 32 characters outside local demos. `PAYMENT_MODE=mock` works without payment credentials. For Razorpay Test Mode, use `PAYMENT_MODE=razorpay` and configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`; point the provider webhook at `POST /v1/payments/razorpay/webhook`.

`AI_POLICY_PROVIDER=mock` uses the deterministic fallback parser. Generated policy JSON is a Pydantic-validated draft and must be published by an admin; AI output never authorizes payments.

## Authorization example

Money is always integer minor units: ₹8,450 is `845000` INR.

```bash
curl -X POST http://localhost:8000/v1/authorizations \
  -H 'Content-Type: application/json' \
  -H 'X-Agent-Key: <one-time-agent-secret>' \
  -d '{
    "agent_id":"agt_travel_01",
    "amount":845000,
    "currency":"INR",
    "merchant":{"name":"IndiGo","category":"airline","country":"IN"},
    "purpose":"Flight booking",
    "intent":{"description":"Book Kozhikode to Bengaluru","justification":"Client meeting"},
    "idempotency_key":"booking_127",
    "metadata":{"order_reference":"TRIP-102"}
  }'
```

The response includes a transaction ID, deterministic decision, stable reason codes, policy version, risk band, allowed actions, request ID, and an approval reference when review is required. Transaction detail retains the complete policy snapshot, checks, risk signals, and measured decision trace.

## Demo scenarios

- TravelAgent, ₹8,450, IndiGo/airline: known allowed merchant, low risk, approved and paid in mock mode.
- ProcurementAgent, ₹34,000, new international supplier: review; the Approval Center can approve it once and initiate payment.
- InvestmentAgent, ₹80,000, cryptocurrency: hard `CATEGORY_BLOCKED`; no payment call occurs.

The seed creates schema-compatible history for all three states.

## Security design

Tenant reads and mutations use the active membership workspace from `X-Workspace-ID`; caller-supplied document workspace IDs are ignored. RBAC is enforced for admin, approver, developer, and viewer roles. Secrets and passwords are hashed, provider secrets are environment-only, CORS is explicit, request IDs are returned, approval updates use compare-and-set conditions, webhook events and authorization retries are deduplicated, and blocked/rejected/expired transactions cannot enter payment processing.

For production, add refresh-token rotation/revocation, distributed rate limiting, encrypted secret management, MongoDB transactions for multi-document state changes, a reservation ledger, stronger merchant identity, MFA/SSO, provider reconciliation, structured telemetry, and independent security review. The risk engine is explainable hackathon logic, not a fraud ML model.

## Tests and verification

```bash
python -m unittest discover -s backend/tests -v
cd frontend && npm run lint && npm run build
```

The deterministic tests cover the primary outcomes. Before deployment, run integration tests against disposable MongoDB for approval races, idempotency, workspace isolation, paused/revoked credentials, payment gating, and webhook replay.

Interactive API documentation is at `http://localhost:8000/docs` while the backend runs. The detailed frontend-to-backend product map remains in `FRONTEND_BACKEND_AUDIT.md`.
