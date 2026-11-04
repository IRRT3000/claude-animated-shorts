#!/bin/bash
# Final render of CoxShort in chunks (software GL in the cloud container is slow; each chunk is resumable).
# usage: scripts/render_cox.sh <first-chunk> <last-chunk>   (chunks of 128 frames, 0..15)
set -e
cd "$(dirname "$0")/.."
export TEMP=/home/user/remotion-tmp TMP=/home/user/remotion-tmp
CHROME=$(ls -d /opt/pw-browsers/chromium_headless_shell-1243/*/chrome-headless-shell)
mkdir -p out/cox/chunks
TOTAL=1940; STEP=128
for c in $(seq "$1" "$2"); do
  a=$((c * STEP)); b=$((a + STEP - 1)); [ $b -ge $TOTAL ] && b=$((TOTAL - 1)); [ $a -ge $TOTAL ] && break
  o=out/cox/chunks/c$(printf %02d $c).mp4
  [ -s "$o" ] && { echo "skip $o"; continue; }
  t0=$(date +%s)
  npx remotion render src/index.ts CoxShort "$o.part.mp4" --frames=$a-$b --scale 1.3333333333333333 --codec h264 --crf 16 \
    --gl=swangle --browser-executable="$CHROME" --concurrency=${CONC:-2} --timeout=240000 --log=error
  mv "$o.part.mp4" "$o"
  echo "chunk $c ($a-$b) $(( $(date +%s) - t0 ))s"
done
