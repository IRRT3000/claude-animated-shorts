# Picture timeline mirrored (read-only) from remotion/src/videos/ice/story.ts (+ cast.ts / sets.ts timings) so every
# sound lands on its frame. Change story.ts -> change this file -> re-run mix.py.
import json
import numpy as np

FPS = 30
TOTAL = 2080
DUR = TOTAL / FPS            # 69.333 s
fr = lambda f: f / FPS

W = dict(war=31, aircraft=78, ice0=112, y1942=141, sinking=192, steel=240, inventor=303, pyke=333, iceFree=368,
         free=383, ocean=402, admirals=452, cracks=500, mixes=530, sawdust=562, freezes=570, himself=623, pykrete=646,
         mountbatten=703, generals=786, pistol=823, shoots1=836, shatters=895, shoots2=940, bounces=995, back=1018,
         luckily=1066, unluckily=1119, interested=1176, tiny=1258, crack=1267, straight=1289, mud=1346, straw=1365,
         catches=1403, spreads=1441, sawdust2=1471, cold=1532, thousand=1605, test=1660, lake=1696, planes=1720,
         warOn=1754, cancelled=1814, only=1859, fought=1914, sat=1953, three=1991, summers=2008, lose=2026)
T_ = {k: fr(v) for k, v in W.items()}

SHOT1, SHOT2 = fr(W["shoots1"] + 2), fr(W["shoots2"] + 2)
SHATTER, RICO = fr(W["shatters"] - 2), fr(W["bounces"] - 2)
FLASH = fr(130)

# id: (first frame, end frame, set)
SHOTS = {1: (0, 130, "sea"), 2: (130, 240, "sea"), 3: (240, 287, "study"), 4: (287, 383, "study"), 5: (383, 449, "sea"),
         6: (449, 518, "study"), 7: (518, 671, "study"), 8: (671, 889, "room"), 9: (889, 927, "room"), 10: (927, 1066, "room"),
         11: (1066, 1119, "room"), 12: (1119, 1209, "room"), 13: (1209, 1321, "insert"), 14: (1321, 1471, "insert"),
         15: (1471, 1569, "insert"), 16: (1569, 1641, "sea"), 17: (1641, 1712, "lake"), 18: (1712, 1842, "lake"),
         19: (1842, TOTAL, "lake")}
XFADE = {2: 0, 5: 6, 13: 8, 16: 8, 17: 8, 19: 10}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def words(path):
    w = json.load(open(path, encoding="utf-8"))
    return [dict(w=x["w"], s=float(x.get("s", x.get("start"))), e=float(x.get("e", x.get("end")))) for x in w]
