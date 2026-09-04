#!/usr/bin/env node
/**
 * Records the AgentGuard product demo with Playwright, paced against the
 * narration timeline in timeline.json so picture and voice-over stay in sync.
 *
 * Every scene is held for exactly the duration of its narration segments.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const BASE = process.env.DEMO_BASE_URL || 'http://localhost:5180'
const OUT = path.join(DIR, 'output', 'raw')
const EMAIL = 'demo@agentguard.app'
const PASSWORD = process.env.DEMO_PASSWORD || 'AgentGuard123!'

const timeline = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'))
const scenes = []
for (const s of timeline.segments) {
  const last = scenes[scenes.length - 1]
  if (last && last.scene === s.scene) last.end = s.end
  else scenes.push({ scene: s.scene, start: s.start, end: s.end })
}
scenes.forEach((sc, i) => { sc.until = i < scenes.length - 1 ? scenes[i + 1].start : timeline.duration })
const SC = Object.fromEntries(scenes.map(s => [s.scene, s]))

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  channel: 'chrome', headless: false,
  args: ['--window-size=1920,1180', '--window-position=0,0', '--hide-scrollbars', '--force-device-scale-factor=1'],
})
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  reducedMotion: 'no-preference',
})
const page = await ctx.newPage()

let T0 = 0
const now = () => (Date.now() - T0) / 1000
const sleep = ms => page.waitForTimeout(ms)

async function holdUntil(mark, label) {
  const remain = mark - now()
  if (remain > 0) await sleep(remain * 1000)
  else console.log(`  ! scene "${label}" overran by ${(-remain).toFixed(1)}s`)
}
async function scene(name, fn) {
  const sc = SC[name]
  if (!sc) throw new Error(`unknown scene ${name}`)
  console.log(`[${now().toFixed(1)}s] scene ${name} (target start ${sc.start.toFixed(1)}s, until ${sc.until.toFixed(1)}s)`)
  if (fn) { try { await fn(sc) } catch (e) { console.log(`  ! scene "${name}" error: ${String(e).split('\n')[0].slice(0, 90)}`) } }
  await holdUntil(sc.until, name)
}

// gentle, presentation-paced helpers
const type = async (sel, text, delay = 55) => { await page.locator(sel).click(); await page.locator(sel).fill(''); await page.locator(sel).type(text, { delay }) }
const nav = async (label) => {
  try { await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click({ timeout: 8000 }) }
  catch (e) { console.log(`  ! nav "${label}" failed: ${String(e).split('\n')[0].slice(0, 70)}`) }
  await sleep(900)
}
const glide = async (to, steps = 26) => {
  const from = await page.evaluate(() => window.scrollY)
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(y => window.scrollTo(0, y), from + ((to - from) * i) / steps)
    await sleep(38)
  }
}
async function fillPayment({ agent, amount, merchant, category, purpose, intent, justification }) {
  try {
    await page.locator('#payment-agent').selectOption({ label: agent }, { timeout: 8000 })
  } catch {
    const labels = await page.locator('#payment-agent option').allTextContents()
    console.log(`  ! agent "${agent}" not in dropdown; options: ${labels.join(', ')}`)
    const match = labels.findIndex(l => l.trim().toLowerCase().includes(agent.toLowerCase().slice(0, 7)))
    if (match > 0) await page.locator('#payment-agent').selectOption({ index: match })
  }
  await sleep(280)
  await type('#payment-amount', amount, 70)
  await type('#merchant-name', merchant, 55)
  await type('#merchant-category', category, 50)
  await page.locator('#merchant-country').fill('IN')
  await type('#payment-purpose', purpose, 40)
  if (intent) await type('#payment-description', intent, 22)
  if (justification) await type('#payment-justification', justification, 22)
}
const submitPayment = async () => { await page.getByRole('button', { name: /Evaluate and pay safely/i }).click() }
async function dismissCheckout() {
  // The Razorpay iframe swallows pointer events; removing its container closes it cleanly.
  await page.evaluate(() => {
    document.querySelectorAll('.razorpay-container, .razorpay-backdrop, iframe.razorpay-checkout-frame')
      .forEach(el => el.remove())
    document.body.style.overflow = ''
  }).catch(() => {})
}
async function clickIfPresent(name, timeout = 6000) {
  try {
    const el = page.getByRole('button', { name: new RegExp(name, 'i') }).first()
    if (await el.count()) { await el.click({ timeout }); return true }
  } catch (e) { console.log(`  ! could not click "${name}": ${String(e).split('\n')[0].slice(0, 80)}`) }
  return false
}

// ---------------------------------------------------------------- run
await page.goto(BASE, { waitUntil: 'networkidle' })
await sleep(1200)
T0 = Date.now()
console.log('recording clock started')

await scene('problem', async () => { await glide(120); await sleep(600); await glide(0) })
await scene('solution', async () => { await sleep(800); await glide(90); await sleep(900); await glide(0) })

await scene('login', async () => {
  await type('#signin-email', EMAIL, 45)
  await type('#signin-password', PASSWORD, 45)
  await sleep(250)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await sleep(2200)
  const body = await page.locator('body').innerText()
  if (/choose a workspace/i.test(body)) {
    await page.getByText(/AgentGuard Demo/i).first().click()
    await sleep(1600)
  }
})

await scene('dashboard', async () => { await sleep(1500); await glide(420); await sleep(1200); await glide(760) })

await scene('policy', async () => {
  await glide(0); await nav('Policy Intelligence'); await sleep(1800)
  await glide(360); await sleep(1500)
  const vendor = page.getByText(/Vendor Verification Policy/i).first()
  if (await vendor.count()) { await vendor.click().catch(() => {}); await sleep(1800) }
  await glide(640)
})

await scene('allow_form', async () => {
  await glide(0); await nav('Authorize Payment'); await sleep(1100)
  await fillPayment({
    agent: 'SubscriptionBot', amount: '499', merchant: 'Adobe', category: 'software',
    purpose: 'Creative Cloud subscription',
    intent: 'Renew the monthly design software licence',
    justification: 'Existing vendor with prior settled payments in this workspace',
  })
})

await scene('allow_decision', async () => { await submitPayment(); await sleep(2200); await glide(560) })

await scene('razorpay', async () => {
  // the real Razorpay Test Mode checkout renders over the app
  await sleep(4500)
  await page.screenshot({ path: path.join(DIR, 'output', 'razorpay-checkout.png') }).catch(() => {})
})

await scene('allow_detail', async () => {
  await dismissCheckout()
  await sleep(1400)
  await glide(560)
  await clickIfPresent('View transaction'); await sleep(2000)
  await glide(420); await sleep(1200); await glide(820)
})

await scene('review_form', async () => {
  await glide(0); await nav('Authorize Payment'); await sleep(1000)
  await fillPayment({
    agent: 'ProcurementAgent', amount: '9000', merchant: 'Orbit Industrial Supply', category: 'supplies',
    purpose: 'Raw material order',
    intent: 'Order components for production run ORD-4932',
  })
})

await scene('review_decision', async () => { await submitPayment(); await sleep(2600); await glide(600) })

await scene('rag', async () => {
  await clickIfPresent('View transaction'); await sleep(2200)
  await glide(520); await sleep(1600); await glide(980); await sleep(1200); await glide(1340)
})

await scene('duplicate', async () => {
  await glide(0); await nav('Authorize Payment'); await sleep(900)
  await fillPayment({
    agent: 'ProcurementAgent', amount: '9000', merchant: 'Orbit Industrial Supply', category: 'supplies',
    purpose: 'Raw material order',
  })
  await submitPayment(); await sleep(2400); await glide(600)
})

await scene('architecture', async () => {
  await glide(0); await nav('Developers'); await sleep(2000)
  await glide(420); await sleep(2200); await glide(820); await sleep(1800)
  await glide(0); await nav('Settings'); await sleep(2000); await glide(320)
})

await scene('audit', async () => {
  await glide(0); await nav('Audit Logs'); await sleep(1800)
  await glide(380); await sleep(1500); await glide(700)
})

await scene('closing', async () => {
  await glide(0); await nav('Overview'); await sleep(2000); await glide(300); await sleep(1500); await glide(0)
})

console.log(`[${now().toFixed(1)}s] done — target ${timeline.duration.toFixed(1)}s`)
await ctx.close()
await browser.close()

const file = fs.readdirSync(OUT).find(f => f.endsWith('.webm'))
const finalRaw = path.join(DIR, 'output', 'demo-raw.webm')
fs.renameSync(path.join(OUT, file), finalRaw)
console.log('raw recording:', finalRaw)
