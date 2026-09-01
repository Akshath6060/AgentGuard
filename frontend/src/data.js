// Design tokens and demo data, ported from the AgentGuard design canvas.

export const IND = '#4F46E5'
export const TXT = '#111827'
export const MUT = '#6B7280'

export const RISK = {
  Low: { bg: '#DCFCE7', fg: '#15803D' },
  Medium: { bg: '#FEF3C7', fg: '#B45309' },
  High: { bg: '#FEE2E2', fg: '#B91C1C' },
}

export const STAT = {
  Approved: { bg: '#DCFCE7', fg: '#15803D' },
  Blocked: { bg: '#FEE2E2', fg: '#B91C1C' },
  Review: { bg: '#FEF3C7', fg: '#B45309' },
  'Approval Required': { bg: '#FEF3C7', fg: '#B45309' },
  Active: { bg: '#DCFCE7', fg: '#15803D' },
  Paused: { bg: '#F3F4F6', fg: '#6B7280' },
  Draft: { bg: '#F3F4F6', fg: '#6B7280' },
}

export const AV = [
  { bg: '#EEF2FF', fg: '#4F46E5' },
  { bg: '#ECFDF5', fg: '#047857' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#F1F5F9', fg: '#334155' },
]

export const TX = [
  { id: 'AGTX-40291', agent: 'TravelAgent', merchant: 'IndiGo', amount: '₹8,450', risk: 'Low', status: 'Approved', time: '14:03', ago: '2 sec ago', av: 0 },
  { id: 'AGTX-40290', agent: 'ProcurementGPT', merchant: 'XYZ Components', amount: '₹72,000', risk: 'High', status: 'Blocked', time: '13:31', ago: '21 sec ago', av: 1 },
  { id: 'AGTX-40289', agent: 'MarketingAgent', merchant: 'Meta Ads', amount: '₹14,500', risk: 'Medium', status: 'Review', time: '13:14', ago: '1 min ago', av: 2 },
  { id: 'AGTX-40288', agent: 'SubscriptionBot', merchant: 'Adobe', amount: '₹3,400', risk: 'Low', status: 'Approved', time: '12:58', ago: '6 min ago', av: 3 },
  { id: 'AGTX-40287', agent: 'ShoppingAgent', merchant: 'Amazon', amount: '₹6,120', risk: 'Low', status: 'Approved', time: '12:41', ago: '12 min ago', av: 0 },
  { id: 'AGTX-40286', agent: 'ProcurementGPT', merchant: 'AWS', amount: '₹28,900', risk: 'Medium', status: 'Approved', time: '12:20', ago: '26 min ago', av: 1 },
  { id: 'AGTX-40285', agent: 'MarketingAgent', merchant: 'Google Cloud', amount: '₹41,000', risk: 'High', status: 'Blocked', time: '11:52', ago: '48 min ago', av: 2 },
]

export const DETAILS = {
  'AGTX-40290': {
    score: 91, scoreLabel: 'High risk', scoreNote: 'Blocked automatically before payment was initiated.',
    question: 'Why was this transaction blocked?', policy: 'Procurement Policy', category: 'Industrial Components',
    date: '01 Sep 2026 · 13:31:04 IST', payStatus: 'Not initiated', payColor: '#6B7280', payId: '—',
    intent: 'ProcurementGPT requested this payment to purchase electronic components required for order #ORD-4932.',
    justification: '"Supplier XYZ Components offered the required inventory with the fastest delivery time and available stock."',
    signals: [
      { level: 'High Risk', title: 'Transaction exceeds agent spending limit', detail: 'Allowed ₹25,000 · Requested ₹72,000 — 2.9× over the per-transaction cap.' },
      { level: 'High Risk', title: 'New merchant detected', detail: 'This agent has never interacted with XYZ Components.' },
      { level: 'Medium Risk', title: 'Unusual transaction amount', detail: "Transaction is 3.4× higher than the agent's normal purchase value." },
      { level: 'Passed', title: 'Merchant category allowed', detail: 'Industrial Components is an approved spending category.' },
    ],
    checks: [['Transaction Limit', 'Failed'], ['Merchant Trust', 'Failed'], ['Category Permission', 'Passed'], ['Frequency Check', 'Passed'], ['Behaviour Analysis', 'Failed']],
  },
  'AGTX-40291': {
    score: 12, scoreLabel: 'Low risk', scoreNote: 'Cleared autonomously in 380 ms.',
    question: 'Why was this transaction approved?', policy: 'Travel Policy', category: 'Flights',
    date: '01 Sep 2026 · 14:03:21 IST', payStatus: 'Payment successful', payColor: '#16A34A', payId: 'pay_NxR91kd8Lm2Za',
    intent: 'TravelAgent requested this payment to book a Delhi → Bengaluru flight for the 12 Sep client visit.',
    justification: '"Lowest-priced direct flight matching the requested departure window and refund policy."',
    signals: [
      { level: 'Passed', title: 'Within transaction limit', detail: 'Allowed ₹15,000 · Requested ₹8,450.' },
      { level: 'Passed', title: 'Known merchant', detail: 'IndiGo has 34 prior settled transactions with this agent.' },
      { level: 'Passed', title: 'Typical amount', detail: "Within 0.9× of the agent's average booking value." },
      { level: 'Passed', title: 'Merchant category allowed', detail: 'Flights is an approved spending category.' },
    ],
    checks: [['Transaction Limit', 'Passed'], ['Merchant Trust', 'Passed'], ['Category Permission', 'Passed'], ['Frequency Check', 'Passed'], ['Behaviour Analysis', 'Passed']],
  },
  'AGTX-40289': {
    score: 58, scoreLabel: 'Needs human review', scoreNote: 'Held for approval — no funds moved yet.',
    question: 'Why does this transaction need approval?', policy: 'Marketing Policy', category: 'Advertising',
    date: '01 Sep 2026 · 13:14:47 IST', payStatus: 'Awaiting approval', payColor: '#D97706', payId: '—',
    intent: 'MarketingAgent requested a budget top-up for the Q3 retargeting campaign on Meta Ads.',
    justification: '"Campaign CPA dropped 22% this week; extending budget captures the remaining high-intent audience."',
    signals: [
      { level: 'Medium Risk', title: 'Approaching daily limit', detail: 'This payment would use 84% of the ₹17,000 daily allowance.' },
      { level: 'Medium Risk', title: 'Third top-up in 24 hours', detail: 'Frequency is above the agent’s usual once-daily pattern.' },
      { level: 'Passed', title: 'Known merchant', detail: 'Meta Ads has 61 prior settled transactions.' },
      { level: 'Passed', title: 'Merchant category allowed', detail: 'Advertising is an approved spending category.' },
    ],
    checks: [['Transaction Limit', 'Passed'], ['Merchant Trust', 'Passed'], ['Category Permission', 'Passed'], ['Frequency Check', 'Review'], ['Behaviour Analysis', 'Passed']],
  },
}

export const AGENTS = [
  { name: 'TravelAgent', id: 'agt_travel_01', purpose: 'Travel booking assistant', status: 'Active', today: '₹8,450', monthly: '₹18,700', pct: '37%', risk: 'Low', last: '2 sec ago', av: 0 },
  { name: 'ProcurementGPT', id: 'agt_procure_04', purpose: 'Procurement automation', status: 'Active', today: '₹72,000', monthly: '₹92,300', pct: '92%', risk: 'High', last: '21 sec ago', av: 1 },
  { name: 'MarketingAgent', id: 'agt_mktg_02', purpose: 'Ad campaign manager', status: 'Active', today: '₹14,500', monthly: '₹32,400', pct: '64%', risk: 'Medium', last: '1 min ago', av: 2 },
  { name: 'SubscriptionBot', id: 'agt_subs_07', purpose: 'Software subscription manager', status: 'Paused', today: '₹0', monthly: '₹3,400', pct: '11%', risk: 'Low', last: '3 hrs ago', av: 3 },
  { name: 'ShoppingAgent', id: 'agt_shop_03', purpose: 'Supplies reordering', status: 'Active', today: '₹6,120', monthly: '₹21,050', pct: '42%', risk: 'Low', last: '12 min ago', av: 0 },
]

export const APPROVALS = [
  {
    agent: 'TravelAgent', merchant: 'MakeMyTrip', amount: '₹18,700', purpose: 'Flight booking', risk: 'Medium',
    ago: '2 minutes ago', policy: 'Travel Policy', av: 0, tx: 'AGTX-40289',
    reason: 'Transaction exceeds autonomous spending limit of ₹15,000.',
    justification: '"Selected because it was the lowest-priced direct flight matching the requested schedule."',
  },
  {
    agent: 'MarketingAgent', merchant: 'Meta Ads', amount: '₹14,500', purpose: 'Campaign top-up', risk: 'Medium',
    ago: '6 minutes ago', policy: 'Marketing Policy', av: 2, tx: 'AGTX-40289',
    reason: 'Third budget top-up within 24 hours — frequency rule triggered.',
    justification: '"Campaign CPA improved 22%; additional budget captures remaining high-intent audience today."',
  },
  {
    agent: 'ProcurementGPT', merchant: 'Global Metals Co.', amount: '₹46,200', purpose: 'Raw material order', risk: 'High',
    ago: '14 minutes ago', policy: 'Procurement Policy', av: 1, tx: 'AGTX-40290',
    reason: 'Unknown merchant with no transaction history for this workspace.',
    justification: '"Only supplier with stock available before the 04 Sep production run."',
  },
]

export const POLICIES = [
  { name: 'Travel Policy', desc: 'Flights, hotels and ground transport for approved trips.', agents: '2', txnLimit: '₹15,000', monthly: '₹50,000', approval: 'Above limit', status: 'Active' },
  { name: 'Procurement Policy', desc: 'Supplier payments with merchant allowlist enforcement.', agents: '3', txnLimit: '₹25,000', monthly: '₹1,00,000', approval: 'New merchant', status: 'Active' },
  { name: 'Marketing Policy', desc: 'Ad platform spend with daily frequency guardrails.', agents: '2', txnLimit: '₹20,000', monthly: '₹80,000', approval: 'Above limit', status: 'Active' },
  { name: 'Subscription Policy', desc: 'Recurring SaaS renewals under a fixed monthly cap.', agents: '1', txnLimit: '₹10,000', monthly: '₹25,000', approval: 'Recurring', status: 'Draft' },
]

export const AUDIT = [
  ['14:03:21', 'TravelAgent initiated transaction ₹8,450', 'AGTX-40291 · merchant IndiGo', '#4F46E5'],
  ['14:03:21', 'Policy "Travel Policy" evaluated', '5 of 5 checks passed', '#4F46E5'],
  ['14:03:22', 'Merchant verification completed', 'IndiGo · 34 prior settled payments', '#4F46E5'],
  ['14:03:22', 'Risk score calculated', 'Score: 12 — low risk band', '#16A34A'],
  ['14:03:22', 'Transaction approved', 'Autonomous decision, no human required', '#16A34A'],
  ['14:03:23', 'Payment initiated through Razorpay', 'pay_NxR91kd8Lm2Za', '#0C2451'],
  ['14:03:24', 'Payment successful', '₹8,450 settled · 380 ms end to end', '#16A34A'],
  ['13:31:04', 'ProcurementGPT transaction blocked', 'AGTX-40290 · risk score 91', '#DC2626'],
]

export const CATS = ['Flights', 'Hotels', 'Transportation', 'Food & Dining', 'Software', 'Advertising', 'Electronics', 'Cryptocurrency']
export const SECRULES = ['Require approval for unknown merchants', 'Require approval above spending limit', 'Require approval for international transactions', 'Block cryptocurrency transactions', 'Block repeated failed attempts']
export const TYPES = ['Travel', 'Shopping', 'Procurement', 'Marketing', 'Subscription', 'Custom']
export const STEPS = ['Agent Details', 'Permissions', 'Spending Limits', 'Security Rules', 'Review']

export const SERIES = { d7: [24, 31, 27, 38, 34, 46, 42], d30: [18, 26, 22, 34, 29, 44, 52], d90: [12, 22, 31, 26, 40, 36, 49] }
export const LABELS = {
  d7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  d30: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
  d90: ['Jun', 'Jul', 'Jul', 'Aug', 'Aug', 'Aug', 'Sep'],
}

export const WORKSPACES = [
  { name: 'Nexora Retail', email: 'ops@nexora.in', initials: 'NV', meta: '12 agents · 248 transactions today', env: 'Live', bg: '#EEF2FF', fg: IND, envBg: '#DCFCE7', envFg: '#15803D' },
  { name: 'Nexora Labs', email: 'ops@nexora.in', initials: 'NL', meta: '3 agents · sandbox keys only', env: 'Test', bg: '#F1F5F9', fg: '#334155', envBg: '#F3F4F6', envFg: MUT },
]

export const RISK_STATS = [
  { label: 'Suspicious Merchants', value: '4', delta: '+1', deltaColor: '#DC2626' },
  { label: 'Limit Violations', value: '7', delta: '+3', deltaColor: '#DC2626' },
  { label: 'Unusual Spending', value: '3', delta: '−2', deltaColor: '#16A34A' },
  { label: 'Repeated Attempts', value: '2', delta: '0', deltaColor: MUT },
]

export const RISK_BARS = [[6, 10, 62], [4, 14, 58], [9, 8, 64], [3, 12, 70], [11, 16, 52], [5, 9, 66], [7, 13, 60], [2, 7, 74], [10, 18, 48], [6, 11, 63], [8, 15, 55], [4, 9, 68], [12, 17, 50], [5, 10, 65]]
  .map((b) => ({ high: b[0] + '%', med: b[1] + '%', low: b[2] + '%' }))

export const RISK_CATS = [
  { label: 'Limit violations', value: '38%' },
  { label: 'Unknown merchants', value: '27%' },
  { label: 'Behaviour anomalies', value: '21%' },
  { label: 'Restricted categories', value: '14%' },
]

export const GENERATED_RULES = [
  { label: 'Agent', value: 'TravelAgent', color: TXT },
  { label: 'Allowed Categories', value: 'Flights, Hotels', color: TXT },
  { label: 'Transaction Limit', value: '₹15,000', color: TXT },
  { label: 'Monthly Limit', value: '₹50,000', color: TXT },
  { label: 'Above Limit', value: 'Human Approval', color: '#D97706' },
  { label: 'Unknown Merchant', value: 'Block', color: '#DC2626' },
  { label: 'International Payments', value: 'Approval Required', color: '#D97706' },
]

export const PAGE_TITLES = {
  overview: 'Overview', agents: 'AI Agents', agentProfile: 'Agent Profile', transactions: 'Transactions',
  detail: 'Transaction Analysis', approvals: 'Approval Center', policies: 'Policies', risk: 'Risk Center',
  audit: 'Audit Logs', developers: 'Developers', settings: 'Settings',
}

export const initials = (n) => n.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
export const sigColor = (l) => (l === 'High Risk' ? '#DC2626' : l === 'Medium Risk' ? '#D97706' : '#16A34A')
export const sigBg = (l) => (l === 'High Risk' ? '#FEE2E2' : l === 'Medium Risk' ? '#FEF3C7' : '#DCFCE7')
export const resColor = (r) => (r === 'Failed' ? '#DC2626' : r === 'Review' ? '#D97706' : '#16A34A')
