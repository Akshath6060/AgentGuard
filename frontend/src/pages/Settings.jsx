import { useState } from 'react'
import { Razorpay } from '../components/Icons'
import { api } from '../api/client'

export default function Settings({ workspace, onToast = () => {} }) {
  const [name, setName] = useState(workspace.name)
  const [currency, setCurrency] = useState(workspace.default_currency || 'INR')
  return (
    <div className="ag-rise" style={{ maxWidth: 760 }}>
      <h1 className="ag-h1">Settings</h1>
      <p className="ag-sub">Workspace, payment provider and notification preferences.</p>

      <div className="ag-card ag-card-pad" style={{ marginBottom: 16 }}>
        <h2 className="ag-h2" style={{ marginBottom: 14 }}>Workspace</h2>
        <div className="ag-grid-2">
          <div>
            <label className="ag-label">Workspace name</label>
            <input className="ag-input ag-input-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="ag-label">Default currency</label>
            <input className="ag-input ag-input-sm" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>
        <button className="ag-btn ag-btn-primary" style={{ marginTop: 14 }} onClick={async () => { try { await api.updateWorkspace({ name, default_currency: currency }); onToast('Workspace settings saved') } catch (e) { onToast(e.message, '#DC2626') } }}>Save settings</button>
      </div>

      <div className="ag-card ag-card-pad">
        <h2 className="ag-h2" style={{ marginBottom: 4 }}>Payment provider</h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#6B7280' }}>
          Approved agent payments settle through this provider.
        </p>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid #E5E7EB', borderRadius: 9, padding: '14px 16px',
          }}
        >
          <Razorpay size={32} radius={7} font={14} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Razorpay</div>
            <span className="ag-note">Connected · acc_NxRa8821kq</span>
          </div>
          <span className="ag-badge" style={{ background: '#DCFCE7', color: '#15803D' }}>Live</span>
        </div>
      </div>
    </div>
  )
}
