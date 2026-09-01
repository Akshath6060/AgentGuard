import { RISK_STATS, RISK_BARS, RISK_CATS } from '../data'

export default function RiskCenter() {
  return (
    <div className="ag-rise">
      <h1 className="ag-h1">Risk Center</h1>
      <p className="ag-sub">Security posture across every agent in the workspace.</p>

      <div className="ag-split-risk" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 16 }}>
        <div className="ag-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="104" height="104" viewBox="0 0 42 42" style={{ flex: 'none' }}>
            <circle cx="21" cy="21" r="16.5" fill="none" stroke="#EEF0F3" strokeWidth="4" />
            <circle
              cx="21" cy="21" r="16.5" fill="none" stroke="#16A34A" strokeWidth="4" strokeLinecap="round"
              strokeDasharray="78.8 103.6" transform="rotate(-90 21 21)"
            />
            <text x="21" y="21.6" textAnchor="middle" fontSize="9" fontWeight="600" fill="#111827" fontFamily="Inter">76</text>
            <text x="21" y="26.6" textAnchor="middle" fontSize="3.2" fill="#6B7280" fontFamily="Inter">/ 100</text>
          </svg>
          <div>
            <div className="ag-eyebrow" style={{ marginBottom: 6 }}>SECURITY SCORE</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#16A34A', marginBottom: 6 }}>Healthy</div>
            <p style={{ margin: 0, fontSize: 12.5, color: '#6B7280', lineHeight: 1.5 }}>
              Two agents run without a monthly cap. Tighten to reach 85+.
            </p>
          </div>
        </div>

        <div className="ag-grid-4">
          {RISK_STATS.map((s) => (
            <div
              key={s.label}
              className="ag-card ag-stat"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <div className="ag-stat-label">{s.label}</div>
              <div className="ag-stat-row">
                <span style={{ fontSize: 26, fontWeight: 600 }}>{s.value}</span>
                <span style={{ fontSize: 12, color: s.deltaColor }}>{s.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ag-split" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="ag-card ag-card-pad">
          <h2 className="ag-h2" style={{ marginBottom: 16 }}>Risk Trend · last 14 days</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
            {RISK_BARS.map((b, i) => (
              <div
                key={i}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 3, height: '100%' }}
              >
                <span style={{ display: 'block', background: '#DC2626', borderRadius: '2px 2px 0 0', height: b.high }} />
                <span style={{ display: 'block', background: '#D97706', height: b.med }} />
                <span style={{ display: 'block', background: '#DCE7DA', borderRadius: '0 0 2px 2px', height: b.low }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            {[['Low', '#DCE7DA'], ['Medium', '#D97706'], ['High', '#DC2626']].map(([label, color]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6B7280' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="ag-col">
          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2" style={{ marginBottom: 16 }}>Approved vs Blocked</h2>
            <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <span style={{ width: '88%', background: '#16A34A', display: 'block' }} />
              <span style={{ width: '5%', background: '#D97706', display: 'block' }} />
              <span style={{ width: '7%', background: '#DC2626', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6B7280' }}>
              <span>218 approved</span>
              <span>13 review</span>
              <span>17 blocked</span>
            </div>
          </div>

          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2" style={{ marginBottom: 12 }}>Risk Categories</h2>
            {RISK_CATS.map((c) => (
              <div key={c.label} style={{ padding: '9px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#4B5563' }}>{c.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.value}</span>
                </div>
                <span className="ag-track" style={{ height: 5 }}>
                  <span className="ag-track-fill" style={{ width: c.value, background: '#4F46E5' }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
