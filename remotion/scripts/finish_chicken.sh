#!/bin/bash
# After scripts/render_chicken.sh 0 16: join the 17 chunks, mux the final mix (Remotion writes a silent audio track,
# so take video from the render and audio from mix.wav), then frame-by-frame QA.
set -e
cd "$(dirname "$0")/.."
O=out/chicken; MIX=../projects/headless-chicken/audio/mix.wav
n=$(ls $O/chunks/c*.mp4 | grep -v part | wc -l); [ "$n" -eq 17 ] || { echo "only $n/17 chunks rendered"; exit 1; }
ls $O/chunks/c*.mp4 | grep -v part | sed "s|^$O/chunks/|file '|; s|$|'|" > $O/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $O/chunks/list.txt -c copy $O/video_silent.mp4
ffmpeg -v error -y -i $O/video_silent.mp4 -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest $O/chicken_final.mp4
python3 scripts/short_qa.py $O/chicken_final.mp4 $O/qa scripts/chicken_shots.json
echo "final: $O/chicken_final.mp4"
