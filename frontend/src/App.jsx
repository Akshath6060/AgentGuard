import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_TITLES } from './data'
import { api, setSession } from './api/client'

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

export default function App() {
  const [screen, setScreen] = useState('login')
  const [page, setPage] = useState('overview')
  const [workspace, setWorkspace] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [txId, setTxId] = useState('AGTX-40290')
  const [approvals, setApprovals] = useState([])
  const [agents, setAgents] = useState([])
  const [transactions, setTransactions] = useState([])
  const [policies, setPolicies] = useState([])
  const [auditEvents, setAuditEvents] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [agentId, setAgentId] = useState(null)

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
      setWorkspaces(result.workspaces.map((w) => ({ ...w, initials: w.name.slice(0, 2).toUpperCase(), meta: `${w.environment} workspace`, env: w.environment === 'live' ? 'Live' : 'Test', bg: '#EEF2FF', fg: '#4F46E5', envBg: '#F3F4F6', envFg: '#6B7280' })))
      setScreen('workspace')
    } catch (e) { say(e.message, '#DC2626'); throw e }
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

  if (screen !== 'app') {
    return <><Auth screen={screen} onScreen={setScreen} onEnterWorkspace={enterWorkspace} onLogin={login} workspaces={workspaces} /><Toast message={toast.message} color={toast.color} /></>
  }

  const openAddAgent = () => setAgentModalOpen(true)

  const resolveApproval = async (_index, approval, approved) => {
    try { await api.decide(approval.approval_id, approved ? 'approve' : 'reject', approval.version); await refresh(); say(approved ? 'Payment approved' : 'Payment rejected', approved ? '#16A34A' : '#DC2626') }
    catch (e) { say(e.message, '#DC2626') }
  }

  const pages = {
    overview: <Overview data={dashboard} transactions={transactions} agents={agents} onNavigate={setPage} onOpenTx={openTx} onAddAgent={openAddAgent} />,
    agents: <Agents agents={agents} onOpenAgent={(id) => { setAgentId(id); setPage('agentProfile') }} onAddAgent={openAddAgent} />,
    agentProfile: <AgentProfile agentId={agentId} onBack={() => setPage('agents')} onToast={say} onChanged={refresh} />,
    transactions: <Transactions transactions={transactions} onSearch={async (params) => setTransactions((await api.transactions(params)).items)} onOpenTx={openTx} />,
    detail: <TransactionDetail txId={txId} onBack={() => setPage('transactions')} onToast={say} />,
    approvals: (
      <Approvals
        approvals={approvals}
        onApprove={(i, a) => resolveApproval(i, a, true)}
        onReject={(i, a) => resolveApproval(i, a, false)}
        onView={openTx}
      />
    ),
    policies: <Policies policies={policies} onCreate={() => setPolicyOpen(true)} />,
    risk: <RiskCenter />,
    audit: <AuditLogs events={auditEvents} />,
    developers: <Developers onToast={say} />,
    settings: <Settings workspace={workspace} onToast={say} />,
  }

  return (
    <div className="ag-shell">
      <Sidebar page={page} onNavigate={setPage} workspace={workspace} pendingCount={approvals.length} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar
          title={PAGE_TITLES[page] || 'AgentGuard'}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((v) => !v)}
          onCloseMenu={() => setMenuOpen(false)}
          onNavigate={(p) => {
            setPage(p)
            setMenuOpen(false)
          }}
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
          policies={policies.filter((p) => p.status === 'active')}
          onCreate={async (body) => {
            try { await api.createAgent(body); setAgentModalOpen(false); await refresh(); say('Agent created successfully') } catch (e) { say(e.message, '#DC2626') }
          }}
        />
      )}

      <Toast message={toast.message} color={toast.color} />
    </div>
  )
}
