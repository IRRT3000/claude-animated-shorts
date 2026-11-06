# Sound for "The Summer Everyone Danced": an original score built round one dance tune of our own (a brisk Dorian
# round-dance in D, 4/4, 132 bpm: fife, tabor, a bowed fiddle, lute plucks) that the hired band plays for real on the
# stage (diegetic, shots 8c-10a), plus the comedy colour of the series (pizzicato, tuba, glock, brass stabs) +
# synthesized SFX timed to the picture (frames from remotion/src/videos/dance/story.ts + cast.ts) + the voice, gain only.
# "No music. No reason.": from Troffea's first step to the neighbours joining, only her feet on the cobbles.
# Standard mix: music +3 dB house standard (~-10 LU under the voice, ducked 3 dB on words), SFX -6 dB (~-14 LU).
# Master -16 LUFS, <= -1 dBTP, exactly TOTAL frames / 48 kHz.
import json
import os
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, make_ir, convolve_st, integrated, true_peak,
                 read_wav, write_wav, phase, colored, smooth_noise, reson)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 2070
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
TAU = 2 * np.pi
CUES = []
# story.ts
STEP_OUT, FIRST_DANCE, CLEAR, BUILD0, BUILD1, BAND_ON, EVERYONE, TEAR, BAND_OFF, BAN = 282, 322, 845, 889, 922, 958, 1147, 1231, 1265, 1296
YAWN1, YAWN2, NDANCE, FEET, SHOES, STOPPED = 1580, 1594, 1630, 1653, 1823, 1887


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts SHOTS)
SHOTS = [(0, 120, "square"), (120, 190, "square"), (190, 345, "street"), (345, 398, "street"), (398, 445, "lapse"), (445, 515, "street"),
         (515, 650, "square"), (650, 1345, "square"), (1345, 1526, "night"), (1526, 1686, "square"), (1686, 1911, "hill"),
         (1911, 1980, "dusk"), (1980, TOTAL, "hilldusk")]


def env_for(kinds, fade=0.15, spans=None):
    e = np.zeros(N)
    for a, b, k in (spans or SHOTS):
        if k in kinds:
            e[ns(fr(a)):min(N, ns(fr(b)))] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


# ================================================================ sounds of our own
def foot(r, hard=0.6):
    """a shoe on cobbles: a soft heel thump and a gritty scuff"""
    d = 0.12
    t = tt(d)
    th = lp(r.standard_normal(ns(d)), 380, 2) * np.exp(-t / 0.018) * 1.4
    sc = bp(r.standard_normal(ns(d)), 1800, 6000, 2) * np.exp(-t / 0.03) * 0.35 * hard
    return fades(th + sc, 0.001, 0.02)


def crowd_feet(d, r, people=60, rate=2.8):
    """many dancers stamping slightly out of step: dense heel thumps, stereo"""
    n = ns(d)
    out = np.zeros((2, n))
    for p in range(people):
        tm, rt, pp = r.uniform(0, 0.4), rate * r.uniform(0.9, 1.1), r.uniform(-0.9, 0.9)
        y = np.zeros(n)
        while tm < d - 0.15:
            x = foot(r, r.uniform(0.3, 0.9)) * r.uniform(0.4, 1.0)
            k = ns(tm)
            y[k:k + len(x)] += x[:n - k]
            tm += 1 / rt * r.uniform(0.85, 1.15)
        out += pan(y, pp)
    return out / np.sqrt(people)


def fiddle(f, dur, vel=0.7, r=None):
    """bowed fiddle: a bright saw-like additive tone with bow noise and a slow vibrato"""
    r = r or rng(0)
    n = ns(dur + 0.08)
    t = np.arange(n) / SR
    vib = 14 * np.clip((t - 0.12) / 0.15, 0, 1) * np.sin(TAU * 5.8 * t + r.uniform(0, TAU))
    ph = phase(f * 2 ** (vib / 1200))
    y = sum(np.sin(k * ph) / k ** 1.15 * (1.0 if k % 2 else 0.7) for k in range(1, 12) if k * f < 9000)
    y = peq(y, 2800, 5, 1.2)
    bow = bp(r.standard_normal(n), 2000, 7000, 1) * 0.06
    env = np.clip(t / 0.04, 0, 1) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return (y * 0.35 + bow) * env * vel


def tabor(vel=0.8, r=None):
    """a rope tabor: a short low snare-drum hit with loose wires"""
    return I.snare(vel, r, 0.28, 0.62, 0.45) * 0.9


def mixa(*xs):
    n = max(len(x) for x in xs)
    return sum(np.pad(x, (0, n - len(x))) for x in xs)


def hoof(r):
    d = 0.09
    t = tt(d)
    return fades(reson(r.standard_normal(ns(d)), r.uniform(700, 900), 6) * np.exp(-t / 0.012) + lp(r.standard_normal(ns(d)), 300) * np.exp(-t / 0.02), 0.001, 0.02)


def yawn(r, base=120, d=1.0):
    n = ns(d)
    t = np.arange(n) / SR
    f0 = base * G._track(n, [(0, 1.3), (d * 0.3, 1.5), (d, 0.85)], t)
    forms = G.vowel_track(n, [(0, "a"), (d * 0.5, "A"), (d * 0.85, "o"), (d, "u")])
    amp = np.clip(t / 0.15, 0, 1) * np.clip((d - t) / 0.25, 0, 1)
    return G.vox(f0, forms, amp, r, 1.0, tilt=1.2, breath=0.6)


def cough(r):
    d = 0.22
    t = tt(d)
    y = bp(r.standard_normal(ns(d)), 250, 2600, 1) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.004))
    o = G.oof(r, "ugh", 160)
    k = min(len(o), len(y))
    y[:k] += 0.4 * o[:k]
    return y


def bell(r, f=880.0, d=1.6):
    return mixa(G.clink(r, f, d, 0.8), 0.5 * G.clink(r, f * 2.76, d * 0.5, 0.6))


# ================================================================ SFX
def build_sfx():
    r = rng(41)
    S = np.zeros((2, N))
    day = env_for({"square", "street", "lapse"})
    S += G.breeze(DUR, r, 0.7, 0.25, 1100) * (day + env_for({"hill"}))[None, :] * dbg(-32)
    S += pan(G.bird_chirps(DUR, r, 0.6, "sparrow"), -0.3) * env_for({"street", "hill", "square"})[None, :] * dbg(-33)
    cr = G.crickets(DUR, r, 3)
    S += cr * env_for({"night", "dusk", "hilldusk"}, 0.3)[None, :] * dbg(-30)

    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def feet(f0, f1, every=11, g=-20, p=0.0):
        for f in range(f0, f1, every):
            cue(fr(f) + 0.01 * r.random(), "foot", foot(r, 0.7), g, p, S)

    def crowd(f0, f1, people, g, rate=2.8):
        d = fr(f1) - fr(f0)
        x = crowd_feet(d, r, people, rate)
        e = np.minimum(1, np.minimum(np.linspace(0, d / 0.3, x.shape[1]), np.linspace(d / 0.3, 0, x.shape[1])))
        cue(fr(f0), "crowd feet", x * e[None, :], g, 0.0, S)

    def murmur(f0, f1, g):
        d = fr(f1) - fr(f0)
        x = G.babble(d, r, 130, 1.0, 4.0, 0.7) + G.babble(d, r, 210, 1.15, 4.6, 0.6) + G.babble(d, r, 170, 1.05, 4.3, 0.6)
        e = np.minimum(1, np.minimum(np.linspace(0, d / 0.4, len(x)), np.linspace(d / 0.4, 0, len(x))))
        cue(fr(f0), "murmur", x * e, g, 0.0, S)

    # hook: the whole square stamping
    crowd(0, 186, 60, -10)
    murmur(0, 186, -26)
    whoosh(fr(84), 0.5, -20)
    whoosh(fr(190), 0.7, -16)                                      # flash -> Strasbourg
    # the street: a passer-by's steps; the door; Troffea's steps out; then only her feet ("no music, no reason")
    feet(196, 236, 14, -26, -0.3)
    cue(fr(STEP_OUT - 10), "door creak", G.creak(0.8, r, 120, 190), -18, 0.3, S)
    feet(STEP_OUT, STEP_OUT + 22, 9, -22, 0.2)
    feet(FIRST_DANCE, 445, 10, -14, 0.0)
    cue(fr(398), "time whoosh", G.whoosh(1.5, r, 0.5, 300, 3000, 1.0, 0.6, 0.4), -20, 0.0, S)
    for k in range(3):
        cue(fr(404) + k * 0.47, "cock crow", G.whoa(r, 420, 0.4) * 0.6, -30, -0.5, S)
    cue(fr(424), "stamp", G.push_thump(r), -14, 0.0, S)
    # thirty neighbours join: a pop each, the feet multiply
    for k in range(30):
        cue(fr(455 + k * 46 / 30), "pop", np.exp(-tt(0.1) / 0.015) * np.sin(phase(np.full(ns(0.1), 480.0 + 15 * k))), -30, r.uniform(-0.6, 0.6), S)
    crowd(450, 515, 30, -14)
    # four hundred: a roar of feet; ouch on "feet"
    crowd(515, 612, 140, -6, 3.0)
    murmur(515, 612, -24)
    feet(612, 650, 8, -12, 0.0)
    cue(fr(631), "ouch", G.oof(r, "ow", 150), -14, 0.0, S)
    # the doctors: the flask boils on "hot blood"; dance marks
    crowd(650, 828, 30, -20)
    cue(fr(705), "boil", G.bubbles(1.0, r, 24, 400, 2400), -16, 0.2, S)
    cue(fr(707), "sizzle", bp(r.standard_normal(ns(0.8)), 3000, 9000, 2) * np.linspace(1, 0, ns(0.8)) ** 2, -22, 0.2, S)
    # the council: the guild hall doors bang open, the clutter scrapes out
    cue(fr(CLEAR), "doors bang", mixa(G.push_thump(r), G.creak(0.5, r, 140, 90) * 0.5), -10, -0.3, S)
    for k in range(4):
        cue(fr(CLEAR + 3 + k * 3), "scrape", mixa(G.creak(0.4, r, 300, 200) * 0.5, bp(r.standard_normal(ns(0.4)), 800, 4000, 1) * 0.3), -22, -0.2, S)
    # the stage goes up: hammers and plank clunks
    for k in range(10):
        cue(fr(BUILD0 + k * 3.5), "plank", G.hammer_hit(r, 0.6), -18 - (k % 2) * 3, r.uniform(-0.4, 0.4), S)
    for k in range(14):
        cue(fr(889) + 0.15 * k, "hammer", G.hammer_hit(r, 0.3), -24, (-0.5, 0.5)[k % 2], S)
    for k in range(3):
        cue(fr(BAND_ON) + 0.08 * k, "boots on boards", G.boot(r, 0.8), -18, (k - 1) * 0.3, S)
    # the strong men: a heave
    cue(fr(1004), "heave", G.oof(r, "ugh", 110), -16, -0.2, S)
    cue(fr(1006), "heave", G.oof(r, "ugh", 95), -16, 0.2, S)
    # everyone: the crowd roar of feet + cheers
    crowd(1072, 1177, 50, -14)
    crowd(EVERYONE - 4, 1177, 140, -6, 3.2)
    for k in range(5):
        cue(fr(EVERYONE) + 0.1 * k, "cheer", G.hurrah(r, r.uniform(110, 190), r.uniform(0.95, 1.1)), -18, r.uniform(-0.6, 0.6), S)
    # the spin, the stage torn down, the band leaves, the bell of the ban
    cue(fr(1193), "spin swish", G.whoosh(0.7, r, 0.5, 600, 4000, 0.6, 0.2, 0.4), -14, 0.0, S)
    cue(fr(TEAR), "crash", G.timber_tear(r, 0.9), -8, 0.0, S)
    for k in range(6):
        cue(fr(TEAR + 6 + k * 3), "plank clatter", G.hammer_hit(r, 0.5), -16, r.uniform(-0.6, 0.6), S)
    feet(BAND_OFF, 1293, 9, -24, 0.3)
    for k in range(10):
        cue(fr(BAN - 2) + k * 0.17, "hand bell", bell(r, 1180 + 30 * (k % 2), 0.5), -14, -0.3, S)
    crowd(1293, 1345, 12, -20)
    # the night: wind, a dog, a cough or two; the curse: a low boom
    S += G.breeze(DUR, r, 1.0, 0.3, 600) * env_for({"night"}, 0.3)[None, :] * dbg(-28)
    crowd(1345, 1408, 20, -22, 2.4)
    for k in range(3):
        cue(fr(1426 + k * 22), "cough", cough(r), -14, 0.3, S)
    cue(fr(1475), "curse boom", lp(r.standard_normal(ns(1.6)), 120, 2) * np.exp(-tt(1.6) / 0.5) * 3, -10, 0.0, S)
    feet(1477, 1526, 9, -22, -0.2)
    # the yawns; the neighbour's feet; his feet
    cue(fr(YAWN1), "yawn", yawn(r, 115, 0.75), -12, -0.2, S)
    cue(fr(YAWN2), "yawn", yawn(r, 140, 0.8), -12, 0.2, S)
    feet(NDANCE, 1643, 9, -18, -0.2)
    for k in range(9):
        cue(fr(FEET + k * 4), "toe tap", foot(r, 0.4), -18 + min(k, 4), 0.0, S)
    # the hills: hooves and a creaking wagon; the chapel bell; the shoes; the stop
    for k in range(int((fr(1794) - fr(1686)) / 0.24)):
        cue(fr(1686) + 0.24 * k + 0.02 * r.random(), "hoof", hoof(r), -22 - 3 * (k % 2), 0.1, S)
    cue(fr(1690), "wagon creak", G.creak(3.2, r, 60, 80) * 0.4, -24, 0.0, S)
    for k in range(3):
        cue(fr(1748) + k * 0.9, "chapel bell", bell(r, 620, 2.4), -18, 0.0, S)
    cue(fr(SHOES), "sparkle", G.clink(r, 3200, 0.6, 0.6), -18, 0.0, S)
    feet(1850, STOPPED, 13, -18, 0.0)
    cue(fr(STOPPED + 4), "sigh", G.oof(r, "oh", 130), -18, -0.3, S)
    cue(fr(STOPPED + 9), "sigh", G.oof(r, "oh", 170), -20, 0.3, S)
    # the idle band: one drum tap; the button: a tap of red shoes
    cue(fr(1962), "drum tap", tabor(0.4, r), -14, 0.0, S)
    cue(fr(2040), "shoe tap", foot(r, 0.9), -12, 0.0, S)
    cue(fr(2041), "sparkle", G.clink(r, 3600, 0.5, 0.6), -20, 0.0, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 132.0
BEAT = 60 / BPM
BAR = 4 * BEAT
# our own round-dance in D Dorian (bar, beat, beats, midi)
THEME = [(0, 0, 1, 69), (0, 1, 1, 69), (0, 2, 1, 74), (0, 3, 1, 72),
         (1, 0, 1, 69), (1, 1, 0.5, 67), (1, 1.5, 0.5, 65), (1, 2, 2, 64),
         (2, 0, 1, 65), (2, 1, 1, 67), (2, 2, 1, 69), (2, 3, 1, 72),
         (3, 0, 3, 74),
         (4, 0, 1, 74), (4, 1, 0.5, 76), (4, 1.5, 0.5, 74), (4, 2, 1, 72), (4, 3, 1, 69),
         (5, 0, 1, 67), (5, 1, 0.5, 69), (5, 1.5, 0.5, 67), (5, 2, 1, 65), (5, 3, 1, 62),
         (6, 0, 1, 64), (6, 1, 1, 65), (6, 2, 1, 67), (6, 3, 1, 64),
         (7, 0, 3, 62)]
BASS = [38, 36, 41, 38, 41, 36, 33, 38]
CHORDS = [[62, 65, 69], [60, 64, 67], [65, 69, 72], [62, 65, 69], [65, 69, 72], [60, 64, 67], [57, 61, 64], [62, 65, 69]]


def build_music():
    r = rng(5)
    M = np.zeros((2, N))
    BANDB = np.zeros((2, N))   # the diegetic band (drier, its own room)
    ir = make_ir(1.0, 3, hf=1.4)

    def note(t, x, g, p=0.0, buf=None):
        place(M if buf is None else buf, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def tune(t0, bars, lead="fife", g=0.0, drum=True, bass=True, until=None, tempo=1.0, buf=None, start=0, oct_=0, fid=False):
        bt, br = BEAT / tempo, BAR / tempo
        for (b, be, ln, m) in THEME:
            for rep in range((start + bars + 7) // 8):
                bb = b + 8 * rep
                if not (start <= bb < start + bars):
                    continue
                t = t0 + (bb - start) * br + be * bt
                if until and t >= until:
                    continue
                if lead == "fife":
                    note(t, I.fife(F_(m + oct_), ln * bt * 0.9, 0.65, r), g - 8, 0.15, buf)
                elif lead == "pluck":
                    note(t, I.pluck(F_(m + oct_), 0.75, r, 0.6, 0.7, 0.14), g - 6, 0.15, buf)
                elif lead == "box":
                    note(t, I.musicbox(F_(m + 12 + oct_), 0.6, r, 1.4), g - 8, -0.1, buf)
                if fid:
                    note(t, fiddle(F_(m - 12 + oct_), ln * bt * 0.95, 0.6, r), g - 9, -0.3, buf)
        for b in range(start, start + bars):
            t = t0 + (b - start) * br
            if until and t >= until:
                continue
            if bass:
                note(t, I.pluck(F_(BASS[b % 8]), 0.8, r, 0.9, 0.3, 0.2), g - 6, -0.2, buf)
                note(t + 2 * bt, I.pluck(F_(BASS[b % 8] + 7), 0.6, r, 0.7, 0.3, 0.2), g - 9, -0.2, buf)
                for k in (1, 3):
                    for mm in CHORDS[b % 8]:
                        note(t + k * bt, I.pluck(F_(mm), 0.4, r, 0.35, 0.6, 0.15), g - 17, 0.25, buf)
            if drum:
                for k, v in ((0, 0.9), (1.5, 0.5), (2, 0.8), (3, 0.45), (3.5, 0.4)):
                    if until and t + k * bt >= until:
                        continue
                    note(t + k * bt, tabor(v, r), g - 9, 0.0, buf)

    def stab(t, ms, g=-10):
        for m in ms:
            note(t, I.brass(F_(m), 0.3, 0.85, r, "horn"), g, 0.0)
        note(t, I.brass(F_(ms[0] - 12), 0.3, 0.8, r, "tuba"), g - 2, 0.0)

    def glock(t, m, g=-10, p=0.3):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, p)

    # hook (0 - 6.3 s): the dance tune on fife and tabor, a stab on "dance"; on "more dancing" it goes double-time
    tune(0.15, 6, "fife", -2, until=fr(99))
    stab(fr(101), [62, 65, 69], -8)
    tune(fr(104), 2, "pluck", -6, drum=True, until=fr(159))
    stab(fr(161), [64, 67, 71], -8)
    tune(fr(163), 2, "fife", -3, tempo=1.25, until=fr(188))
    # Strasbourg, July: a calm lute line under the street; it stops dead when she starts dancing (no music)
    tune(fr(194), 6, "pluck", -8, drum=False, bass=True, tempo=0.6, until=fr(FIRST_DANCE - 2))
    # the time-lapse: a quick music-box swirl
    for k in range(10):
        note(fr(400) + k * 0.12, I.musicbox(F_([74, 77, 81, 86][k % 4]), 0.5, r, 1.0), -16, 0.2)
    # thirty neighbours: the tabor alone comes in on the stamps, then the 400: tabor + low drone + fife creeping in
    for b in range(int((fr(515) - fr(470)) / BEAT)):
        note(fr(470) + b * BEAT, tabor(0.5 + 0.3 * (b % 2 == 0), r), -12, 0.0)
    tune(fr(517), 8, "fife", -4, until=fr(608))
    note(fr(517), I.pad([F_(38), F_(45), F_(50)], fr(612) - fr(517), 0.5, r, 0.6, 0.6, 600), -14)
    note(fr(632), I.pluck(F_(41), 0.9, r, 0.6, 0.6), -8)      # "feet": a sour pluck
    note(fr(632) + 0.08, I.pluck(F_(40), 0.9, r, 0.6, 0.6), -8)
    # the doctors: comic pizzicato; a brass stab on "hot blood", a tuba "bwomp" on "out"
    for b in range(int((fr(704) - fr(652)) / BEAT)):
        note(fr(652) + b * BEAT, I.pluck(F_([50, 57, 53, 57][b % 4]), 0.6, r, 0.5, 0.4, 0.2), -12, 0.2 * (-1) ** b)
    stab(fr(707), [62, 66, 69], -6)
    for b in range(int((fr(806) - fr(738)) / BEAT)):
        note(fr(738) + b * BEAT, I.pluck(F_([50, 57, 53, 57][b % 4] + 2), 0.6, r, 0.5, 0.4, 0.2), -12, 0.2 * (-1) ** b)
    note(fr(809), I.brass(F_(38), 0.5, 0.8, r, "tuba", fall=-1.5), -8, 0.0)
    # the council: a busy pizz ostinato; a stab when the doors burst; the build on glock
    for b in range(int((fr(950) - fr(830)) / (BEAT / 2))):
        note(fr(830) + b * BEAT / 2, I.pluck(F_([62, 69, 65, 69][b % 4] + (12 if b % 8 > 5 else 0)), 0.45, r, 0.35, 0.6, 0.2), -15, 0.25 * (-1) ** b)
    stab(fr(CLEAR), [62, 65, 69], -9)
    for k in range(6):
        glock(fr(BUILD0) + k * 0.19, [74, 77, 81, 86, 81, 86][k], -16)
    # THE BAND (diegetic): fife + fiddle + tabor + lute from "hired a band" to the spin, louder on "everyone"
    tune(fr(BAND_ON + 3), 32, "fife", 0, until=fr(1190), buf=BANDB, fid=True)
    # the spin: a slide whistle; the crash; the band leaves on a sad tuba; the ban stops everything
    spin = I.fife(F_(86), 0.6, 0.5, r)
    note(fr(1193), spin * np.linspace(1, 0.2, len(spin)), -12, 0.0)
    stab(fr(TEAR), [61, 64, 67], -6)
    for k, m in enumerate((45, 44, 43, 41)):
        note(fr(BAND_OFF + 2) + k * 0.42, I.brass(F_(m), 0.4 if k < 3 else 0.9, 0.7, r, "tuba", fall=-1.0 if k == 3 else 0.0), -10, 0.0)
    # the night: a dark pad and a slow glock; the curse: low brass
    note(fr(1348), I.pad([F_(50), F_(53), F_(57)], fr(1475) - fr(1348), 0.5, r, 1.0, 0.8, 500), -16)
    for k in range(5):
        glock(fr(1352) + k * 0.9, [74, 72, 69, 65, 62][k], -20, 0.0)
    for m in (38, 41, 44):
        note(fr(1475), I.brass(F_(m), 1.4, 0.8, r, "soft"), -10, 0.0)
    note(fr(1502), I.timpani(F_(38), 0.8, r, 1.6), -10)
    # the yawns: a lazy music box; the feet start: the tune sneaks back on pizzicato
    for k, m in enumerate((74, 72, 69, 65, 69)):
        note(fr(1530) + k * 0.55, I.musicbox(F_(m + 12), 0.5, r, 1.4), -16, 0.0)
    tune(fr(1630), 3, "pluck", -8, drum=False, until=fr(1684))
    # the hills: the tune slow and pastoral on fife; a glock for the shoes; it slows and stops on "stopped"
    tune(fr(1688), 6, "fife", -6, drum=False, tempo=0.75, until=fr(1792))
    note(fr(1748), I.pad([F_(62), F_(65), F_(69)], 1.8, 0.5, r, 0.6, 0.8, 800), -18)
    for k, m in enumerate((86, 90, 93)):
        glock(fr(SHOES) + k * 0.1, m, -14, 0.0)
    tune(fr(1850), 2, "pluck", -10, drum=False, tempo=0.55, until=fr(STOPPED - 1))
    note(fr(STOPPED + 2), I.pad([F_(62), F_(66), F_(69)], 2.2, 0.5, r, 0.4, 1.2, 900), -14)
    # the idle band: one sad fife note falling; the button: a bright little three-note figure
    note(fr(1964), I.fife(F_(69), 0.9, 0.5, r) * np.linspace(1, 0.3, ns(0.95)), -12, 0.0)
    for k, m in enumerate((74, 78, 81)):
        note(fr(2040) + k * 0.11, I.pluck(F_(m), 0.7, r, 0.6, 0.7), -10, 0.1)
    glock(fr(2040) + 0.33, 86, -16, 0.0)
    wet = convolve_st(M, ir)
    out = M + wet * dbg(-9)
    # the band plays in the open square: a short slap of the houses, louder after "everyone"
    band = BANDB + convolve_st(BANDB, make_ir(0.6, 11, hf=1.2)) * dbg(-10)
    ramp = np.ones(N)
    ramp[ns(fr(BAND_ON)):ns(fr(1072))] = 0.8
    ramp[ns(fr(EVERYONE)):] = 1.25
    out += band * ramp[None, :]
    return out


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
        f.write("# Dancing plague short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("Music includes the diegetic band (fife, fiddle, tabor, lute) on the stage, 8c-10a.\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            if n_ not in ("foot", "pop", "hoof", "hammer", "toe tap", "hand bell", "plank", "plank clatter", "scrape"):
                f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
