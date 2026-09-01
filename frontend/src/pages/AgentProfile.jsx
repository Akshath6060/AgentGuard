import { useState } from 'react'
import { Check, Cross, DocEmpty } from '../components/Icons'

const TABS = ['Overview', 'Transactions', 'Permissions', 'Policies', 'Logs']
const ALLOWED = ['Flights', 'Hotels', 'Transportation', 'Food']
const RESTRICTED = ['Electronics', 'Cryptocurrency', 'Gift Cards', 'Unknown Categories']

const CONTROLS = [
  { label: 'Maximum single transaction', value: '₹15,000', color: '#111827' },
  { label: 'Daily spending limit', value: '₹30,000', color: '#111827' },
  { label: 'Monthly spending limit', value: '₹50,000', color: '#111827' },
  { label: 'International payments', value: 'Disabled', color: '#DC2626' },
  { label: 'Recurring payments', value: 'Approval Required', color: '#D97706' },
]

const RECENT = [
  { text: '₹8,450 → IndiGo approved', time: '2 sec ago', color: '#16A34A' },
  { text: '₹18,700 → MakeMyTrip sent for approval', time: '2 min ago', color: '#D97706' },
  { text: '₹2,300 → Uber approved', time: '1 hr ago', color: '#16A34A' },
  { text: '₹9,900 → Unknown merchant blocked', time: '4 hrs ago', color: '#DC2626' },
]

const SUMMARY = [
  ['Monthly Limit', '₹50,000'],
  ['Spent', '₹18,700'],
  ['Remaining', '₹31,300', '#16A34A'],
  ['Transaction Limit', '₹15,000'],
]

export default function AgentProfile({ onBack, onToast }) {
  const [tab, setTab] = useState('Overview')

  return (
    <div className="ag-rise">
      <button className="ag-btn-back" onClick={onBack}>← Agents</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div
            className="ag-avatar"
            style={{ width: 48, height: 48, borderRadius: 12, background: '#EEF2FF', color: '#4F46E5', fontSize: 15 }}
          >
            TA
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>TravelAgent-AI</h1>
              <span className="ag-badge" style={{ background: '#DCFCE7', color: '#15803D' }}>Active</span>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6B7280' }}>AI travel booking assistant</p>
            <span className="ag-mono" style={{ fontSize: 12, color: '#9CA3AF' }}>agt_travel_01</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ag-btn" onClick={() => onToast('TravelAgent paused', '#D97706')}>Pause Agent</button>
          <button className="ag-btn ag-btn-primary" onClick={() => onToast('Agent settings opened')}>Edit Agent</button>
        </div>
      </div>

      <div className="ag-grid-4" style={{ marginBottom: 16 }}>
        {SUMMARY.map(([label, value, color]) => (
          <div key={label} className="ag-card ag-stat">
            <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 7 }}>{label}</div>
            <span style={{ fontSize: 22, fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="ag-card ag-card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>Monthly spending</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>₹18,700 of ₹50,000 · 37%</span>
        </div>
        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '37%', background: '#4F46E5', borderRadius: 5 }} />
        </div>
      </div>

      <div className="ag-tabs">
        {TABS.map((t) => (
          <button key={t} className={'ag-tab' + (tab === t ? ' is-active' : '')} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <div className="ag-grid-2" style={{ gap: 16 }}>
          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2" style={{ marginBottom: 4 }}>Permissions</h2>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#6B7280' }}>Categories this agent may spend on.</p>

            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#15803D', letterSpacing: '0.04em' }}>ALLOWED</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0 18px' }}>
              {ALLOWED.map((p) => (
                <div
                  key={p}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    border: '1px solid #E5E7EB', borderRadius: 8,
                  }}
                >
                  <Check size={15} stroke="#16A34A" width={2.2} />
                  <span style={{ fontSize: 13.5, flex: 1 }}>{p}</span>
                  <span className="ag-toggle" style={{ width: 32, height: 18, background: '#16A34A' }}>
                    <span className="ag-toggle-knob" style={{ top: 2, right: 2, width: 14, height: 14 }} />
                  </span>
                </div>
              ))}
            </div>

            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#B91C1C', letterSpacing: '0.04em' }}>RESTRICTED</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {RESTRICTED.map((p) => (
                <div
                  key={p}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    border: '1px solid #E5E7EB', borderRadius: 8, background: '#FAFAFB',
                  }}
                >
                  <Cross size={15} />
                  <span style={{ fontSize: 13.5, flex: 1, color: '#6B7280' }}>{p}</span>
                  <span className="ag-toggle" style={{ width: 32, height: 18, background: '#E5E7EB' }}>
                    <span className="ag-toggle-knob" style={{ top: 2, left: 2, width: 14, height: 14 }} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ag-col">
            <div className="ag-card ag-card-pad">
              <h2 className="ag-h2" style={{ marginBottom: 4 }}>Spending Controls</h2>
              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#6B7280' }}>
                Hard limits enforced before every payment.
              </p>
              {CONTROLS.map((c) => (
                <div
                  key={c.label}
                  className="ag-divider-row"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: 13.5, color: '#4B5563' }}>{c.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: c.color }}>{c.value}</span>
                </div>
              ))}
            </div>

            <div className="ag-card ag-card-pad">
              <h2 className="ag-h2" style={{ marginBottom: 14 }}>Recent decisions</h2>
              {RECENT.map((r) => (
                <div
                  key={r.text}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderTop: '1px solid #F3F4F6',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flex: 'none' }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{r.text}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="ag-card"
          style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <div
            className="ag-avatar"
            style={{ width: 42, height: 42, borderRadius: 10, background: '#F3F4F6' }}
          >
            <DocEmpty />
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{tab} view</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            Not part of this mockup pass — the Overview tab carries the demo content.
          </span>
        </div>
      )}
    </div>
  )
}
