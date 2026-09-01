const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
let token = localStorage.getItem('ag_token') || ''
let workspaceId = localStorage.getItem('ag_workspace') || ''

export function setSession(nextToken, nextWorkspace) {
  if (nextToken !== undefined) { token = nextToken || ''; token ? localStorage.setItem('ag_token', token) : localStorage.removeItem('ag_token') }
  if (nextWorkspace !== undefined) { workspaceId = nextWorkspace || ''; workspaceId ? localStorage.setItem('ag_workspace', workspaceId) : localStorage.removeItem('ag_workspace') }
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (workspaceId) headers['X-Workspace-ID'] = workspaceId
  const response = await fetch(`${BASE}${path}`, { ...options, headers })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status})`)
  return body
}

export const api = {
  login: (email, password) => request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  agents: () => request('/v1/agents'),
  agent: (id) => request(`/v1/agents/${id}`),
  createAgent: (body) => request('/v1/agents', { method: 'POST', body: JSON.stringify(body) }),
  agentState: (id, action) => request(`/v1/agents/${id}/${action}`, { method: 'POST' }),
  policies: () => request('/v1/policies'),
  generatePolicy: (text) => request('/v1/policies/generate-draft', { method: 'POST', body: JSON.stringify({ text }) }),
  createPolicy: (body) => request('/v1/policies', { method: 'POST', body: JSON.stringify(body) }),
  publishPolicy: (id) => request(`/v1/policies/${id}/publish`, { method: 'POST' }),
  transactions: (params = {}) => request(`/v1/transactions?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`),
  transaction: (id) => request(`/v1/transactions/${id}`),
  approvals: () => request('/v1/approvals?status=pending'),
  decide: (id, decision, version, comment = '') => request(`/v1/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, version, comment }) }),
  dashboard: (range = '7d') => request(`/v1/dashboard/overview?range=${range}`),
  audit: () => request('/v1/audit-events'),
  keys: () => request('/v1/api-keys'),
  createKey: () => request('/v1/api-keys', { method: 'POST', body: JSON.stringify({ name: 'Test API Key', environment: 'test', scopes: ['authorizations:create'] }) }),
  revokeKey: (id) => request(`/v1/api-keys/${id}`, { method: 'DELETE' }),
}

