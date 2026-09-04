import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { initials } from '../data'

const ROLES = ['admin', 'approver', 'developer', 'viewer']

export default function Admin({ workspace, workspaces, currentUser, onWorkspaceCreated, onSwitchWorkspace, onToast }) {
  const [members, setMembers] = useState([])
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', environment: 'test' })
  const [memberForm, setMemberForm] = useState({ email: '', role: 'viewer' })
  const [busy, setBusy] = useState('')

  const loadMembers = () => api.members().then((result) => setMembers(result.items)).catch((error) => onToast(error.message, '#DC2626'))
  useEffect(() => { loadMembers() }, [workspace.workspace_id])

  const createWorkspace = async () => {
    setBusy('workspace')
    try {
      const created = await api.createWorkspace(workspaceForm)
      setWorkspaceForm({ name: '', environment: 'test' })
      onWorkspaceCreated(created)
    } catch (error) { onToast(error.message, '#DC2626') } finally { setBusy('') }
  }

  const addMember = async () => {
    setBusy('member')
    try {
      await api.addMember(memberForm)
      setMemberForm({ email: '', role: 'viewer' })
      await loadMembers()
      onToast('Workspace member added')
    } catch (error) { onToast(error.message, '#DC2626') } finally { setBusy('') }
  }

  const changeRole = async (userId, role) => {
    setBusy(userId)
    try { await api.updateMember(userId, role); await loadMembers(); onToast('Member role updated') }
    catch (error) { onToast(error.message, '#DC2626') } finally { setBusy('') }
  }

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.name || member.email} from this workspace?`)) return
    setBusy(member.user_id)
    try { await api.removeMember(member.user_id); await loadMembers(); onToast('Workspace member removed', '#DC2626') }
    catch (error) { onToast(error.message, '#DC2626') } finally { setBusy('') }
  }

  return (
    <div className="ag-rise" style={{ maxWidth: 1040 }}>
      <h1 className="ag-h1">Workspace Admin</h1>
      <p className="ag-sub">Create isolated workspaces and manage access to {workspace.name}.</p>

      <div className="ag-grid-2 ag-admin-grid" style={{ marginBottom: 16 }}>
        <div className="ag-card ag-card-pad">
          <h2 className="ag-h2" style={{ marginBottom: 4 }}>Your workspaces</h2>
          <p className="ag-note" style={{ margin: '0 0 14px' }}>Each workspace has separate agents, policies, transactions and members.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workspaces.map((item) => (
              <button key={item.workspace_id} className="ag-ws-btn" disabled={item.workspace_id === workspace.workspace_id} onClick={() => onSwitchWorkspace(item)}>
                <span className="ag-avatar" style={{ width: 34, height: 34, borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', fontSize: 12 }}>{initials(item.name)}</span>
                <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{item.name}</span><span className="ag-note">{item.environment} · {item.role}</span></span>
                <span className="ag-badge" style={{ background: item.workspace_id === workspace.workspace_id ? '#DCFCE7' : '#F3F4F6', color: item.workspace_id === workspace.workspace_id ? '#15803D' : '#6B7280' }}>{item.workspace_id === workspace.workspace_id ? 'Current' : 'Switch'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ag-card ag-card-pad">
          <h2 className="ag-h2" style={{ marginBottom: 4 }}>Create workspace</h2>
          <p className="ag-note" style={{ margin: '0 0 14px' }}>You become the first admin of every workspace you create.</p>
          <label className="ag-label">Workspace name</label>
          <input className="ag-input ag-input-sm" value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })} placeholder="Acme Sandbox" />
          <label className="ag-label" style={{ marginTop: 12 }}>Environment</label>
          <select className="ag-input ag-input-sm" value={workspaceForm.environment} onChange={(e) => setWorkspaceForm({ ...workspaceForm, environment: e.target.value })}><option value="test">Test</option><option value="live">Live</option></select>
          <button disabled={busy === 'workspace' || workspaceForm.name.trim().length < 2} className="ag-btn ag-btn-primary" style={{ marginTop: 14 }} onClick={createWorkspace}>{busy === 'workspace' ? 'Creating…' : 'Create and switch'}</button>
        </div>
      </div>

      <div className="ag-card ag-card-pad">
        <div className="ag-admin-member-head" style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1 }}><h2 className="ag-h2" style={{ marginBottom: 4 }}>Members</h2><span className="ag-note">Users register first, then an admin grants them access here.</span></div>
          <input className="ag-input ag-input-sm" style={{ width: 250 }} type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="member@company.com" />
          <select className="ag-btn-filter" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select>
          <button disabled={busy === 'member' || !memberForm.email} className="ag-btn ag-btn-primary" onClick={addMember}>{busy === 'member' ? 'Adding…' : 'Add member'}</button>
        </div>

        <div className="ag-member-list">
          {members.map((member) => (
            <div key={member.user_id} className="ag-member-row">
              <span className="ag-avatar" style={{ width: 34, height: 34, borderRadius: 9, background: '#EEF2FF', color: '#4F46E5', fontSize: 12 }}>{initials(member.name || member.email || 'U')}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{member.name || 'Registered user'}</div><div className="ag-note" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div></div>
              <select disabled={busy === member.user_id} className="ag-btn-filter" value={member.role} onChange={(e) => changeRole(member.user_id, e.target.value)}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select>
              <button disabled={busy === member.user_id || member.user_id === currentUser.user_id} className="ag-btn ag-btn-danger ag-btn-sm" onClick={() => removeMember(member)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
