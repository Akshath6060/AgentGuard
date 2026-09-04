import { useEffect, useRef, useState } from 'react'
import { STAT, sigColor, sigBg, resColor } from '../data'
import { ArrowRight, CheckBold, Razorpay } from '../components/Icons'
import { api, openRazorpayCheckout } from '../api/client'

const RING = 2 * Math.PI * 16.5
const PIPE_LABELS = ['Agent Request', 'Intent Analysis', 'Policy Check', 'Risk Analysis', 'Payment Decision']

export default function TransactionDetail({ txId, onBack, onToast, onChanged, checkoutCustomer }) {
  const [pipe, setPipe] = useState(0)
  const [raw, setRaw] = useState(null)
  const [error, setError] = useState('')
  const timer = useRef(null)

  const run = () => {
    clearInterval(timer.current)
    setPipe(0)
    timer.current = setInterval(() => {
      setPipe((p) => {
        if (p >= 5) {
          clearInterval(timer.current)
          return p
        }
        return p + 1
      })
    }, 260)
  }
  const decide = async (decision) => {
    try {
      const queue = await api.approvals()
      const approval = queue.items.find((item) => item.transaction_id === txId)
      if (!approval) throw new Error('Pending approval not found')
      const result = await api.decide(approval.approval_id, decision, approval.version)
      if (decision === 'approve' && result.payment?.checkout) {
        try {
          await openRazorpayCheckout(result.payment, result.transaction_id, checkoutCustomer)
          onToast('Payment completed and verified')
        } catch (checkoutError) {
          onToast(`Approval recorded, but ${checkoutError.message}`, '#D97706')
        }
      } else {
        onToast(decision === 'approve' ? 'Payment approved' : 'Transaction rejected', decision === 'approve' ? '#16A34A' : '#DC2626')
      }
      setRaw(await api.transaction(txId))
      await onChanged()
    } catch (e) { onToast(e.message, '#DC2626') }
  }

  useEffect(() => {
    run()
    setRaw(null); setError('')
    api.transaction(txId).then(setRaw).catch((e) => setError(e.message))
    return () => clearInterval(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId])

  if (error) return <div className="ag-card ag-card-pad"><button className="ag-btn-back" onClick={onBack}>← Transactions</button><p>{error}</p></div>
  if (!raw) return <div className="ag-card ag-card-pad">Loading transaction…</div>
  const title = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase())
  const tx = { status: raw.decision === 'review' ? 'Review' : title(raw.decision), amount: new Intl.NumberFormat('en-IN', { style: 'currency', currency: raw.amount?.currency || 'INR', maximumFractionDigits: 0 }).format((raw.amount?.minor || 0) / 100), agent: raw.agent_name || raw.agent_id, merchant: raw.merchant?.name }
  const d = {
    score: raw.risk?.score || 0, scoreLabel: `${title(raw.risk?.band)} risk`, scoreNote: `${title(raw.decision_state)} · ${raw.total_decision_latency_ms || 0} ms decision latency.`,
    question: `Why was this transaction ${raw.decision}?`, policy: `${raw.policy_evaluation?.policy_id} v${raw.policy_evaluation?.policy_version}`, category: raw.merchant?.category,
    date: new Date(raw.created_at).toLocaleString(), payStatus: title(raw.payment?.status), payColor: raw.payment?.status === 'succeeded' ? '#16A34A' : '#6B7280', payId: raw.payment?.provider_payment_id || raw.payment?.provider_order_id || '—',
    intent: raw.intent?.description || raw.purpose, justification: raw.intent?.justification || 'No justification provided.',
    signals: (raw.risk?.signals || []).filter((s) => s.triggered).map((s) => ({ level: s.weight >= 20 ? 'High Risk' : s.weight > 0 ? 'Medium Risk' : 'Passed', title: title(s.code), detail: s.explanation })),
    checks: (raw.policy_evaluation?.checks || []).map((c) => [title(c.code), c.result === 'pass' ? 'Passed' : c.result === 'review' ? 'Review' : 'Failed']),
  }
  const score = d.score
  const scoreColor = score >= 70 ? '#DC2626' : score >= 40 ? '#D97706' : '#16A34A'
  const statusUpper = tx.status === 'Review' ? 'NEEDS APPROVAL' : tx.status.toUpperCase()

  return (
    <div className="ag-rise">
      <button className="ag-btn-back" onClick={onBack}>← Transactions</button>

      <div className="ag-card ag-detail-hero" style={{ padding: '22px 24px', marginBottom: 16 }}>
        <div className="ag-detail-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="ag-note">Transaction</span>
              <span className="ag-mono" style={{ fontSize: 13, fontWeight: 500 }}>{txId}</span>
              <span
                className="ag-badge"
                style={{
                  fontWeight: 600, letterSpacing: '0.04em', padding: '4px 10px',
                  background: STAT[tx.status].bg, color: STAT[tx.status].fg,
                }}
              >
                {statusUpper}
              </span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 8 }}>{tx.amount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: '#4B5563' }}>
              <span style={{ fontWeight: 500, color: '#111827' }}>{tx.agent}</span>
              <ArrowRight />
              <span>{tx.merchant}</span>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 18, fontSize: 12.5, color: '#6B7280', flexWrap: 'wrap' }}>
              <span>{d.date}</span>
              <span>Policy · {d.policy}</span>
              <span>Category · {d.category}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 18, padding: '16px 20px',
              border: '1px solid #E5E7EB', borderRadius: 11, background: '#FAFAFB',
            }}
          >
            <div style={{ position: 'relative', width: 96, height: 96, flex: 'none' }}>
              <svg width="96" height="96" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="16.5" fill="none" stroke="#EEF0F3" strokeWidth="4" />
                <circle
                  cx="21" cy="21" r="16.5" fill="none" stroke={scoreColor} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${((score / 100) * RING).toFixed(1)} ${RING.toFixed(1)}`}
                  transform="rotate(-90 21 21)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                }}
              >
                <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 10, color: '#6B7280', lineHeight: 1 }}>/ 100</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="ag-eyebrow">RISK SCORE</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: scoreColor }}>{d.scoreLabel}</span>
              <span style={{ fontSize: 12.5, color: '#6B7280', maxWidth: 180 }}>{d.scoreNote}</span>
            </div>
          </div>
        </div>

        <div className="ag-pipeline"
          style={{
            display: 'flex', alignItems: 'center', marginTop: 22, paddingTop: 20,
            borderTop: '1px solid #F3F4F6', flexWrap: 'wrap',
          }}
        >
          {PIPE_LABELS.map((label, i) => {
            const done = i < pipe
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8,
                    border: '1px solid ' + (done ? '#E5E7EB' : '#F3F4F6'),
                    background: done ? '#fff' : '#FAFAFB',
                  }}
                >
                  <span
                    className="ag-avatar"
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: done ? (i === 4 ? scoreColor : '#16A34A') : '#D1D5DB',
                    }}
                  >
                    <CheckBold />
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: done ? '#111827' : '#9CA3AF' }}>{label}</span>
                </div>
                <span style={{ color: '#D1D5DB', fontSize: 13 }}>{i < 4 ? '→' : ''}</span>
              </div>
            )
          })}
          <button className="ag-btn ag-btn-xs" style={{ marginLeft: 'auto', color: '#4B5563' }} onClick={run}>
            Replay analysis
          </button>
        </div>
      </div>

      <div className="ag-split-detail" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="ag-col">
          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2-lg" style={{ marginBottom: 4 }}>{d.question}</h2>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#6B7280' }}>
              Signals evaluated against the {d.policy}.
            </p>
            {d.signals.map((s) => (
              <div key={s.title} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid #F3F4F6' }}>
                <span
                  style={{ width: 8, height: 8, borderRadius: 2, background: sigColor(s.level), marginTop: 6, flex: 'none' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.title}</span>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                        background: sigBg(s.level), color: sigColor(s.level),
                      }}
                    >
                      {s.level}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2-lg" style={{ marginBottom: 14 }}>Agent Intent</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#4B5563', lineHeight: 1.55 }}>{d.intent}</p>
            <div style={{ borderLeft: '2px solid #4F46E5', padding: '2px 0 2px 14px' }}>
              <span className="ag-eyebrow">AGENT JUSTIFICATION</span>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#111827', lineHeight: 1.55, fontStyle: 'italic' }}>
                {d.justification}
              </p>
            </div>
          </div>
        </div>

        <div className="ag-col">
          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2" style={{ marginBottom: 4 }}>Policy Evaluation</h2>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#6B7280' }}>{d.policy}</p>
            {d.checks.map(([label, result]) => (
              <div
                key={label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderTop: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: 13.5, color: '#4B5563' }}>{label}</span>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12.5, fontWeight: 600, color: resColor(result),
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: resColor(result) }} />
                  {result}
                </span>
              </div>
            ))}
          </div>

          {raw.allowed_actions?.some((a) => ['approve', 'reject'].includes(a)) && <div className="ag-card ag-card-pad">
            <h2 className="ag-h2" style={{ marginBottom: 12 }}>Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {raw.allowed_actions?.includes('approve') && <button
                className="ag-btn ag-btn-primary"
                style={{ height: 40, fontSize: 13.5 }}
                onClick={() => decide('approve')}
              >
                Approve Once
              </button>}
              {raw.allowed_actions?.includes('reject') && <button
                className="ag-btn ag-btn-danger"
                style={{ height: 40, fontSize: 13.5 }}
                onClick={() => decide('reject')}
              >
                Reject Transaction
              </button>}
            </div>
          </div>}

          <div className="ag-card ag-card-pad">
            <span className="ag-eyebrow">PAYMENT PROVIDER</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Razorpay />
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Razorpay</span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: d.payColor }}>{d.payStatus}</span>
            </div>
            <div
              style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6',
                display: 'flex', justifyContent: 'space-between',
              }}
            >
              <span className="ag-note">Payment ID</span>
              <span className="ag-mono" style={{ fontSize: 12.5 }}>{d.payId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
