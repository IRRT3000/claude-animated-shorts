# Local voice for "The Ship Made of Ice": Kokoro-82M (onnx, Apache-2.0), one voice, one steady tone.
# Lines are synthesized one by one and joined with fixed pauses -> voice.wav (24 kHz mono) + lines.json (line times).
# usage: python tts.py <model.onnx> <voices.bin> [voice] [speed]
import sys, json, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
model, voices = sys.argv[1], sys.argv[2]
VOICE = sys.argv[3] if len(sys.argv) > 3 else "bm_george"
SPEED = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
txt = open("../../scripts_ice/SCRIPT.md").read().split("## Script")[1].split("\n## ")[0]
lines = [l.strip() for l in txt.splitlines()[1:] if l.strip()]
k = Kokoro(model, voices)
GAP = {"short": 0.22, "line": 0.38, "beat": 0.6}
out, meta, t, sr = [], [], 0.0, 24000
for i, l in enumerate(lines):
    a, sr = k.create(l.replace("Pykrete", "Pike-reet").replace("pykrete", "pike-reet"), voice=VOICE, speed=SPEED, lang="en-gb" if VOICE.startswith("b") else "en-us")
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(nz[0] - 240, 0): nz[-1] + 480]   # trim edge silence
    meta.append({"i": i, "text": l, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out.append(a); t += len(a) / sr
    g = GAP["beat"] if l.endswith(("shatters.", "room.", "interested.", "spreads.", "cancelled.")) or i == 0 else GAP["short"] if len(l) < 25 else GAP["line"]
    out.append(np.zeros(int(g * sr), np.float32)); t += g
y = np.concatenate(out); y = y / np.abs(y).max() * 0.89
sf.write("voice.wav", y, sr, subtype="PCM_16")
json.dump(meta, open("lines.json", "w"), indent=1)
print(f"{VOICE} x{SPEED}: {len(y)/sr:.1f} s, {len(lines)} lines")
