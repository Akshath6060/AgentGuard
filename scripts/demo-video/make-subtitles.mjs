#!/usr/bin/env node
/** Builds SRT + VTT from timeline.json, wrapped to at most two readable lines. */
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const OFFSET = Number(process.env.SUBTITLE_OFFSET || 0)   // seconds of intro before narration
const MAX_CHARS = 46
const MAX_LINES = 2

const timeline = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'))

const wrap = (text) => {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if (line && (line + ' ' + w).length > MAX_CHARS) { lines.push(line); line = w }
    else line = line ? line + ' ' + w : w
  }
  if (line) lines.push(line)
  return lines
}

// Split each segment into balanced cues of at most MAX_LINES lines.
const chunk = (text) => {
  const totalLines = wrap(text).length
  const n = Math.max(1, Math.ceil(totalLines / MAX_LINES))
  if (n === 1) return [text]
  const words = text.split(/\s+/)
  const target = text.length / n
  const out = []
  let cur = ''
  for (const w of words) {
    const remaining = n - out.length
    // start a new chunk once this one is at its share and chunks still remain
    if (cur && cur.length >= target && remaining > 1) { out.push(cur); cur = w }
    else cur = cur ? cur + ' ' + w : w
  }
  if (cur) out.push(cur)
  return out
}

const cues = []
for (const seg of timeline.segments) {
  const parts = chunk(seg.text)
  const span = seg.end - seg.start
  const total = parts.reduce((a, p) => a + p.length, 0) || 1
  let t = seg.start
  for (const part of parts) {
    const d = span * (part.length / total)
    cues.push({ start: t + OFFSET, end: t + d + OFFSET, text: wrap(part).join('\n') })
    t += d
  }
}

const clamp = n => Math.max(0, n)
const fmt = (s, sep) => {
  s = clamp(s)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  const ms = String(Math.round((s % 1) * 1000)).padStart(3, '0')
  return `${h}:${m}:${sec}${sep}${ms}`
}

const srt = cues.map((c, i) =>
  `${i + 1}\n${fmt(c.start, ',')} --> ${fmt(c.end, ',')}\n${c.text}\n`).join('\n')
fs.writeFileSync(path.join(DIR, 'agentguard-demo.srt'), srt)

const vtt = 'WEBVTT\n\n' + cues.map((c, i) =>
  `${i + 1}\n${fmt(c.start, '.')} --> ${fmt(c.end, '.')}\n${c.text}\n`).join('\n')
fs.writeFileSync(path.join(DIR, 'agentguard-demo.vtt'), vtt)


// --- ASS for burn-in: explicit PlayRes so libass does not upscale the font ---
const assTime = s => {
  s = clamp(s)
  const h = Math.floor(s / 3600)
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  const cs = String(Math.floor((s % 1) * 100)).padStart(2, '0')
  return `${h}:${m}:${sec}.${cs}`
}
const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Helvetica Neue,40,&H00FFFFFF,&H00FFFFFF,&H00101828,&HA6101828,-1,0,0,0,100,100,0,0,3,10,0,2,260,260,54,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
const assBody = cues.map(c =>
  `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${c.text.replace(/\n/g, '\\N')}`).join('\n')
fs.writeFileSync(path.join(DIR, 'agentguard-demo.ass'), assHeader + assBody + '\n')

const longest = cues.reduce((m, c) => Math.max(m, ...c.text.split('\n').map(l => l.length)), 0)
console.log(`${cues.length} cues written (offset ${OFFSET}s), longest line ${longest} chars`)
