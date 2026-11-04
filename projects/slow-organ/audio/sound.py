# Sound for "The Song That Ends in 2640": an original score (a slow, smiling little waltz in D, 3/4, 84 bpm: pizzicato,
# music box, flute, warm pads, a deadpan tuba, a brass stab or two) + the diegetic organ itself (a sustained 7-note
# chord that becomes 8 notes on "eight"; the 1361 cathedral's open-fifth roar) + synthesized SFX timed to the picture
# (frames from remotion/src/videos/organ/story.ts + cast.ts) + the voice, gain only. The twist ends in real silence:
# from "rest" to the first note there is no music at all, only the room, crickets and snores; then the chord swells in.
# Standard mix: music +3 dB house standard (~-10 LU under the voice, ducked 3 dB on words), SFX -6 dB (~-14 LU).
# Master -16 LUFS, <= -1 dBTP, exactly TOTAL frames / 48 kHz.
import json
import os
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, integrated, true_peak,
                 read_wav, write_wav, phase, colored, smooth_noise)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 2040
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
TAU = 2 * np.pi
CUES = []
# story.ts
SWITCH, WEIGHT, ADD_PIPE, FIRST_NOTE, REST = 924, 990, 1452, 1992, 1773


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts SHOTS)
SHOTS = [(0, 56, "town"), (56, 180, "church"), (180, 384, "studio"), (384, 460, "town"), (460, 650, "cathedral"),
         (650, 798, "town"), (798, 856, "barn"), (856, 1470, "church"), (1470, 1563, "town"), (1563, 1710, "church"),
         (1710, 1795, "studio"), (1795, TOTAL, "church")]


def env_for(kinds, fade=0.15, spans=None):
    e = np.zeros(N)
    for a, b, k in (spans or SHOTS):
        if k in kinds:
            e[ns(fr(a)):min(N, ns(fr(b)))] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


# the tiny organ sounds (cast.ts sounding())
ORGAN_ON = [(56, 180, "on"), (940, 1012, "on"), (1078, 1470, "on"), (1470, 1563, "far"), (1563, 1710, "on"), (FIRST_NOTE, TOTAL, "on")]


# ================================================================ instruments of our own
def organ_tone(freqs, dur, r, att=0.12, rel=0.6, bright=1.0, wind=0.03, chiff=0.25):
    """flue-pipe organ: steady additive partials (odd stronger), a breath of wind noise, a soft chiff at the start"""
    n = ns(dur + rel)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f in freqs:
        w = 1 + 0.0007 * smooth_noise(n, r, 0.6)            # tiny wind wobble
        ph = phase(f * w)
        for k in range(1, 11):
            if k * f > 9000:
                break
            a = (1.0 if k % 2 else 0.55) / k ** (1.6 - 0.5 * bright)
            y += a * np.sin(k * ph + r.uniform(0, TAU))
        y += bp(r.standard_normal(n), f * 2, f * 6, 1) * wind
    env = np.clip(t / att, 0, 1) ** 1.5
    d = ns(dur)
    env[d:] *= np.linspace(1, 0, n - d) ** 2
    ch = bp(r.standard_normal(n), 1500, 6000, 2) * np.exp(-t / 0.06) * chiff
    return (y / np.sqrt(len(freqs)) + ch) * env


def oink(r, base=None):
    """a pig's grunt: a nasal pulse with a quick pitch rise and fall through two formants"""
    base = base or r.uniform(130, 190)
    d = r.uniform(0.18, 0.28)
    n = ns(d)
    t = np.arange(n) / SR
    f0 = base * (1 + 0.5 * np.sin(np.pi * t / d))
    ph = phase(f0)
    src = np.sign(np.sin(ph)) * 0.6 + np.sin(ph)
    y = bp(src, 350, 900, 2) + 0.6 * bp(src, 1400, 2400, 2)
    y += bp(r.standard_normal(n), 600, 3000, 1) * 0.25
    return fades(y * np.sin(np.pi * t / d) ** 0.6, 0.002, 0.02)


def snore(r, d=1.6):
    n = ns(d)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / (d * 0.7), 0, 1)) ** 2
    src = lp(colored(n, r, 1.0), 500, 2) * (1 + 0.8 * np.sin(phase(np.full(n, 28.0))))
    return src * env


def bottle_blow(d, r, f=310.0):
    n = ns(d)
    t = np.arange(n) / SR
    tone = np.sin(phase(f * (1 + 0.004 * smooth_noise(n, r, 3)))) + 0.15 * np.sin(phase(np.full(n, 2 * f)))
    air = bp(r.standard_normal(n), 800, 5000, 2) * 0.35
    env = np.clip(t / 0.12, 0, 1) * np.clip((d - t) / 0.2, 0, 1)
    return (tone * 0.8 + air) * env


def paper(r, d=0.18):
    n = ns(d)
    t = tt(d)
    return bp(r.standard_normal(n), 1500, 7000, 2) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.005))


def tick(r, f0=1500):
    return G.clink(r, f0, 0.05, 0.6)


# ================================================================ SFX
def build_sfx():
    r = rng(31)
    S = np.zeros((2, N))
    town, church, studio, cath, barn = (env_for({k}) for k in ("town", "church", "studio", "cathedral", "barn"))
    room = lp(colored(N, r, 1.0), 300, 2)
    S += np.stack([room, room]) * (church + barn + cath + 0.6 * studio)[None, :] * dbg(-40)
    S += G.breeze(DUR, r, 0.7, 0.25, 1100) * town[None, :] * dbg(-31)
    S += pan(G.bird_chirps(DUR, r, 0.7, "sparrow"), -0.3) * town[None, :] * dbg(-31)
    S += pan(G.bird_chirps(DUR, r, 0.25, "sparrow"), 0.5) * (barn * 0.8)[None, :] * dbg(-38)
    # the blower: a low fan hum whenever the tiny organ is alive (after the switch), spin-up on the switch
    on = env_for({"on"}, 0.3, ORGAN_ON) + 0.4 * env_for({"far"}, 0.3, ORGAN_ON)
    on[: ns(fr(SWITCH))] *= 0.0
    on[ns(fr(56)):ns(fr(180))] = env_for({"on"}, 0.3, ORGAN_ON)[ns(fr(56)):ns(fr(180))]
    tH = np.arange(N) / SR
    hum = np.sin(TAU * 48 * tH) * 0.5 + np.sin(TAU * 96 * tH) * 0.25 + lp(colored(N, r, 0.5), 700, 2) * 0.6
    S += np.stack([hum, hum]) * on[None, :] * dbg(-38)

    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def swish(t, g=-22):
        cue(t, "cloth swish", G.whoosh(0.35, r, 0.4, 900, 4500, 0.6, 0.15, 0.3), g, 0.0, S)

    def steps(f0, f1, every=14, g=-28, p=0.0):
        for f in range(f0, f1, every):
            cue(fr(f), "step", G.stroll_step(r, 0.4), g, p, S)

    def stamp(t, g=-14):
        cue(t, "stamp thunk", G.push_thump(r), g, 0.0, S)

    def flips(a, b, n0, g=-22):
        for k in range(n0):
            cue(fr(a + (b - a) * (k + 0.5) / n0), "page flip", paper(r), g, 0.4, S)

    def murmur(f0, f1, people, g):
        d = fr(f1) - fr(f0)
        x = G.babble(d, r, 130, 1.0, 4.0, 0.7) + G.babble(d, r, 210, 1.15, 4.6, 0.6)
        e = np.minimum(1, np.minimum(np.linspace(0, d / 0.4, len(x)), np.linspace(d / 0.4, 0, len(x))))
        cue(fr(f0), "murmur", x * e, g, 0.0, S)

    # hook: town steps, the cut into the church
    steps(4, 54, 15, -30, -0.3)
    whoosh(fr(56), 0.5, -22)
    whoosh(fr(180), 0.7, -16)                                     # flash -> Cage
    # Cage writes (pencil scratches), shrugs
    for k in range(9):
        cue(fr(190) + 0.28 * k + 0.05 * r.random(), "pencil", bp(r.standard_normal(ns(0.12)), 2500, 8000, 2) * np.sin(np.pi * np.linspace(0, 1, ns(0.12))), -26, -0.2, S)
    swish(fr(284), -20)
    # the hour: the clock hands sweep (ticks racing), a little ding
    for k in range(28):
        tk = fr(326) + 44 / FPS * (k / 28) ** 1.4
        cue(tk, "tick", tick(r, 1500 if k % 2 else 1300), -22, 0.3, S)
    cue(fr(371), "clock ding", G.clink(r, 2100, 1.0, 0.8), -16, 0.3, S)
    # the council: murmur, a paper rattle
    murmur(386, 458, 5, -24)
    cue(fr(400), "paper rattle", paper(r, 0.35), -22, 0.0, S)
    # the cathedral: bellows wheeze each tread, candles
    for k in range(int((fr(650) - fr(470)) / 0.45)):
        t = fr(470) + 0.45 * k
        cue(t, "bellows", G.creak(0.3, r, 90, 70) * 0.6 + bp(r.standard_normal(ns(0.3)), 300, 1800, 1) * 0.3 * np.sin(np.pi * np.linspace(0, 1, ns(0.3))), -30, -0.4, S)
    cue(fr(556), "time whoosh", G.whoosh(2.8, r, 0.5, 300, 3000, 1.0, 0.6, 0.4), -20, 0.0, S)
    # so that's how long: a few claps + the stamp
    cue(fr(683), "small applause", G.applause(1.2, r, 6) * np.linspace(1, 0.2, ns(1.2))[None, :], -22, 0.0, S)
    stamp(fr(687), -16)
    # the venue: birds; the barn: hay rustle; the pigs
    cue(fr(800), "hay rustle", bp(r.standard_normal(ns(0.8)), 1200, 6000, 1) * np.sin(np.pi * np.linspace(0, 1, ns(0.8))), -26, 0.2, S)
    for k, t in enumerate((830, 836, 843, 849)):
        cue(fr(t), "oink", oink(r), -14 - 2 * (k % 2), [-0.3, 0.3, 0.0, -0.2][k], S)
    cue(fr(829), "pop", np.exp(-tt(0.15) / 0.02) * np.sin(phase(np.full(ns(0.15), 520.0))), -20, 0.0, S)
    # the build: wood clunks, hammer taps; the switch; the blower spins up; the weight
    for k, t in enumerate((864, 870, 877, 884, 890)):
        cue(fr(t), "wood clunk", G.hammer_hit(r, 0.4), -24 - (k % 2) * 2, r.uniform(-0.3, 0.3), S)
    cue(fr(SWITCH), "switch click", G.clink(r, 1800, 0.06, 0.9) + np.pad(G.clink(r, 900, 0.05, 0.5), (0, ns(0.06) - ns(0.05))), -12, -0.2, S)
    spin = np.sin(phase(np.linspace(20, 96, ns(1.2)))) * np.linspace(0, 0.5, ns(1.2))
    cue(fr(SWITCH), "blower spin-up", spin + lp(colored(ns(1.2), r, 0.5), 600, 2) * np.linspace(0, 0.6, ns(1.2)), -24, -0.2, S)
    th = lp(G.push_thump(r), 1500, 2)
    sand = bp(r.standard_normal(ns(0.15)), 2000, 7000, 2) * np.exp(-tt(0.15) / 0.03) * 0.4
    th[:len(sand)] += sand[:len(th)]
    cue(fr(WEIGHT), "sandbag thud", th, -12, 0.0, S)
    # the bottle; the air through the pipe
    cue(fr(1018), "bottle blow", bottle_blow(fr(1074) - fr(1018), r), -16, -0.2, S)
    cue(fr(1078), "air", G.whoosh(1.6, r, 0.5, 600, 3500, 1.0, 0.6, 0.6), -24, 0.0, S)
    # 2,527 days: pages, the time whoosh, the stamp on "days"
    flips(1170, 1250, 14, -22)
    cue(fr(1168), "time whoosh", G.whoosh(2.6, r, 0.5, 300, 3000, 1.0, 0.6, 0.4), -22, 0.0, S)
    stamp(fr(1244), -16)
    # the crowd: doors, footsteps, murmur; the eighth pipe; applause
    cue(fr(1266), "door creak", G.creak(1.0, r, 100, 170), -20, 0.0, S)
    steps(1272, 1326, 4, -30, 0.0)
    murmur(1272, 1440, 20, -22)
    cue(fr(1430), "pipe slide", G.creak(0.6, r, 300, 420), -24, 0.2, S)
    cue(fr(ADD_PIPE), "pipe clunk", G.clink(r, 1900, 0.3, 0.7), -14, 0.2, S)
    cue(fr(1454), "applause", G.applause(2.4, r, 40) * np.linspace(1, 0.4, ns(2.4))[None, :], -13, 0.0, S)
    for k in range(3):
        cue(fr(1456) + 0.15 * k, "cheer", G.hurrah(r, r.uniform(110, 170), r.uniform(0.95, 1.1)), -22, r.uniform(-0.4, 0.4), S)
    # the long score: an aerial whoosh, paper unrolling, the little flag
    whoosh(fr(1470), 0.9, -18)
    cue(fr(1472), "paper unroll", bp(r.standard_normal(ns(2.0)), 1500, 7000, 1) * np.linspace(1, 0.1, ns(2.0)) ** 0.5, -26, 0.0, S)
    cue(fr(1524), "flag flutter", G.flag_flutter(1.3, r), -26, 0.3, S)
    # unluckily: the time-lapse
    cue(fr(1638), "time whoosh", G.whoosh(2.2, r, 0.5, 300, 3000, 1.0, 0.6, 0.4), -22, 0.0, S)
    # the twist: a page turn, then the "rest" lands as a soft dead stop
    cue(fr(1712), "page", paper(r, 0.3), -22, 0.0, S)
    stamp(fr(REST), -14)
    # 2001: chairs creak, a cough, then nothing; 17 months of crickets and snores; the first note wakes everyone
    for t in (1800, 1812, 1830):
        cue(fr(t), "chair creak", G.creak(0.35, r, 150, 110), -30, r.uniform(-0.5, 0.5), S)
    cue(fr(1860), "cough", bp(r.standard_normal(ns(0.2)), 300, 2500, 1) * np.exp(-tt(0.2) / 0.05), -28, 0.4, S)
    flips(1928, 1976, 8, -24)
    cr = G.crickets(fr(FIRST_NOTE) - fr(1930), r, 3)
    cue(fr(1930), "crickets", cr * np.minimum(1, np.linspace(0, 6, cr.shape[-1])), -30, 0.0, S)
    for t in (1946, 1962, 1976):
        cue(fr(t), "snore", snore(r, 0.9), -24, r.uniform(-0.5, 0.5), S)
    for k in range(4):
        cue(fr(FIRST_NOTE) + 0.12 + 0.06 * k, "whoa", G.whoa(r), -22, r.uniform(-0.5, 0.5), S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 84.0
BEAT = 60 / BPM
BAR = 3 * BEAT
# our own slow waltz in D (bar, beat, beats, midi)
THEME = [(0, 0, 2, 74), (0, 2, 1, 73),
         (1, 0, 1, 71), (1, 1, 1, 69), (1, 2, 1, 66),
         (2, 0, 3, 69),
         (3, 0, 1, 67), (3, 1, 1, 69), (3, 2, 1, 71),
         (4, 0, 2, 73), (4, 2, 1, 71),
         (5, 0, 1, 69), (5, 1, 1, 66), (5, 2, 1, 64),
         (6, 0, 1, 62), (6, 1, 1, 64), (6, 2, 1, 66),
         (7, 0, 3, 62)]
CHORDS = [[38, 54, 57, 62], [35, 54, 59, 62], [33, 52, 57, 61], [31, 55, 59, 62], [33, 52, 57, 61], [35, 54, 59, 62], [31, 55, 59, 64], [38, 54, 57, 62]]
# the Halberstadt chord (our voicing): seven pipes, then the A4 on "eight"
CHORD7 = [55, 60, 62, 66, 67, 71, 74]
CHORD8 = CHORD7 + [69]


def build_music():
    r = rng(5)
    M = np.zeros((2, N))
    ir = make_ir(1.2, 3, hf=1.4)
    MUTE = [(fr(REST), fr(FIRST_NOTE))]   # the opening rest: real silence until the first note

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
            if chords:
                for k in (1, 2):
                    for m in ch[1:]:
                        note(t + k * bt, I.pluck(F_(m), 0.45, r, 0.4, 0.6, 0.15), g - 16, 0.25)

    def padc(t, ch, d, g, warm=900):
        note(t, I.pad([F_(m) for m in ch], d, 0.5, r, 0.5, 1.0, warm), g)

    def glock(t, m, g=-10, p=0.3):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, p)

    def stab(t, ms, g=-10):
        for m in ms:
            note(t, I.brass(F_(m), 0.3, 0.85, r, "horn"), g, 0.0)
        note(t, I.brass(F_(ms[0] - 12), 0.3, 0.8, r, "tuba"), g - 2, 0.0)

    # hook (0 - 1.9 s): two soft plucks; the organ takes over in the church; glock sparkle on "twenty-six forty"
    theme(0.2, 1, "pluck", -4, chords=False, until=fr(54))
    for k, m in enumerate((86, 81, 78, 74)):
        glock(fr(143) + k * 0.16, m, -16)
    # Cage (6 - 10.7 s): the waltz on pizzicato; a tuba "bwomp" on "slow"
    theme(fr(182), 8, "pluck", 0, until=fr(294))
    note(fr(296), I.brass(F_(38), 0.5, 0.8, r, "tuba", fall=-1.5), -10, 0.0)
    # the hour (10.7 - 12.8 s): the pianist's quick run (our pizzicato piano), a final chord
    for k in range(16):
        note(fr(324) + 0.09 * k, I.pluck(F_([62, 66, 69, 74, 78, 74, 69, 66][k % 8] + 12 * (k // 8)), 0.55, r, 0.7, 0.8, 0.12), -14, 0.3)
    for m in (62, 66, 69, 74):
        note(fr(371), I.pluck(F_(m), 0.6, r, 1.4, 0.7, 0.12), -14, 0.3)
    # the council (12.8 - 15.3 s): fife theme; a brass stab on "literally"
    theme(fr(386), 3, "fife", -2, chords=True, until=fr(431))
    stab(fr(433), [74, 78, 81], -8)
    # 1361 (15.3 - 21.7 s): the cathedral organ roars an open fifth (diegetic); time-lapse music box during 639 years
    big = organ_tone([F_(38), F_(45), F_(50), F_(57), F_(62)], fr(650) - fr(472), r, 0.3, 0.4, 1.2, 0.05)
    note(fr(470), big * 0.9, -6, 0.0)
    theme(fr(558), 4, "box", -4, bass=False, chords=False, tempo=1.8, until=fr(646))
    # so that's how long (21.7 - 23.7 s): pizz + tutti stab on "last"
    theme(fr(652), 1, "pluck", -2, until=fr(685))
    stab(fr(687), [74, 78, 81], -8)
    # the venue (23.7 - 28.5 s): music box; a tuba wah on "pigsty"
    theme(fr(712), 4, "box", -4, bass=True, chords=False, until=fr(826))
    for k, m in enumerate((46, 45)):
        note(fr(832) + k * 0.3, I.brass(F_(m), 0.3 if k == 0 else 0.6, 0.8, r, "tuba", fall=-1.0 if k else 0.0), -10, 0.0)
    # the build (28.5 - 31.3 s): busy pizz ostinato; a glock on "blower"; then the tiny organ sounds
    for b in range(int((fr(938) - fr(858)) / BEAT)):
        note(fr(858) + b * BEAT, I.pluck(F_([62, 66, 69][b % 3] + 12 * (b % 2)), 0.5, r, 0.4, 0.6, 0.2), -14, 0.2 * (-1) ** b)
    glock(fr(938), 86, -14)
    # the luckily/unluckily (52 - 57 s): warm pad, then a deadpan tuba walking down
    padc(fr(1567), [62, 66, 69], 1.6, -20, 800)
    for k, m in enumerate((38, 37, 35, 33)):
        note(fr(1617) + 0.1 + k * 0.45, I.brass(F_(m), 0.4, 0.7, r, "tuba"), -12, -0.1)
    # the long score (49 - 52 s): fife theme over the town
    theme(fr(1472), 3, "fife", -2, chords=True, until=fr(1560))
    # the twist: the waltz creeps back on pizzicato and stops dead on "rest"
    for b in range(int((fr(REST) - fr(1712)) / BEAT) + 1):
        t = fr(1712) + b * BEAT
        note(t, I.pluck(F_([62, 66, 69][b % 3] + 2 * (b // 6)), 0.45, r, 0.4, 0.5, 0.2), -14, 0.2 * (-1) ** b)
    # the button after the first note: one low deadpan pluck and a glock
    note(fr(2022), I.pluck(F_(38), 0.9, r, 1.4, 0.3), -8)
    glock(fr(2022) + 0.02, 86, -18, 0.0)
    wet = convolve_st(M, ir)
    out = M + wet * dbg(-9)
    for a, b in MUTE:
        i, j = ns(a), ns(b)
        out[:, i:i + ns(0.02)] *= np.linspace(1, 0, ns(0.02))[None, :]
        out[:, i + ns(0.02):j] = 0
    # ---- the tiny organ (diegetic, in the church's long reverb): the chord whenever it sounds, 8 notes from "eight"
    org = np.zeros((2, N))
    long_ir = make_ir(3.2, 9, hf=0.8)
    for a, b, kind in ORGAN_ON:
        for (x0, x1, ch) in ((a, min(b, ADD_PIPE + 2), CHORD7), (max(a, ADD_PIPE + 2), b, CHORD8)):
            if x1 <= x0:
                continue
            first = x0 == FIRST_NOTE
            tone = organ_tone([F_(m) for m in ch], fr(x1) - fr(x0), r, 0.9 if first else 0.06, 0.25, 0.9, 0.03, 0.4 if first else 0.0)
            g = -14 if kind == "far" else -6
            place(org, st(tone), fr(x0), dbg(g))
    org = org + convolve_st(org, long_ir) * dbg(-6)
    # the room cuts with the picture: keep only where the organ is heard
    keep = env_for({"on", "far"}, 0.08, ORGAN_ON)
    keep[ns(fr(ADD_PIPE)):] = np.maximum(keep[ns(fr(ADD_PIPE)):], 0)
    out += org * keep[None, :]
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
        f.write("# Slow organ short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("Music includes the diegetic organ (the tiny organ's 7- then 8-note chord, the 1361 cathedral roar).\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            if n_ not in ("tick", "step", "bellows", "pencil"):
                f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
