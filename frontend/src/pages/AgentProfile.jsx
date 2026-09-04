import { useEffect, useState } from 'react'
import { Check, Cross } from '../components/Icons'
import { api } from '../api/client'

const TABS = ['Overview', 'Transactions', 'Permissions', 'Policies', 'Logs']
export default function AgentProfile({ agentId, onBack, onToast, onChanged }) {
  const [tab, setTab] = useState('Overview')
  const [agent, setAgent] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '' })
  const [newSecret, setNewSecret] = useState('')
  useEffect(() => { if (agentId) api.agent(agentId).then((value) => { setAgent(value); setDraft({ name: value.name, description: value.description || '' }) }).catch((e) => onToast(e.message, '#DC2626')) }, [agentId, onToast])
  if (!agent) return <div className="ag-card ag-card-pad">Loading agent…</div>
  const allowed = agent.policy?.rules?.categories?.allowed || []
  const restricted = agent.policy?.rules?.categories?.blocked || []
  const limits = agent.policy?.rules?.limits || {}
  const format = (v) => v == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v / 100)
  const controls = [
    { label: 'Maximum single transaction', value: format(limits.per_transaction), color: '#111827' },
    { label: 'Daily spending limit', value: format(limits.daily), color: '#111827' },
    { label: 'Monthly spending limit', value: format(limits.monthly), color: '#111827' },
    { label: 'International payments', value: agent.policy?.rules?.international?.allowed ? 'Enabled' : 'Disabled', color: agent.policy?.rules?.international?.allowed ? '#16A34A' : '#DC2626' },
  ]
  const summary = [['Monthly Limit', format(limits.monthly)], ['Spent', format(agent.spend?.monthly)], ['Remaining', format(agent.spend?.remaining), '#16A34A'], ['Transaction Limit', format(limits.per_transaction)]]
  const recent = (agent.recent_transactions || []).slice(0, 5).map((tx) => ({ text: `${format(tx.amount?.minor)} → ${tx.merchant?.name} ${tx.decision}`, time: new Date(tx.created_at).toLocaleString(), color: tx.decision === 'approved' ? '#16A34A' : tx.decision === 'blocked' ? '#DC2626' : '#D97706' }))

  return (
    <div className="ag-rise">
      <button className="ag-btn-back" onClick={onBack}>← Agents</button>

      <div className="ag-profile-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div
            className="ag-avatar"
            style={{ width: 48, height: 48, borderRadius: 12, background: '#EEF2FF', color: '#4F46E5', fontSize: 15 }}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {editing ? <input className="ag-input ag-input-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /> : <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{agent.name}</h1>}
              <span className="ag-badge" style={{ background: agent.status === 'active' ? '#DCFCE7' : '#F3F4F6', color: agent.status === 'active' ? '#15803D' : '#6B7280' }}>{agent.status}</span>
            </div>
            {editing ? <input className="ag-input ag-input-sm" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /> : <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6B7280' }}>{agent.description}</p>}
            <span className="ag-mono" style={{ fontSize: 12, color: '#9CA3AF' }}>{agent.agent_id}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ag-btn" onClick={async () => { try { const updated = await api.agentState(agent.agent_id, agent.status === 'active' ? 'pause' : 'resume'); setAgent({ ...agent, status: updated.status }); await onChanged(); onToast(`Agent ${updated.status}`) } catch (e) { onToast(e.message, '#DC2626') } }}>{agent.status === 'active' ? 'Pause Agent' : 'Resume Agent'}</button>
          <button className="ag-btn" onClick={async () => { if (!editing) return setEditing(true); try { const updated = await api.updateAgent(agent.agent_id, draft); setAgent({ ...agent, ...updated }); setEditing(false); await onChanged(); onToast('Agent updated') } catch (e) { onToast(e.message, '#DC2626') } }}>{editing ? 'Save Agent' : 'Edit Agent'}</button>
          <button className="ag-btn ag-btn-primary" onClick={async () => { try { const credential = await api.rotateAgentCredential(agent.agent_id); setNewSecret(credential.secret); onToast('Credential rotated — copy it now') } catch (e) { onToast(e.message, '#DC2626') } }}>Rotate Credential</button>
        </div>
      </div>

      {newSecret && <div className="ag-card ag-card-pad" style={{ marginBottom: 16, background: '#FEF3C7' }}><strong>New agent credential — shown once</strong><div className="ag-mono" style={{ marginTop: 8, wordBreak: 'break-all' }}>{newSecret}</div><button className="ag-btn ag-btn-xs" style={{ marginTop: 10 }} onClick={async () => { await navigator.clipboard.writeText(newSecret); onToast('Credential copied') }}>Copy credential</button></div>}

      <div className="ag-grid-4" style={{ marginBottom: 16 }}>
        {summary.map(([label, value, color]) => (
          <div key={label} className="ag-card ag-stat">
            <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 7 }}>{label}</div>
            <span style={{ fontSize: 22, fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="ag-card ag-card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>Monthly spending</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{format(agent.spend?.monthly)} of {format(limits.monthly)} · {agent.spend?.percent || 0}%</span>
        </div>
        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${agent.spend?.percent || 0}%`, background: '#4F46E5', borderRadius: 5 }} />
        </div>
      </div>

      <div className="ag-tabs">
        {TABS.map((t) => (
          <button key={t} className={'ag-tab' + (tab === t ? ' is-active' : '')} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <div className="ag-grid-2" style={{ gap: 16 }}>
          <div className="ag-card ag-card-pad">
            <h2 className="ag-h2" style={{ marginBottom: 4 }}>Permissions</h2>
            <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#6B7280' }}>Categories this agent may spend on.</p>

            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#15803D', letterSpacing: '0.04em' }}>ALLOWED</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0 18px' }}>
              {allowed.map((p) => (
                <div
                  key={p}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    border: '1px solid #E5E7EB', borderRadius: 8,
                  }}
                >
                  <Check size={15} stroke="#16A34A" width={2.2} />
                  <span style={{ fontSize: 13.5, flex: 1 }}>{p}</span>
                  <span className="ag-toggle" style={{ width: 32, height: 18, background: '#16A34A' }}>
                    <span className="ag-toggle-knob" style={{ top: 2, right: 2, width: 14, height: 14 }} />
                  </span>
                </div>
              ))}
            </div>

            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#B91C1C', letterSpacing: '0.04em' }}>RESTRICTED</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {restricted.map((p) => (
                <div
                  key={p}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    border: '1px solid #E5E7EB', borderRadius: 8, background: '#FAFAFB',
                  }}
                >
                  <Cross size={15} />
                  <span style={{ fontSize: 13.5, flex: 1, color: '#6B7280' }}>{p}</span>
                  <span className="ag-toggle" style={{ width: 32, height: 18, background: '#E5E7EB' }}>
                    <span className="ag-toggle-knob" style={{ top: 2, left: 2, width: 14, height: 14 }} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ag-col">
            <div className="ag-card ag-card-pad">
              <h2 className="ag-h2" style={{ marginBottom: 4 }}>Spending Controls</h2>
              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#6B7280' }}>
                Hard limits enforced before every payment.
              </p>
              {controls.map((c) => (
                <div
                  key={c.label}
                  className="ag-divider-row"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: 13.5, color: '#4B5563' }}>{c.label}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: c.color }}>{c.value}</span>
                </div>
              ))}
            </div>

            <div className="ag-card ag-card-pad">
              <h2 className="ag-h2" style={{ marginBottom: 14 }}>Recent decisions</h2>
              {recent.map((r) => (
                <div
                  key={r.text}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderTop: '1px solid #F3F4F6',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, flex: 'none' }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{r.text}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : tab === 'Transactions' ? <div className="ag-card ag-card-pad">{recent.map((r) => <div key={r.text+r.time} className="ag-divider-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{r.text}</span><span className="ag-note">{r.time}</span></div>)}</div>
        : tab === 'Policies' ? <div className="ag-card ag-card-pad"><h2 className="ag-h2">{agent.policy?.name || 'No policy assigned'}</h2><p className="ag-note">{agent.policy ? `Version ${agent.policy.version} · ${agent.policy.status}` : 'Assign an active policy to enforce authorizations.'}</p></div>
          : tab === 'Permissions' ? <div className="ag-card ag-card-pad"><h2 className="ag-h2">Effective permissions</h2><p className="ag-note">Allowed: {allowed.join(', ') || 'None'}</p><p className="ag-note">Blocked: {restricted.join(', ') || 'None'}</p></div>
            : <div className="ag-card ag-card-pad"><p className="ag-note">Agent activity is available in the workspace Audit Logs, filtered by agent ID {agent.agent_id}.</p></div>}
    </div>
  )
}
