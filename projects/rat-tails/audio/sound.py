# Sound for "The Rats That Kept Their Lives": an original score built round one sly tune of our own (a sneaking
# pentatonic caper in A minor, 2/4 feel at 116 bpm: pizzicato bass, plucked lead, glock, tuba, a light shaker) that
# changes colour with the place (sewer: low pad and drips; plague: a sour drone; farm and garden: the tune on fife),
# plus synthesized SFX timed to the picture (frames from remotion/src/videos/rats/story.ts + cast.ts) + the voice, gain only.
# Standard mix: music +3 dB house standard (~-10 LU under the voice, ducked 3 dB on words), SFX -6 dB (~-14 LU).
# Master -16 LUFS, <= -1 dBTP, exactly TOTAL frames / 48 kHz.
import json
import os
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, integrated, true_peak,
                 read_wav, write_wav, phase, reson)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 2010
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
TAU = 2 * np.pi
CUES = []
# story.ts
PAID, FARMING, SHINY, DARK, WARM, PRED, POP, JUMP, POINT = 52, 133, 251, 357, 370, 384, 426, 435, 556
EVERYONE, CENT, STINK, TAIL1, POURED, ANYWHERE = 806, 854, 932, 1018, 1065, 1148
NOTAIL, GRAB, SNIP, LETGO, MORE, MTAILS, FARMS, WEED, WEEDS, SCRAP, PLAGUE2, TAILS, ONE = 1238, 1290, 1332, 1354, 1395, 1419, 1528, 1594, 1655, 1703, 1741, 1870, 1926


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts SHOTS)
SHOTS = [(0, 106, "city"), (106, 169, "farm"), (169, 283, "city"), (283, 414, "sewer"), (414, 479, "bath"), (479, 542, "dusk"),
         (542, 613, "city"), (613, 647, "sewer"), (647, 752, "city"), (752, 785, "sewer"), (785, 1172, "city"), (1172, 1270, "city"),
         (1270, 1389, "alley"), (1389, 1454, "sewer"), (1454, 1554, "farm"), (1554, 1690, "garden"), (1690, 1737, "city"), (1737, TOTAL, "dusk")]


def env_for(kinds, fade=0.15):
    e = np.zeros(N)
    for a, b, k in SHOTS:
        if k in kinds:
            e[ns(fr(a)):min(N, ns(fr(b)))] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


def mixa(*xs):
    n = max(len(x) for x in xs)
    return sum(np.pad(x, (0, n - len(x))) for x in xs)


# ================================================================ sounds of our own
def squeak(r, f0=None, d=None, up=True):
    """a rat's squeak: a thin pitched chirp gliding up (or down) with a little vibrato"""
    f0 = f0 or r.uniform(2600, 3600)
    d = d or r.uniform(0.06, 0.14)
    t = tt(d)
    f = f0 * (1 + (0.35 if up else -0.25) * t / d) * (1 + 0.03 * np.sin(TAU * 38 * t))
    y = np.sin(phase(f)) + 0.3 * np.sin(phase(2 * f))
    return fades(y * np.sin(np.pi * t / d) ** 0.6, 0.002, 0.01)


def patter(d, r, rate=22.0):
    """tiny claws scurrying on stone"""
    n = ns(d)
    y = np.zeros(n)
    tm = 0.0
    while tm < d - 0.02:
        x = bp(r.standard_normal(ns(0.012)), 2500, 8000, 2) * np.exp(-tt(0.012) / 0.002) * r.uniform(0.4, 1.0)
        k = ns(tm)
        y[k:k + len(x)] += x[:n - k]
        tm += r.exponential(1 / rate)
    return y * np.minimum(1, np.minimum(np.linspace(0, d / 0.05, n), np.linspace(d / 0.05, 0, n)))


def drip(r, f=None):
    f = f or r.uniform(900, 1800)
    t = tt(0.25)
    return fades(np.exp(-t / 0.04) * np.sin(phase(f * (1 + 2.5 * t))), 0.001, 0.02)


def thud(r, f=90, d=0.25, g=1.0):
    t = tt(d)
    return fades(np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.06) * g + lp(r.standard_normal(ns(d)), 600) * np.exp(-t / 0.02) * 0.4, 0.001, 0.03)


def sack(r):
    """a burlap sack dropped: a soft heavy flump with a rustle"""
    t = tt(0.35)
    return mixa(thud(r, 70, 0.3, 1.2), bp(r.standard_normal(ns(0.35)), 900, 5000, 1) * np.exp(-t / 0.05) * 0.4)


def coin(r):
    return mixa(G.clink(r, 3300, 0.5, 0.9), 0.6 * G.clink(r, 4700, 0.35, 0.7))


def bell(r, f=1180.0, d=0.5):
    return mixa(G.clink(r, f, d, 0.8), 0.5 * G.clink(r, f * 2.76, d * 0.5, 0.6))


def pop_(r, f=520.0):
    return np.exp(-tt(0.1) / 0.015) * np.sin(phase(np.full(ns(0.1), f)))


def meow(r, sad=False):
    d = 0.7
    n = ns(d)
    t = np.arange(n) / SR
    f0 = 520 * G._track(n, [(0, 1.0), (d * 0.35, 1.25 if not sad else 1.05), (d, 0.75)], t)
    forms = G.vowel_track(n, [(0, "i"), (d * 0.3, "A"), (d * 0.8, "o"), (d, "u")])
    amp = np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.2, 0, 1)
    return G.vox(f0, forms, amp, r, 1.6, tilt=1.0, breath=0.3)


def snip(r):
    return mixa(G.clink(r, 5200, 0.08, 1.0), np.pad(G.clink(r, 4200, 0.1, 0.8), (ns(0.05), 0)))


# ================================================================ SFX
def build_sfx():
    r = rng(43)
    S = np.zeros((2, N))
    day = env_for({"city", "alley", "garden"})
    S += G.breeze(DUR, r, 0.6, 0.25, 1100) * (day + env_for({"farm", "dusk"}))[None, :] * dbg(-33)
    S += pan(G.bird_chirps(DUR, r, 0.7, "sparrow"), -0.3) * (day + env_for({"farm"}))[None, :] * dbg(-33)
    S += G.crickets(DUR, r, 3) * env_for({"dusk", "farm"}, 0.3)[None, :] * dbg(-32)
    sew = env_for({"sewer"}, 0.2)
    S += G.water_bed(DUR, r, 0.4, 0.5) * sew[None, :] * dbg(-26)
    for k in range(int(DUR * 2.2)):
        tm = r.uniform(0, DUR)
        if sew[min(N - 1, ns(tm))] > 0.5:
            cue(tm, "drip", drip(r), -26, r.uniform(-0.7, 0.7), S)

    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def steps(f0, f1, every=10, g=-24, p=0.0):
        for f in range(f0, f1, every):
            cue(fr(f) + 0.01 * r.random(), "step", G.stroll_step(r, 0.5), g, p, S)

    def squeaks(f0, f1, n, g=-20, p=0.0):
        for k in range(n):
            cue(fr(f0) + (fr(f1) - fr(f0)) * r.random(), "squeak", squeak(r, up=r.random() < 0.7), g, p + r.uniform(-0.4, 0.4), S)

    def scurry(f0, f1, g=-20, p=0.0):
        cue(fr(f0), "scurry", patter(fr(f1) - fr(f0), r), g, p, S)

    def murmur(f0, f1, g):
        d = fr(f1) - fr(f0)
        x = G.babble(d, r, 130, 1.0, 4.0, 0.7) + G.babble(d, r, 210, 1.15, 4.6, 0.6)
        e = np.minimum(1, np.minimum(np.linspace(0, d / 0.4, len(x)), np.linspace(d / 0.4, 0, len(x))))
        cue(fr(f0), "murmur", x * e, g, 0.0, S)

    # 1: the desk: a sack plonks, the coin; "kill rats": a squeak from the sack
    murmur(0, 106, -30)
    cue(fr(34), "sack", sack(r), -12, 0.1, S)
    cue(fr(PAID), "coin", coin(r), -12, 0.2, S)
    cue(fr(84), "squeak", squeak(r, 3000, 0.12), -18, 0.1, S)
    whoosh(fr(106), 0.5, -20)
    # 2: the farm: rats pop up in every cage, a chorus of squeaks
    for k in range(14):
        cue(fr(FARMING - 4 + (k % 7) * 1.5 + (3 if k >= 7 else 0)), "pop", pop_(r, 480 + 25 * k), -24, r.uniform(-0.6, 0.6), S)
    squeaks(FARMING, 166, 10, -22)
    whoosh(fr(169), 0.7, -16)
    # 3: Hanoi: water lapping by the lake, strollers; the manhole sparkles
    cue(fr(172), "lake", G.water_bed(2.0, r, 0.3, 0.6) * 0.6, -26, 0.0, S)
    steps(226, 283, 12, -28, 0.3)
    cue(fr(SHINY), "sparkle", G.clink(r, 3600, 0.6, 0.6), -16, 0.0, S)
    cue(fr(263), "sparkle", G.clink(r, 4400, 0.5, 0.6), -20, 0.1, S)
    # 4: the sewer: rats scurry in; content squeaks; "dark" a lamp fizz; the cat meows, its paw scrabbles
    scurry(290, 330, -18, -0.2)
    squeaks(325, 380, 6, -24)
    cue(fr(DARK), "lamp fizz", bp(r.standard_normal(ns(0.4)), 2000, 6000, 1) * np.exp(-tt(0.4) / 0.1) * 0.5, -22, 0.3, S)
    cue(fr(PRED - 6), "meow", meow(r), -14, 0.0, S)
    cue(fr(PRED + 2), "scrabble", patter(0.4, r, 40), -18, 0.0, S)
    cue(fr(PRED + 12), "sad meow", meow(r, True) * 0.7, -18, 0.0, S)
    # 5: the bathroom: whistling gent; the lid bangs up, splash, squeak; his yelp
    cue(fr(POP), "lid bang", mixa(thud(r, 180, 0.15), G.clink(r, 900, 0.12, 0.4)), -10, 0.2, S)
    cue(fr(POP), "splash", G.bubbles(0.4, r, 60, 500, 2500) * 0.8, -14, 0.2, S)
    cue(fr(POP + 4), "squeak", squeak(r, 3200, 0.16), -14, 0.2, S)
    cue(fr(JUMP), "yelp", G.whoa(r, 210, 0.5), -10, -0.2, S)
    # 6: plague: a low wind, distant shutters closing
    cue(fr(480), "ill wind", lp(r.standard_normal(ns(2.1)), 300, 2) * np.sin(np.linspace(0, np.pi, ns(2.1))) * 1.4, -14, 0.0, S)
    for k in range(4):
        cue(fr(500 + k * 9), "shutter", thud(r, 160, 0.12, 0.6), -24, r.uniform(-0.7, 0.7), S)
    # 7: hunters down the manhole: steps, ladder clangs
    cue(fr(POINT), "whistle", G.whoa(r, 300, 0.3) * 0.4, -24, 0.3, S)
    for k in range(4):
        for j in range(3):
            cue(fr(572 + k * 11 + j * 3), "ladder clang", G.clink(r, 700 + 60 * j, 0.25, 0.5), -20, -0.1, S)
    # 8: nets swish, rats squeal and scatter
    for k in range(3):
        whoosh(fr(616 + k * 9), 0.4, -18, (-0.3, 0.3)[k % 2])
    scurry(612, 647, -16)
    squeaks(612, 647, 8, -18)
    # 9: the pile: sacks thump down, faster, then a big mountain thump on "twenty thousand"
    for k in range(10):
        cue(fr(655) + 0.11 * k, "sack", sack(r), -16, r.uniform(-0.3, 0.3), S)
    for k in range(16):
        cue(fr(716) + 0.04 * k, "sack", sack(r), -14, r.uniform(-0.5, 0.5), S)
    cue(fr(720), "boom", thud(r, 55, 0.6, 1.5), -8, 0.0, S)
    murmur(700, 752, -24)
    # 10: rats stream past the tired hunter
    scurry(745, 785, -14, -0.2)
    squeaks(745, 785, 10, -22)
    cue(fr(758), "sigh", G.oof(r, "oh", 120), -16, 0.0, S)
    # 11: the bell, the rush of townsfolk; coin; sacks; stink; one tail; tails pouring; the rats watching
    for k in range(10):
        cue(fr(EVERYONE - 2) + k * 0.16, "hand bell", bell(r, 1180 + 30 * (k % 2)), -14, -0.3, S)
    for k in range(4):
        cue(fr(EVERYONE + 4) + 0.12 * k, "hurrah", G.hurrah(r, r.uniform(120, 200), r.uniform(0.95, 1.1)), -18, r.uniform(-0.6, 0.6), S)
    steps(EVERYONE + 2, 846, 4, -22)
    cue(fr(CENT), "coin", coin(r), -10, 0.0, S)
    for k in range(3):
        cue(fr(906 + k * 16), "sack", sack(r), -12, 0.2, S)
    cue(fr(STINK), "ugh", G.oof(r, "ugh", 150), -14, 0.0, S)
    cue(fr(TAIL1 + 2), "sparkle", G.clink(r, 3800, 0.5, 0.6), -18, 0.0, S)
    for k in range(9):
        cue(fr(POURED) + 0.13 * k, "coin", coin(r), -18, r.uniform(-0.4, 0.4), S)
    murmur(1050, 1100, -26)
    for k in range(16):
        cue(fr(1118 + (k % 8) * 2) + 0.01 * k, "pop", pop_(r, 600 + 20 * k), -26, r.uniform(-0.6, 0.6), S)
    squeaks(1120, 1170, 8, -22)
    # 12: a rat scurries past, the officials gasp; grab, snip, puff, the rat runs into the grate
    scurry(1198, NOTAIL - 4, -18, 0.4)
    cue(fr(NOTAIL + 2), "gasp", G.whoa(r, 180, 0.4), -14, 0.0, S)
    scurry(1272, GRAB, -18, 0.2)
    cue(fr(GRAB), "grab", thud(r, 200, 0.1, 0.6), -14, 0.0, S)
    cue(fr(GRAB + 2), "squeak", squeak(r, 3400, 0.18), -14, 0.0, S)
    cue(fr(SNIP), "snip", snip(r), -10, 0.0, S)
    cue(fr(SNIP + 1), "puff", bp(r.standard_normal(ns(0.3)), 400, 3000, 1) * np.exp(-tt(0.3) / 0.06), -16, 0.0, S)
    scurry(1350, LETGO + 2, -18)
    cue(fr(LETGO + 6), "happy squeak", squeak(r, 2800, 0.2), -14, 0.0, S)
    cue(fr(1372), "plop", G.bubbles(0.3, r, 40, 500, 1500) * 0.8, -18, 0.0, S)
    # 13: babies pop in round the tailless rat
    for k in range(9):
        cue(fr(MORE + k * 3), "baby pop", mixa(pop_(r, 700 + 40 * k), squeak(r, 4200, 0.06) * 0.5), -22, r.uniform(-0.5, 0.5), S)
    cue(fr(MTAILS), "sparkle", G.clink(r, 4000, 0.6, 0.7), -16, 0.0, S)
    # 14: the farm: squeaks everywhere, a rooster
    squeaks(1456, 1552, 16, -24)
    cue(fr(1470), "rooster", G.whoa(r, 420, 0.5) * 0.6, -28, -0.5, S)
    cue(fr(FARMS), "pop", pop_(r, 400), -18, 0.0, S)
    # 15: the garden: a weed pulled, a coin; weeds pop up everywhere; watering; the chest slams
    cue(fr(1584), "weed pull", mixa(bp(r.standard_normal(ns(0.25)), 300, 3000, 1) * np.exp(-tt(0.25) / 0.05), thud(r, 150, 0.1, 0.3)), -14, 0.1, S)
    cue(fr(WEED), "coin", coin(r), -12, -0.2, S)
    for k in range(24):
        cue(fr(1622) + 0.06 * k + 0.02 * r.random(), "weed pop", pop_(r, 300 + 15 * (k % 12)), -24, r.uniform(-0.7, 0.7), S)
    cue(fr(1640), "watering", bp(r.standard_normal(ns(1.6)), 2000, 8000, 1) * 0.3 * np.sin(np.linspace(0, np.pi, ns(1.6))), -22, 0.2, S)
    cue(fr(SCRAP), "slam", mixa(thud(r, 120, 0.3, 1.4), G.clink(r, 1400, 0.3, 0.6)), -6, -0.2, S)
    # 16: the plague wind down the boulevard, doors shutting; a flopped tail; the wink; the rat scampers off
    cue(fr(1738), "ill wind", lp(r.standard_normal(ns(1.8)), 300, 2) * np.sin(np.linspace(0, np.pi, ns(1.8))) * 1.4, -14, 0.0, S)
    for k in range(3):
        cue(fr(1752 + k * 10), "door", thud(r, 140, 0.15, 0.7), -22, r.uniform(-0.6, 0.6), S)
    cue(fr(TAILS + 2), "flop", thud(r, 260, 0.08, 0.3), -20, 0.0, S)
    cue(fr(ONE), "wink", G.clink(r, 4200, 0.4, 0.6), -14, 0.0, S)
    scurry(1966, 1986, -18, -0.4)
    cue(fr(1968), "squeak", squeak(r, 3000, 0.14), -16, -0.3, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 116.0
BEAT = 60 / BPM
BAR = 4 * BEAT
# our own sneaking caper in A minor pentatonic (bar, beat, beats, midi)
THEME = [(0, 0, 0.5, 69), (0, 0.5, 0.5, 72), (0, 1, 1, 74), (0, 2, 0.5, 76), (0, 2.5, 0.5, 74), (0, 3, 1, 72),
         (1, 0, 0.5, 69), (1, 0.5, 0.5, 67), (1, 1, 1, 69), (1, 2, 2, 64),
         (2, 0, 0.5, 69), (2, 0.5, 0.5, 72), (2, 1, 1, 74), (2, 2, 0.5, 79), (2, 2.5, 0.5, 76), (2, 3, 1, 74),
         (3, 0, 0.5, 72), (3, 0.5, 0.5, 74), (3, 1, 0.5, 72), (3, 1.5, 0.5, 69), (3, 2, 2, 69)]
BASS = [45, 43, 41, 40]


def build_music():
    r = rng(7)
    M = np.zeros((2, N))
    ir = make_ir(1.0, 3, hf=1.4)

    def note(t, x, g, p=0.0):
        place(M, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def tune(t0, bars, lead="pluck", g=0.0, bass=True, shaker=True, until=None, tempo=1.0, oct_=0, start=0):
        bt, br = BEAT / tempo, BAR / tempo
        for rep in range((start + bars + 3) // 4):
            for (b, be, ln, m) in THEME:
                bb = b + 4 * rep
                if not (start <= bb < start + bars):
                    continue
                t = t0 + (bb - start) * br + be * bt
                if until and t >= until:
                    continue
                if lead == "pluck":
                    note(t, I.pluck(F_(m + oct_), 0.75, r, 0.5, 0.7, 0.14), g - 6, 0.15)
                elif lead == "fife":
                    note(t, I.fife(F_(m + oct_), ln * bt * 0.9, 0.6, r), g - 8, 0.15)
                elif lead == "glock":
                    note(t, I.glock(F_(m + 12 + oct_), 0.6, r, 1.2), g - 10, -0.1)
                elif lead == "box":
                    note(t, I.musicbox(F_(m + 12 + oct_), 0.6, r, 1.4), g - 8, -0.1)
        for b in range(start, start + bars):
            t = t0 + (b - start) * br
            if until and t >= until:
                continue
            if bass:
                for k, dm in ((0, 0), (1, 7), (2, 0), (3, 7)):
                    if until and t + k * bt >= until:
                        continue
                    note(t + k * bt, I.pluck(F_(BASS[b % 4] + dm - (12 if k % 2 == 0 else 0)), 0.8, r, 0.35, 0.3, 0.2), g - 7, -0.2)
            if shaker:
                for k in range(8):
                    if until and t + k * bt / 2 >= until:
                        continue
                    note(t + k * bt / 2, I.brush(0.35 + 0.2 * (k % 2), r, 0.12), g - 18, 0.3)

    def stab(t, ms, g=-10):
        for m in ms:
            note(t, I.brass(F_(m), 0.3, 0.85, r, "horn"), g, 0.0)
        note(t, I.brass(F_(ms[0] - 12), 0.3, 0.8, r, "tuba"), g - 2, 0.0)

    def glock(t, m, g=-10, p=0.3):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, p)

    def tuba(t, m, d=0.4, g=-8, fall=0.0):
        note(t, I.brass(F_(m), d, 0.8, r, "tuba", fall=fall), g, 0.0)

    # 1-2: the caper; a stab on "rats"; the farm: the tune on fife, a glock flurry on "farming"
    tune(0.1, 6, "pluck", -2, until=fr(104))
    stab(fr(83), [57, 60, 64], -9)
    tune(fr(108), 2, "fife", -4, until=fr(166))
    for k, m in enumerate((81, 84, 86, 88, 91)):
        glock(fr(FARMING) + k * 0.07, m, -14)
    # 3: Hanoi: a calm, airy version (music box + soft pad); a glock sparkle on "shiny"
    note(fr(172), I.pad([F_(57), F_(64), F_(69)], fr(283) - fr(172), 0.45, r, 0.8, 0.8, 900), -16)
    tune(fr(172), 3, "box", -8, bass=False, shaker=False, tempo=0.8, until=fr(280))
    for k, m in enumerate((88, 93, 96)):
        glock(fr(SHINY) + k * 0.08, m, -14, 0.0)
    # 4: the sewer: a low pad, the caper on plucks low and slow; "dark" drops out; the cat: a sour horn
    note(fr(285), I.pad([F_(45), F_(52), F_(57)], fr(414) - fr(285), 0.5, r, 0.6, 0.6, 450), -14)
    tune(fr(325), 3, "pluck", -8, shaker=False, tempo=0.85, oct_=-12, until=fr(DARK - 2))
    tune(fr(WARM), 1, "pluck", -10, shaker=False, tempo=0.85, oct_=-12, until=fr(PRED - 4))
    note(fr(PRED), I.brass(F_(52), 0.6, 0.7, r, "horn", fall=-1.0), -12, 0.0)
    # 5: the bathroom: a prim little music box; a stab on the jump
    tune(fr(416), 1, "box", -10, bass=False, shaker=False, until=fr(POP - 2))
    stab(fr(JUMP), [60, 63, 66], -6)
    # 6: plague: a dark sour drone, low timpani
    note(fr(480), I.pad([F_(40), F_(46), F_(51)], fr(542) - fr(480), 0.55, r, 0.8, 0.4, 380), -10)
    note(fr(482), I.timpani(F_(40), 0.7, r, 1.8), -12)
    # 7: hunters: a march of the caper's bass with a snare
    for b in range(int((fr(613) - fr(546)) / BEAT)):
        t = fr(546) + b * BEAT
        note(t, I.pluck(F_([45, 52][b % 2] - 12), 0.8, r, 0.35, 0.3, 0.2), -8, -0.2)
        note(t, I.snare(0.4 + 0.2 * (b % 2 == 0), r, 0.2), -18, 0.1)
    # 8-9: killing: the caper fast; the pile grows on a rising tuba; "twenty thousand": a big stab
    tune(fr(614), 2, "pluck", -4, tempo=1.25, until=fr(645))
    for k, m in enumerate((33, 36, 38, 40, 43)):
        tuba(fr(655) + k * 0.28, m + 12, 0.25, -10)
    stab(fr(720), [57, 61, 64], -5)
    tune(fr(726), 1, "glock", -8, bass=False, shaker=False, until=fr(750))
    # 10: "wasn't enough": a sad tuba fall
    tuba(fr(756), 40, 0.9, -8, fall=-2.0)
    # 11: the caper in full for "everyone a rat hunter"; stinky slide on "dead rats"; glock on the tail
    tune(fr(EVERYONE - 2), 3, "pluck", -2, until=fr(882))
    glock(fr(CENT), 93, -12, 0.0)
    for k, m in enumerate((52, 51, 50, 49)):
        note(fr(STINK) + k * 0.12, I.brass(F_(m), 0.15, 0.6, r, "tuba"), -12, 0.0)
    for k, m in enumerate((84, 88, 91)):
        glock(fr(TAIL1) + k * 0.09, m, -12, 0.0)
    tune(fr(1052), 3, "pluck", -3, until=fr(1100))
    stab(fr(1103), [56, 59, 62], -8)
    tune(fr(1106), 2, "pluck", -6, tempo=0.8, oct_=-12, until=fr(1146))
    stab(fr(ANYWHERE), [57, 60, 63], -6)
    # 12: no tails: a sly plucked figure; a "bwomp" on "no tails"; the snip on glock
    tune(fr(1174), 3, "pluck", -6, shaker=False, until=fr(NOTAIL - 2))
    tuba(fr(1244), 45, 0.5, -6, fall=-1.5)
    tune(fr(1272), 4, "pluck", -4, until=fr(1388))
    glock(fr(SNIP), 96, -12, 0.0)
    # 13: more tails: music box twinkles per baby
    for k in range(9):
        note(fr(MORE + k * 3), I.musicbox(F_([81, 84, 86, 88, 91, 93, 96, 93, 91][k]), 0.5, r, 1.0), -14, 0.2 * (-1) ** k)
    # 14: the farm: the tune on fife, pastoral
    tune(fr(1456), 4, "fife", -4, shaker=False, tempo=0.9, until=fr(1552))
    stab(fr(FARMS), [57, 60, 64], -10)
    # 15: the garden: the caper on glock; a stab on "weeds"; the slam: everything stops
    tune(fr(1556), 4, "glock", -4, until=fr(1668))
    stab(fr(1670), [57, 61, 64], -6)
    tune(fr(1672), 1, "pluck", -8, until=fr(SCRAP - 2))
    stab(fr(SCRAP), [52, 55, 58], -4)
    # 16: plague anyway: the sour drone; then the caper slow and sad on the music box; the wink: the caper's last bar
    note(fr(1738), I.pad([F_(40), F_(46), F_(51)], fr(1795) - fr(1738), 0.55, r, 0.6, 0.6, 380), -10)
    note(fr(1740), I.timpani(F_(40), 0.7, r, 1.8), -12)
    tune(fr(1798), 3, "box", -8, bass=False, shaker=False, tempo=0.7, until=fr(1888))
    tuba(fr(TAILS), 45, 0.6, -8, fall=-1.0)
    tune(fr(ONE), 1, "pluck", -4, start=3, until=fr(1968))
    for k, m in enumerate((81, 84, 88)):
        note(fr(1970) + k * 0.1, I.pluck(F_(m), 0.7, r, 0.6, 0.7), -8, 0.1)
    glock(fr(1970) + 0.32, 93, -14, 0.0)
    wet = convolve_st(M, ir)
    return M + wet * dbg(-9)


# ================================================================ mix
def words():
    return json.load(open(os.path.join(ROOT, "voice", "words.json")))


def main():
    v, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR, sr
    v = st(v)
    v = np.pad(v, ((0, 0), (0, max(0, N - v.shape[1]))))[:, :N]
    Lv = lufs(v)
    m = build_music()[:, :N]
    s = build_sfx()[:, :N]
    key = np.zeros(N)
    for w in words():
        key[ns(w["start"] - 0.05):ns(w["end"] + 0.1)] = 1
    kk = ns(0.12)
    key = np.convolve(key, np.ones(kk) / kk, "same")
    m *= dbg(-3.0 * key)[None, :]
    m *= dbg((Lv - 10.0 + 3.0) - lufs(m))                 # music bed, +3 dB house standard
    s *= dbg((Lv - 14.0 - 6.0 + 6.0) - lufs(s))           # sfx -6 dB from the bridge reference (~-14 LU)
    mix = v + m + s
    G0 = -16.0 - lufs(mix)
    y = mix * dbg(G0)
    ceil = dbg(-1.5)
    if np.abs(y).max() > ceil:
        y = np.tanh(y / ceil) * ceil
    y = fades(y, 0.0, 0.05)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    write_wav(os.path.join(HERE, "stem_voice.wav"), v * dbg(G0))
    write_wav(os.path.join(HERE, "stem_music.wav"), m * dbg(G0))
    write_wav(os.path.join(HERE, "stem_sfx.wav"), s * dbg(G0))
    with open(os.path.join(HERE, "cues.md"), "w") as f:
        f.write("# Rat-tails short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            if n_ not in ("step", "pop", "drip", "squeak", "ladder clang", "sack", "coin", "weed pop", "hand bell", "baby pop"):
                f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
