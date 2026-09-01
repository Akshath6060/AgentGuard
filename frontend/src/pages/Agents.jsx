import { AGENTS, RISK, STAT, AV, initials } from '../data'

const COLS = '1.5fr 1.5fr 100px 1fr 1fr 100px 120px'
const HEADS = ['AGENT', 'PURPOSE', 'STATUS', 'TODAY SPEND', 'MONTHLY SPEND', 'RISK', 'LAST ACTIVITY']

const barColor = (risk) => (risk === 'High' ? '#DC2626' : risk === 'Medium' ? '#D97706' : '#4F46E5')

export default function Agents({ onOpenAgent, onAddAgent }) {
  return (
    <div className="ag-rise">
      <div className="ag-page-head">
        <div>
          <h1 className="ag-h1">AI Agents</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
            Manage agents, permissions and spending controls.
          </p>
        </div>
        <button className="ag-btn ag-btn-primary" onClick={onAddAgent}>+ Add Agent</button>
      </div>

      <div className="ag-table">
        <div className="ag-thead" style={{ minWidth: 980, display: 'grid', gridTemplateColumns: COLS, gap: 12 }}>
          {HEADS.map((h, i) => (
            <span key={h} style={i === HEADS.length - 1 ? { textAlign: 'right' } : undefined}>{h}</span>
          ))}
        </div>

        {AGENTS.map((a) => (
          <div
            key={a.id}
            className="ag-row"
            onClick={onOpenAgent}
            style={{ minWidth: 980, display: 'grid', gridTemplateColumns: COLS, gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="ag-avatar"
                style={{ width: 30, height: 30, borderRadius: 8, background: AV[a.av].bg, color: AV[a.av].fg, fontSize: 11 }}
              >
                {initials(a.name)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{a.name}</span>
                <span className="ag-mono" style={{ fontSize: 11, color: '#9CA3AF' }}>{a.id}</span>
              </div>
            </div>
            <span style={{ fontSize: 13, color: '#4B5563' }}>{a.purpose}</span>
            <span className="ag-badge" style={{ justifySelf: 'start', background: STAT[a.status].bg, color: STAT[a.status].fg }}>
              {a.status}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{a.today}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{a.monthly}</span>
              <span className="ag-track">
                <span className="ag-track-fill" style={{ width: a.pct, background: barColor(a.risk) }} />
              </span>
            </div>
            <span className="ag-badge" style={{ justifySelf: 'start', background: RISK[a.risk].bg, color: RISK[a.risk].fg }}>
              {a.risk}
            </span>
            <span style={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'right' }}>{a.last}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
