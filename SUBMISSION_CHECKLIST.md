# AgentGuard Submission Checklist

Status as of the final pre-submission pass. Items marked `[x]` were verified automatically;
items marked `[ ]` need you.

## Code

- [x] Final backend tests pass — 15/15
- [x] Frontend lint passes — oxlint clean
- [x] Production frontend build passes
- [x] No secrets committed — repository scan clean
- [x] `.env` ignored by git
- [x] `.env.example` contains placeholders only
- [x] Demo database seeds without errors
- [x] Demo flow tested end to end — 25/25

## Razorpay

- [x] Payment mode confirmed — `PAYMENT_MODE=razorpay` in local `.env`
- [x] Test credentials configured and validated (`rzp_test_`, API returns 200)
- [ ] **Webhook secret configured** — `RAZORPAY_WEBHOOK_SECRET` is currently **empty**.
      Set it if you plan to demo webhooks; otherwise skip webhooks in the demo.
- [x] No secret committed to the repository
- [x] Signature verification enabled (checkout and webhook)

## Demo

- [x] ALLOW tested first
- [x] REVIEW tested — funds held until approval
- [x] BLOCK tested — `TRANSACTION_LIMIT`
- [x] Prompt injection tested — still blocked
- [x] Audit log visible and populated
- [x] RAG retrieval returns workspace-scoped policy evidence
- [ ] Re-seed performed immediately before recording
- [x] Duplicate-payment and repeated-failure behaviour understood (see `DEMO_SCRIPT.md`)

## GitHub

- [x] README finalized
- [x] Setup instructions verified against the actual repository
- [x] Architecture documented (Mermaid diagram)
- [ ] Screenshots added to `docs/screenshots/` (folder and capture list prepared)
- [x] QA reports included — `FINAL_QA_REPORT.md`, `SECURITY_AUDIT.md`
- [ ] Repository committed and pushed
- [ ] Repository accessible to judges

## Video

- [ ] Final recording completed
- [ ] Audio understandable
- [ ] Important text readable (reason codes, decisions)
- [ ] No API keys or secrets visible on screen
- [ ] Uploaded
- [ ] Public/unlisted access tested
- [ ] Link added to README (`Demo Video: [ADD LINK]`)

## Submission

- [ ] Correct track selected
- [ ] Project name: AgentGuard
- [ ] Project description complete
- [ ] GitHub URL correct
- [ ] Video URL correct
- [ ] Links tested in a private/incognito window
- [ ] Final submission checkbox completed
