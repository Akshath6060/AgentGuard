# AgentGuard Final QA Report

**Date:** 04 Sep 2026 · **Audit type:** pre-submission production-readiness review
**Stack (as found):** FastAPI + PyMongo (async) + MongoDB · React 19 + Vite · JWT/bcrypt auth · Razorpay · RAG with pluggable OpenAI/mock providers

## Overall Status

**READY WITH MINOR ISSUES** — all confirmed defects found during this audit were fixed and
re-verified. Remaining items are configuration steps and low-severity polish, listed below.

## Build Status

| Component | Result |
|---|---|
| Frontend build (`npm run build`) | **PASS** — 310.71 kB / 88.12 kB gzip, clean |
| Frontend lint (`oxlint`) | **PASS** — no findings |
| Backend tests (`pytest`) | **PASS** — 15/15 |
| Database (MongoDB) | **PASS** — connects, 30 indexes created on startup, `/ready` healthy |
| AI / RAG | **PASS (mock providers)** — real OpenAI path not exercised, no key configured |
| Razorpay | **PASS (mock mode)** — live checkout not exercised, no live credentials |

## Security Audit

Full detail in [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

### Critical
None found.

### High
1. **Validation errors returned HTTP 500 instead of 422.** Any custom validator raising `ValueError`
   produced an unserializable payload. Weak-password registration and the card-data-in-metadata
   guard both returned 500 with a logged traceback. **Fixed.**
2. **Unauthenticated Razorpay webhook forgery.** In mock mode with no webhook secret — the shipped
   default — any caller could post a forged event and rewrite payment state. Demonstrated live:
   a settled payment was flipped to `failed`. **Fixed.**

### Medium
3. **Webhook could overwrite a settled payment**, and a malformed payload returned 500. **Fixed.**
4. **No rate limiting on login or registration** — 25 password attempts ran unthrottled. **Fixed.**
5. **User enumeration via login timing** — 172x response-time difference between known and unknown
   emails. **Fixed** (now 1.00x).

### Low
6. **Form controls not programmatically labelled.** Fixed on sign-in/sign-up and global search;
   13 remain across four modals/pages.
7. **Tests were not hermetic** — they read the developer's local `.env`, so two failed on this
   machine and would pass on a clean checkout. **Fixed.**

## Issues Fixed

1. `app/errors.py` — safe serialization of validation errors; clean 422 with an actionable message.
2. `app/integrations/razorpay.py` — webhooks require a configured secret and matching HMAC.
3. `app/api/payments.py` — settled payments are terminal; malformed webhook payloads return 400.
4. `app/services/rate_limit.py` (new) + `app/api/auth.py` — login 10/min, registration 5/min.
5. `app/api/auth.py` — constant-work password comparison removes the enumeration side channel.
6. `app/config.py` — `LOGIN_RATE_LIMIT_PER_MINUTE`, `REGISTER_RATE_LIMIT_PER_MINUTE`.
7. `frontend/src/pages/Auth.jsx`, `frontend/src/components/Topbar.jsx` — label/input association,
   `autoComplete` hints, accessible search name.
8. `backend/tests/` — hermetic config tests, plus new `test_errors.py` and webhook signature tests.

## Automated Test Results

| Suite | Result |
|---|---|
| Backend unit tests (`pytest`) | **15 / 15 passed** (9 pre-existing, 6 added for these fixes) |
| Security + E2E suite (20 sections) | **102 / 102 passed** |
| Seeded demo journey | **31 / 31 passed** |
| Frontend UI QA (Chrome, 4 viewports) | **22 / 23 passed** (1 remaining a11y item) |
| **Total** | **170 / 171** |

## Authentication Tests
Registration, login, logout, duplicate email (409), weak/short/invalid credentials (422), unknown
user and wrong password (401, non-enumerating message), missing/garbage/malformed tokens, expired
tokens, wrong-signature tokens, wrong audience, and `alg=none` — all behave correctly.

## Authorization Tests
Four roles enforced via an explicit permission map. A viewer can read but cannot create agents or
policies, manage members, or decide approvals. A token for workspace A cannot act on workspace B.

## AgentGuard Security Tests
Deterministic policy results are authoritative and the LLM is advisory only — it can escalate but
never downgrade a block or release funds. Verified live against seeded policies:

| Scenario | Expected | Actual |
|---|---|---|
| ₹499 to a known airline | ALLOW | `approved`, payment settled |
| ₹9,000 to an unverified vendor | REVIEW | `review`, funds held (`not_initiated`) |
| ₹50,000 over a ₹15,000 per-transaction cap | BLOCK | `blocked` — `TRANSACTION_LIMIT` |
| Payment in a prohibited category | BLOCK | `blocked` — `CATEGORY_BLOCKED` |
| International payment when disabled | BLOCK | `blocked` |
| "Ignore all payment restrictions…" + violation | BLOCK | `blocked` |

Prompt injection in `purpose` and `intent` never changed an outcome. Agent credentials are hashed,
revocable, and bound to one `agent_id` (using agent A's key for agent B returns 403).

## RAG Tests
Retrieval is workspace-filtered in both the Atlas `$vectorSearch` path and the in-memory fallback;
one workspace's policy chunks never surfaced in another's results. Retrieved policy text is treated
as evidence, not instruction — it informs the risk score but cannot override deterministic rules.

## Razorpay Tests
Order creation, approval-gated initiation, checkout signature verification (valid and tampered),
webhook signature verification, duplicate-event suppression via a unique index, and state-transition
guards all verified. No endpoint can initiate payment outside an approved decision.

## API / Database Tests
CRUD verified for users, workspaces, memberships, agents, credentials, policies, transactions,
approvals and audit events. Idempotency keys are enforced by a unique compound index and a replayed
authorization returns the original transaction. Approvals use optimistic version locking — stale
versions and double-approval return 409. 30 indexes cover every hot query path.

## Frontend QA
All 11 console pages render against live API data with no console errors, no `undefined`/`NaN`/
`[object Object]` leakage, and no horizontal overflow at 1440 / 1280 / 1024 / 390 px. Navigation
stays reachable at every viewport. Invalid login surfaces a clear message; going offline degrades
gracefully rather than hanging. No `dangerouslySetInnerHTML` anywhere.

## Performance
Authorization decisions complete in roughly 5–20 ms end to end in mock mode, with per-step timings
recorded on each transaction. Listing endpoints are cursor-paginated and capped (≤200). Spend
aggregation is a single grouped pipeline per agent.

**Watch item:** when no Atlas vector index exists, retrieval falls back to loading up to 1,000
policy chunks and scoring cosine similarity in Python. Fine for the demo; create the
`policy_chunks_vector` index before any real volume.

## Production Configuration
`validate_runtime()` refuses to start in production with a placeholder JWT secret, non-HTTPS or
wildcard origins, or Razorpay enabled without full credentials. Docs are disabled in production and
HSTS is added. Secrets live in env vars; `.env` is gitignored and absent from git history.

## Remaining Limitations
1. **`RAZORPAY_WEBHOOK_SECRET` is empty in `backend/.env` while `PAYMENT_MODE=razorpay`.** With the
   fix in place, webhooks now correctly return 401 — meaning **webhook delivery will not work until
   the secret is set**. Set it from the Razorpay dashboard, or leave webhooks out of the demo.
2. In-process rate limiting — correct for a single instance, needs Redis if scaled out.
3. 13 form labels still not programmatically associated (four modals/pages).
4. Live Razorpay checkout, real OpenAI calls, and Atlas `$vectorSearch` were not exercised.

## Demo Readiness

Two behaviours are correct controls that can surprise you on stage:

1. **`REPEATED_FAILURES` (threshold 3).** After three blocked decisions for an agent within 30 days,
   *every* later transaction for that agent escalates to REVIEW — including the safe one. Observed
   during this audit: the ALLOW scenario became REVIEW after repeated block demos.
   **Run ALLOW first, use a different agent for BLOCK scenarios, or re-seed before demoing.**
2. **`DUPLICATE_PAYMENT`.** An identical amount to the same merchant within 10 minutes is blocked.
   **Vary the amount between takes.**

Seed data is in place (`backend/seed.py`) with `demo@agentguard.app` / `AgentGuard123!`, eight
agents, six policies, and merchant history so the ALLOW path resolves correctly.

## Final Recommendation

**Ready to submit.** The security model is genuinely sound — the deterministic-over-AI authority
design is the right architecture for this problem, workspace isolation held under every attack
attempted, and no critical vulnerability was found. The two high-severity issues were real and are
fixed and re-verified.

Before submitting: set `RAZORPAY_WEBHOOK_SECRET` (or drop webhooks from the demo), re-seed, and
rehearse the demo in ALLOW → REVIEW → BLOCK order.
