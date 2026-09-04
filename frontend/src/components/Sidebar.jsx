import { Logo, Grid, Robot, Card, Shield, CircleCheck, ShieldAlert, Doc, Code, Gear, Users, ChevronDown } from './Icons'

const MONITOR = [
  { id: 'overview', label: 'Overview', Icon: Grid },
  { id: 'agents', label: 'Agents', Icon: Robot, alias: ['agentProfile'] },
  { id: 'transactions', label: 'Transactions', Icon: Card, alias: ['detail'] },
]

const CONTROL = [
  { id: 'policies', label: 'Policy Intelligence', Icon: Shield },
  { id: 'approvals', label: 'Approvals', Icon: CircleCheck, count: 3 },
  { id: 'risk', label: 'Risk Center', Icon: ShieldAlert },
  { id: 'audit', label: 'Audit Logs', Icon: Doc },
]

const FOOTER = [
  { id: 'admin', label: 'Workspace Admin', Icon: Users, adminOnly: true },
  { id: 'developers', label: 'Developers', Icon: Code },
  { id: 'settings', label: 'Settings', Icon: Gear },
]

function NavButton({ item, page, onNavigate, pendingCount }) {
  const active = page === item.id || (item.alias || []).includes(page)
  const count = item.id === 'approvals' ? pendingCount : item.count
  return (
    <button
      className={'ag-nav-btn' + (active ? ' is-active' : '')}
      onClick={() => onNavigate(item.id)}
    >
      <item.Icon />
      {item.label}
      {count > 0 && <span className="ag-nav-count">{count}</span>}
    </button>
  )
}

export default function Sidebar({ page, onNavigate, workspace, pendingCount, open = false, onClose }) {
  const navigate = (destination) => {
    onNavigate(destination)
    onClose?.()
  }
  return (
    <>
    <button className={'ag-sidebar-backdrop' + (open ? ' is-open' : '')} onClick={onClose} aria-label="Close navigation" />
    <aside id="agentguard-navigation" className={'ag-sidebar' + (open ? ' is-open' : '')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px 18px' }}>
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>AgentGuard</span>
          <span style={{ fontSize: 10.5, color: '#9CA3AF', letterSpacing: '0.02em' }}>AI PAYMENT GOVERNANCE</span>
        </div>
      </div>

      <nav className="ag-nav">
        <span className="ag-nav-group">MONITOR</span>
        {MONITOR.map((item) => (
          <NavButton key={item.id} item={item} page={page} onNavigate={navigate} pendingCount={pendingCount} />
        ))}

        <span className="ag-nav-group" style={{ paddingTop: 14 }}>CONTROL</span>
        {CONTROL.map((item) => (
          <NavButton key={item.id} item={item} page={page} onNavigate={navigate} pendingCount={pendingCount} />
        ))}

        <div style={{ flex: 1 }} />

        {FOOTER.filter((item) => !item.adminOnly || workspace.role === 'admin').map((item) => (
          <NavButton key={item.id} item={item} page={page} onNavigate={navigate} pendingCount={pendingCount} />
        ))}
      </nav>

      <div style={{ borderTop: '1px solid #E5E7EB', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          className="ag-avatar"
          style={{ width: 32, height: 32, borderRadius: 8, background: '#1E2A5A', color: '#fff', fontSize: 12 }}
        >
          {workspace.initials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{workspace.name}</span>
          <span
            style={{
              fontSize: 11, color: '#6B7280', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {workspace.email}
          </span>
        </div>
        <ChevronDown style={{ marginLeft: 'auto' }} />
      </div>
    </aside>
    </>
  )
}
