import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'

const here = path.dirname(new URL(import.meta.url).pathname)
const segments = JSON.parse(fs.readFileSync(path.join(here, 'narration-segments.json'), 'utf8'))
const temp = path.join(here, '.audio-segments')
fs.mkdirSync(temp, { recursive: true })

const voice = process.env.DEMO_VOICE || 'Samantha'
const rate = process.env.DEMO_VOICE_RATE || '200'
const gap = Number(process.env.DEMO_SEGMENT_GAP || '0.24')

function duration(file) {
  const bytes = Math.max(0, fs.statSync(file).size - 78)
  return bytes / (44100 * 2)
}

const wavs = []
for (let index = 0; index < segments.length; index += 1) {
  const stem = String(index).padStart(3, '0')
  const aiff = path.join(temp, `${stem}.aiff`)
  const wav = path.join(temp, `${stem}.wav`)
  execFileSync('/usr/bin/say', ['-v', voice, '-r', rate, '-o', aiff, segments[index].text])
  execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav])
  wavs.push(wav)
}

const silence = path.join(temp, 'silence.wav')
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(gap), '-c:a', 'pcm_s16le', silence])

const concatFile = path.join(temp, 'concat.txt')
const concatLines = []
for (const wav of wavs) {
  concatLines.push(`file '${wav.replaceAll("'", "'\\''")}'`)
  concatLines.push(`file '${silence.replaceAll("'", "'\\''")}'`)
}
fs.writeFileSync(concatFile, concatLines.join('\n') + '\n')
const narrationWav = path.join(here, 'narration.wav')
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c:a', 'pcm_s16le', narrationWav])

function stamp(seconds, decimal = ',') {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3600000)
  const minutes = Math.floor((milliseconds % 3600000) / 60000)
  const secs = Math.floor((milliseconds % 60000) / 1000)
  const ms = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}${decimal}${String(ms).padStart(3, '0')}`
}

let cursor = 0
const timeline = segments.map((segment, index) => {
  const clipDuration = duration(wavs[index])
  const entry = { ...segment, index, start: cursor, end: cursor + clipDuration }
  cursor += clipDuration + gap
  return entry
})
fs.writeFileSync(path.join(here, 'timeline.json'), JSON.stringify({ duration: cursor, segments: timeline }, null, 2) + '\n')
fs.writeFileSync(path.join(here, 'narration.txt'), segments.map((item) => item.text).join('\n\n') + '\n')

const srt = timeline.map((item, index) => `${index + 1}\n${stamp(item.start)} --> ${stamp(item.end)}\n${item.text}\n`).join('\n')
fs.writeFileSync(path.join(here, 'agentguard-demo.srt'), srt)
const vtt = 'WEBVTT\n\n' + timeline.map((item) => `${stamp(item.start, '.')} --> ${stamp(item.end, '.')}\n${item.text}\n`).join('\n')
fs.writeFileSync(path.join(here, 'agentguard-demo.vtt'), vtt)
console.log(JSON.stringify({ voice, rate, duration: Number(cursor.toFixed(2)), segments: segments.length }))
