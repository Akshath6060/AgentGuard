const REQUEST = `const decision = await agentguard.authorize({
  agent_id: "travel_agent",
  amount:   8450,
  currency: "INR",
  merchant: "IndiGo",
  purpose:  "Flight booking"
});`

const RESPONSE = `{
  "decision":       "APPROVED",
  "risk_score":     12,
  "transaction_id": "AGTX-40291"
}`

const preBase = {
  borderRadius: 9,
  padding: '16px 18px',
  font: "400 12.5px/1.7 'JetBrains Mono', monospace",
  overflow: 'auto',
}

export default function Developers({ onToast }) {
  return (
    <div className="ag-rise" style={{ maxWidth: 900 }}>
      <h1 className="ag-h1">Developers</h1>
      <p className="ag-sub">Integrate AgentGuard into your AI agents.</p>

      <div className="ag-card ag-card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 className="ag-h2">API Keys</h2>
          <button className="ag-btn ag-btn-sm" onClick={() => onToast('New test key generated')}>Generate Key</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3 }}>Test API Key</div>
            <span className="ag-mono" style={{ fontSize: 12.5, color: '#6B7280' }}>ag_test_7f3ba91c4de20a</span>
          </div>
          <button className="ag-btn ag-btn-xs" onClick={() => onToast('API key copied to clipboard')}>Copy</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3 }}>Production Key</div>
            <span className="ag-mono" style={{ fontSize: 12.5, color: '#6B7280' }}>ag_live_••••••••••••••</span>
          </div>
          <button className="ag-btn ag-btn-xs" onClick={() => onToast('API key copied to clipboard')}>Reveal</button>
          <button className="ag-btn ag-btn-xs ag-btn-danger" onClick={() => onToast('Production key revoked', '#DC2626')}>
            Revoke
          </button>
        </div>
      </div>

      <div className="ag-card ag-card-pad">
        <h2 className="ag-h2" style={{ marginBottom: 4 }}>Integration Example</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#6B7280' }}>
          Authorize a payment before your agent executes it.
        </p>
        <pre style={{ ...preBase, margin: '0 0 14px', background: '#0F1729', color: '#E2E8F0' }}>{REQUEST}</pre>
        <span className="ag-eyebrow">RESPONSE</span>
        <pre
          style={{ ...preBase, margin: '8px 0 0', background: '#FAFAFB', border: '1px solid #E5E7EB', color: '#111827' }}
        >
          {RESPONSE}
        </pre>
      </div>
    </div>
  )
}
