import { Logo } from '../components/Icons'

export default function NotFound() {
  return (
    <main className="ag-not-found">
      <div className="ag-not-found-card">
        <Logo size={50} />
        <span className="ag-not-found-code">404</span>
        <h1>Page not found</h1>
        <p>The page may have moved, or the address may be incorrect. Your AgentGuard workspace and payment data are unaffected.</p>
        <div className="ag-not-found-actions">
          <a className="ag-btn ag-btn-primary" href="/">Return to AgentGuard</a>
          <button className="ag-btn" onClick={() => window.history.back()}>Go back</button>
        </div>
      </div>
    </main>
  )
}
