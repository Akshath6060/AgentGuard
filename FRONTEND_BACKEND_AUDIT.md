# AgentGuard Frontend Audit and Backend Planning Report

Date: 1 September 2026  
Scope: Current React frontend in `src/`  
Purpose: Describe the product flows implied by the UI and translate them into a backend plan.

## 1. Executive summary

The current frontend is a polished single-page prototype for governing payments initiated by autonomous AI agents. It presents three core product outcomes:

1. approve a low-risk agent payment automatically before money moves;
2. hold a policy-sensitive payment for human approval;
3. block a high-risk or prohibited payment before provider authorization.

The frontend currently has no backend integration. All users, workspaces, agents, policies, transactions, risk results, audit events, API keys, and provider details are hard-coded in `src/data.js` or inside page components. Navigation is component state rather than URL routing. Only the approval queue mutates, and that mutation exists only in memory until refresh.

The backend should therefore be planned around an authorization and decision engine, not around dashboard CRUD alone. The critical path is:

`agent request -> authenticate agent -> validate request -> evaluate policy -> calculate risk -> persist decision and evidence -> approve / review / block -> optionally settle through provider -> append audit events -> publish live updates`

Recommended first release: implement tenant-aware identity, agent credentials, versioned policies, the authorization state machine, approval handling, an append-only audit trail, and provider idempotency. Analytics, natural-language policy generation, advanced behavioral scoring, and notification preferences can follow.

## 2. What exists today

### Technical shape

- React 19 + Vite; no React Router, data-fetching library, API client, or global store.
- `App.jsx` holds authentication screen, selected workspace, selected page, selected transaction, modals, toast, and approval queue state.
- `src/data.js` is the mock database and contains most product data.
- No network calls, browser persistence, cookies, tokens, sockets, or server-driven events.
- No form validation, error states, retries, loading skeletons, pagination, or concurrency handling.
- Currency values and timestamps are display strings rather than typed values.

### Implemented screens

| Area | Current UI | Actual behavior |
|---|---|---|
| Authentication | Email/password, SSO, 2FA, workspace picker | Any input advances through timed screens; 2FA is fixed text |
| Overview | KPIs, spend chart, risk distribution, recent activity | Range changes swap local arrays; transaction rows navigate |
| Agents | Agent list, spend usage, status/risk | Every row opens the same hard-coded TravelAgent profile |
| Agent profile | Limits, permissions, recent decisions, pause/edit | Overview is static; other tabs are placeholders; pause/edit only toast |
| Transactions | Status tabs, search, date/risk/agent/status filters | Status tabs work locally; search and filter controls do nothing |
| Transaction detail | Decision pipeline, signals, intent, checks, provider status | Reads three mocked detail records; actions only toast |
| Approval Center | Review cards, approve, reject, open analysis | Approve/reject removes a local array item only |
| Policies | Policy cards and plain-language creation modal | Generation is a timer returning fixed rules; save only toast |
| Risk Center | Security score, trend and categories | Static presentation only |
| Audit Logs | Timeline, filters and export | Static presentation; filters/export do nothing |
| Developers | Test/live keys and integration example | Generate/copy/reveal/revoke only toast; clipboard is not used |
| Settings | Workspace name, currency, Razorpay connection | Inputs are not saved; provider connection is static |
| Global chrome | Search, notifications, workspace/user menu | Search and notifications do nothing; workspace switch changes label only |

## 3. Product flows inferred from the frontend

### Flow A: Console sign-in and workspace selection

1. Operator enters work email and password or chooses SSO.
2. Backend authenticates the identity and applies sign-in/session policy.
3. If MFA is required, backend creates an MFA challenge and verifies a time-limited code.
4. Backend returns the workspaces and roles available to the identity.
5. Operator selects a live or test workspace.
6. All subsequent console requests are scoped to that workspace; switching workspace refreshes all tenant data.
7. Sign-out revokes the current session or refresh token.

Backend requirements: users, identities, sessions, SSO organization config, MFA challenges/recovery, workspace membership, role/permission claims, environment separation, login audit events.

### Flow B: Create and configure an agent

1. Admin starts the five-step Add Agent wizard.
2. Enter name, description, and type.
3. Select allowed spending categories.
4. Configure per-transaction, daily, and monthly monetary limits.
5. Configure approval/block rules: unknown merchants, above-limit payments, international payments, cryptocurrency, repeated failures.
6. Review and create.
7. Backend creates the agent, its credential, and either an embedded policy assignment or a reusable policy link.
8. The secret is shown exactly once; later the admin can rotate or revoke it.

Backend requirements: validated minor-unit amounts, ISO currency, category taxonomy, agent lifecycle (`active`, `paused`, `revoked`), credential hashes, secret rotation, effective policy resolution, immutable creation audit.

Important decision: the UI currently mixes policy fields into agent creation while also supporting reusable Policies. Prefer reusable, versioned policies plus agent-specific overrides. The backend must return the fully resolved/effective rules used for a decision.

### Flow C: Agent requests payment authorization (critical path)

The Developers screen implies an SDK call similar to:

```json
POST /v1/authorizations
{
  "agent_id": "agt_travel_01",
  "amount": 8450,
  "currency": "INR",
  "merchant": { "name": "IndiGo" },
  "purpose": "Flight booking"
}
```

The production request should additionally include `idempotency_key`, stable merchant identifiers where available, category/MCC, country, payment instrument/provider context, agent-generated intent and justification, and useful order/reference metadata.

Processing flow:

1. Authenticate the agent credential and workspace.
2. Reject malformed, duplicated, stale, disabled-agent, or cross-workspace requests.
3. Normalize amount, currency, merchant, category, geography, and recurrence.
4. Resolve the agent's active policy version and current spend counters.
5. Run deterministic policy checks: single/daily/monthly limits, category, merchant trust, international/recurring restrictions, frequency and repeated attempts.
6. Run risk signals and calculate a reproducible score/band.
7. Persist the transaction, input snapshot, policy version, each check/signal, score, reason codes, decision, and timing atomically.
8. Return one decision:
   - `approved`: safe to continue, optionally coupled to provider execution;
   - `review`: funds must not move; approval record is created with expiry;
   - `blocked`: final denial; funds must not move.
9. Emit audit and live dashboard events.

The advertised sub-400 ms response means the synchronous path cannot depend on slow LLM calls. Use deterministic rules and low-latency feature retrieval synchronously; use asynchronous enrichment or precomputed behavioral features for anything expensive.

### Flow D: Approved payment and settlement

1. Authorization decision is `approved`.
2. Depending on product ownership, either:
   - AgentGuard returns a signed authorization token and the client executes payment; or
   - AgentGuard initiates the provider payment itself.
3. Provider request uses a stable idempotency key.
4. Transaction moves through provider states such as `not_initiated -> processing -> succeeded/failed`.
5. Razorpay webhook signatures are verified; webhook events are deduplicated.
6. Spend counters are reserved/committed consistently and released on expiry or terminal failure.
7. The transaction detail and audit timeline update live.

Recommendation: choose the payment ownership model before coding. The current UI claims both “authorize before your agent executes it” and that payments are “initiated through Razorpay,” so this boundary is presently ambiguous.

### Flow E: Human approval

1. Authorization decision is `review`; backend creates a pending approval linked one-to-one to the transaction and policy evaluation.
2. Authorized approvers receive/see the queue.
3. Approver reviews amount, merchant, reason, intent, justification, signals, and policy checks.
4. Approver submits approve or reject, ideally with optional comment and mandatory step-up authentication above a threshold.
5. Backend uses compare-and-set semantics so only the first valid decision wins.
6. On approval, revalidate expiry, agent state, policy-sensitive conditions, spend availability, and merchant status before payment.
7. Persist actor, decision, timestamp, comment, client/IP metadata, and any override reason.
8. On rejection/expiry, transaction reaches a terminal state and no payment can be initiated.

Required edge cases: double clicks, two approvers racing, already expired approval, requester retrying with a new idempotency key, policy changed while pending, insufficient remaining budget at approval time, provider failure after approval.

### Flow F: Blocked payment

1. A hard rule or risk threshold returns `blocked`.
2. No provider authorization is created.
3. Response contains stable machine reason codes plus safe operator-facing explanations.
4. Attempt contributes to repeated-failure and anomaly features.
5. Operator can inspect the exact policy version and evidence.

The current “Approve Once” action appears even for already approved and blocked transactions. Backend permissions and transition rules must determine available actions; the frontend should render server-provided capabilities rather than always showing all buttons.

### Flow G: Merchant allowlisting

1. Authorized admin chooses “Add Merchant to Allowlist” from a transaction.
2. Backend resolves a stable merchant identity, not merely a display name.
3. Admin selects workspace-wide, policy-specific, or agent-specific scope and optionally an expiry.
4. Change creates a new policy/allowlist version with actor and rationale.
5. It does not silently approve the current transaction unless the user separately approves/retries it.

### Flow H: Policy creation and lifecycle

1. Admin describes policy in plain language.
2. Backend converts text into a draft structured schema.
3. Server validates conflicts, unsupported clauses, currency/limit consistency, and dangerous gaps.
4. UI shows the generated structured rules for explicit confirmation/editing.
5. Saving creates a versioned draft; publishing activates it and records assignments.
6. Existing decisions retain the exact historical policy snapshot/version.

Treat LLM output only as a proposal. Enforcement must execute a validated, deterministic policy DSL/schema. Include policy states such as `draft`, `active`, `superseded`, and `archived`; require optimistic locking for edits.

### Flow I: Agent administration

1. List/search/filter agents with spend, risk and last activity.
2. Open the selected agent by ID.
3. View effective permissions, limits, assignments, transactions and logs.
4. Pause/resume changes authorization behavior immediately.
5. Edit creates auditable changes and returns updated effective configuration.

Define pause semantics explicitly: new authorizations should fail, pending approvals should normally be invalidated or require revalidation, and existing provider payments should not be retroactively cancelled without a separate action.

### Flow J: Monitoring, analytics, search and exports

- Overview KPIs aggregate workspace activity for a selected time range.
- Live activity and approval counts arrive through SSE or WebSocket; SSE is sufficient if console updates are server-to-client only.
- Transaction listing supports cursor pagination plus query, time range, risk, agent and status filters.
- Risk Center consumes daily/hourly aggregates rather than scanning the transaction table per request.
- Global search returns typed results for agents, transactions and merchants.
- Audit export is an asynchronous, access-controlled job for large datasets, with a signed short-lived download URL.

### Flow K: API keys, settings and provider connection

- Admin creates keys by environment and scope; plaintext secret is returned once, only a hash/prefix is stored.
- Copy is client-only; reveal should not be possible for a properly stored secret. Replace “Reveal” with rotate/create replacement.
- Revoke is immediate, confirmed, and audited.
- Workspace name/currency changes use validation and optimistic concurrency.
- Provider onboarding stores encrypted credentials or OAuth references, verifies connection, supports live/test separation, receives webhooks, and exposes connection health without returning secrets.

## 4. Recommended backend domain model

Use UUID/ULID internal identifiers and separate human-readable IDs such as `AGTX-40291`. Every tenant-owned table should carry `workspace_id`; enforce tenant scope in the data-access layer and, where practical, database row-level security.

| Entity | Essential fields |
|---|---|
| User | id, primary_email, name, status, MFA configuration reference |
| Workspace | id, name, environment, default_currency, timezone, status |
| Membership | user_id, workspace_id, role_id, status |
| Role / Permission | role, granular actions such as approvals.decide, policies.publish, keys.manage |
| Session | user_id, token/session hash, expiry, device metadata, revoked_at |
| Agent | id, public_id, workspace_id, name, description, type, status, risk_band, timestamps |
| AgentCredential | agent_id, prefix, secret_hash, scopes, environment, last_used_at, expires_at, revoked_at |
| Policy | id, workspace_id, name, status, current_version_id |
| PolicyVersion | policy_id, version, normalized rules JSON, source text, created_by, published_at, hash |
| PolicyAssignment | policy_version/policy_id, agent_id, priority, effective_from/to |
| Merchant | id, normalized name, provider merchant ID, MCC/category, country, trust metadata |
| MerchantRule | merchant_id, scope, action (allow/block/review), expiry, reason, actor |
| Transaction | id/public_id, workspace_id, agent_id, amount_minor, currency, merchant_id/snapshot, purpose, intent, justification, state, idempotency key, timestamps |
| PolicyEvaluation | transaction_id, policy_version_id, input snapshot, decision, latency_ms |
| EvaluationCheck | evaluation_id, code, result, observed value, threshold, explanation, evidence JSON |
| RiskAssessment | transaction_id, model/ruleset version, score, band, feature snapshot |
| Approval | transaction_id, status, requested_at, expires_at, decided_by/at, comment, version |
| PaymentAttempt | transaction_id, provider, provider_payment_id, amount, status, idempotency key, failure code, timestamps |
| SpendLedger | agent_id, transaction_id, type (reserve/commit/release/refund), amount_minor, occurred_at |
| AuditEvent | workspace_id, sequence/id, actor type/id, action, object type/id, immutable payload, timestamp, request/trace ID |
| APIKey | workspace_id, prefix, secret_hash, environment, scopes, creator, last_used, revoked_at |
| ProviderConnection | workspace_id, provider, environment, encrypted config reference, account reference, status |
| Notification | recipient, type, object reference, read_at, delivery status |
| ExportJob | workspace_id, requester, filters, status, object key, expires_at |

Do not store money as formatted text or floating point. Store integer minor units plus ISO-4217 currency. Store timestamps in UTC and format with workspace timezone on the client.

## 5. Transaction and approval state model

Keep the risk/policy decision separate from payment settlement status.

### Decision state

`received -> evaluating -> approved | review_pending | blocked | evaluation_failed`

`review_pending -> approved_by_human | rejected_by_human | expired | cancelled`

### Payment state

`not_initiated -> reserved -> processing -> succeeded | failed | cancelled | refunded`

Rules:

- A blocked/rejected/expired transaction cannot enter `processing`.
- Human approval is a transition, not a boolean.
- Every transition is validated server-side and appended to audit history.
- Repeated requests with the same workspace + agent + idempotency key return the original logical result.
- Provider callbacks may be out of order; transition handlers must be idempotent and reject invalid regressions.
- API responses should include `allowed_actions` or capabilities derived from current state and caller permissions.

## 6. Suggested API surface

This is an initial REST shape; exact naming can change, but tenant scope, idempotency, pagination, and state transitions should remain explicit.

### Identity and workspace

- `POST /v1/auth/login`
- `POST /v1/auth/mfa/challenges/{id}/verify`
- `GET /v1/me`
- `GET /v1/workspaces`
- `POST /v1/auth/logout`
- `GET /v1/workspaces/{workspace_id}`
- `PATCH /v1/workspaces/{workspace_id}`

### Agent integration and management

- `POST /v1/authorizations` — agent-facing critical path
- `GET /v1/agents?query=&status=&cursor=`
- `POST /v1/agents`
- `GET /v1/agents/{agent_id}`
- `PATCH /v1/agents/{agent_id}`
- `POST /v1/agents/{agent_id}/pause`
- `POST /v1/agents/{agent_id}/resume`
- `GET /v1/agents/{agent_id}/effective-policy`
- `POST /v1/agents/{agent_id}/credentials`
- `DELETE /v1/agents/{agent_id}/credentials/{credential_id}`

### Transactions, approvals and payments

- `GET /v1/transactions?query=&agent_id=&decision=&risk=&from=&to=&cursor=`
- `GET /v1/transactions/{transaction_id}`
- `GET /v1/transactions/{transaction_id}/timeline`
- `GET /v1/approvals?status=pending&cursor=`
- `POST /v1/approvals/{approval_id}/decision` with `{ decision, comment, version }`
- `POST /v1/transactions/{transaction_id}/merchant-rule` with scope and rationale
- Provider webhook endpoint outside console authentication, protected by signature verification

Avoid separate blind `/approve` and `/reject` endpoints if both perform the same concurrency-sensitive transition. A single decision command with an expected version is easier to make consistent.

### Policies and merchants

- `GET /v1/policies`
- `POST /v1/policies`
- `POST /v1/policies/generate-draft`
- `GET /v1/policies/{policy_id}`
- `POST /v1/policies/{policy_id}/versions`
- `POST /v1/policies/{policy_id}/publish`
- `POST /v1/policies/{policy_id}/assignments`
- `GET /v1/merchants?query=&trust_state=`
- `POST /v1/merchant-rules`

### Dashboard, audit and developer administration

- `GET /v1/dashboard/overview?range=`
- `GET /v1/analytics/spend?range=&bucket=`
- `GET /v1/analytics/risk?range=&bucket=`
- `GET /v1/audit-events?...filters...&cursor=`
- `POST /v1/audit-exports`
- `GET /v1/search?q=&types=`
- `GET /v1/events/stream` (SSE)
- `GET /v1/api-keys`
- `POST /v1/api-keys`
- `DELETE /v1/api-keys/{key_id}`
- `GET /v1/provider-connections`
- `POST/PATCH /v1/provider-connections/{provider}`

## 7. Authorization response contract

The SDK needs more than the three fields shown in the mockup. A useful response is:

```json
{
  "transaction_id": "AGTX-40291",
  "decision": "approved",
  "risk": { "score": 12, "band": "low", "version": "risk-2026-09" },
  "reason_codes": ["WITHIN_LIMIT", "KNOWN_MERCHANT", "CATEGORY_ALLOWED"],
  "policy": { "id": "pol_travel", "version": 7 },
  "approval": null,
  "authorization_token": "short-lived-token-if-client-settles",
  "expires_at": "2026-09-01T08:38:21Z",
  "request_id": "req_..."
}
```

For `review`, include approval ID, expiry and polling/webhook guidance. For `blocked`, include safe reason codes but avoid leaking fraud controls or sensitive model features to untrusted agent clients. Full evidence remains available to authorized console users.

## 8. Security, compliance and reliability requirements

This system controls money, so these are release requirements rather than later polish:

- Strict workspace isolation on every read/write and cache key.
- RBAC at minimum: owner/admin, approver, analyst/auditor, developer, viewer.
- Separate human session credentials, agent API credentials and provider secrets.
- Secrets encrypted with managed KMS; API/provider secrets never logged.
- API keys hashed and shown once; scoped by environment and action.
- Idempotency on authorization creation, approval decisions and provider operations.
- Append-only, tamper-evident audit events; include actor, object, before/after or command result, request/trace ID and policy version.
- Rate limits per key/agent/workspace; anomaly detection for credential abuse.
- Signed provider webhooks, replay protection, deduplication and dead-letter handling.
- Monetary counter correctness under concurrency; use a ledger/reservations, not cached dashboard totals as authority.
- Approval expiry and optional step-up MFA for high-value overrides.
- PII minimization, retention controls, audit export authorization and redaction policy.
- Structured observability around decision latency, failure rate, provider state and rule outcomes.
- Disaster recovery, backups and reconciliation jobs against the payment provider.

## 9. Frontend-to-backend gaps and inconsistencies to resolve

### Critical product/data issues

1. Approval records do not have unique approval IDs and some point to unrelated transaction detail data. TravelAgent/MakeMyTrip links to a Meta Ads record; Global Metals links to an XYZ Components record.
2. Approving/rejecting only removes a card. It does not update transaction status, payment status, counters, audit logs, recent activity or risk analytics.
3. Transaction detail falls back to AGTX-40290 for four transactions without details, which can show the wrong amount-specific evidence and policy.
4. Every agent row opens the same TravelAgent profile because no agent ID is passed.
5. “Approve Once,” “Reject,” and “Allowlist” are displayed regardless of transaction state or caller role.
6. Workspace switching changes identity labels but all workspaces share the same mocked data and approval state.
7. The settlement ownership boundary is unclear: SDK copy says the agent executes payment, while the transaction timeline says AgentGuard initiates Razorpay.

### Missing functional states

- Request loading, empty and error states, retry, timeout, offline and partial-data handling.
- Pagination and server-side sorting/filtering.
- Conflict feedback when an approval was already decided.
- Policy validation/conflict display and publish/assignment lifecycle.
- Agent key delivery/rotation and edit/pause confirmations.
- Saved workspace settings and provider connect/disconnect/error states.
- Notification list/read state and global search result UI.
- Proper clipboard, secure secret display and destructive confirmations.
- URL-based routes and deep links for agents, transactions and approvals.

### Terminology to normalize

The UI uses `Review`, `Approval Required`, `Needs Approval`, and `Pending Review` for the same concept. Define canonical API enums and map them to display labels. Likewise distinguish policy decision status, approval status, payment status, agent risk band and transaction lifecycle state.

## 10. Recommended delivery plan

### Phase 0: Contract and threat-model decisions

- Decide whether AgentGuard only authorizes or also executes payments.
- Finalize state machines, canonical enums, policy schema and merchant identity strategy.
- Define workspace isolation, RBAC matrix, approval thresholds and environment separation.
- Write OpenAPI contracts and representative error/idempotency behavior before replacing mocks.

### Phase 1: Backend foundation

- Workspace-aware identity/session/MFA and membership/RBAC.
- Core schema, migrations, audit event infrastructure and secrets management.
- Agent CRUD, lifecycle and one-time credential issuance.
- Versioned deterministic policies and assignment resolution.

### Phase 2: Critical authorization path

- `POST /authorizations` with input normalization and idempotency.
- Deterministic limit/category/merchant/geography/frequency checks.
- Transaction, evaluation, signal and risk persistence.
- Spend ledger/reservation logic and latency instrumentation.
- Integration tests for approve/review/block and concurrency.

### Phase 3: Approval and payment execution

- Approval queue and atomic decision command with expiry/revalidation.
- Razorpay adapter, idempotent initiation, signed webhooks and reconciliation.
- Correct transaction/payment transitions and audit events.
- SSE updates for queue counts and live activity.

### Phase 4: Replace frontend mocks

- Add URL routing, workspace context and authenticated API client.
- Wire agents, policies, transactions/details and approvals first.
- Render available actions from state + permissions.
- Add standardized loading/error/empty/conflict states.
- Then wire overview/risk aggregates, audit filtering/export, search, settings and keys.

### Phase 5: Advanced capabilities

- Natural-language draft generation with schema validation and human confirmation.
- Precomputed behavioral features and versioned risk models.
- Notifications/escalations, configurable approval chains, richer analytics and compliance exports.

## 11. Minimum end-to-end acceptance scenarios

1. Known low-risk merchant within all limits is approved exactly once and payment succeeds after a valid provider webhook.
2. Unknown merchant creates one pending approval; two approvers racing produce one winner and one conflict response.
3. Above-limit request is blocked before any provider call and includes correct policy evidence.
4. Retrying the same authorization with the same idempotency key returns the original transaction without double-counting spend.
5. Approval after expiry or after agent pause fails safely and creates an audit event.
6. Provider timeout followed by a late success webhook reconciles to the correct final state without duplicate payment.
7. Policy change affects new requests but historical transaction detail still renders the old policy version.
8. Test-workspace agents and keys cannot access live workspace data or provider credentials.
9. Revoked agent/API credentials fail immediately and are rate-limited/audited.
10. Every dashboard count can be reconciled to authoritative transactions/ledger entries for the same workspace and period.

## 12. Practical first backend milestone

The smallest coherent milestone is not “make the dashboard dynamic.” It is one fully trustworthy vertical slice:

1. admin creates a workspace agent and receives a one-time test credential;
2. admin assigns a deterministic travel policy;
3. agent submits an idempotent authorization request;
4. backend returns approved, review or blocked with persisted evidence;
5. review appears in the console and can be atomically approved/rejected;
6. transaction detail and audit timeline reflect the exact same state;
7. live queue count updates without refresh.

Once this slice is correct, the remaining screens are mostly projections, administration, and analytics over the same domain model.
