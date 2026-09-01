const FILTERS = ['Agent: All ▾', 'Transaction: All ▾', 'Action type ▾', '01 Sep 2026 ▾']

export default function AuditLogs({ events = [] }) {
  return (
    <div className="ag-rise" style={{ maxWidth: 1000 }}>
      <h1 className="ag-h1">Audit Logs</h1>
      <p className="ag-sub">Complete history of autonomous payment decisions.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f} className="ag-btn-filter">{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="ag-btn-filter" style={{ fontWeight: 500 }}>Export CSV</button>
      </div>

      <div className="ag-card" style={{ padding: '22px 24px' }}>
        {events.map((event, i) => { const time = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); const title = event.action; const meta = `${event.object?.type || ''} · ${event.object?.id || ''}`; const color = event.action.includes('blocked') || event.action.includes('rejected') ? '#DC2626' : event.action.includes('approved') || event.action.includes('succeeded') ? '#16A34A' : '#4F46E5'; return (
          <div
            key={i}
            style={{ display: 'grid', gridTemplateColumns: '92px 20px 1fr', gap: 14, alignItems: 'start' }}
          >
            <span className="ag-mono" style={{ fontSize: 12.5, color: '#9CA3AF', paddingTop: 1 }}>{time}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, marginTop: 4, flex: 'none' }} />
              <span style={{ width: 1, flex: 1, background: '#E5E7EB', minHeight: 24 }} />
            </div>
            <div style={{ paddingBottom: 18 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>{meta}</div>
            </div>
          </div>
        )})}
      </div>
    </div>
  )
}
