import { useState } from 'react'
import { GENERATED_RULES } from '../data'

export default function PolicyModal({ onClose, onSave }) {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = () => {
    setGenerating(true)
    setGenerated(false)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 900)
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
          <label className="ag-label" style={{ marginBottom: 7 }}>
            Describe how this agent should be allowed to spend.
          </label>
          <textarea
            className="ag-textarea"
            rows={4}
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
                {GENERATED_RULES.map((r) => (
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
                <button className="ag-btn ag-btn-primary ag-btn-tall" onClick={onSave}>Save Policy</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
