#!/usr/bin/env node
/** Renders the intro/closing cards and section labels as PNGs via headless Chrome,
 *  so the build does not depend on an ffmpeg drawtext/freetype build. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(DIR, 'output', 'cards')
fs.mkdirSync(OUT, { recursive: true })

let repo = 'github.com/<your-repo>'
try {
  repo = execFileSync('git', ['-C', path.join(DIR, '..', '..'), 'config', '--get', 'remote.origin.url'])
    .toString().trim().replace(/^git@github\.com:/, 'github.com/').replace(/^https:\/\//, '').replace(/\.git$/, '')
} catch {}

const base = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1920px;height:1080px;font-family:'Inter','Helvetica Neue',Arial,sans-serif;
       -webkit-font-smoothing:antialiased;overflow:hidden;position:relative}
  .wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 200px}
  .center{align-items:center;text-align:center;padding:0}
  .eyebrow{font-size:52px;font-weight:700;letter-spacing:-.01em;margin-bottom:44px}
  h1{font-size:112px;font-weight:700;letter-spacing:-.03em;color:#fff}
  .sub{font-size:46px;color:#B9C2DE;margin-top:34px;font-weight:400}
  .meta{font-size:34px;color:#7C8DC4;margin-top:26px}
  .rule{width:360px;height:5px;background:#4F46E5;margin-top:52px;border-radius:3px}
  .line{font-size:48px;color:#fff;font-weight:600;line-height:1.45}
  .dim{font-size:44px;color:#B9C2DE;font-weight:400;line-height:1.5;margin-top:26px}
  .triad{display:flex;gap:110px;margin:56px 0 10px}
  .tag{font-size:64px;font-weight:700;letter-spacing:.01em}
  .flow{font-size:36px;color:#D7DEF2;margin-top:16px;letter-spacing:.01em}
  .hr{height:3px;background:#4F46E5;margin:52px 0 40px;border-radius:2px}
  .rule2{font-size:44px;font-weight:700;color:#fff;line-height:1.5}
  .logo{width:96px;height:96px;border-radius:24px;background:#4F46E5;display:flex;
        align-items:center;justify-content:center;margin-bottom:44px}
`
const shield = `<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`

const cards = {
  card1: `<style>${base} body{background:#0F1729}</style>
    <div class="wrap center">
      <div class="logo">${shield}</div>
      <h1>AgentGuard</h1>
      <div class="sub">AI-Powered Payment Risk &amp; Policy Guard</div>
      <div class="meta">Razorpay AI Buildathon 2026</div>
      <div class="rule"></div>
    </div>`,
  card2: `<style>${base} body{background:#0F1729}</style>
    <div class="wrap">
      <div class="eyebrow" style="color:#FCA5A5">The Problem</div>
      <div class="line">AI agents can now spend real money.</div>
      <div class="dim">They can be prompt-injected, their credentials can leak,<br>or they can simply be wrong.</div>
      <div class="dim" style="margin-top:40px">The model that was manipulated cannot also be<br>the thing that guards the money.</div>
    </div>`,
  card3: `<style>${base} body{background:#1E2A5A}</style>
    <div class="wrap">
      <div class="eyebrow" style="color:#86EFAC">The Solution</div>
      <div class="line">A governance layer between the agent and the money.</div>
      <div class="flow">Authenticate &nbsp;→&nbsp; Policy engine &nbsp;→&nbsp; Risk score &nbsp;→&nbsp; Policy evidence</div>
      <div class="triad">
        <span class="tag" style="color:#86EFAC">ALLOW</span>
        <span class="tag" style="color:#FCD34D">REVIEW</span>
        <span class="tag" style="color:#FCA5A5">BLOCK</span>
      </div>
      <div class="hr"></div>
      <div class="rule2">AI provides intelligence.<br>Deterministic policy retains final authority.</div>
    </div>`,
  card4: `<style>${base} body{background:#0F1729}</style>
    <div class="wrap center">
      <div class="logo">${shield}</div>
      <h1>AgentGuard</h1>
      <div class="sub">AI-Powered Payment Risk &amp; Policy Guard</div>
      <div class="meta">Razorpay AI Buildathon 2026</div>
      <div class="meta" style="color:#4F46E5;margin-top:34px;font-size:30px">${repo}</div>
    </div>`,
}

const LABELS = ['Live Dashboard','Policy Engine','Normal Transaction','Decision: ALLOW',
  'Razorpay Test Integration','Explainable Risk Decision','Suspicious Behaviour Detected',
  'Decision: REVIEW','RAG Policy Intelligence','Duplicate Payment Protection',
  'Architecture & Stack','Audit Trail']

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html)
  await page.waitForTimeout(220)
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log('card:', name)
}

// transparent lower-third labels
const lp = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (let i = 0; i < LABELS.length; i++) {
  const accent = /ALLOW/.test(LABELS[i]) ? '#86EFAC' : /REVIEW/.test(LABELS[i]) ? '#FCD34D'
    : /Duplicate|Suspicious/.test(LABELS[i]) ? '#FCA5A5' : '#A5B4FC'
  await lp.setContent(`<style>*{margin:0;box-sizing:border-box}
    body{width:1920px;height:1080px;background:transparent;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
    .pill{position:absolute;left:70px;bottom:250px;display:inline-flex;align-items:center;gap:16px;
      background:rgba(15,23,41,.86);border:1px solid rgba(255,255,255,.14);border-radius:14px;
      padding:18px 30px;color:#fff;font-size:34px;font-weight:600;letter-spacing:-.01em;
      box-shadow:0 12px 40px rgba(0,0,0,.35)}
    .dot{width:14px;height:14px;border-radius:50%;background:${accent};flex:none}</style>
    <div class="pill"><span class="dot"></span>${LABELS[i].replace(/&/g,'&amp;')}</div>`)
  await lp.waitForTimeout(140)
  await lp.screenshot({ path: path.join(OUT, `label${String(i).padStart(2, '0')}.png`), omitBackground: true })
}
console.log(`labels: ${LABELS.length}`)
await browser.close()
console.log('repo url on closing card:', repo)
