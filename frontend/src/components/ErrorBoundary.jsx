import { Component } from 'react'
import { Logo } from './Icons'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('AgentGuard UI error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="ag-fatal" role="alert">
        <Logo size={44} />
        <h1>AgentGuard could not load this view</h1>
        <p>Your session and workspace data are safe. Reload the application to try again.</p>
        <button className="ag-btn ag-btn-primary" onClick={() => window.location.reload()}>Reload AgentGuard</button>
      </main>
    )
  }
}
