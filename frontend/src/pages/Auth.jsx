import { useState } from 'react'
import { Logo, Check, CheckBold } from '../components/Icons'

const PROMISES = [
  'Policy checks run in under 400 ms, before authorisation',
  'Human approval only when a rule genuinely needs a person',
  'Immutable audit trail for every agent decision',
]

function Brand() {
  return (
    <div className="ag-auth-brand">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo />
        <span style={{ fontSize: 15, fontWeight: 600 }}>AgentGuard</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420 }}>
        <h1 style={{ margin: '0 0 14px', fontSize: 34, lineHeight: 1.2, fontWeight: 600, letterSpacing: '-0.025em' }}>
          Secure payments for autonomous AI agents
        </h1>
        <p style={{ margin: '0 0 34px', fontSize: 15, lineHeight: 1.6, color: '#B9C2DE' }}>
          Govern, monitor and protect every transaction your agents make — before the money moves.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PROMISES.map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <span style={{ marginTop: 2, flex: 'none', display: 'flex' }}>
                <Check size={17} stroke="#7C8DC4" />
              </span>
              <span style={{ fontSize: 13.5, color: '#D7DEF2' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingTop: 22, borderTop: '1px solid rgba(255,255,255,.12)',
        }}
      >
        <span
          className="ag-avatar"
          style={{ width: 24, height: 24, borderRadius: 6, background: '#fff', color: '#0C2451', fontSize: 11 }}
        >
          R
        </span>
        <span style={{ fontSize: 12.5, color: '#B9C2DE' }}>Payments settled through Razorpay</span>
      </div>
    </div>
  )
}

function Login({ onSubmit, onRegister }) {
  const [email, setEmail] = useState(import.meta.env.DEV ? 'demo@agentguard.app' : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? 'AgentGuard123!' : '')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  const submit = async () => {
    setSigningIn(true)
    try {
      await onSubmit(email, password)
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="ag-rise">
      <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Sign in</h2>
      <p style={{ margin: '0 0 26px', fontSize: 13.5, color: '#6B7280' }}>
        Use your work account to access the AgentGuard console.
      </p>

      <label className="ag-label">Work email</label>
      <input className="ag-input" style={{ marginBottom: 14 }} value={email} onChange={(e) => setEmail(e.target.value)} />

      <label className="ag-label">Password</label>
      <input className="ag-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 20px' }}>
        <span
          onClick={() => setKeepSignedIn((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4B5563', cursor: 'pointer' }}
        >
          <span
            className="ag-avatar"
            style={{
              width: 16, height: 16, borderRadius: 4,
              border: '1.5px solid #4F46E5',
              background: keepSignedIn ? '#4F46E5' : '#fff',
            }}
          >
            {keepSignedIn && <CheckBold />}
          </span>
          Keep me signed in
        </span>
        <a href="#" style={{ fontSize: 13 }} onClick={(e) => e.preventDefault()}>Forgot password?</a>
      </div>

      <button className="ag-btn ag-btn-primary" style={{ width: '100%', height: 44, fontSize: 14 }} onClick={submit}>
        {signingIn ? 'Signing in…' : 'Sign in'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <span style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>or</span>
        <span style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
      </div>

      <button className="ag-btn" style={{ width: '100%', height: 44, fontSize: 13.5 }} onClick={onRegister}>
        Create an AgentGuard account
      </button>

      {import.meta.env.DEV && <p style={{ margin: '22px 0 0', fontSize: 12.5, color: '#9CA3AF', textAlign: 'center' }}>Demo credentials are prefilled after running the seed script.</p>}
    </div>
  )
}

function Register({ onSubmit, onBack }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', workspace_name: '' })
  const [busy, setBusy] = useState(false)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async () => {
    setBusy(true)
    try { await onSubmit(form) } finally { setBusy(false) }
  }
  return (
    <div className="ag-rise">
      <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Create your account</h2>
      <p style={{ margin: '0 0 24px', fontSize: 13.5, color: '#6B7280' }}>Your first workspace will be created automatically.</p>
      <label className="ag-label">Full name</label>
      <input className="ag-input" style={{ marginBottom: 13 }} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Alex Morgan" />
      <label className="ag-label">Work email</label>
      <input className="ag-input" type="email" style={{ marginBottom: 13 }} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="alex@company.com" />
      <label className="ag-label">Password</label>
      <input className="ag-input" type="password" style={{ marginBottom: 13 }} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" />
      <label className="ag-label">Workspace name</label>
      <input className="ag-input" value={form.workspace_name} onChange={(e) => update('workspace_name', e.target.value)} placeholder="Acme Operations" />
      <button disabled={busy} className="ag-btn ag-btn-primary" style={{ width: '100%', height: 44, fontSize: 14, marginTop: 20 }} onClick={submit}>{busy ? 'Creating account…' : 'Create account'}</button>
      <button className="ag-btn" style={{ width: '100%', height: 44, fontSize: 13.5, marginTop: 10 }} onClick={onBack}>Back to sign in</button>
    </div>
  )
}

function Verify({ onSubmit, onBack }) {
  return (
    <div className="ag-rise">
      <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Two-factor verification</h2>
      <p style={{ margin: '0 0 26px', fontSize: 13.5, color: '#6B7280' }}>
        Enter the 6-digit code from your authenticator app.
      </p>
      <div style={{ display: 'flex', gap: 9, marginBottom: 20 }}>
        {['4', '8', '2', '9', '1', '6'].map((value, i) => (
          <span
            key={i}
            className="ag-avatar"
            style={{
              flex: 1, height: 52, border: '1px solid #E5E7EB', borderRadius: 8,
              fontSize: 19, background: '#fff',
            }}
          >
            {value}
          </span>
        ))}
      </div>
      <button className="ag-btn ag-btn-primary" style={{ width: '100%', height: 44, fontSize: 14 }} onClick={onSubmit}>
        Verify and continue
      </button>
      <button
        onClick={onBack}
        style={{
          width: '100%', height: 40, marginTop: 10, border: 0, background: 'transparent',
          color: '#6B7280', font: '500 13px Inter, sans-serif', cursor: 'pointer',
        }}
      >
        Back to sign in
      </button>
    </div>
  )
}

function WorkspacePicker({ onEnter, onBack, workspaces }) {
  return (
    <div className="ag-rise">
      <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Choose a workspace</h2>
      <p style={{ margin: '0 0 22px', fontSize: 13.5, color: '#6B7280' }}>
        Choose an authorized AgentGuard workspace.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {workspaces.map((w) => (
          <button key={w.name} className="ag-ws-btn" onClick={() => onEnter(w)}>
            <span
              className="ag-avatar"
              style={{ width: 34, height: 34, borderRadius: 8, background: w.bg, color: w.fg, fontSize: 12 }}
            >
              {w.initials}
            </span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{w.name}</span>
              <span style={{ fontSize: 12.5, color: '#6B7280' }}>{w.meta}</span>
            </span>
            <span className="ag-badge" style={{ background: w.envBg, color: w.envFg }}>{w.env}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        style={{
          width: '100%', height: 40, marginTop: 14, border: 0, background: 'transparent',
          color: '#6B7280', font: '500 13px Inter, sans-serif', cursor: 'pointer',
        }}
      >
        Sign in with a different account
      </button>
    </div>
  )
}

export default function Auth({ screen, onScreen, onEnterWorkspace, onLogin, onRegister, workspaces = [] }) {
  return (
    <div className="ag-auth-shell" style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>
      <Brand />
      <div className="ag-auth-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {screen === 'login' && <Login onSubmit={onLogin} onRegister={() => onScreen('register')} />}
          {screen === 'register' && <Register onSubmit={onRegister} onBack={() => onScreen('login')} />}
          {screen === 'verify' && <Verify onSubmit={() => onScreen('workspace')} onBack={() => onScreen('login')} />}
          {screen === 'workspace' && <WorkspacePicker workspaces={workspaces} onEnter={onEnterWorkspace} onBack={() => onScreen('login')} />}
        </div>
      </div>
    </div>
  )
}
