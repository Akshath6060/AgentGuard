import { useMemo, useState } from 'react'
import { RISK, STAT, AV, SERIES, LABELS, initials } from '../data'

const W = 620
const H = 176
const MAX = 60

function useChart(range) {
  return useMemo(() => {
    const pts = SERIES[range]
    const xy = pts.map((v, i) => [i * (W / (pts.length - 1)), H - (v / MAX) * (H - 24)])
    const line = 'M' + xy.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ')
    const area = line + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z'
    const last = xy[xy.length - 1]
    return { line, area, lastX: last[0], lastY: last[1], labels: LABELS[range] }
  }, [range])
}

const STATS = [
  { label: 'Active Agents', value: '12', meta: '+2 this week', metaColor: '#16A34A', metaWeight: 500 },
  { label: "Today's Agent Spend", value: '₹42,840', meta: 'of ₹1,20,000' },
  { label: 'Blocked Transactions', value: '7', valueColor: '#DC2626', meta: '₹2.4L prevented' },
  { label: 'Pending Approvals', value: '3', valueColor: '#D97706', meta: 'oldest 2 min' },
]

const RANGES = [['d7', '7D'], ['d30', '30D'], ['d90', '90D']]

export default function Overview({ data, transactions = [], agents = [], onNavigate, onOpenTx, onAddAgent }) {
  const [range, setRange] = useState('d7')
  const chart = useChart(range)

  const stats = data ? [
    { label: 'Active Agents', value: String(agents.filter((a) => a.status === 'active').length), meta: `${agents.length} total` },
    { label: "Approved Agent Spend", value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: data.currency || 'INR', maximumFractionDigits: 0 }).format((data.approved_spend || 0) / 100), meta: `${data.total || 0} requests` },
    { label: 'Blocked Transactions', value: String(data.blocked || 0), valueColor: '#DC2626', meta: 'prevented before payment' },
    { label: 'Pending Approvals', value: String(data.approval_pending || 0), valueColor: '#D97706', meta: 'requires a human' },
  ] : STATS
  const activity = transactions.slice(0, 5).map((raw, index) => { const t = { id: raw.transaction_id, agent: raw.agent_name || raw.agent_id, merchant: raw.merchant?.name, amount: new Intl.NumberFormat('en-IN', { style: 'currency', currency: raw.amount?.currency || 'INR', maximumFractionDigits: 0 }).format((raw.amount?.minor || 0) / 100), risk: (raw.risk?.band || 'low').replace(/^./, x => x.toUpperCase()), status: raw.decision === 'review' ? 'Review' : (raw.decision || '').replace(/^./, x => x.toUpperCase()), ago: new Date(raw.created_at).toLocaleString(), av: index % 4 }; return ({
    ...t,
    initials: initials(t.agent),
    avatar: AV[t.av],
    label: t.status === 'Review' ? 'Approval Required' : t.status,
  })})

  return (
    <div className="ag-rise">
      <div className="ag-page-head">
        <div>
          <h1 className="ag-h1">Overview</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
            Monitor and control autonomous agent payment activity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ag-btn" onClick={() => onNavigate('approvals')}>Review approvals</button>
          <button className="ag-btn ag-btn-primary" onClick={onAddAgent}>+ Add Agent</button>
        </div>
      </div>

      <div className="ag-grid-4" style={{ marginBottom: 16 }}>
        {stats.map((s) => (
          <div key={s.label} className="ag-card ag-stat">
            <div className="ag-stat-label">{s.label}</div>
            <div className="ag-stat-row">
              <span className="ag-stat-value" style={{ color: s.valueColor }}>{s.value}</span>
              <span style={{ fontSize: 12, color: s.metaColor || '#6B7280', fontWeight: s.metaWeight }}>{s.meta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ag-split" style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="ag-card ag-card-pad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 className="ag-h2" style={{ marginBottom: 3 }}>Spending Overview</h2>
              <span className="ag-note">Agent spend, last 7 days</span>
            </div>
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 2 }}>
              {RANGES.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  style={{
                    border: 0, cursor: 'pointer', font: '500 12px Inter, sans-serif',
                    padding: '5px 11px', borderRadius: 6,
                    background: range === key ? '#fff' : 'transparent',
                    color: range === key ? '#111827' : '#6B7280',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 620 190" width="100%" height="190" preserveAspectRatio="none">
              <defs>
                <linearGradient id="agfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 60, 100, 140].map((y) => (
                <line key={y} x1="0" y1={y} x2="620" y2={y} stroke="#F3F4F6" strokeWidth="1" />
              ))}
              <line x1="0" y1="176" x2="620" y2="176" stroke="#E5E7EB" strokeWidth="1" />
              <path d={chart.area} fill="url(#agfill)" />
              <path d={chart.line} fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={chart.lastX} cy={chart.lastY} r="4.5" fill="#fff" stroke="#4F46E5" strokeWidth="2.4" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {chart.labels.map((lbl, i) => (
                <span key={i} style={{ fontSize: 11.5, color: '#9CA3AF' }}>{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="ag-card ag-card-pad">
          <h2 className="ag-h2" style={{ marginBottom: 3 }}>Risk Distribution</h2>
          <span className="ag-note">{data?.total || 0} evaluated transactions</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18 }}>
            <svg width="118" height="118" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="5" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#16A34A" strokeWidth="5" strokeDasharray="72 28" strokeDashoffset="25" strokeLinecap="butt" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#D97706" strokeWidth="5" strokeDasharray="21 79" strokeDashoffset="-47" strokeLinecap="butt" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#DC2626" strokeWidth="5" strokeDasharray="7 93" strokeDashoffset="-68" strokeLinecap="butt" />
              <text x="21" y="20.4" textAnchor="middle" fontSize="6.2" fontWeight="600" fill="#111827" fontFamily="Inter">72%</text>
              <text x="21" y="25.4" textAnchor="middle" fontSize="3.1" fill="#6B7280" fontFamily="Inter">low risk</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {[['Low Risk', '72%', '#16A34A'], ['Medium Risk', '21%', '#D97706'], ['High Risk', '7%', '#DC2626']].map(
                ([label, pct, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 13, color: '#4B5563', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pct}</span>
                  </div>
                ),
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 18, paddingTop: 14, borderTop: '1px solid #F3F4F6',
              display: 'flex', justifyContent: 'space-between',
            }}
          >
            <span className="ag-note">Autonomy rate</span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>93.2% settled without humans</span>
          </div>
        </div>
      </div>

      <div className="ag-table">
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #F3F4F6', minWidth: 900,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h2 className="ag-h2">Live Agent Activity</h2>
            <span className="ag-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
          </div>
          <button className="ag-btn-link" onClick={() => onNavigate('transactions')}>View all transactions →</button>
        </div>

        {activity.map((row) => (
          <div
            key={row.id}
            className="ag-row"
            onClick={() => onOpenTx(row.id)}
            style={{
              minWidth: 900, display: 'grid',
              gridTemplateColumns: '1.6fr 1.4fr 1fr 110px 150px 90px', gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="ag-avatar"
                style={{ width: 30, height: 30, borderRadius: 8, background: row.avatar.bg, color: row.avatar.fg, fontSize: 11 }}
              >
                {row.initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{row.agent}</span>
                <span className="ag-mono" style={{ fontSize: 11.5, color: '#9CA3AF' }}>{row.id}</span>
              </div>
            </div>
            <span style={{ fontSize: 13, color: '#4B5563' }}>{row.merchant}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.amount}</span>
            <span className="ag-badge" style={{ justifySelf: 'start', background: RISK[row.risk].bg, color: RISK[row.risk].fg }}>
              Risk: {row.risk}
            </span>
            <span
              className="ag-badge"
              style={{ justifySelf: 'start', background: STAT[row.status].bg, color: STAT[row.status].fg }}
            >
              <span className="ag-dot" style={{ background: STAT[row.status].fg }} />
              {row.label}
            </span>
            <span style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'right' }}>{row.ago}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
