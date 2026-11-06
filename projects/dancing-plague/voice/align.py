# words.json: forced alignment of each script line (lines.json offsets) against voice.wav with pocketsphinx.
import json, os, re, numpy as np, soundfile as sf
from pocketsphinx import Decoder, get_model_path
HERE = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(get_model_path(), "en-us")
EXTRA = {"strasbourg": "S T R AA S B ER G", "troffea": "T R AA F IY AH", "frau": "F R AW", "unluckily": "AH N L AH K AH L IY", "drumbeat": "D R AH M B IY T"}
y, sr = sf.read(os.path.join(HERE, "voice.wav"), dtype="int16")
pcm = np.ascontiguousarray(y[::3])  # 48k -> 16k (voice is band-limited TTS from 24k)
lines = json.load(open(os.path.join(HERE, "lines.json")))
W = []
for L in lines:
    words = re.findall(r"[a-z']+", L["text"].lower())
    d = Decoder(loglevel="FATAL")
    for k, v in EXTRA.items():
        if d.lookup_word(k) is None: d.add_word(k, v, False)
    d.set_align_text(" ".join(words))
    a, b = int((L["start"] - 0.05) * 16000), int((L["end"] + 0.25) * 16000)
    d.start_utt(); d.process_raw(pcm[a:b].tobytes(), full_utt=True); d.end_utt()
    segs = [s for s in d.seg() if s.word not in ("<s>", "</s>", "<sil>", "(NULL)")]
    got = [re.sub(r"\(\d+\)$", "", s.word) for s in segs]
    if got == words[:-1]:  # hand-fix: aligner merged the last short word (e.g. "at it") into the previous one
        import copy
        last = segs[-1]; mid = (last.start_frame + last.end_frame) // 2
        tail = copy.copy(last); last.end_frame = mid; tail.start_frame = mid + 1
        segs.append(tail); got = words
        print("hand-fixed:", L["text"])
    assert got == words, (got, words)
    disp = re.findall(r"[A-Za-z']+[^\sA-Za-z']*", L["text"])
    for s, w in zip(segs, disp):
        t0 = a / 16000 + s.start_frame / 100; t1 = a / 16000 + (s.end_frame + 1) / 100
        W.append({"word": w, "start": round(t0, 3), "end": round(t1, 3)})
json.dump(W, open(os.path.join(HERE, "words.json"), "w"), indent=1)
print(len(W), "words, last end", W[-1]["end"])
