# Sound for "The Chicken That Lived Without a Head": an original score built round one cheerful barnyard tune of our
# own (a G-major hoedown, 2/4 feel at 120 bpm: plucked "banjo" lead, fife "fiddle", oom-pah tuba, brushes) that
# changes colour with the place (lab: glock and vibes; sideshow: a calliope of music box + brass; motel: a lonely pad;
# the end: the tune slowed on the music box, then the festival), plus synthesized SFX timed to the picture (frames from
# remotion/src/videos/chicken/story.ts + cast.ts) + the voice, gain only.
# Standard mix: music +3 dB house standard (~-10 LU under the voice, ducked 3 dB on words), SFX -6 dB (~-14 LU).
# Master -16 LUFS, <= -1 dBTP, exactly TOTAL frames / 48 kHz.
import json
import os
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, integrated, true_peak,
                 read_wav, write_wav, phase)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 2130
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
TAU = 2 * np.pi
CUES = []
# story.ts
DINNER, JAW, MIKE, AXE, NECK, HIGH, TOOHIGH, WHOOSH, HEAD = 89, 128, 262, 295, 349, 389, 423, 449, 466
VEIN, EAR, STEM, SHOOK, CORN, TUCK, HABIT, KEEP, DROP, MILK, WATER, THROAT = 500, 524, 560, 606, 646, 718, 754, 812, 857, 886, 901, 933
EXAM, CLOT, STEM2, REST, PROMO, TOUR, CENTS, SNAP, TRIED, NONE = 1002, 1045, 1109, 1121, 1156, 1198, 1243, 1302, 1356, 1401
TWO, EIGHT, NOHEAD, PHOENIX, CHOKE, SYR, LEFT, AXE2, FORGOT, PARTY, WANTED = 1484, 1530, 1550, 1622, 1660, 1688, 1746, 1821, 1893, 1973, 2036


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts SHOTS)
SHOTS = [(0, 158, "farm"), (158, 316, "farm"), (316, 364, "kitchen"), (364, 488, "farm"), (488, 588, "lab"), (588, 680, "farm"),
         (680, 788, "night"), (788, 952, "kitchen"), (952, 1145, "lab"), (1145, 1335, "show"), (1335, 1433, "farm"), (1433, 1575, "show"),
         (1575, 1640, "motel"), (1640, 1742, "room"), (1742, 1792, "shownight"), (1792, 1866, "dusk"), (1866, 1932, "shownight"),
         (1932, 2010, "town"), (2010, TOTAL, "kitchen")]


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
def cluck(r, base=None, n=None):
    """a hen's 'bawk': a few short nasal pitched blips, the last one longer and rising"""
    base = base or r.uniform(520, 780)
    n = n or r.integers(2, 4)
    out = []
    for k in range(n):
        d = 0.07 if k < n - 1 else 0.2
        m = ns(d)
        t = np.arange(m) / SR
        f0 = base * (1.0 + (0.5 if k == n - 1 else 0.15) * t / d)
        forms = G.vowel_track(m, [(0, "A"), (d, "A" if k < n - 1 else "o")])
        amp = np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.03, 0, 1)
        out.append(G.vox(f0, forms, amp, r, 1.4, tilt=0.9, breath=0.25))
        out.append(np.zeros(ns(0.045)))
    return np.concatenate(out)


def squawk(r):
    """an alarmed hen: a harsh high glide"""
    d = 0.45
    m = ns(d)
    t = np.arange(m) / SR
    f0 = 900 * G._track(m, [(0, 1.0), (0.12, 1.45), (d, 1.1)], t)
    forms = G.vowel_track(m, [(0, "A"), (d, "e")])
    amp = np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.12, 0, 1)
    return G.vox(f0, forms, amp, r, 1.5, tilt=0.8, breath=0.4)


def gurgle(r, d=0.6):
    """Mike's 'crow' without a head: a wet throaty gurgle"""
    return G.bubbles(d, r, 35, 180, 700) * 1.2


def flutter(r, d=0.5):
    """wings flapping: fast filtered noise bursts"""
    n = ns(d)
    y = np.zeros(n)
    for k in range(int(d * 18)):
        x = bp(r.standard_normal(ns(0.04)), 500, 4000, 1) * np.exp(-tt(0.04) / 0.012)
        i = ns(k / 18 + r.uniform(0, 0.01))
        y[i:i + len(x)] += x[:n - i]
    return y * np.minimum(1, np.linspace(1.6, 0, n))


def thud(r, f=90, d=0.25, g=1.0):
    t = tt(d)
    return fades(np.sin(phase(f * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.06) * g + lp(r.standard_normal(ns(d)), 600) * np.exp(-t / 0.02) * 0.4, 0.001, 0.03)


def chop(r):
    """the axe into the stump: a woody thock with a crack"""
    return mixa(thud(r, 140, 0.3, 1.3), G.wood_crack(r) * 0.6)


def peck(r):
    return G.clink(r, r.uniform(1800, 2400), 0.05, 0.4) * 0.7 + thud(r, 400, 0.05, 0.2)


def coin(r):
    return mixa(G.clink(r, 3300, 0.5, 0.9), 0.6 * G.clink(r, 4700, 0.35, 0.7))


def jar_coin(r):
    return mixa(G.clink(r, 2600, 0.4, 0.8), 0.5 * G.clink(r, 5200, 0.25, 0.7), 0.4 * G.clink(r, 1900, 0.3, 0.5))


def pop_(r, f=520.0):
    return np.exp(-tt(0.1) / 0.015) * np.sin(phase(np.full(ns(0.1), f)))


def plink(r, f=1500):
    t = tt(0.25)
    return fades(np.exp(-t / 0.04) * np.sin(phase(f * (1 + 2.5 * t))), 0.001, 0.02)


def heartbeat(r):
    return mixa(thud(r, 55, 0.18, 1.0), np.pad(thud(r, 50, 0.18, 0.7), (ns(0.18), 0)))


def flash(r):
    """a flashbulb: a pop, a fizz and a high whine"""
    t = tt(0.6)
    return mixa(pop_(r, 300) * 1.5, bp(r.standard_normal(ns(0.3)), 3000, 9000, 1) * np.exp(-tt(0.3) / 0.05) * 0.6,
                np.sin(phase(6000 + 3000 * t)) * np.exp(-t / 0.15) * 0.15)


def engine(d, r):
    """an old sedan driving by: a low lumpy idle that swells and pans"""
    n = ns(d)
    t = np.arange(n) / SR
    f = 38 * (1 + 0.1 * np.sin(TAU * 0.5 * t))
    y = np.sin(phase(f)) * (1 + 0.5 * np.sin(phase(f * 0.5))) + 0.4 * lp(r.standard_normal(n), 300)
    return lp(y, 600) * np.sin(np.pi * t / d) ** 2


def hum(d, r, f=120):
    n = ns(d)
    t = np.arange(n) / SR
    return (np.sin(TAU * f * t) + 0.3 * np.sin(TAU * 2 * f * t)) * 0.5 + 0.1 * bp(r.standard_normal(n), 2000, 5000, 1)


def boing(r, f0=160):
    t = tt(0.6)
    return fades(np.sin(phase(f0 * (1 + 0.6 * np.exp(-t / 0.08)) * (1 + 0.04 * np.sin(TAU * 18 * t)))) * np.exp(-t / 0.2), 0.002, 0.05)


def creak(r, d=0.5):
    return G.creak(d, r, 120, 200)


# ================================================================ SFX
def build_sfx():
    r = rng(45)
    S = np.zeros((2, N))
    out_day = env_for({"farm", "show", "town"})
    S += G.breeze(DUR, r, 0.6, 0.25, 1100) * (out_day + env_for({"dusk"}))[None, :] * dbg(-33)
    S += pan(G.bird_chirps(DUR, r, 0.6, "sparrow"), -0.3) * env_for({"farm"})[None, :] * dbg(-33)
    S += G.crickets(DUR, r, 3) * env_for({"night", "motel", "shownight", "dusk", "room"}, 0.3)[None, :] * dbg(-30)
    lab = env_for({"lab"})
    S += st(hum(DUR, r)) * lab[None, :] * dbg(-40)
    # farm ambience: hens clucking now and then
    farm = env_for({"farm"})
    for k in range(int(DUR * 0.5)):
        tm = r.uniform(0, DUR)
        if farm[min(N - 1, ns(tm))] > 0.5:
            cue(tm, "cluck", cluck(r), -28, r.uniform(-0.7, 0.7), S)

    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def steps(f0, f1, every=10, g=-24, p=0.0):
        for f in range(f0, f1, every):
            cue(fr(f) + 0.01 * r.random(), "step", G.stroll_step(r, 0.5), g, p, S)

    def murmur(f0, f1, g):
        d = fr(f1) - fr(f0)
        x = G.babble(d, r, 130, 1.0, 4.0, 0.7) + G.babble(d, r, 210, 1.15, 4.6, 0.6)
        e = np.minimum(1, np.minimum(np.linspace(0, d / 0.4, len(x)), np.linspace(d / 0.4, 0, len(x))))
        cue(fr(f0), "murmur", x * e, g, 0.0, S)

    # 1: off the porch: a screen door, boots, whistling (music); the hens look up
    cue(fr(2), "screen door", mixa(creak(r, 0.4), thud(r, 200, 0.12, 0.5)), -20, -0.2, S)
    steps(8, 104, 13, -24, -0.1)
    cue(fr(DINNER), "cluck", cluck(r, 700, 2), -18, 0.3, S)
    # 2: the headless strut: little steps, Lloyd's gasp
    for f in range(110, 156, 6):
        cue(fr(f), "claw step", peck(r) * 0.6, -24, 0.0, S)
    cue(fr(JAW), "gasp", G.whoa(r, 160, 0.45), -12, 0.0, S)
    whoosh(fr(158), 0.7, -16)
    # 3: the farm: a rooster's proud gurgle-free crow; Lloyd lifts Mike (a cluck), the axe up
    cue(fr(176), "far rooster", cluck(r, 480, 3) * 0.7, -30, -0.6, S)
    cue(fr(MIKE - 4), "proud cluck", cluck(r, 560, 2), -16, 0.1, S)
    cue(fr(MIKE), "sparkle", G.clink(r, 3800, 0.5, 0.6), -20, 0.1, S)
    whoosh(fr(AXE), 0.5, -18)
    # 4: the kitchen: a clock ticks; Ma smacks her lips
    for k in range(int((fr(364) - fr(316)) / 0.5)):
        cue(fr(318) + k * 0.5, "tick", G.clink(r, 2600 if k % 2 else 2300, 0.04, 0.3), -30, 0.4, S)
    cue(fr(NECK), "lip smack", mixa(pop_(r, 900) * 0.6, bp(r.standard_normal(ns(0.06)), 1000, 4000, 1) * 0.5), -14, 0.0, S)
    # 5: the aim: a squeak of the handle, a rising tone (music); "too high": a nervous cluck
    cue(fr(HIGH), "aim", creak(r, 0.25), -24, 0.2, S)
    cue(fr(TOOHIGH), "aim", creak(r, 0.25), -22, 0.2, S)
    cue(fr(TOOHIGH + 4), "worried cluck", cluck(r, 760, 2), -18, 0.1, S)
    # 6: whoosh and CHOP behind the post; feathers; Lloyd's "uh-oh"
    whoosh(fr(WHOOSH), 0.5, -12)
    cue(fr(WHOOSH), "chop", chop(r), -6, 0.0, S)
    cue(fr(WHOOSH + 1), "feathers", flutter(r, 0.6), -14, 0.0, S)
    cue(fr(HEAD + 2), "uh-oh", G.oof(r, "oh", 140), -14, -0.2, S)
    # 7: the lab lightbox clicks on; a ping per glowing part
    cue(fr(486), "lightbox", mixa(G.clink(r, 900, 0.08, 0.5), hum(0.4, r, 100) * 0.3), -18, 0.0, S)
    for f0, fq in ((VEIN, 1500), (EAR, 1800), (STEM, 2200)):
        cue(fr(f0), "ping", plink(r, fq), -16, 0.0, S)
    # 8: he shakes it off (flap flap), the gurgle crow, pecks
    cue(fr(SHOOK - 6), "shake", flutter(r, 0.7), -12, 0.0, S)
    cue(fr(620), "gurgle", gurgle(r, 0.7), -16, 0.0, S)
    for f in range(638, 680, 7):
        cue(fr(f), "peck", peck(r), -16, 0.1, S)
    # 9: night: snores; the wing tuck; a content gurgle
    cue(fr(TUCK), "rustle", flutter(r, 0.35) * 0.6, -20, 0.0, S)
    for k in range(3):
        cue(fr(HABIT + 4) + k * 0.9, "snore", lp(r.standard_normal(ns(0.5)), 500) * np.sin(np.linspace(0, np.pi, ns(0.5))) * 0.6, -24, 0.1, S)
    # 10: the kitchen: chairs, the dropper drips, the milk bottle clink, the glass, gulps
    cue(fr(KEEP), "chair", creak(r, 0.3), -22, -0.3, S)
    for f0 in (DROP, 875, 905, THROAT):
        cue(fr(f0 + 4), "drip", plink(r, 1300 + r.uniform(-200, 200)), -14, 0.0, S)
    cue(fr(MILK), "bottle", G.clink(r, 1400, 0.3, 0.6), -16, 0.2, S)
    cue(fr(WATER), "glass", G.clink(r, 2600, 0.4, 0.7), -16, 0.2, S)
    cue(fr(THROAT + 6), "gulp", gurgle(r, 0.25) * 0.8, -16, 0.0, S)
    # 11: the lab: stethoscope heartbeat; the clot thumps; "the brain stem": a ping; the shrug
    for k in range(3):
        cue(fr(EXAM) + k * 0.55, "heartbeat", heartbeat(r), -14, 0.0, S)
    for k in range(4):
        cue(fr(CLOT) + k * 0.55, "clot thump", heartbeat(r), -16, 0.0, S)
    cue(fr(STEM2), "ping", plink(r, 2200), -14, 0.0, S)
    cue(fr(REST), "hmm", G.oof(r, "hm", 130), -16, 0.2, S)
    # 12: the promoter's puff; the car drives by; the coins in the jar; a crowd
    cue(fr(PROMO - 3), "puff", mixa(pop_(r, 420) * 1.2, bp(r.standard_normal(ns(0.3)), 400, 3000, 1) * np.exp(-tt(0.3) / 0.06)), -12, -0.3, S)
    cue(fr(1188), "car", engine(fr(1228) - fr(1188), r), -12, 0.0, S)
    cue(fr(1206), "horn", I.brass(I.m2f(64), 0.35, 0.7, r, "horn") * 0.6, -20, 0.2, S)
    murmur(1220, 1335, -26)
    for f0 in (1226, 1236, CENTS, 1252):
        cue(fr(f0 + 8), "jar coin", jar_coin(r), -14, 0.2, S)
    # 13: the flashbulb; a crowd "ooh"
    cue(fr(SNAP), "flash", flash(r), -10, 0.1, S)
    for k in range(4):
        cue(fr(SNAP + 6) + 0.05 * k, "ooh", G.whoa(r, r.uniform(150, 230), 0.6), -22, r.uniform(-0.6, 0.6), S)
    # 14: farmers' axes; the hens squawk and flee; a sad silence, one feather
    cue(fr(TRIED), "axes up", G.whoosh(0.4, r, 0.3, 500, 2500), -20, 0.0, S)
    for k in range(3):
        cue(fr(1382 + k * 4), "nervous cluck", cluck(r, 700 + 60 * k, 2), -18, (-0.5, 0, 0.5)[k], S)
    for k in range(3):
        cue(fr(NONE - 6 + k * 2), "squawk", squawk(r), -14, (-0.6, 0.0, 0.6)[k], S)
        cue(fr(NONE - 4 + k * 2), "flap", flutter(r, 0.6), -16, (-0.6, 0.0, 0.6)[k], S)
    # 15: the scale: a creak as the needle swings, a boing on "eight", a crowd cheer on "no head"
    cue(fr(TWO), "scale creak", creak(r, 1.5), -18, 0.2, S)
    cue(fr(EIGHT), "boing", boing(r), -12, 0.2, S)
    for k in range(5):
        cue(fr(NOHEAD) + 0.06 * k, "hurrah", G.hurrah(r, r.uniform(120, 200), r.uniform(0.95, 1.1)), -18, r.uniform(-0.6, 0.6), S)
    cue(fr(NOHEAD + 4), "applause", G.applause(1.0, r), -18, 0.0, S)
    # 16: the motel: a neon buzz and flicker, a far truck
    neon = bp(r.standard_normal(ns(fr(1640) - fr(1575))), 100, 400, 1) * 0.3 + st(hum(fr(1640) - fr(1575), r, 120))[0] * 0.4
    cue(fr(1575), "neon buzz", neon, -24, 0.3, S)
    for f0 in (1590, 1612):
        cue(fr(f0), "flicker", bp(r.standard_normal(ns(0.15)), 1500, 6000, 1) * 0.6, -20, 0.3, S)
    cue(fr(1578), "far truck", engine(1.8, r) * 0.5, -28, -0.7, S)
    # 17: the room: coughing; Lloyd sits up (bedsprings); the suitcase rummage
    for k in range(4):
        cue(fr(CHOKE - 2) + k * 0.3, "cough", mixa(G.oof(r, "ugh", 420) * 0.5, gurgle(r, 0.15)), -14, -0.1, S)
    cue(fr(CHOKE + 4), "bedsprings", creak(r, 0.4), -18, -0.3, S)
    for k in range(6):
        cue(fr(SYR) + k * 0.28, "rummage", bp(r.standard_normal(ns(0.2)), 600, 4000, 1) * np.exp(-tt(0.2) / 0.05), -18, r.uniform(-0.3, 0.5), S)
    # 18/20: the empty tent at night: wind on canvas; a lonely glint
    tent = env_for({"shownight"}, 0.3)
    S += G.flag_flutter(DUR, r) * tent[None, :] * dbg(-30)
    cue(fr(LEFT), "glint", G.clink(r, 4200, 0.6, 0.6), -16, 0.0, S)
    cue(fr(FORGOT + 8), "glint", G.clink(r, 3800, 0.8, 0.5), -18, 0.0, S)
    # 19: dusk: the empty stump, a feather lands (a tiny tick)
    cue(fr(AXE2 + 22), "feather lands", G.clink(r, 5000, 0.05, 0.2), -28, 0.0, S)
    # 21: the festival: crowd, cheers, a party horn
    murmur(1932, 2010, -22)
    for k in range(6):
        cue(fr(PARTY - 2) + 0.07 * k, "hurrah", G.hurrah(r, r.uniform(120, 220), r.uniform(0.95, 1.1)), -16, r.uniform(-0.7, 0.7), S)
    cue(fr(PARTY), "party horn", I.brass(I.m2f(76), 0.4, 0.6, r, "horn") * 0.5, -18, 0.4, S)
    # 22: the kitchen at dusk: a clock, a fork on an empty plate, a sigh
    for k in range(int((fr(TOTAL) - fr(2012)) / 0.5)):
        cue(fr(2014) + k * 0.5, "tick", G.clink(r, 2600 if k % 2 else 2300, 0.04, 0.3), -32, 0.4, S)
    cue(fr(2026), "fork", G.clink(r, 3100, 0.25, 0.6), -18, -0.1, S)
    cue(fr(WANTED + 4), "sigh", G.oof(r, "oh", 110), -16, -0.1, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 120.0
BEAT = 60 / BPM
BAR = 4 * BEAT
# our own barnyard hoedown in G major (bar, beat, beats, midi)
THEME = [(0, 0, 0.5, 67), (0, 0.5, 0.5, 71), (0, 1, 0.5, 74), (0, 1.5, 0.5, 71), (0, 2, 1, 76), (0, 3, 1, 74),
         (1, 0, 0.5, 72), (1, 0.5, 0.5, 71), (1, 1, 0.5, 69), (1, 1.5, 0.5, 67), (1, 2, 2, 69),
         (2, 0, 0.5, 67), (2, 0.5, 0.5, 71), (2, 1, 0.5, 74), (2, 1.5, 0.5, 79), (2, 2, 1, 78), (2, 3, 1, 76),
         (3, 0, 0.5, 74), (3, 0.5, 0.5, 72), (3, 1, 0.5, 71), (3, 1.5, 0.5, 69), (3, 2, 2, 67)]
BASS = [43, 48, 50, 43]  # G C D G


def build_music():
    r = rng(9)
    M = np.zeros((2, N))
    ir = make_ir(1.0, 3, hf=1.4)

    def note(t, x, g, p=0.0):
        place(M, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def tune(t0, bars, lead="pluck", g=0.0, bass=True, brush=True, until=None, tempo=1.0, oct_=0, start=0):
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
                    note(t, I.pluck(F_(m + oct_), 0.8, r, 0.45, 0.85, 0.12), g - 6, 0.15)
                elif lead == "fife":
                    note(t, I.fife(F_(m + oct_), ln * bt * 0.9, 0.6, r), g - 8, 0.15)
                elif lead == "glock":
                    note(t, I.glock(F_(m + 12 + oct_), 0.6, r, 1.2), g - 10, -0.1)
                elif lead == "box":
                    note(t, I.musicbox(F_(m + 12 + oct_), 0.6, r, 1.4), g - 8, -0.1)
                elif lead == "vibes":
                    note(t, I.vibes(F_(m + oct_), 0.6, r, 1.4), g - 8, -0.1)
                elif lead == "calliope":
                    note(t, I.musicbox(F_(m + 12 + oct_), 0.7, r, 1.0), g - 9, -0.1)
                    note(t, I.fife(F_(m + oct_), ln * bt * 0.8, 0.5, r), g - 12, 0.1)
        for b in range(start, start + bars):
            t = t0 + (b - start) * br
            if until and t >= until:
                continue
            if bass:  # oom-pah: tuba on 1 and 3, a plucked chord on 2 and 4
                for k in range(4):
                    tk = t + k * bt
                    if until and tk >= until:
                        continue
                    root = BASS[b % 4]
                    if k % 2 == 0:
                        note(tk, I.brass(F_(root + (0 if k == 0 else 7) - 12), 0.3, 0.75, r, "tuba"), g - 8, -0.1)
                    else:
                        for dm in (12, 16, 19):
                            note(tk, I.pluck(F_(root + dm), 0.5, r, 0.3, 0.6, 0.25), g - 15, 0.25)
            if brush:
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

    # 1: the hoedown, whistled along on fife; 2: it stops dead on "did not", a tuba "bwomp" on "cooperate"
    tune(0.1, 6, "pluck", -2, until=fr(114))
    tune(0.1 + BAR, 2, "fife", -6, bass=False, brush=False, until=fr(104))
    tuba(fr(JAW), 43, 0.6, -6, fall=-2.0)
    note(fr(132), I.pad([F_(55), F_(61), F_(64)], 0.9, 0.45, r, 0.1, 0.5, 900), -14)
    # 3: Fruita: the tune broad on fife over the mesas; a glock on "Mike"; a drumroll as the axe goes up
    tune(fr(160), 8, "fife", -3, until=fr(312))
    for k, m in enumerate((79, 83, 86)):
        glock(fr(MIKE) + k * 0.08, m, -14, 0.0)
    for k in range(int((fr(316) - fr(282)) * 18)):
        note(fr(282) + k / 18, I.snare(0.25 + 0.4 * k / ((fr(316) - fr(282)) * 18), r, 0.12), -20, 0.1)
    # 4: the kitchen: a prim little music box; a sly tuba on "neck"
    tune(fr(318), 3, "box", -10, bass=False, brush=False, until=fr(362))
    tuba(fr(NECK), 43, 0.4, -10)
    tuba(fr(NECK) + 0.3, 50, 0.4, -10)
    # 5: the aim: the drumroll again, two rising horn notes on "high", "too high"
    for k in range(int((fr(440) - fr(366)) * 16)):
        note(fr(366) + k / 16, I.snare(0.2 + 0.4 * k / ((fr(440) - fr(366)) * 16), r, 0.12), -20, 0.1)
    note(fr(HIGH), I.brass(F_(67), 0.4, 0.7, r, "horn"), -12, 0.0)
    note(fr(TOOHIGH), I.brass(F_(72), 0.4, 0.7, r, "horn"), -11, 0.0)
    # 6: the chop: a cymbal crash; silence; a confused low tuba
    note(fr(WHOOSH), I.cymbal(0.8, r, 2.0), -12, 0.0)
    tuba(fr(HEAD + 4), 36, 0.6, -8, fall=-1.0)
    # 7: the lab x-ray: vibes, one note per glowing part
    note(fr(490), I.pad([F_(55), F_(62), F_(67)], fr(588) - fr(490), 0.4, r, 0.6, 0.6, 1200), -16)
    for f0, m in ((VEIN, 74), (EAR, 79), (STEM, 83)):
        note(fr(f0), I.vibes(F_(m), 0.7, r, 1.6), -10, 0.0)
    # 8: he shakes it off: the hoedown kicks back in, jaunty
    tune(fr(SHOOK - 4), 4, "pluck", -2, until=fr(682))
    # 9: night: the tune slow and soft on the music box
    note(fr(682), I.pad([F_(55), F_(59), F_(62)], fr(788) - fr(682), 0.35, r, 0.8, 0.8, 700), -16)
    tune(fr(684), 3, "box", -10, bass=False, brush=False, tempo=0.6, until=fr(786))
    # 10: kitchen care: the tune gentle on plucks, no drums; glock drips
    tune(fr(792), 6, "pluck", -6, brush=False, tempo=0.85, until=fr(950))
    for f0 in (DROP, 875, 905, THROAT):
        glock(fr(f0 + 4), 91, -16, 0.0)
    # 11: the lab: the tune on vibes, curious; a stab on "clot"; a shrug on the tuba
    note(fr(954), I.pad([F_(55), F_(62), F_(67)], fr(1145) - fr(954), 0.35, r, 0.8, 0.8, 1100), -18)
    tune(fr(956), 6, "vibes", -6, bass=False, brush=False, tempo=0.9, until=fr(1140))
    stab(fr(CLOT), [67, 71, 74], -12)
    tuba(fr(REST), 43, 0.3, -10)
    tuba(fr(REST) + 0.3, 38, 0.5, -10)
    # 12-13: the sideshow: the calliope, full oom-pah; a stab on the flash
    tune(fr(PROMO - 4), 12, "calliope", -2, until=fr(1333))
    stab(fr(SNAP), [67, 71, 74], -6)
    # 14: other farmers: the tune limps on a minor-ish tuba, then stops; a sad horn on "none"
    tune(fr(1338), 3, "pluck", -6, until=fr(NONE - 8))
    note(fr(NONE), I.brass(F_(62), 1.0, 0.7, r, "horn", fall=-2.0), -10, 0.0)
    # 15: the scale: the calliope again, a rising tuba run with the needle, a stab on "eight", a big finish on "no head"
    tune(fr(1436), 3, "calliope", -4, until=fr(TWO - 2))
    for k, m in enumerate((31, 33, 35, 36, 38, 40, 43)):
        tuba(fr(TWO) + k * 0.2, m + 12, 0.22, -10)
    stab(fr(EIGHT), [67, 71, 74], -6)
    stab(fr(NOHEAD), [72, 76, 79], -4)
    # 16-17: the motel at night: a lonely pad, the tune's first bar slow on the vibes; the choke: it stops
    note(fr(1577), I.pad([F_(52), F_(59), F_(64)], fr(1742) - fr(1577), 0.4, r, 0.8, 0.8, 600), -14)
    tune(fr(1580), 2, "vibes", -10, bass=False, brush=False, tempo=0.55, until=fr(CHOKE - 4))
    note(fr(CHOKE), I.brass(F_(52), 0.5, 0.7, r, "horn", fall=-1.5), -12, 0.0)
    for k in range(int((fr(1742) - fr(SYR)) * 6)):
        note(fr(SYR) + k / 6, I.pluck(F_(52 + (k % 2)), 0.5, r, 0.3, 0.3, 0.2), -14, -0.2)
    # 18-20: the syringe: one glock note; dusk: the tune slow and sad on the music box
    glock(fr(LEFT), 88, -12, 0.0)
    tune(fr(1796), 3, "box", -8, bass=False, brush=False, tempo=0.6, until=fr(1930))
    note(fr(1796), I.pad([F_(48), F_(55), F_(64)], fr(1932) - fr(1796), 0.35, r, 0.8, 0.8, 600), -16)
    glock(fr(FORGOT + 8), 84, -14, 0.0)
    # 21: the festival: the hoedown full, with the calliope on top
    tune(fr(1934), 3, "pluck", -1, until=fr(2010))
    tune(fr(1934), 3, "calliope", -5, bass=False, brush=False, until=fr(2010))
    stab(fr(PARTY), [67, 71, 74], -6)
    # 22: "Lloyd only wanted dinner": the tune's last bar, slow, on the music box; a final tuba button
    tune(fr(2014), 1, "box", -8, bass=False, brush=False, tempo=0.6, start=3, until=fr(2100))
    tuba(fr(2052), 43, 0.6, -8)
    note(fr(2052), I.pluck(F_(67), 0.7, r, 0.8, 0.6), -10, 0.1)
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
        f.write("# Headless-chicken short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            if n_ not in ("step", "cluck", "tick", "claw step", "peck", "rummage", "hurrah", "jar coin"):
                f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
