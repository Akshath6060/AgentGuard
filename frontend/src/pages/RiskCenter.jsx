const label = (code = '') => code.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase())

export default function RiskCenter({ data }) {
  const total = data?.total || 0
  const dist = data?.risk_distribution || {}
  const approvedPct = total ? Math.round((data.approved || 0) * 100 / total) : 0
  const reviewPct = total ? Math.round((data.review || 0) * 100 / total) : 0
  const blockedPct = Math.max(0, 100 - approvedPct - reviewPct)
  const healthy = Math.max(0, 100 - Math.round(((dist.high || 0) * 60 + (dist.medium || 0) * 25) / Math.max(total, 1)))
  const reasons = data?.reason_distribution || []
  const maxReason = Math.max(1, ...reasons.map((r) => r.count))
  const trend = (data?.risk_trend || []).slice(-14)
  return (
    <div className="ag-rise">
      <h1 className="ag-h1">Risk Center</h1>
      <p className="ag-sub">Security posture calculated from workspace authorization data.</p>
      <div className="ag-split-risk" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 16 }}>
        <div className="ag-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="104" height="104" viewBox="0 0 42 42" style={{ flex: 'none' }}><circle cx="21" cy="21" r="16.5" fill="none" stroke="#EEF0F3" strokeWidth="4" /><circle cx="21" cy="21" r="16.5" fill="none" stroke={healthy >= 70 ? '#16A34A' : '#D97706'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${healthy * 1.036} 103.6`} transform="rotate(-90 21 21)" /><text x="21" y="21.6" textAnchor="middle" fontSize="9" fontWeight="600">{healthy}</text><text x="21" y="26.6" textAnchor="middle" fontSize="3.2" fill="#6B7280">/ 100</text></svg>
          <div><div className="ag-eyebrow" style={{ marginBottom: 6 }}>SECURITY SCORE</div><div style={{ fontSize: 15, fontWeight: 600, color: healthy >= 70 ? '#16A34A' : '#D97706', marginBottom: 6 }}>{healthy >= 70 ? 'Healthy' : 'Needs attention'}</div><p style={{ margin: 0, fontSize: 12.5, color: '#6B7280', lineHeight: 1.5 }}>Derived from {total} deterministic authorization decisions.</p></div>
        </div>
        <div className="ag-grid-4">
          {[['High Risk', dist.high || 0, '#DC2626'], ['Medium Risk', dist.medium || 0, '#D97706'], ['Low Risk', dist.low || 0, '#16A34A'], ['Pending Approval', data?.approval_pending || 0, '#4F46E5']].map(([name, value, color]) => <div key={name} className="ag-card ag-stat"><div className="ag-stat-label">{name}</div><span style={{ fontSize: 26, fontWeight: 600, color }}>{value}</span></div>)}
        </div>
      </div>
      <div className="ag-split" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="ag-card ag-card-pad"><h2 className="ag-h2" style={{ marginBottom: 16 }}>Risk Trend</h2><div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>{trend.map((day) => { const sum = Math.max(1, day.low + day.medium + day.high); return <div key={day.date} title={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, height: '100%' }}><span style={{ background: '#DC2626', height: `${day.high * 100 / sum}%` }} /><span style={{ background: '#D97706', height: `${day.medium * 100 / sum}%` }} /><span style={{ background: '#DCE7DA', height: `${day.low * 100 / sum}%` }} /></div>})}</div><div className="ag-note" style={{ marginTop: 12 }}>Daily low, medium and high-risk decisions from MongoDB.</div></div>
        <div className="ag-col">
          <div className="ag-card ag-card-pad"><h2 className="ag-h2" style={{ marginBottom: 16 }}>Approved vs Review vs Blocked</h2><div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}><span style={{ width: `${approvedPct}%`, background: '#16A34A' }} /><span style={{ width: `${reviewPct}%`, background: '#D97706' }} /><span style={{ width: `${blockedPct}%`, background: '#DC2626' }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6B7280' }}><span>{data?.approved || 0} approved</span><span>{data?.review || 0} review</span><span>{data?.blocked || 0} blocked</span></div></div>
          <div className="ag-card ag-card-pad"><h2 className="ag-h2" style={{ marginBottom: 12 }}>Top Decision Reasons</h2>{reasons.map((reason) => <div key={reason.code} style={{ padding: '9px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: '#4B5563' }}>{label(reason.code)}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{reason.count}</span></div><span className="ag-track" style={{ height: 5 }}><span className="ag-track-fill" style={{ width: `${reason.count * 100 / maxReason}%`, background: '#4F46E5' }} /></span></div>)}</div>
        </div>
      </div>
    </div>
  )
}
