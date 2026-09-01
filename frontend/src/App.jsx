import { useCallback, useEffect, useRef, useState } from 'react'
import { APPROVALS, PAGE_TITLES, WORKSPACES } from './data'

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
  const [workspace, setWorkspace] = useState(WORKSPACES[0])
  const [menuOpen, setMenuOpen] = useState(false)
  const [txId, setTxId] = useState('AGTX-40290')
  const [approvals, setApprovals] = useState(APPROVALS)

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

  const enterWorkspace = (w) => {
    setWorkspace(w)
    setScreen('app')
    setPage('overview')
    setMenuOpen(false)
    say('Signed in to ' + w.name)
  }

  if (screen !== 'app') {
    return <Auth screen={screen} onScreen={setScreen} onEnterWorkspace={enterWorkspace} />
  }

  const openAddAgent = () => setAgentModalOpen(true)

  const resolveApproval = (index, approval, approved) => {
    setApprovals((list) => list.filter((_, j) => j !== index))
    if (approved) say('Payment approved · ' + approval.amount + ' to ' + approval.merchant)
    else say('Payment rejected', '#DC2626')
  }

  const pages = {
    overview: <Overview onNavigate={setPage} onOpenTx={openTx} onAddAgent={openAddAgent} />,
    agents: <Agents onOpenAgent={() => setPage('agentProfile')} onAddAgent={openAddAgent} />,
    agentProfile: <AgentProfile onBack={() => setPage('agents')} onToast={say} />,
    transactions: <Transactions onOpenTx={openTx} />,
    detail: <TransactionDetail txId={txId} onBack={() => setPage('transactions')} onToast={say} />,
    approvals: (
      <Approvals
        approvals={approvals}
        onApprove={(i, a) => resolveApproval(i, a, true)}
        onReject={(i, a) => resolveApproval(i, a, false)}
        onView={openTx}
      />
    ),
    policies: <Policies onCreate={() => setPolicyOpen(true)} />,
    risk: <RiskCenter />,
    audit: <AuditLogs />,
    developers: <Developers onToast={say} />,
    settings: <Settings workspace={workspace} />,
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
          onSave={() => {
            setPolicyOpen(false)
            say('Policy saved and enforcing')
          }}
        />
      )}

      {agentModalOpen && (
        <AddAgentModal
          onClose={() => setAgentModalOpen(false)}
          onCreate={() => {
            setAgentModalOpen(false)
            say('Agent created successfully')
          }}
        />
      )}

      <Toast message={toast.message} color={toast.color} />
    </div>
  )
}
