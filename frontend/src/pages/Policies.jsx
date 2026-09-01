import { POLICIES, STAT } from '../data'
import { Shield } from '../components/Icons'

export default function Policies({ onCreate }) {
  return (
    <div className="ag-rise">
      <div className="ag-page-head">
        <div>
          <h1 className="ag-h1">Policies</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
            Define how autonomous agents are allowed to spend.
          </p>
        </div>
        <button className="ag-btn ag-btn-primary" onClick={onCreate}>Create Policy</button>
      </div>

      <div className="ag-grid-2">
        {POLICIES.map((p) => (
          <div key={p.name} className="ag-card ag-card-pad ag-policy-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ag-avatar" style={{ width: 30, height: 30, borderRadius: 8, background: '#EEF2FF' }}>
                  <Shield size={15} stroke="#4F46E5" width={1.9} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
              </div>
              <span className="ag-badge" style={{ background: STAT[p.status].bg, color: STAT[p.status].fg }}>
                {p.status}
              </span>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6B7280' }}>{p.desc}</p>

            <div
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                paddingTop: 14, borderTop: '1px solid #F3F4F6',
              }}
            >
              {[['Agents', p.agents], ['Txn limit', p.txnLimit], ['Monthly', p.monthly], ['Approval', p.approval]].map(
                ([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 3 }}>{label}</div>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{value}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
