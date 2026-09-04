import { useMemo, useState } from 'react'
import { api, openRazorpayCheckout } from '../api/client'

const initialForm = {
  agent_id: '', amount: '', currency: 'INR', merchant_name: '', category: '', country: 'IN',
  payment_type: 'one_time', purpose: '', description: '', justification: '',
}

function toMinorUnits(value) {
  const normalized = value.trim().replaceAll(',', '')
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) throw new Error('Enter a valid amount with no more than two decimal places')
  const minor = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('Amount must be greater than zero')
  return minor
}

function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return `dashboard-${crypto.randomUUID()}`
  return `dashboard-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function AuthorizePayment({ agents, user, onToast, onChanged, onView }) {
  const activeAgents = useMemo(() => agents.filter((agent) => agent.status === 'active'), [agents])
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setResult(null)
    try {
      const payload = {
        agent_id: form.agent_id,
        amount: toMinorUnits(form.amount),
        currency: form.currency.trim().toUpperCase(),
        merchant: {
          name: form.merchant_name.trim(), category: form.category.trim().toLowerCase(),
          country: form.country.trim().toUpperCase(), verification_status: 'unverified',
        },
        purpose: form.purpose.trim(),
        intent: { description: form.description.trim(), justification: form.justification.trim() },
        payment_type: form.payment_type,
        idempotency_key: idempotencyKey(),
        metadata: { source: 'dashboard' },
      }
      const decision = await api.authorizePayment(payload)
      setResult(decision)
      if (decision.payment?.checkout) {
        try {
          const verified = await openRazorpayCheckout(decision.payment, decision.transaction_id, user)
          setResult((current) => ({ ...current, payment: verified.payment }))
          onToast('Payment completed and verified')
        } catch (error) {
          onToast(`Payment authorized, but ${error.message}`, '#D97706')
        }
      } else if (decision.decision === 'approved') onToast(decision.payment?.status === 'failed' ? 'Approved, but payment initiation failed' : 'Payment approved and processed', decision.payment?.status === 'failed' ? '#DC2626' : '#16A34A')
      else if (decision.decision === 'review') onToast('Payment sent for human approval', '#D97706')
      else onToast('Payment blocked by policy', '#DC2626')
      await onChanged()
    } catch (error) { onToast(error.message, '#DC2626') }
    finally { setBusy(false) }
  }

  const statusColor = result?.decision === 'approved' ? '#15803D' : result?.decision === 'review' ? '#B45309' : '#B91C1C'
  const statusBg = result?.decision === 'approved' ? '#DCFCE7' : result?.decision === 'review' ? '#FEF3C7' : '#FEE2E2'

  return (
    <div className="ag-rise" style={{ maxWidth: 900 }}>
      <h1 className="ag-h1">Authorize Payment</h1>
      <p className="ag-sub">Enter a payment request on behalf of an agent. No funds move until all assigned policy checks pass.</p>

      <form className="ag-card ag-card-pad" onSubmit={submit}>
        <h2 className="ag-h2" style={{ marginBottom: 16 }}>Payment request</h2>
        <div className="ag-grid-2">
          <div>
            <label className="ag-label" htmlFor="payment-agent">Agent</label>
            <select id="payment-agent" className="ag-input ag-input-sm" required value={form.agent_id} onChange={(e) => update('agent_id', e.target.value)}>
              <option value="">Select an active agent</option>
              {activeAgents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.name}</option>)}
            </select>
          </div>
          <div>
            <label className="ag-label" htmlFor="payment-amount">Amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select aria-label="Currency" className="ag-input ag-input-sm" style={{ width: 92 }} value={form.currency} onChange={(e) => update('currency', e.target.value)}><option>INR</option></select>
              <input id="payment-amount" className="ag-input ag-input-sm" required inputMode="decimal" placeholder="8450.00" value={form.amount} onChange={(e) => update('amount', e.target.value.replace(/[^0-9.,]/g, ''))} />
            </div>
            <span className="ag-note">Enter rupees; the server receives the exact value in paise.</span>
          </div>
          <div>
            <label className="ag-label" htmlFor="merchant-name">Merchant name</label>
            <input id="merchant-name" className="ag-input ag-input-sm" required maxLength={160} placeholder="IndiGo" value={form.merchant_name} onChange={(e) => update('merchant_name', e.target.value)} />
          </div>
          <div>
            <label className="ag-label" htmlFor="merchant-category">Merchant category</label>
            <input id="merchant-category" className="ag-input ag-input-sm" required maxLength={80} placeholder="airline" value={form.category} onChange={(e) => update('category', e.target.value)} />
          </div>
          <div>
            <label className="ag-label" htmlFor="merchant-country">Merchant country</label>
            <input id="merchant-country" className="ag-input ag-input-sm" required minLength={2} maxLength={2} placeholder="IN" value={form.country} onChange={(e) => update('country', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
          </div>
          <div>
            <label className="ag-label" htmlFor="payment-type">Payment type</label>
            <select id="payment-type" className="ag-input ag-input-sm" value={form.payment_type} onChange={(e) => update('payment_type', e.target.value)}>
              <option value="one_time">One-time</option><option value="subscription">Subscription</option><option value="refund">Refund</option>
            </select>
          </div>
          <div>
            <label className="ag-label" htmlFor="payment-purpose">Purpose</label>
            <input id="payment-purpose" className="ag-input ag-input-sm" required maxLength={500} placeholder="Flight booking" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} />
          </div>
        </div>
        <p className="ag-note" style={{ margin: '14px 0 0' }}>Merchant trust is derived from successful workspace payment history; it cannot be self-declared in this form.</p>
        <div style={{ marginTop: 14 }}>
          <label className="ag-label" htmlFor="payment-description">Agent intent</label>
          <textarea id="payment-description" className="ag-textarea" rows={2} maxLength={1000} placeholder="What the agent is trying to accomplish" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="ag-label" htmlFor="payment-justification">Justification</label>
          <textarea id="payment-justification" className="ag-textarea" rows={2} maxLength={1000} placeholder="Why this merchant and amount were selected" value={form.justification} onChange={(e) => update('justification', e.target.value)} />
        </div>
        {!activeAgents.length && <p style={{ color: '#B91C1C', fontSize: 13 }}>Create or resume an agent before submitting a payment.</p>}
        <button className="ag-btn ag-btn-primary ag-btn-tall" style={{ marginTop: 16 }} type="submit" disabled={busy || !activeAgents.length}>{busy ? 'Evaluating…' : 'Evaluate and pay safely'}</button>
      </form>

      {result && (
        <div className="ag-card ag-card-pad ag-rise-fast" style={{ marginTop: 16, borderColor: statusBg }} aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div><span className="ag-eyebrow">DECISION</span><h2 style={{ margin: '5px 0 0', fontSize: 20, textTransform: 'capitalize' }}>{result.decision === 'review' ? 'Human review required' : result.decision}</h2></div>
            <span className="ag-badge" style={{ color: statusColor, background: statusBg }}>{result.risk?.score ?? 0}/100 · {result.risk?.band || 'unknown'} risk</span>
          </div>
          <p className="ag-note" style={{ margin: '14px 0' }}>{(result.reason_codes || []).join(' · ')}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="ag-mono" style={{ fontSize: 12.5 }}>{result.transaction_id}</span>
            <span className="ag-note">Payment: {result.payment?.status || 'not initiated'}</span>
            <button type="button" className="ag-btn ag-btn-sm" onClick={() => onView(result.transaction_id)}>View transaction</button>
          </div>
        </div>
      )}
    </div>
  )
}
