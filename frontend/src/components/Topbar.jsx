import { useEffect, useRef, useState } from 'react'
import { Search, Bell, Menu } from './Icons'

export default function Topbar({ title, user, menuOpen, navOpen, onOpenNav, onToggleMenu, onCloseMenu, onNavigate, onSearch, onNotifications, onSwitchWorkspace, onSignOut }) {
  const ref = useRef(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCloseMenu()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen, onCloseMenu])

  return (
    <header className="ag-topbar">
      <button className="ag-btn-icon ag-mobile-nav-button" onClick={onOpenNav} aria-label="Open navigation" aria-controls="agentguard-navigation" aria-expanded={navOpen}>
        <Menu />
      </button>
      <span className="ag-topbar-title" style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</span>

      <div className="ag-search ag-topbar-search" style={{ marginLeft: 12, background: '#F7F8FA', height: 36, width: 300 }}>
        <Search />
        <input aria-label="Search agents, transactions and merchants" placeholder="Search agents, transactions, merchants" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) onSearch(query.trim()) }} />
      </div>

      <div style={{ flex: 1 }} />

      <div className="ag-live">
        <span className="ag-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
        Live monitoring
      </div>

      <button className="ag-btn-icon" onClick={onNotifications} aria-label="Open pending approvals">
        <Bell />
        <span
          style={{ position: 'absolute', top: 7, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }}
        />
      </button>

      <div style={{ position: 'relative' }} ref={ref}>
        <div
          onClick={onToggleMenu}
          className="ag-avatar"
          style={{
            width: 34, height: 34, borderRadius: 999, background: '#4F46E5',
            color: '#fff', fontSize: 12.5, cursor: 'pointer',
          }}
        >
          {(user?.name || 'AG').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        {menuOpen && (
          <div className="ag-menu ag-rise-fast">
            <div style={{ padding: '10px 10px 12px', borderBottom: '1px solid #F3F4F6', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || 'AgentGuard User'}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{user?.email} · {user?.role || 'Member'}</div>
            </div>
            <button className="ag-menu-item" onClick={() => onNavigate('settings')}>Workspace settings</button>
            <button className="ag-menu-item" onClick={onSwitchWorkspace}>Switch workspace</button>
            <button className="ag-menu-item is-danger" onClick={onSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  )
}
