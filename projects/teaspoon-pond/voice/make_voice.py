# Generate voice.wav for "The Teaspoon That Calmed a Pond" with Kokoro (kokoro-onnx), one steady narrator.
# Usage: python make_voice.py <model.onnx> <voices.bin> [voice] [speed]
import re, sys, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
HERE = os.path.dirname(os.path.abspath(__file__))
model, voices = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "am_michael"
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
txt = open(os.path.join(HERE, "..", "SCRIPT.md")).read()
lines = [l.strip() for l in txt.split("## Script")[1].split("##")[0].strip().splitlines() if l.strip()]
k = Kokoro(model, voices)
out, sr = [], 24000
LEAD = 0.3
t = LEAD; segs = []
for i, l in enumerate(lines):
    a, sr = k.create(l, voice=voice, speed=speed, lang="en-us")
    out.append(a.astype(np.float32))
    segs.append({"text": l, "start": round(t, 3), "end": round(t + len(a) / sr, 3)}); t += len(a) / sr
    gap = 0.12 if l.endswith(",") else 0.28
    out.append(np.zeros(int(sr * gap), np.float32)); t += int(sr * gap) / sr
y = np.concatenate([np.zeros(int(sr * LEAD), np.float32)] + out)
y = y / max(1e-6, np.abs(y).max()) * 0.89
sf.write(os.path.join(HERE, "voice_24k.wav"), y, sr)
import json; json.dump(segs, open(os.path.join(HERE, "lines.json"), "w"), indent=1)
print(voice, speed, f"{len(y)/sr:.2f}s")
