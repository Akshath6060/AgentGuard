import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_TITLES } from './data'
import { api, hasStoredSession, openRazorpayCheckout, setSession } from './api/client'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Toast from './components/Toast'
import PolicyModal from './components/PolicyModal'
import AddAgentModal from './components/AddAgentModal'

import Auth from './pages/Auth'
import Overview from './pages/Overview'
import Agents from './pages/Agents'
import AgentProfile from './pages/AgentProfile'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Approvals from './pages/Approvals'
import Policies from './pages/Policies'
import RiskCenter from './pages/RiskCenter'
import AuditLogs from './pages/AuditLogs'
import Developers from './pages/Developers'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import { Logo } from './components/Icons'
import { useSeo } from './hooks/useSeo'

const presentWorkspace = (workspace) => ({
  ...workspace,
  initials: workspace.name.slice(0, 2).toUpperCase(),
  meta: `${workspace.environment} workspace`,
  env: workspace.environment === 'live' ? 'Live' : 'Test',
  bg: '#EEF2FF', fg: '#4F46E5', envBg: '#F3F4F6', envFg: '#6B7280',
})

export default function App() {
  const notFound = !['/', '/index.html'].includes(window.location.pathname)
  const [booting, setBooting] = useState(hasStoredSession)
  const [screen, setScreen] = useState('login')
  const [page, setPage] = useState('overview')
  const [workspace, setWorkspace] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [txId, setTxId] = useState('AGTX-40290')
  const [approvals, setApprovals] = useState([])
  const [agents, setAgents] = useState([])
  const [transactions, setTransactions] = useState([])
  const [policies, setPolicies] = useState([])
  const [auditEvents, setAuditEvents] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [agentId, setAgentId] = useState(null)

  useSeo(notFound ? 'notfound' : screen, page, booting && !notFound)

  const [policyOpen, setPolicyOpen] = useState(false)
  const [agentModalOpen, setAgentModalOpen] = useState(false)

  const [toast, setToast] = useState({ message: '', color: '#16A34A' })
  const toastTimer = useRef(null)

  const say = useCallback((message, color = '#16A34A') => {
    clearTimeout(toastTimer.current)
    setToast({ message, color })
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, message: '' })), 2600)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (notFound || !hasStoredSession()) return
    Promise.all([api.me(), api.workspaces(), api.workspace()])
      .then(([currentUser, available, currentWorkspace]) => {
        const items = available.items.map(presentWorkspace)
        const selected = items.find((item) => item.workspace_id === currentWorkspace.workspace_id)
        if (!selected) throw new Error('The selected workspace is no longer available')
        setUser(currentUser); setWorkspaces(items); setWorkspace(selected); setScreen('app')
      })
      .catch(() => { setSession('', ''); setScreen('login') })
      .finally(() => setBooting(false))
  }, [notFound])

  useEffect(() => {
    if (!navOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => { if (event.key === 'Escape') setNavOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [navOpen])

  const openTx = (id) => {
    setTxId(id)
    setPage('detail')
  }

  const refresh = useCallback(async () => {
    try {
      const [a, t, p, ap, d, ev] = await Promise.all([api.agents(), api.transactions(), api.policies(), api.approvals(), api.dashboard(), api.audit()])
      setAgents(a.items); setTransactions(t.items); setPolicies(p.items); setApprovals(ap.items); setDashboard(d); setAuditEvents(ev.items)
    } catch (e) { say(e.message, '#DC2626') }
  }, [say])

  const login = async (email, password) => {
    try {
      const result = await api.login(email, password)
      setSession(result.access_token)
      setUser(result.user)
      setWorkspaces(result.workspaces.map(presentWorkspace))
      setScreen('workspace')
    } catch (e) { say(e.message, '#DC2626'); throw e }
  }

  const register = async (body) => {
    try {
      const result = await api.register(body)
      setSession(result.access_token)
      setUser(result.user)
      setWorkspaces(result.workspaces.map(presentWorkspace))
      setScreen('workspace')
      say('Account and workspace created')
    } catch (error) { say(error.message, '#DC2626'); throw error }
  }

  const enterWorkspace = (w) => {
    setSession(undefined, w.workspace_id)
    setWorkspace(w)
    setScreen('app')
    setPage('overview')
    setMenuOpen(false)
    say('Signed in to ' + w.name)
  }

  useEffect(() => { if (screen === 'app' && workspace) refresh() }, [screen, workspace, refresh])

  if (notFound) return <NotFound />

  if (booting) {
    return <main className="ag-fatal" aria-busy="true"><Logo size={48} /><h1>Loading AgentGuard</h1><p>Restoring your secure workspace…</p></main>
  }

  if (screen !== 'app') {
    return <><Auth screen={screen} onScreen={setScreen} onEnterWorkspace={enterWorkspace} onLogin={login} onRegister={register} workspaces={workspaces} /><Toast message={toast.message} color={toast.color} /></>
  }

  const openAddAgent = () => setAgentModalOpen(true)

  const resolveApproval = async (_index, approval, approved) => {
    try {
      const result = await api.decide(approval.approval_id, approved ? 'approve' : 'reject', approval.version)
      if (approved && result.payment?.checkout) {
        try {
          await openRazorpayCheckout(result.payment, result.transaction_id, user)
          say('Payment completed and verified')
        } catch (error) {
          say(`Approval recorded, but ${error.message}`, '#D97706')
        }
      } else {
        say(approved ? (result.payment?.status === 'failed' ? 'Approved, but payment initiation failed' : 'Payment approved') : 'Payment rejected', approved && result.payment?.status !== 'failed' ? '#16A34A' : '#DC2626')
      }
      await refresh()
    }
    catch (e) { await refresh(); say(e.message, '#DC2626') }
  }

  const pages = {
    overview: <Overview data={dashboard} transactions={transactions} agents={agents} onRange={async (range) => setDashboard(await api.dashboard(range))} onNavigate={setPage} onOpenTx={openTx} onAddAgent={openAddAgent} />,
    agents: <Agents agents={agents} onOpenAgent={(id) => { setAgentId(id); setPage('agentProfile') }} onAddAgent={openAddAgent} />,
    agentProfile: <AgentProfile agentId={agentId} onBack={() => setPage('agents')} onToast={say} onChanged={refresh} />,
    transactions: <Transactions transactions={transactions} agents={agents} onSearch={async (params) => setTransactions((await api.transactions(params)).items)} onOpenTx={openTx} />,
    detail: <TransactionDetail txId={txId} onBack={() => setPage('transactions')} onToast={say} onChanged={refresh} checkoutCustomer={user} />,
    approvals: (
      <Approvals
        approvals={approvals}
        onApprove={(i, a) => resolveApproval(i, a, true)}
        onReject={(i, a) => resolveApproval(i, a, false)}
        onView={openTx}
      />
    ),
    policies: <Policies policies={policies} onCreate={() => setPolicyOpen(true)} />,
    risk: <RiskCenter data={dashboard} />,
    audit: <AuditLogs events={auditEvents} />,
    developers: <Developers onToast={say} />,
    settings: <Settings workspace={workspace} onToast={say} />,
    admin: <Admin workspace={workspace} workspaces={workspaces} currentUser={user} onToast={say} onSwitchWorkspace={enterWorkspace} onWorkspaceCreated={(created) => { const next = presentWorkspace(created); setWorkspaces((items) => items.concat(next)); enterWorkspace(next) }} />,
  }

  return (
    <div className="ag-shell">
      <Sidebar page={page} onNavigate={setPage} workspace={workspace} pendingCount={approvals.length} open={navOpen} onClose={() => setNavOpen(false)} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar
          title={PAGE_TITLES[page] || 'AgentGuard'}
          user={{ ...user, role: workspace.role }}
          navOpen={navOpen}
          onOpenNav={() => setNavOpen(true)}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
          onCloseMenu={() => setMenuOpen(false)}
          onNavigate={(p) => {
            setPage(p)
            setMenuOpen(false)
          }}
          onSearch={async (query) => { try { setTransactions((await api.transactions({ q: query })).items); setPage('transactions') } catch (e) { say(e.message, '#DC2626') } }}
          onNotifications={() => setPage('approvals')}
          onSwitchWorkspace={() => {
            setScreen('workspace')
            setMenuOpen(false)
          }}
          onSignOut={() => {
            setSession('', '')
            setScreen('login')
            setMenuOpen(false)
            setPage('overview')
          }}
        />

        <main className="ag-main">{pages[page]}</main>
      </div>

      {policyOpen && (
        <PolicyModal
          onClose={() => setPolicyOpen(false)}
          onGenerate={api.generatePolicy}
          onSave={async (draft) => {
            try { const created = await api.createPolicy(draft); await api.publishPolicy(created.policy_id); setPolicyOpen(false); await refresh(); say('Policy saved and enforcing') } catch (e) { say(e.message, '#DC2626') }
          }}
        />
      )}

      {agentModalOpen && (
        <AddAgentModal
          onClose={() => setAgentModalOpen(false)}
          onCreate={async (body) => {
            try { const { policy_rules, ...agent } = body; const policy = await api.createPolicy({ name: `${agent.name} Policy`, rules: policy_rules }); await api.publishPolicy(policy.policy_id); await api.createAgent({ ...agent, policy_id: policy.policy_id }); setAgentModalOpen(false); await refresh(); say('Agent and policy created successfully') } catch (e) { say(e.message, '#DC2626') }
          }}
        />
      )}

      <Toast message={toast.message} color={toast.color} />
    </div>
  )
}
