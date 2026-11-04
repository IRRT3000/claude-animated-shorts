#!/bin/bash
# After scripts/render_pitch.sh 0 15: join the 16 chunks, mux the final mix (Remotion writes a silent audio track,
# so take video from the render and audio from mix.wav), then frame-by-frame QA.
set -e
cd "$(dirname "$0")/.."
O=out/pitch; MIX=../projects/pitch-drop/audio/mix.wav
n=$(ls $O/chunks/c*.mp4 | grep -v part | wc -l); [ "$n" -eq 16 ] || { echo "only $n/16 chunks rendered"; exit 1; }
ls $O/chunks/c*.mp4 | grep -v part | sed "s|^$O/chunks/|file '|; s|$|'|" > $O/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $O/chunks/list.txt -c copy $O/video_silent.mp4
ffmpeg -v error -y -i $O/video_silent.mp4 -i "$MIX" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest $O/pitch_final.mp4
python3 scripts/short_qa.py $O/pitch_final.mp4 $O/qa scripts/pitch_shots.json
echo "final: $O/pitch_final.mp4"
