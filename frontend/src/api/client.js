const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
let token = localStorage.getItem('ag_token') || ''
let workspaceId = localStorage.getItem('ag_workspace') || ''

export function setSession(nextToken, nextWorkspace) {
  if (nextToken !== undefined) { token = nextToken || ''; if (token) localStorage.setItem('ag_token', token); else localStorage.removeItem('ag_token') }
  if (nextWorkspace !== undefined) { workspaceId = nextWorkspace || ''; if (workspaceId) localStorage.setItem('ag_workspace', workspaceId); else localStorage.removeItem('ag_workspace') }
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (workspaceId) headers['X-Workspace-ID'] = workspaceId
  const response = await fetch(`${BASE}${path}`, { ...options, headers })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status})`)
  return body
}

let razorpayLoader
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  if (razorpayLoader) return razorpayLoader
  razorpayLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded'))
    document.head.appendChild(script)
  })
  return razorpayLoader
}

export async function openRazorpayCheckout(payment, transactionId, customer = {}) {
  const checkout = payment?.checkout
  if (!checkout?.key_id || !checkout?.order_id) return payment
  await loadRazorpay()
  return new Promise((resolve, reject) => {
    let completed = false
    const gateway = new window.Razorpay({
      key: checkout.key_id,
      order_id: checkout.order_id,
      amount: checkout.amount,
      currency: checkout.currency,
      name: 'AgentGuard',
      description: `Approved agent payment · ${transactionId}`,
      prefill: { name: customer.name || '', email: customer.email || '' },
      theme: { color: '#4F46E5' },
      handler: async (response) => {
        completed = true
        try {
          resolve(await api.verifyPayment({ transaction_id: transactionId, ...response }))
        } catch (error) { reject(error) }
      },
      modal: { ondismiss: () => { if (!completed) reject(new Error('payment checkout was closed')) } },
    })
    gateway.on('payment.failed', (response) => {
      completed = true
      reject(new Error(response.error?.description || 'Payment failed'))
    })
    gateway.open()
  })
}

export const api = {
  login: (email, password) => request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  agents: () => request('/v1/agents'),
  agent: (id) => request(`/v1/agents/${id}`),
  createAgent: (body) => request('/v1/agents', { method: 'POST', body: JSON.stringify(body) }),
  updateAgent: (id, body) => request(`/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  agentState: (id, action) => request(`/v1/agents/${id}/${action}`, { method: 'POST' }),
  rotateAgentCredential: (id) => request(`/v1/agents/${id}/credentials/rotate`, { method: 'POST', body: JSON.stringify({ environment: 'test' }) }),
  policies: () => request('/v1/policies'),
  generatePolicy: (text) => request('/v1/policies/generate-draft', { method: 'POST', body: JSON.stringify({ text }) }),
  createPolicy: (body) => request('/v1/policies', { method: 'POST', body: JSON.stringify(body) }),
  publishPolicy: (id) => request(`/v1/policies/${id}/publish`, { method: 'POST' }),
  transactions: (params = {}) => request(`/v1/transactions?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`),
  transaction: (id) => request(`/v1/transactions/${id}`),
  approvals: () => request('/v1/approvals?status=pending'),
  decide: (id, decision, version, comment = '') => request(`/v1/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, version, comment }) }),
  verifyPayment: (body) => request('/v1/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(body) }),
  dashboard: (range = '7d') => request(`/v1/dashboard/overview?range=${range}`),
  workspace: () => request('/v1/workspaces/current'),
  updateWorkspace: (body) => request('/v1/workspaces/current', { method: 'PATCH', body: JSON.stringify(body) }),
  audit: () => request('/v1/audit-events'),
  keys: () => request('/v1/api-keys'),
  createKey: () => request('/v1/api-keys', { method: 'POST', body: JSON.stringify({ name: 'Test API Key', environment: 'test', scopes: ['authorizations:create'] }) }),
  revokeKey: (id) => request(`/v1/api-keys/${id}`, { method: 'DELETE' }),
}
