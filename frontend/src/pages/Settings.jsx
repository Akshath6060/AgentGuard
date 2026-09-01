import { Razorpay } from '../components/Icons'

export default function Settings({ workspace }) {
  return (
    <div className="ag-rise" style={{ maxWidth: 760 }}>
      <h1 className="ag-h1">Settings</h1>
      <p className="ag-sub">Workspace, payment provider and notification preferences.</p>

      <div className="ag-card ag-card-pad" style={{ marginBottom: 16 }}>
        <h2 className="ag-h2" style={{ marginBottom: 14 }}>Workspace</h2>
        <div className="ag-grid-2">
          <div>
            <label className="ag-label">Workspace name</label>
            <input className="ag-input ag-input-sm" defaultValue={workspace.name} key={workspace.name} />
          </div>
          <div>
            <label className="ag-label">Default currency</label>
            <input className="ag-input ag-input-sm" defaultValue="INR — Indian Rupee" />
          </div>
        </div>
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
