import { useState } from 'react'
import { RISK, STAT } from '../data'
import { Search } from '../components/Icons'

const COLS = '140px 1.2fr 1.4fr 110px 100px 130px 70px'
const TABS = ['All', 'Approved', 'Blocked', 'Pending Review']
const matches = (t, tab) =>
  tab === 'All' || (tab === 'Pending Review' ? t.status === 'Review' : tab === 'Approved' ? ['Approved', 'Human Approved'].includes(t.status) : t.status === tab)

const displayStatus = (t) => t.decision_state === 'approved_by_human' ? 'Human Approved' : t.decision_state === 'rejected_by_human' ? 'Rejected' : t.decision_state === 'expired' ? 'Expired' : t.decision === 'review' ? 'Review' : (t.decision || '').replace(/^./, x => x.toUpperCase())
const mapTx = (t) => ({ id: t.transaction_id, agent: t.agent_name || t.agent_id, merchant: t.merchant?.name, amount: new Intl.NumberFormat('en-IN', { style: 'currency', currency: t.amount?.currency || 'INR', maximumFractionDigits: 0 }).format((t.amount?.minor || 0) / 100), risk: (t.risk?.band || 'low').replace(/^./, x => x.toUpperCase()), status: displayStatus(t), time: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' })
export default function Transactions({ transactions = [], agents = [], onSearch, onOpenTx }) {
  const [tab, setTab] = useState('All')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ date: '', risk_band: '', agent_id: '', status: '' })
  const apply = (key, value) => { const next = { ...filters, [key]: value }; setFilters(next); const params = { q: query, risk_band: next.risk_band, agent_id: next.agent_id, status: next.status }; if (next.date === 'today') params.from_date = new Date(new Date().setHours(0, 0, 0, 0)).toISOString(); onSearch(params) }
  const rows = transactions.map(mapTx)
  const visible = rows.filter((t) => matches(t, tab))

  return (
    <div className="ag-rise">
      <h1 className="ag-h1">Transactions</h1>
      <p className="ag-sub">Monitor every payment initiated by autonomous agents.</p>

      <div className="ag-tabs" style={{ marginBottom: 14 }}>
        {TABS.map((label) => (
          <button
            key={label}
            className={'ag-tab' + (tab === label ? ' is-active' : '')}
            onClick={() => setTab(label)}
          >
            {label}
            <span style={{ marginLeft: 7, fontSize: 11.5, color: '#9CA3AF' }}>
              {rows.filter((t) => matches(t, label)).length}
            </span>
          </button>
        ))}
      </div>

      <div className="ag-filter-bar" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="ag-search" style={{ flex: 1, minWidth: 240 }}>
          <Search />
          <input placeholder="Search transaction ID, merchant or agent" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSearch({ q: query }) }} />
        </div>
        <select className="ag-btn-filter" value={filters.date} onChange={(e) => apply('date', e.target.value)}><option value="">Any date</option><option value="today">Today</option></select>
        <select className="ag-btn-filter" value={filters.risk_band} onChange={(e) => apply('risk_band', e.target.value)}><option value="">Risk: All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
        <select className="ag-btn-filter" value={filters.agent_id} onChange={(e) => apply('agent_id', e.target.value)}><option value="">Agent: All</option>{agents.map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}</select>
        <select className="ag-btn-filter" value={filters.status} onChange={(e) => apply('status', e.target.value)}><option value="">Status: All</option><option value="approved">Approved</option><option value="review_pending">Review pending</option><option value="approved_by_human">Human approved</option><option value="blocked">Blocked</option><option value="rejected_by_human">Rejected</option></select>
      </div>

      <div className="ag-table">
        <div className="ag-thead" style={{ minWidth: 940, display: 'grid', gridTemplateColumns: COLS, gap: 12 }}>
          <span>TRANSACTION</span>
          <span>AGENT</span>
          <span>MERCHANT</span>
          <span style={{ textAlign: 'right' }}>AMOUNT</span>
          <span>RISK</span>
          <span>STATUS</span>
          <span style={{ textAlign: 'right' }}>TIME</span>
        </div>

        {visible.map((t) => (
          <div
            key={t.id}
            className="ag-row"
            onClick={() => onOpenTx(t.id)}
            style={{ minWidth: 940, display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 20px' }}
          >
            <span className="ag-mono" style={{ fontSize: 12.5, color: '#4F46E5' }}>{t.id}</span>
            <span style={{ fontSize: 13 }}>{t.agent}</span>
            <span style={{ fontSize: 13, color: '#4B5563' }}>{t.merchant}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, textAlign: 'right' }}>{t.amount}</span>
            <span className="ag-badge" style={{ justifySelf: 'start', background: RISK[t.risk].bg, color: RISK[t.risk].fg }}>
              {t.risk}
            </span>
            <span className="ag-badge" style={{ justifySelf: 'start', background: STAT[t.status].bg, color: STAT[t.status].fg }}>
              <span className="ag-dot" style={{ background: STAT[t.status].fg }} />
              {t.status}
            </span>
            <span style={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'right' }}>{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
