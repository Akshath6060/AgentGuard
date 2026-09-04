import { useMemo, useState } from 'react'
import { STAT } from '../data'
import { Shield, Search } from '../components/Icons'
import { api } from '../api/client'

const money = (v) => v == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v / 100)
export default function Policies({ policies = [], onCreate, onChanged, onToast }) {
  const [query,setQuery]=useState(''); const [category,setCategory]=useState(''); const [selected,setSelected]=useState(null); const [used,setUsed]=useState([]); const [editContent,setEditContent]=useState(''); const [busy,setBusy]=useState(false)
  const visible=useMemo(()=>policies.filter((p)=>(!query||`${p.name} ${p.description} ${p.content}`.toLowerCase().includes(query.toLowerCase()))&&(!category||p.category===category)),[policies,query,category])
  const act=async(fn,message)=>{try{setBusy(true);await fn();await onChanged();onToast(message)}catch(e){onToast(e.message,'#DC2626')}finally{setBusy(false)}}
  return (
    <div className="ag-rise">
      <div className="ag-page-head">
        <div>
          <h1 className="ag-h1">Policy Intelligence</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
            Organizational rules indexed for enforcement and semantic retrieval.
          </p>
        </div>
        <button className="ag-btn ag-btn-primary" onClick={onCreate}>+ Add Policy</button>
      </div>

      <div className="ag-filter-bar" style={{display:'flex',gap:10,marginBottom:16}}><div className="ag-search" style={{flex:1}}><Search/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search policy content"/></div><select className="ag-btn-filter" value={category} onChange={(e)=>setCategory(e.target.value)}><option value="">All categories</option>{['payment','security','agent','vendor','approval','finance','subscription','refund','other'].map(x=><option key={x}>{x}</option>)}</select></div>

      <div className="ag-grid-2">
        {visible.map((raw) => { const p = { ...raw, desc: raw.description || raw.content || raw.source_text || 'Deterministic spending controls.', agents: raw.agent_count || '—', txnLimit: money(raw.rules?.limits?.per_transaction), monthly: money(raw.rules?.limits?.monthly), approval: Object.values(raw.rules?.merchant_rules || {}).includes('review') ? 'Rule based' : 'None', status: raw.status.replace(/^./, x => x.toUpperCase()) }; return (
          <button key={`${p.policy_id}-${p.version}`} className="ag-card ag-card-pad ag-policy-card" style={{textAlign:'left',font:'inherit'}} onClick={async()=>{const detail=await api.policy(p.policy_id);setSelected(detail.policy);setUsed(detail.transactions_used||[]);setEditContent(detail.policy.content||detail.policy.source_text||'')}}>
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

            <div className="ag-policy-metrics"
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                paddingTop: 14, borderTop: '1px solid #F3F4F6',
              }}
            >
              {[['Category', p.category || 'other'], ['Txn limit', p.txnLimit], ['Chunks', p.chunks || 0], ['Index', p.embedding_status || 'pending']].map(
                ([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11.5, color: '#9CA3AF', marginBottom: 3 }}>{label}</div>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{value}</span>
                  </div>
                ),
              )}
            </div>
          </button>
        )})}
      </div>
      {selected&&<div className="ag-overlay" onClick={()=>setSelected(null)}><div className="ag-modal" style={{width:720}} onClick={e=>e.stopPropagation()}><div className="ag-modal-head"><div><h2 style={{margin:0}}>{selected.name}</h2><span className="ag-note">{selected.category||'other'} · {selected.embedding_status||'pending'} · {selected.chunks||0} chunks</span></div><button className="ag-btn-close" onClick={()=>setSelected(null)}>✕</button></div><div style={{padding:22}}><label className="ag-label">Policy content</label><textarea className="ag-textarea" rows={8} value={editContent} onChange={e=>setEditContent(e.target.value)}/><div className="ag-note" style={{marginTop:8}}>Last indexed: {selected.last_indexed_at?new Date(selected.last_indexed_at).toLocaleString():'Not indexed'}</div><h3 style={{fontSize:13.5,marginTop:20}}>Transactions where this policy was used</h3>{used.length?used.map(tx=><div key={tx.transaction_id} className="ag-divider-row" style={{display:'flex',justifyContent:'space-between',fontSize:12.5}}><span className="ag-mono">{tx.transaction_id}</span><span>{tx.decision} · {tx.risk?.score||0}/100</span></div>):<p className="ag-note">No recorded transaction evidence yet.</p>}</div><div className="ag-modal-foot"><button className="ag-btn ag-btn-danger" disabled={busy} onClick={async()=>{await act(()=>api.deletePolicy(selected.policy_id),'Policy deleted');setSelected(null)}}>Delete</button><div style={{display:'flex',gap:8}}><button className="ag-btn" disabled={busy} onClick={()=>act(()=>api.updatePolicy(selected.policy_id,{status:selected.status==='disabled'?'active':'disabled'}),'Policy status updated')}>{selected.status==='disabled'?'Enable':'Disable'}</button><button className="ag-btn" disabled={busy||editContent===(selected.content||selected.source_text||'')} onClick={()=>act(()=>api.updatePolicy(selected.policy_id,{content:editContent}),'Policy saved and indexed')}>Save changes</button><button className="ag-btn ag-btn-primary" disabled={busy} onClick={()=>act(()=>api.indexPolicy(selected.policy_id),'Policy indexed')}>Re-index</button></div></div></div></div>}
    </div>
  )
}
