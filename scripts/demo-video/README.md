# AgentGuard demo video pipeline

Produces `AgentGuard-Razorpay-Buildathon-Demo.mp4` — a narrated, subtitled 4:46 product demo
recorded from the **real running application**, not a mockup.

## Prerequisites

- macOS (uses the built-in `say` for text-to-speech)
- `ffmpeg-full` (needs `libass` + `libfreetype` for subtitle burn-in): `brew install ffmpeg-full`
- The app running locally:
  - backend on `:8010` with a freshly seeded database
  - frontend on `:5180` pointed at it (`VITE_API_BASE_URL=http://127.0.0.1:8010`)

## Run order (matters)

```bash
node generate-audio.mjs     # 1. narration.txt -> narration.wav + timeline.json (+ raw srt/vtt)
node make-subtitles.mjs     # 2. rewrap subtitles -> agentguard-demo.srt/.vtt/.ass  (MUST run after step 1)
node make-cards.mjs         # 3. title/problem/solution/closing cards + section labels as PNGs
node record-demo.mjs        # 4. drive the real UI, paced by timeline.json -> output/demo-raw.webm
bash build-video.sh         # 5. compose the final MP4
```

`generate-audio.mjs` also writes an unwrapped `.srt`/`.vtt`, so **always run `make-subtitles.mjs`
after it** or the burned-in captions will be single long lines.

## How sync works

`generate-audio.mjs` measures every narration segment and writes `timeline.json`. `record-demo.mjs`
reads that file and holds each scene for exactly the duration of its narration, so picture and
voice-over stay aligned without manual editing.

## Re-seed before every take

Two AgentGuard controls will change the outcome on a second run against the same database:

- `REPEATED_FAILURES` escalates later requests to REVIEW after three blocked decisions for an agent
- `DUPLICATE_PAYMENT` blocks an identical amount to the same merchant within 10 minutes

Drop and re-seed the demo database before each recording.

## Files

| File | Purpose |
|---|---|
| `narration.txt` | narration source text |
| `timeline.json` | per-segment audio timings (drives recording + subtitles) |
| `narration.wav` / `.mp3` | generated voice-over |
| `agentguard-demo.srt` / `.vtt` | sidecar subtitles |
| `agentguard-demo.ass` | styled subtitles used for burn-in |
| `output/demo-raw.webm` | raw 1080p browser capture |
| `output/verify/` | frames used to verify the finished video |
