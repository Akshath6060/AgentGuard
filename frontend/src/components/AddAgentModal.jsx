import { useState } from 'react'
import { CATS, SECRULES, TYPES, STEPS, IND } from '../data'
import { CheckBold } from './Icons'

export default function AddAgentModal({ onClose, onCreate }) {
  const [step, setStep] = useState(0)
  const [type, setType] = useState('Travel')
  const [cats, setCats] = useState(['Flights', 'Hotels', 'Transportation'])
  const [rules, setRules] = useState([0, 1, 2, 3])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [limits, setLimits] = useState({ per_transaction: '15000', daily: '30000', monthly: '50000' })

  const toggleCat = (label) =>
    setCats((c) => (c.includes(label) ? c.filter((x) => x !== label) : c.concat(label)))
  const toggleRule = (i) =>
    setRules((r) => (r.includes(i) ? r.filter((x) => x !== i) : r.concat(i)))

  const next = () => {
    if (step === 4) {
      const categoryMap = { Flights: 'airline', Hotels: 'hotel', Transportation: 'transport', 'Food & Dining': 'food', Software: 'software', Advertising: 'advertising', Electronics: 'electronics', Cryptocurrency: 'cryptocurrency' }
      onCreate({ name, description, type: type.toLowerCase(), policy_rules: { limits: Object.fromEntries(Object.entries(limits).map(([key, value]) => [key, Math.round(Number(value.replaceAll(',', '')) * 100)])), categories: { allowed: cats.map((c) => categoryMap[c] || c.toLowerCase()), blocked: rules.includes(3) ? ['cryptocurrency'] : [] }, merchant_rules: { unknown: rules.includes(0) ? 'review' : 'allow' }, international: { allowed: !rules.includes(2) }, repeated_failures: { threshold: 3, action: rules.includes(4) ? 'block' : 'review' } } })
    }
    else setStep(step + 1)
  }

  const reviewRows = [
    { label: 'Agent name', value: name },
    { label: 'Type', value: type },
    { label: 'Allowed categories', value: cats.length + ' selected' },
    { label: 'Single transaction limit', value: `₹${Number(limits.per_transaction).toLocaleString('en-IN')}` },
    { label: 'Daily limit', value: `₹${Number(limits.daily).toLocaleString('en-IN')}` },
    { label: 'Monthly limit', value: `₹${Number(limits.monthly).toLocaleString('en-IN')}` },
    { label: 'Security rules', value: rules.length + ' of 5 enabled' },
  ]

  return (
    <div className="ag-overlay" onClick={onClose}>
      <div className="ag-modal ag-rise-modal" style={{ width: 660 }} onClick={(e) => e.stopPropagation()}>
        <div className="ag-modal-head">
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Add Agent</h2>
          <button className="ag-btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="ag-modal-steps" style={{ display: 'flex', gap: 6, padding: '16px 22px', borderBottom: '1px solid #F3F4F6' }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ height: 3, borderRadius: 2, background: i <= step ? IND : '#E5E7EB', display: 'block' }} />
              <span style={{ fontSize: 11.5, fontWeight: 500, color: i <= step ? '#111827' : '#9CA3AF' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 22px', minHeight: 230 }}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="ag-label">Agent name</label>
                <input className="ag-input ag-input-sm" placeholder="e.g. TravelAgent" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="ag-label">Description</label>
                <input className="ag-input ag-input-sm" placeholder="What does this agent do?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="ag-label" style={{ marginBottom: 8 }}>Agent type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TYPES.map((label) => {
                    const on = type === label
                    return (
                      <button
                        key={label}
                        onClick={() => setType(label)}
                        style={{
                          height: 34, padding: '0 14px',
                          border: '1px solid ' + (on ? IND : '#E5E7EB'),
                          background: on ? '#EEF2FF' : '#fff',
                          color: on ? IND : '#4B5563',
                          borderRadius: 8, font: '500 12.5px Inter, sans-serif', cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              <label className="ag-label" style={{ marginBottom: 10 }}>Select allowed spending categories.</label>
              <div className="ag-choice-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {CATS.map((label) => {
                  const on = cats.includes(label)
                  return (
                    <button
                      key={label}
                      onClick={() => toggleCat(label)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                        border: '1px solid ' + (on ? '#C7D2FE' : '#E5E7EB'),
                        background: on ? '#F5F6FF' : '#fff',
                        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        font: '400 13.5px Inter, sans-serif', color: '#111827',
                      }}
                    >
                      <span
                        className="ag-avatar"
                        style={{
                          width: 17, height: 17, borderRadius: 5,
                          border: '1.5px solid ' + (on ? IND : '#D1D5DB'),
                          background: on ? IND : '#fff',
                        }}
                      >
                        {on && <CheckBold />}
                      </span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Single transaction limit', 'per_transaction'],
                ['Daily limit', 'daily'],
                ['Monthly limit', 'monthly'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="ag-label">{label}</label>
                  <input className="ag-input ag-input-sm" inputMode="numeric" value={limits[key]} onChange={(e) => setLimits({ ...limits, [key]: e.target.value.replace(/[^0-9]/g, '') })} />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {SECRULES.map((label, i) => {
                const on = rules.includes(i)
                return (
                  <button key={label} className="ag-rule-btn" onClick={() => toggleRule(i)}>
                    <span style={{ flex: 1 }}>{label}</span>
                    <span
                      className="ag-toggle"
                      style={{ width: 34, height: 19, background: on ? IND : '#E5E7EB' }}
                    >
                      <span
                        className="ag-toggle-knob"
                        style={{ top: 2, left: on ? 17 : 2, width: 15, height: 15 }}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 4 && (
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 11, overflow: 'hidden' }}>
              {reviewRows.map((r) => (
                <div
                  key={r.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ag-modal-foot">
          <button
            className="ag-btn ag-btn-tall"
            style={{ color: '#4B5563' }}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            Back
          </button>
          <button className="ag-btn ag-btn-primary ag-btn-tall" style={{ padding: '0 18px' }} onClick={next}>
            {step === 4 ? 'Create Agent' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
