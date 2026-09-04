# AgentGuard — Security Audit

**Date:** 04 Sep 2026
**Scope:** FastAPI backend (`backend/app`), React frontend (`frontend/src`), MongoDB data layer, Razorpay integration, RAG pipeline.
**Method:** Static review of every route, service and schema, plus 171 dynamic tests executed against a live instance running the current code on an isolated database (`agentguard_audit`, port 8010, mock payment mode).

---

## Summary by control

| Area | Status | Notes |
|---|---|---|
| Authentication | **FIXED** | JWT verified correctly; added login/register rate limiting and removed a timing side channel. |
| Authorization (RBAC) | **PASS** | Four roles with an explicit permission set; every mutating route is permission-guarded. |
| IDOR / BOLA | **PASS** | Every query is workspace-scoped; cross-workspace reads/writes return 404/403. |
| NoSQL Injection | **PASS** | Pydantic types reject operator objects before they reach a query; regex inputs are `re.escape`d. |
| Mass Assignment | **PASS** | Strict Pydantic models; server owns `status`, `workspace_id`, `risk`, IDs. |
| XSS | **PASS** | No `dangerouslySetInnerHTML` / `innerHTML` / `eval` anywhere in the frontend. |
| CORS | **PASS** | Explicit origin allowlist; production requires HTTPS origins and rejects `*`. |
| Rate Limiting | **FIXED** | AI endpoints were limited; login and registration were not. Now limited. |
| Secret Management | **PASS** | No secrets in git history; `.env` ignored; `.env.example` carries names only. |
| AI Prompt Injection | **PASS** | Deterministic rules are authoritative; the LLM cannot downgrade a block or release funds. |
| Agent / Tool Security | **PASS** | Agent credentials are hashed, revocable, and bound to a single `agent_id`. |
| RAG Security | **PASS** | Retrieval is workspace-filtered in both the vector path and the fallback path. |
| Payment Security | **FIXED** | Signature verification was sound; unsigned webhooks were trusted in mock mode. Fixed. |
| Webhook Security | **FIXED** | Now requires a configured secret and a matching HMAC; terminal states protected. |
| Audit Logging | **PASS** | Events are written server-side only; no client-writable audit endpoint exists. |
| Error Handling | **FIXED** | Custom validators returned 500 instead of 422. Fixed. |

---

## Findings and resolutions

### 1. Validation errors returned HTTP 500 — **HIGH, FIXED**

`app/errors.py` serialized `RequestValidationError.errors()` directly. When a `field_validator`
raises `ValueError`, Pydantic v2 places the **exception object** in the error's `ctx`, which
`JSONResponse` cannot encode. The result was `TypeError: Object of type ValueError is not JSON
serializable` and a 500 response.

Every custom validator was affected, including:

* `Register.strong_password` — signing up with a weak password returned **500**, and the user
  never saw *why* the password was rejected.
* `AuthorizationRequest.reject_payment_secrets` — the control that blocks card/CVV data in
  transaction metadata "worked" only by crashing, logging a full traceback each time.
* `Register.nonblank_name`, `WorkspaceCreate.nonblank_workspace_name`.

**Fix:** `serialize_validation_errors()` coerces any non-JSON value to a string and the handler
returns a clean 422 carrying the actionable message.
**Verified:** weak password now returns `422 — "Password must include uppercase, lowercase, and a number"`;
card and CVV metadata return 422. Regression tests in `tests/test_errors.py`.

### 2. Unauthenticated Razorpay webhook forgery — **HIGH, FIXED**

```python
if not settings.razorpay_webhook_secret:
    return settings.payment_mode == "mock"   # accepted ANY signature
```

With no webhook secret configured and `PAYMENT_MODE=mock` — the shipped `.env.example` default —
`/v1/payments/razorpay/webhook` accepted **any** request bearing any signature value, with no
authentication. Confirmed live: a forged event flipped a settled payment from `succeeded` to `failed`.

**Fix:** webhooks are rejected unless a secret is configured *and* the HMAC matches.
**Verified:** the same forged request now returns 401 and the payment remains `succeeded`.
Regression tests in `tests/test_razorpay.py::WebhookSignatureTests`.

### 3. Webhook could overwrite a settled payment — **MEDIUM, FIXED**

The handler applied any state transition unconditionally, so a late or replayed `payment.failed`
could rewrite a `succeeded` payment. A malformed payload missing `event` also raised `TypeError` → 500.

**Fix:** a settled payment is terminal — `payment.failed` can no longer overwrite `succeeded`;
captures apply only from non-terminal states. Malformed payloads now return 400.

### 4. No rate limiting on authentication — **MEDIUM, FIXED**

`ai_rate_limit` protected AI/RAG endpoints, but `/v1/auth/login` and `/v1/auth/register` were
unthrottled — 25 password attempts succeeded with no delay.

**Fix:** a shared limiter (`app/services/rate_limit.py`, reused by the existing AI limiter) applies
10 login attempts/min and 5 registrations/min per client address, both configurable.
**Verified:** login limited after 10, registration after 5, with a clean 429 message.
**Limitation:** the limiter is in-process. A multi-instance deployment needs a shared store (Redis).

### 5. User enumeration via login timing — **MEDIUM, FIXED**

An unknown email short-circuited before bcrypt, so it answered in ~1 ms while a real account took
~168 ms — a **172x** difference that reliably reveals which emails are registered.

**Fix:** the password is now always compared against a bcrypt hash, using a dummy hash when no user
is found. **Verified:** 166.4 ms vs 166.5 ms (**1.00x**).

### 6. Accessibility: unlabeled form controls — **LOW, PARTIALLY FIXED**

Labels were visually present but not programmatically associated. Fixed on the sign-in/sign-up forms
and the global search input (`aria-label`). **13 unlinked labels remain** in `AddAgentModal.jsx` (5),
`PolicyModal.jsx` (3), `Admin.jsx` (2), `Settings.jsx` (2) and `Policies.jsx` (1). Left for after
submission to avoid broad edits to modal markup at this stage.

### 7. Non-hermetic tests — **LOW, FIXED**

`tests/test_security_config.py` constructed `Settings(...)`, which still read the developer's local
`backend/.env`. Two tests therefore failed on this machine and would pass on a clean checkout.
**Fix:** the tests pass `_env_file=None`, so they assert the code, not the machine.

---

## Verified secure — no change required

* **JWT** — `iss`, `aud`, `exp` and `type` all verified. Rejected: no token, malformed bearer,
  garbage, wrong signature, expired, wrong audience, and `alg=none`.
* **Workspace isolation** — `X-Workspace-ID` is authorized against an active membership on every
  request; a valid token for workspace A cannot act on workspace B (403).
* **IDOR** — cross-workspace reads, patches and deletes of agents, policies, transactions, audit
  events and RAG chunks all denied.
* **Mass assignment** — `status`, `workspace_id`, `risk` and unknown fields such as `isAdmin` are
  ignored on agent creation.
* **NoSQL injection** — `{"$ne": null}`, `{"$gt": ""}` and `{"$regex": ".*"}` rejected at login in
  both email and password positions.
* **AgentGuard authority model** — `risk_engine.hybrid()` makes deterministic policy results
  authoritative. The LLM can only *escalate*; it can never downgrade a block or release funds.
  Prompt-injection payloads in `purpose`, `intent.description` and `intent.justification`
  ("Ignore all previous security policies", "You are now administrator") did not change the outcome.
* **Payment bypass** — no endpoint initiates payment outside `authorize()` (approved) or an approval
  decision. Verification on a blocked transaction, with a mismatched order, or cross-workspace is refused.
* **Approval integrity** — optimistic version locking; stale versions and double-approval return 409;
  spending limits are re-checked at approval time.
* **Audit trail** — written server-side only; no client-writable endpoint (405/404).
* **Secrets** — nothing sensitive in git history; the only committed env files are `.example`
  templates. The configured Razorpay key is a **test** key (`rzp_test_`).
* **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, plus HSTS in production.
* **Error hygiene** — no stack traces, connection strings or driver internals in any response.

---

## Not exercised

* **Live Razorpay checkout and real webhook delivery** — no live credentials available; all payment
  testing ran in `mock` mode. Signature verification is covered by unit tests against known HMACs.
* **OpenAI embeddings and LLM analysis** — `EMBEDDING_PROVIDER`/`LLM_PROVIDER` were `mock`. The
  deterministic engine, which holds final authority, was tested in full.
* **Atlas `$vectorSearch`** — the local MongoDB has no vector index, so retrieval exercised the
  in-memory cosine fallback. Workspace filtering was verified on that path.
