import { useState } from 'react'
import { RISK, AV, initials } from '../data'
import { Check } from '../components/Icons'

export default function Approvals({ approvals, onApprove, onReject, onView }) {
  const [busy, setBusy] = useState(null)
  const decide = async (approval, index, approved) => { setBusy(approval.approval_id); try { await (approved ? onApprove(index, approval) : onReject(index, approval)) } finally { setBusy(null) } }
  return (
    <div className="ag-rise" style={{ maxWidth: 1000 }}>
      <h1 className="ag-h1">Approval Center</h1>
      <p className="ag-sub">Review payments that require human authorisation.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {approvals.map((approval, i) => { const tx = approval.transaction || {}; const a = { ...approval, agent: tx.agent_name || tx.agent_id, merchant: tx.merchant?.name, amount: new Intl.NumberFormat('en-IN', { style: 'currency', currency: tx.amount?.currency || 'INR', maximumFractionDigits: 0 }).format((tx.amount?.minor || 0) / 100), purpose: tx.purpose, risk: (tx.risk?.band || 'medium').replace(/^./, x => x.toUpperCase()), ago: new Date(approval.requested_at).toLocaleString(), policy: tx.policy_evaluation?.policy_id, av: i % 4, tx: approval.transaction_id, reason: approval.reason_codes?.join(', '), justification: tx.intent?.justification || 'No justification provided.' }; return (
          <div key={approval.approval_id} className="ag-card" style={{ padding: '20px 22px' }}>
            <div className="ag-approval-head"
              style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 18, marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  className="ag-avatar"
                  style={{ width: 38, height: 38, borderRadius: 9, background: AV[a.av].bg, color: AV[a.av].fg, fontSize: 12 }}
                >
                  {initials(a.agent)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{a.agent}</span>
                    <span style={{ fontSize: 12.5, color: '#9CA3AF' }}>→</span>
                    <span style={{ fontSize: 14, color: '#4B5563' }}>{a.merchant}</span>
                    <span className="ag-badge" style={{ background: RISK[a.risk].bg, color: RISK[a.risk].fg }}>
                      {a.risk} risk
                    </span>
                  </div>
                  <span className="ag-note">
                    {a.purpose} · Requested {a.ago} · Policy: {a.policy}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{a.amount}</span>
            </div>

            <div className="ag-grid-2" style={{ marginBottom: 16 }}>
              <div style={{ background: '#FAFAFB', border: '1px solid #F3F4F6', borderRadius: 9, padding: '12px 14px' }}>
                <span className="ag-eyebrow">WHY APPROVAL IS NEEDED</span>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{a.reason}</p>
              </div>
              <div style={{ background: '#FAFAFB', border: '1px solid #F3F4F6', borderRadius: 9, padding: '12px 14px' }}>
                <span className="ag-eyebrow">AGENT JUSTIFICATION</span>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#111827', lineHeight: 1.5, fontStyle: 'italic' }}>
                  {a.justification}
                </p>
              </div>
            </div>

            <div className="ag-approval-actions" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <button className="ag-btn" style={{ color: '#4B5563' }} onClick={() => onView(a.tx)}>View analysis</button>
              <div style={{ flex: 1 }} />
              {approval.allowed_actions?.includes('reject') && <button disabled={busy === approval.approval_id} className="ag-btn ag-btn-danger" style={{ padding: '0 16px' }} onClick={() => decide(approval, i, false)}>
                Reject
              </button>}
              {approval.allowed_actions?.includes('approve') && <button disabled={busy === approval.approval_id} className="ag-btn ag-btn-primary" style={{ padding: '0 16px' }} onClick={() => decide(approval, i, true)}>
                {busy === approval.approval_id ? 'Processing…' : 'Approve Payment'}
              </button>}
            </div>
          </div>
        )})}
      </div>

      {approvals.length === 0 && (
        <div
          className="ag-card"
          style={{ padding: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <div className="ag-avatar" style={{ width: 42, height: 42, borderRadius: 10, background: '#DCFCE7' }}>
            <Check size={20} stroke="#16A34A" />
          </div>
          <span style={{ fontSize: 14.5, fontWeight: 500 }}>Queue clear</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            No agent payments are waiting on a human right now.
          </span>
        </div>
      )}
    </div>
  )
}
