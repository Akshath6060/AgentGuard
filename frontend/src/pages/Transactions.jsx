import { useState } from 'react'
import { TX, RISK, STAT } from '../data'
import { Search } from '../components/Icons'

const COLS = '140px 1.2fr 1.4fr 110px 100px 130px 70px'
const TABS = ['All', 'Approved', 'Blocked', 'Pending Review']
const FILTERS = ['Today ▾', 'Risk: All ▾', 'Agent: All ▾', 'Status: All ▾']

const matches = (t, tab) =>
  tab === 'All' || (tab === 'Pending Review' ? t.status === 'Review' : t.status === tab)

export default function Transactions({ onOpenTx }) {
  const [tab, setTab] = useState('All')
  const visible = TX.filter((t) => matches(t, tab))

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
              {TX.filter((t) => matches(t, label)).length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="ag-search" style={{ flex: 1, minWidth: 240 }}>
          <Search />
          <input placeholder="Search transaction ID, merchant or agent" />
        </div>
        {FILTERS.map((f) => (
          <button key={f} className="ag-btn-filter">{f}</button>
        ))}
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
