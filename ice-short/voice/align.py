# Word timings without an STT model: each word of a line is synthesized alone with the same voice/speed to get its
# relative length; those lengths are scaled to the line's real span (lines.json) and each boundary is snapped to the
# lowest-energy 10 ms frame within +-80 ms. Output words.json: [{"w","start","end"}] in seconds.
import sys, json, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
model, voices, VOICE, SPEED = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
k = Kokoro(model, voices); y, sr = sf.read("voice.wav")
hop = sr // 100; env = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y), hop)])
def snap(t):
    c = int(t * 100); lo, hi = max(c - 8, 0), min(c + 9, len(env)); return (lo + int(np.argmin(env[lo:hi]))) / 100
words = []
for L in json.load(open("lines.json")):
    ws = re.findall(r"[A-Za-z0-9'\-]+", L["text"])
    lens = []
    for w in ws:
        a, _ = k.create(w.replace("Pykrete", "Pike-reet").replace("pykrete", "pike-reet"), voice=VOICE, speed=SPEED, lang="en-us")
        nz = np.where(np.abs(a) > 0.01)[0]; lens.append((nz[-1] - nz[0]) / sr if len(nz) else 0.1)
    lens = np.array(lens); span = L["end"] - L["start"]
    b = L["start"] + np.concatenate([[0], np.cumsum(lens)]) * span / lens.sum()
    b[1:-1] = [snap(t) for t in b[1:-1]]
    for i, w in enumerate(ws): words.append({"w": w, "start": round(float(b[i]), 3), "end": round(float(max(b[i + 1], b[i] + 0.05)), 3)})
json.dump(words, open("words.json", "w"), indent=0)
print(len(words), "words, last end", words[-1]["end"])
