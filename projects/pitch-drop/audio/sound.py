# Sound for "The Drop Nobody Has Ever Seen": original score (a patient little 1920s-flavoured theme in F, 4/4, 92 bpm:
# pizzicato plucks, music box, flute, warm pads, a deadpan tuba, a small brass fanfare) + synthesized SFX timed to the
# picture (frames from remotion/src/videos/pitch/story.ts + cast.ts) + the voice, gain only. A quiet wall clock ticks in
# the lab; every drop lands with a soft "plip"; the twist ends on the bump, the last plip, a beat of silence, a button.
# Standard mix: music +3 dB house standard (~-10 LU under the voice, ducked 3 dB on words), SFX -6 dB (~-14 LU).
# Master -16 LUFS, <= -1 dBTP, exactly TOTAL frames / 48 kHz.
import json
import os
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, integrated, true_peak,
                 read_wav, write_wav, modal, phase, colored)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 2010
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []
# story.ts
FALLS = [646, 698, 741, 1024, 1108, 1247]
FALL_F = 6
BUMP, SEPARATE, TOUCH, STEM_CUT, SHATTER, POWER_OFF = 1928, 1931, 1842, 541, 363, 1236
LIGHTNING = [1180, 1247, 1294]


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts)
SHOTS = {1: (0, 80, "campus"), 101: (80, 160, "close"), 2: (160, 423, "lab"), 4: (423, 474, "close"), 104: (474, 534, "lab"),
         5: (534, 572, "close"), 105: (572, 638, "lab"), 106: (638, 719, "close"), 7: (719, 968, "lab"), 9: (968, 1013, "close"),
         10: (1013, 1166, "lab"), 12: (1166, 1314, "night"), 13: (1314, 1550, "close"), 15: (1550, 1637, "stage"),
         16: (1637, 1745, "lab"), 17: (1745, 1880, "close"), 117: (1880, 1940, "lab"), 217: (1940, TOTAL, "close")}


def env_for(kind, fade=0.2):
    e = np.zeros(N)
    for a, b, k in SHOTS.values():
        if k == kind:
            e[ns(fr(a)):min(N, ns(fr(b)))] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


# ================================================================ SFX
def plip_sound(r, big=1.0):
    """a drop of pitch landing: a soft dull 'plip' (a falling pitched blip + a tiny thud), no splash"""
    d = 0.35
    t = tt(d)
    f = 1150 * (1 + 0.9 * np.exp(-t / 0.012))
    blip = np.sin(phase(f)) * np.exp(-t / 0.035)
    thud = np.sin(phase(np.full(len(t), 180.0))) * np.exp(-t / 0.05) * 0.6
    return (blip * 0.8 + thud) * big


def tick_sound(r, tock):
    k = modal(0.1, [(1300 if tock else 1500, 1.0, 0.008), (3100, 0.35, 0.004)], r)
    return k * 0.7


def paper(r, d=0.18):
    n = ns(d)
    t = tt(d)
    return bp(r.standard_normal(n), 1500, 7000, 2) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.005))


def build_sfx():
    r = rng(23)
    S = np.zeros((2, N))
    campus, lab, close, night, stagee = (env_for(k) for k in ("campus", "lab", "close", "night", "stage"))
    room = lp(colored(N, r, 1.0), 380, 2)
    S += np.stack([room, room]) * (lab + close + 0.7 * night)[None, :] * dbg(-42)
    S += G.breeze(DUR, r, 0.7, 0.25, 1100) * campus[None, :] * dbg(-32)
    S += pan(G.bird_chirps(DUR, r, 0.6, "sparrow"), -0.3) * campus[None, :] * dbg(-33)
    S += pan(G.bird_chirps(DUR, r, 0.25, "sparrow"), 0.5) * (lab * 0.5)[None, :] * dbg(-44)     # outside the window
    # ---- the lab clock: a quiet tick every second in the lab (louder in the 2013 silence), none at night after the cut
    fN = np.arange(N) / SR * FPS
    tickE = (0.35 * lab + 0.2 * close) * (1 - night) + 0.0 * stagee
    tickE[ns(fr(1637)):ns(fr(1745))] *= 2.2
    for s in range(int(DUR) + 1):
        t = s + 0.04
        if t >= DUR:
            break
        g = tickE[min(N - 1, ns(t))]
        if g > 0.02:
            cue(t, "tick", tick_sound(r, s % 2 == 1), -16 + 20 * np.log10(g), 0.35, S)
    # ---- the storm (shot 12): rain on the windows, thunder after each lightning flash, lamp hum until the cut
    rainE = night.copy()
    rain = np.stack([hp(colored(N, r, 0.3), 1300, 2), hp(colored(N, r, 0.3), 1300, 2)])
    S += rain * rainE[None, :] * dbg(-30)
    S += G.breeze(DUR, r, 1.3, 0.5, 900) * night[None, :] * dbg(-30)
    hum_t = np.arange(N) / SR
    hum = (np.sin(2 * np.pi * 100 * hum_t) * 0.6 + np.sin(2 * np.pi * 200 * hum_t) * 0.3 + np.sin(2 * np.pi * 300 * hum_t) * 0.15)
    humE = night * (fN < POWER_OFF)
    S += np.stack([hum, hum]) * humE[None, :] * dbg(-40)

    def thunder(t, g, d=3.0):
        n = ns(d)
        e = np.exp(-tt(d) / 1.0) * (1 - np.exp(-tt(d) / 0.04))
        x = lp(colored(n, r, 1.8), 280, 2) * e + hp(r.standard_normal(n), 2000) * np.exp(-tt(d) / 0.05) * 0.25
        cue(t, "thunder", x / np.abs(x).max(), g, 0.0, S)

    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def swish(t, g=-22):
        cue(t, "cloth swish", G.whoosh(0.35, r, 0.4, 900, 4500, 0.6, 0.15, 0.3), g, 0.0, S)

    def steps(f0, f1, every=14, g=-28, p=0.0):
        for k, f in enumerate(range(f0, f1, every)):
            cue(fr(f), "step", G.stroll_step(r, 0.4), g, p, S)

    def sting(t, g=-14):  # a shock "boing-ish" wobble: two quick detuned pings
        d = tt(0.5)
        x = np.sin(phase(880 * (1 + 0.08 * np.sin(phase(np.full(len(d), 14.0)))))) * np.exp(-d / 0.18)
        cue(t, "shock ping", x, g, 0.0, S)

    # hook
    steps(6, 78, 15, -30, -0.3)
    whoosh(fr(80), 0.5, -22)
    cue(fr(106), "glass ting", G.clink(r, 5400, 0.7, 1.2), -22, 0.15, S)        # "nobody": the drop glints
    whoosh(fr(160), 0.7, -16)                                                    # flash -> Parnell
    swish(fr(244), -22)                                                          # sly head tilt
    cue(fr(264), "shimmer", G.whoosh(0.9, r, 0.2, 2000, 8000, 0.5, 0.4, 0.6), -20, 0.0, S)
    # the hammer
    swish(fr(346), -24)
    cue(fr(SHATTER), "hammer hit", G.hammer_hit(r, 1.0), -10, -0.1, S)
    for k in range(9):                                                          # shards of pitch skittering like glass
        cue(fr(SHATTER) + 0.03 + 0.045 * k + 0.02 * r.random(), "shard", G.clink(r, np.exp(r.uniform(np.log(2500), np.log(6500))), 0.18, 1.0), -18 - k, r.uniform(-0.5, 0.5), S)
    for k in range(5):
        cue(fr(SHATTER) + 0.35 + 0.12 * k, "shard on bench", G.clink(r, 1800 + 200 * k, 0.1, 0.6), -24 - 2 * k, r.uniform(-0.4, 0.4), S)
    # the pour: thick slow gloops
    for k in range(6):
        cue(fr(432) + 0.22 * k, "gloop", lp(G.bubbles(0.35, r, 6, 150, 500, (0.03, 0.08)), 900, 2), -16, 0.0, S)
    # calendar pages (story.ts calendarAt: page steps)
    for (a, b, n0) in ((476, 528, 6), (612, 640, 8), (721, 768, 10), (1014, 1036, 1), (1504, 1546, 10)):
        for k in range(n0):
            cue(fr(a + (b - a) * (k + 0.5) / n0), "page flip", paper(r), -22 - (2 if n0 > 5 else 0), -0.3, S)
    # snip
    cue(fr(STEM_CUT), "snip", G.clink(r, 3600, 0.12, 1.2) + np.pad(hp(r.standard_normal(ns(0.04)), 2500) * 0.4 * np.exp(-tt(0.04) / 0.01), (0, ns(0.12) - ns(0.04))), -14, 0.1, S)
    # the drops: a plip each, a little shimmer of a fall before
    for x in FALLS:
        cue(fr(x + FALL_F), "plip", plip_sound(r), -12, 0.0, S)
    # Mainstone: door creak, steps
    cue(fr(774), "door creak", G.creak(0.9, r, 120, 200), -26, 0.4, S)
    steps(778, 832, 13, -28, 0.3)
    cue(fr(840), "chair creak", G.creak(0.4, r, 160, 120), -28, 0.2, S)
    # missed by a day
    cue(fr(1031), "door", G.creak(0.5, r, 140, 220), -26, 0.4, S)
    steps(1032, 1040, 5, -26, 0.3)
    sting(fr(1042), -16)
    cue(fr(1046), "briefcase drop", G.push_thump(r), -20, 0.3, S)
    # stepped out for a drink
    cue(fr(1070), "chair creak", G.creak(0.35, r, 150, 110), -28, 0.2, S)
    steps(1074, 1100, 9, -28, 0.4)
    cue(fr(1100), "door", G.creak(0.5, r, 160, 230), -28, 0.5, S)
    steps(1116, 1129, 6, -26, 0.4)
    cue(fr(1122), "tea slurp", bp(r.standard_normal(ns(0.3)), 800, 3000, 2) * np.sin(np.pi * np.linspace(0, 1, ns(0.3))) * 0.5, -26, 0.4, S)
    sting(fr(1133), -15)
    # the night: thunder, the camera's whirr and click, the power cut clunk
    for x, g in zip(LIGHTNING, (-14, -10, -9)):
        thunder(fr(x) + 0.25, g)
    cue(fr(1190), "camera click", G.clink(r, 2200, 0.08, 0.8) + np.pad(G.clink(r, 1500, 0.06, 0.6), (0, ns(0.08) - ns(0.06))), -18, 0.1, S)
    whirr = np.sin(phase(np.full(ns(1.2), 620.0))) * 0.2 * np.sin(np.pi * np.linspace(0, 1, ns(1.2))) ** 0.5
    cue(fr(1196), "camera whirr", whirr, -30, 0.1, S)
    cue(fr(POWER_OFF), "power clunk", G.push_thump(r) * 1.2, -12, 0.0, S)
    cue(fr(POWER_OFF), "lamp tink", G.clink(r, 2900, 0.25, 0.7), -22, 0.2, S)
    cue(fr(1288), "camera dies", np.sin(phase(np.linspace(620, 120, ns(0.6)))) * np.linspace(0.4, 0, ns(0.6)), -22, 0.1, S)
    whoosh(fr(1314), 0.6, -22)
    # the explainer: water trickle vs silent pitch, honey
    wat = G.bubbles(fr(1467) - fr(1314), r, 40, 900, 3200, (0.003, 0.015))
    cue(fr(1314), "water trickle", wat * np.minimum(1, np.linspace(0, 8, len(wat))), -22, -0.2, S)
    cue(fr(1530), "honey glorp", lp(G.bubbles(0.5, r, 3, 120, 380, (0.05, 0.12)), 700, 2), -18, 0.2, S)
    # the prize
    whoosh(fr(1550), 0.8, -18)
    cue(fr(1612), "applause", G.applause(2.4, r, 40) * np.linspace(1, 0.35, ns(2.4))[None, :], -14, 0.0, S)
    cue(fr(1612), "confetti pop", np.exp(-tt(0.2) / 0.03) * np.sin(phase(np.full(ns(0.2), 400.0))) + hp(r.standard_normal(ns(0.2)), 3000) * np.exp(-tt(0.2) / 0.01) * 0.5, -16, 0.0, S)
    # the twist: the jar lifted (glass ring), the bump, the last plip
    cue(fr(1886), "glass lift", G.clink(r, 4400, 0.8, 1.0), -22, 0.0, S)
    cue(fr(BUMP), "bump", G.push_thump(r), -10, 0.0, S)
    for k in range(4):
        cue(fr(BUMP) + 0.04 + 0.05 * k, "glass rattle", G.clink(r, 3800 + 500 * k, 0.15, 0.8), -20 - 2 * k, r.uniform(-0.3, 0.3), S)
    cue(fr(SEPARATE + 2), "the last plip", plip_sound(r, 1.0), -9, 0.0, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 92.0
BEAT = 60 / BPM
BAR = 4 * BEAT
# our own patient theme in F (bar, beat, beats, midi)
THEME = [(0, 0, 1, 72), (0, 1, 1, 69), (0, 2, 2, 65),
         (1, 0, 1, 67), (1, 1, 1, 69), (1, 2, 1, 70), (1, 3, 1, 72),
         (2, 0, 2, 74), (2, 2, 1, 72), (2, 3, 1, 69),
         (3, 0, 3, 67),
         (4, 0, 1, 72), (4, 1, 1, 69), (4, 2, 2, 65),
         (5, 0, 1, 67), (5, 1, 1, 69), (5, 2, 1, 70), (5, 3, 1, 74),
         (6, 0, 1, 72), (6, 1, 1, 70), (6, 2, 1, 69), (6, 3, 1, 67),
         (7, 0, 4, 65)]
CHORDS = [[41, 57, 60, 65], [36, 55, 58, 64], [38, 57, 62, 65], [36, 55, 60, 64], [41, 57, 60, 65], [34, 58, 62, 65], [36, 55, 58, 64], [41, 57, 60, 65]]


def build_music():
    r = rng(5)
    M = np.zeros((2, N))
    ir = make_ir(1.4, 3, hf=1.4)
    MUTE = [(fr(361), fr(372)), (fr(POWER_OFF), fr(1312)), (fr(BUMP), fr(1952))]   # dead stops

    def note(t, x, g, p=0.0):
        if any(a <= t < b for a, b in MUTE):
            return
        place(M, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def theme(t0, bars, lead="pluck", g=0.0, bass=True, chords=True, oct_=0, start_bar=0, until=None, tempo=1.0):
        bt, br = BEAT / tempo, BAR / tempo
        for (b, be, ln, m) in THEME:
            if not (start_bar <= (b % 8) < start_bar + bars):
                continue
            t = t0 + ((b % 8) - start_bar) * br + be * bt
            if until and t >= until:
                continue
            if lead == "pluck":
                note(t, I.pluck(F_(m + oct_), 0.8, r, 0.8, 0.7, 0.14), g - 6, 0.15)
            elif lead == "fife":
                note(t, I.fife(F_(m + oct_), ln * bt * 0.95, 0.6, r), g - 10, 0.1)
            elif lead == "box":
                note(t, I.musicbox(F_(m + 12 + oct_), 0.6, r, 1.6), g - 8, -0.1)
        for b in range(start_bar, start_bar + bars):
            t = t0 + (b - start_bar) * br
            if until and t >= until:
                continue
            ch = CHORDS[b % 8]
            if bass:
                note(t, I.pluck(F_(ch[0]), 0.8, r, 1.1, 0.3, 0.2), g - 7, -0.2)
                note(t + 2 * bt, I.pluck(F_(ch[0] + 7), 0.6, r, 0.8, 0.3, 0.2), g - 10, -0.2)
            if chords:
                for k in (1, 3):
                    for m in ch[1:]:
                        note(t + k * bt, I.pluck(F_(m), 0.45, r, 0.4, 0.6, 0.15), g - 16, 0.25)

    def padc(t, ch, d, g, warm=900):
        note(t, I.pad([F_(m) for m in ch], d, 0.5, r, 0.5, 1.0, warm), g)

    def glock(t, m, g=-10, p=0.3):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, p)

    # hook (0 - 5.3 s): light pizzicato theme; a glock "drop" on "nobody"
    theme(0.25, 3, "pluck", -2, chords=False, until=fr(158))
    for k, m in enumerate((84, 81, 77)):
        glock(fr(106) + k * 0.14, m, -12)
    # Parnell (5.3 - 14 s): the full theme, a stop before the hammer, a crash on "shatters"
    theme(fr(162), 8, "pluck", 0, until=fr(361))
    note(fr(SHATTER), I.cymbal(0.6, r, 1.6, 1.0), -16)
    note(fr(SHATTER), I.timpani(F_(41), 0.8, r, 1.6), -10)
    # the time-lapse (14 - 25.7 s): music box theme, a glock plip on every drop
    theme(fr(424), 8, "box", -2, bass=True, chords=False, until=fr(770))
    for x in FALLS[:3]:
        glock(fr(x + FALL_F), 89, -12, 0.0)
    # Mainstone (25.7 - 31.3 s): warm flute theme over a pad
    theme(fr(774), 4, "fife", -1, bass=True, chords=True, start_bar=0, until=fr(936))
    padc(fr(774), [57, 60, 65], 5.4, -18, 800)
    # unluckily: a deadpan tuba walking down
    for k, m in enumerate((41, 40, 38, 36)):
        note(fr(942) + 0.1 + k * 0.42, I.brass(F_(m), 0.38, 0.7, r, "tuba"), -12, -0.1)
    # the misses (33.8 - 38.9 s): pizzicato tiptoe, tuba "wah-wah" on each miss
    for b in range(4):
        t = fr(1014) + b * BAR
        for k in range(4):
            note(t + k * BEAT, I.pluck(F_([53, 57, 60, 57][k] + (2 if b % 2 else 0)), 0.5, r, 0.4, 0.5, 0.2), -14, 0.2 * (-1) ** k)
    for f0 in (1042, 1133):
        for k, m in enumerate((46, 45)):
            note(fr(f0) + 0.05 + k * 0.3, I.brass(F_(m), 0.3 if k == 0 else 0.6, 0.8, r, "tuba", fall=-1.0 if k else 0.0), -10, 0.0)
    # the night (38.9 - 43.8 s): low tremolo pad, a timpani roll toward the drop, silence at the power cut
    padc(fr(1168), [38, 45, 50, 53], fr(POWER_OFF) - fr(1168), -14, 600)
    for k in range(18):
        note(fr(1200) + k * 0.09, I.timpani(F_(38), 0.25 + 0.4 * k / 18, r, 0.6), -18 + 6 * k / 18)
    # the explainer (43.8 - 51.7 s): soft ostinato + pad
    for b in range(int((fr(1548) - fr(1316)) / BAR)):
        t = fr(1316) + b * BAR
        ch = CHORDS[(b // 2) % 4]
        for k in range(4):
            note(t + k * BEAT, I.pluck(F_(ch[1 + k % (len(ch) - 1)]), 0.5, r, 0.6, 0.5, 0.18), -15, 0.3 * (-1) ** k)
        if b % 2 == 0:
            padc(t, [m + 12 for m in ch[1:]], BAR * 2, -20, 800)
    glock(fr(1406), 84, -13)   # "billion"
    glock(fr(1486), 77, -14)   # "honey"
    # the prize (51.7 - 54.6 s): a small brass fanfare on the theme's head
    for k, (dt, m, d) in enumerate(((0.0, 65, 0.22), (0.24, 69, 0.22), (0.48, 72, 0.5), (1.0, 77, 0.9))):
        note(fr(1600) + dt, I.brass(F_(m), d, 0.85, r, "horn"), -9, 0.0)
        note(fr(1600) + dt, I.brass(F_(m - 12), d, 0.7, r, "tuba"), -12, 0.0)
    note(fr(1612), I.cymbal(0.5, r, 2.0, 0.8), -18)
    # 2013 (54.6 - 58.2 s): music box alone, slower
    theme(fr(1640), 3, "box", -6, bass=False, chords=False, tempo=0.8, until=fr(1745))
    padc(fr(1640), [53, 57, 60], 3.6, -20, 600)
    # the twist (58.2 - 64.3 s): the theme returns as a creeping pizzicato, rising, then stops dead on the bump
    for b in range(int((fr(BUMP) - fr(1748)) / BEAT) + 1):
        t = fr(1748) + b * BEAT
        m = [53, 57, 60, 57][b % 4] + 2 * (b // 8)
        note(t, I.pluck(F_(m), 0.45 + 0.03 * (b // 4), r, 0.4, 0.5, 0.2), -14 + 0.3 * b, 0.2 * (-1) ** b)
    padc(fr(1748), [53, 60, 65], fr(BUMP) - fr(1748), -20, 700)
    # the button: one low deadpan pluck + a tiny glock after the last plip and a beat of silence
    note(fr(1953), I.pluck(F_(29), 0.9, r, 1.4, 0.3), -6)
    glock(fr(1953) + 0.02, 89, -16, 0.0)
    wet = convolve_st(M, ir)
    out = M + wet * dbg(-9)
    for a, b in MUTE:                         # hard stops (20 ms fade), the reverb tail is cut too
        i, j = ns(a), ns(b)
        out[:, i:i + ns(0.02)] *= np.linspace(1, 0, ns(0.02))[None, :]
        out[:, i + ns(0.02):j] = 0
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
        f.write("# Pitch drop short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            if n_ != "tick":
                f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
        f.write(f"\n+ {sum(1 for c in CUES if c[1] == 'tick')} quiet lab-clock ticks\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
