import { useEffect, useState } from 'react'
import { api } from '../api/client'

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
  const [keys, setKeys] = useState([])
  const [newSecret, setNewSecret] = useState('')
  const load = () => api.keys().then((r) => setKeys(r.items)).catch((e) => onToast(e.message, '#DC2626'))
  useEffect(load, [])
  const create = async () => { try { const key = await api.createKey(); setNewSecret(key.secret); await load(); onToast('New test key generated — copy it now') } catch (e) { onToast(e.message, '#DC2626') } }
  const revoke = async (id) => { try { await api.revokeKey(id); await load(); onToast('API key revoked', '#DC2626') } catch (e) { onToast(e.message, '#DC2626') } }
  return (
    <div className="ag-rise" style={{ maxWidth: 900 }}>
      <h1 className="ag-h1">Developers</h1>
      <p className="ag-sub">Integrate AgentGuard into your AI agents.</p>

      <div className="ag-card ag-card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 className="ag-h2">API Keys</h2>
          <button className="ag-btn ag-btn-sm" onClick={create}>Generate Key</button>
        </div>

        {newSecret && <div style={{ padding: 12, background: '#FEF3C7', borderRadius: 8 }}><strong>Copy now — shown once:</strong> <span className="ag-mono">{newSecret}</span></div>}
        {keys.map((key) => <div key={key.key_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3 }}>{key.name}</div>
            <span className="ag-mono" style={{ fontSize: 12.5, color: '#6B7280' }}>{key.prefix}••••••••</span>
          </div>
          {!key.revoked_at && <button className="ag-btn ag-btn-xs ag-btn-danger" onClick={() => revoke(key.key_id)}>
            Revoke
          </button>}
        </div>)}
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
