import { useState } from 'react'
export default function PolicyModal({ onClose, onSave, onGenerate }) {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('payment')
  const [rules, setRules] = useState(null)
  const [error, setError] = useState('')

  const generate = async () => {
    setGenerating(true)
    setGenerated(false)
    setError('')
    try {
      const result = await onGenerate(text)
      setRules(result.rules)
      setGenerated(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="ag-overlay" onClick={onClose}>
      <div className="ag-modal ag-rise-modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="ag-modal-head">
          <div>
            <h2 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 600 }}>Create Policy</h2>
            <span className="ag-note">Describe the rules in plain language — AgentGuard structures them.</span>
          </div>
          <button className="ag-btn-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label className="ag-label">Policy title</label><input className="ag-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Finance Payment Policy" /></div>
            <div><label className="ag-label">Category</label><select className="ag-input" value={category} onChange={(e) => setCategory(e.target.value)}>{['payment','security','agent','vendor','approval','finance','subscription','refund','other'].map((value) => <option key={value}>{value}</option>)}</select></div>
          </div>
          <label className="ag-label" style={{ marginBottom: 7 }}>
            Describe how this agent should be allowed to spend.
          </label>
          <textarea
            className="ag-textarea"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Allow TravelAgent to spend up to ₹15,000 on flights and hotels without approval. Ask for approval above ₹15,000 and block unknown merchants."
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button className="ag-btn ag-btn-primary ag-btn-tall" onClick={generate}>
              {generating ? 'Generating…' : 'Generate Policy'}
            </button>
            <span style={{ fontSize: 12.5, color: '#9CA3AF' }}>
              {generated
                ? 'Rules generated from your description.'
                : 'AgentGuard converts plain language into enforceable rules.'}
            </span>
          </div>
          {error && <p style={{ color: '#DC2626', fontSize: 12.5 }}>{error}</p>}

          {generated && (
            <>
              <div
                className="ag-rise"
                style={{ marginTop: 20, border: '1px solid #E5E7EB', borderRadius: 11, overflow: 'hidden' }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px',
                    background: '#FAFAFB', borderBottom: '1px solid #E5E7EB',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Structured rules</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>7 rules · ready to enforce</span>
                </div>
                {[
                  ['Transaction Limit', rules?.limits?.per_transaction ? `₹${(rules.limits.per_transaction / 100).toLocaleString('en-IN')}` : 'Not set'],
                  ['Daily Limit', rules?.limits?.daily ? `₹${(rules.limits.daily / 100).toLocaleString('en-IN')}` : 'Not set'],
                  ['Allowed Categories', rules?.categories?.allowed?.join(', ') || 'None'],
                  ['Blocked Categories', rules?.categories?.blocked?.join(', ') || 'None'],
                  ['Unknown Merchant', rules?.merchant_rules?.unknown || rules?.merchant_rules?.unknown_international || 'Default review'],
                ].map(([label, value]) => ({ label, value, color: '#111827' })).map((r) => (
                  <div
                    key={r.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 16px', borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 9, marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="ag-btn ag-btn-tall" style={{ color: '#4B5563' }} onClick={onClose}>Edit Rules</button>
                <button disabled={!name.trim()} className="ag-btn ag-btn-primary ag-btn-tall" onClick={() => onSave({ name: name.trim(), category, description: text.slice(0, 300), content: text, rules, source_text: text })}>Save &amp; Index Policy</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
