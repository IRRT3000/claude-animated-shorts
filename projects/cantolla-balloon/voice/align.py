# words.json: forced alignment of each script line (lines.json offsets) against voice.wav with pocketsphinx.
# Display tokens keep the script spelling; numbers / accented names are expanded only for the aligner.
import json, os, re, unicodedata, numpy as np, soundfile as sf
from pocketsphinx import Decoder, get_model_path
HERE = os.path.dirname(os.path.abspath(__file__))
EXTRA = {"bullring": "B UH L R IH NG", "cantolla": "K AE N T OY AH", "charro": "CH AA R OW",
         "joaquin": "W AA K IY N", "moctezuma": "M AA K T EH Z UW M AH", "salto": "S AA L T OW",
         "unluckily": "AH N L AH K AH L IY"}
NUM = {"1863": "eighteen sixty three", "1914": "nineteen fourteen"}
def norm(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9'-]", "", t)
y, sr = sf.read(os.path.join(HERE, "voice.wav"), dtype="int16")
pcm = np.ascontiguousarray(y[::3])
lines = json.load(open(os.path.join(HERE, "lines.json")))
W = []
for L in lines:
    disp = L["text"].replace("...", "... ").split()
    toks = []  # (display index, aligner word)
    for i, d in enumerate(disp):
        n = norm(d)
        parts = NUM.get(n, n).replace("-", " ").split()
        toks += [(i, p) for p in parts if p]
    d = Decoder(loglevel="FATAL")
    for k, v in EXTRA.items():
        try: d.add_word(k, v, False)
        except RuntimeError: pass  # already in the dictionary
    d.set_align_text(" ".join(p for _, p in toks))
    a, b = int((L["start"] - 0.05) * 16000), int((L["end"] + 0.22) * 16000)
    d.start_utt(); d.process_raw(pcm[a:b].tobytes(), full_utt=True); d.end_utt()
    segs = [s for s in d.seg() if s.word not in ("<s>", "</s>", "<sil>", "(NULL)")]
    got = [re.sub(r"\(\d+\)$", "", s.word) for s in segs]
    want = [p for _, p in toks]
    if got != want:  # the aligner sometimes swallows a short last word: give the rest the tail of the line
        assert got == want[:len(got)], (got, want)
        print("tail-filled:", want[len(got):], "in", L["text"][:40])
        class S: pass
        t = segs[-1].end_frame + 1; e = int((L["end"] - a / 16000) * 100); n = len(want) - len(got)
        for j in range(n):
            s = S(); s.start_frame = t + (e - t) * j // n; s.end_frame = t + (e - t) * (j + 1) // n - 1; segs.append(s)
    span = {}
    for (i, _), s in zip(toks, segs):
        t0 = a / 16000 + s.start_frame / 100; t1 = a / 16000 + (s.end_frame + 1) / 100
        span[i] = (min(span.get(i, (t0, t1))[0], t0), max(span.get(i, (t0, t1))[1], t1))
    for i, dd in enumerate(disp):
        if i in span: W.append({"word": dd, "start": round(span[i][0], 3), "end": round(span[i][1], 3)})
json.dump(W, open(os.path.join(HERE, "words.json"), "w"), indent=1, ensure_ascii=False)
print(len(W), "words, last end", W[-1]["end"])
