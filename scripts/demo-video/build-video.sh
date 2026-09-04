#!/usr/bin/env bash
# Composes the final submission MP4:
#   title / problem / solution cards -> live browser demo -> closing card
#   with narration audio, burned-in subtitles and section labels.
set -euo pipefail
cd "$(dirname "$0")"

FF=${FFMPEG:-/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg}
FP=${FFPROBE:-/opt/homebrew/opt/ffmpeg-full/bin/ffprobe}
command -v "$FF" >/dev/null 2>&1 || FF=ffmpeg
command -v "$FP" >/dev/null 2>&1 || FP=ffprobe

OUT=output
CARDS=$OUT/cards
RAW=$OUT/demo-raw.webm
NARR=narration.wav
SRT=agentguard-demo.srt
FINAL=AgentGuard-Razorpay-Buildathon-Demo.mp4

C1=10        # title
C2=13.9      # problem
C3=26        # solution
TRIM=49.9    # browser footage starts at the login scene
BODY=229.8   # narration end (279.7) - TRIM
CLOSE=6

enc=(-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 25)

still () { # png duration out fade_out_start
  "$FF" -y -v error -loop 1 -i "$1" -t "$2" \
    -vf "scale=1920:1080,fade=t=in:st=0:d=0.6,fade=t=out:st=$4:d=0.6,format=yuv420p" \
    "${enc[@]}" "$3"
}

echo "==> 1/5 intro cards"
still $CARDS/card1.png $C1 $OUT/card1.mp4 $(echo "$C1-0.6" | bc)
still $CARDS/card2.png $C2 $OUT/card2.mp4 $(echo "$C2-0.6" | bc)
still $CARDS/card3.png $C3 $OUT/card3.mp4 $(echo "$C3-0.6" | bc)

echo "==> 2/5 closing card"
still $CARDS/card4.png $CLOSE $OUT/card4.mp4 $(echo "$CLOSE-0.7" | bc)

echo "==> 3/5 browser body + section labels"
# label i is shown between START[i] and END[i], relative to the trimmed body
ST=(6.3 22.4 46.8 63.0 70.8 87.7 104.7 117.1 130.0 145.6 163.9 195.1)
EN=(22.4 46.8 63.0 70.8 87.7 104.7 117.1 130.0 145.6 163.9 195.1 211.1)
inputs=(-ss $TRIM -t $BODY -i "$RAW")
filter="[0:v]fade=t=in:st=0:d=0.6[v0]"
for i in $(seq 0 11); do
  inputs+=(-loop 1 -t $BODY -i "$CARDS/label$(printf '%02d' "$i").png")
  n=$((i+1))
  filter+=";[v$i][$n:v]overlay=0:0:enable='between(t,${ST[$i]},${EN[$i]})'[v$n]"
done
"$FF" -y -v error "${inputs[@]}" -filter_complex "$filter" -map "[v12]" -an "${enc[@]}" $OUT/body.mp4

echo "==> 4/5 concatenate"
printf "file '%s'\n" card1.mp4 card2.mp4 card3.mp4 body.mp4 card4.mp4 > $OUT/concat.txt
"$FF" -y -v error -f concat -safe 0 -i $OUT/concat.txt -c copy $OUT/silent.mp4

echo "==> 5/5 narration + burned subtitles + soft subtitle track"
"$FF" -y -v error -i $OUT/silent.mp4 -i "$NARR" -i "$SRT" \
  -vf "ass=agentguard-demo.ass" \
  -map 0:v:0 -map 1:a:0 -map 2:s:0 \
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -c:s mov_text -metadata:s:s:0 language=eng \
  -movflags +faststart "$FINAL"

echo
echo "DONE -> $FINAL"
"$FP" -v error -show_entries format=duration,size -show_entries stream=codec_type,codec_name,width,height -of default=nw=1 "$FINAL"
