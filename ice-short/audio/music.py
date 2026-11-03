# Original light comedic naval march for "The Ship Made of Ice", composed and synthesized here (F major, 120 bpm).
# Sections follow the picture: hook tutti, button on the white flash | light story march | pompous admirals' tuba +
# 'uh-oh' on the crack | busy inventor's pizzicato, ta-da after 'Pykrete.' | Mountbatten's strut, snare roll, DEAD STOP
# before the first shot | (silence through both shots, the shatter and the ricochet) | sneaky pizzicato 'Luckily' |
# curious music box under the science | grand tutti for the 2000 ft plan | soft golden lake march that runs down
# into a sad 'wah-wah' after 'cancelled' | gentle music-box ending, last F chord after 'lose'.
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 0.5  # quarter note (s)

# theme (bar, beat, length in quarters, midi) - fife register, F major
THEME = [
    (1, 0, 1, 72), (1, 1, .5, 77), (1, 1.5, .5, 77), (1, 2, 1, 81), (1, 3, 1, 77),
    (2, 0, .75, 79), (2, .75, .25, 77), (2, 1, .5, 76), (2, 1.5, .5, 74), (2, 2, 2, 72),
    (3, 0, 1, 74), (3, 1, .5, 77), (3, 1.5, .5, 77), (3, 2, 1, 82), (3, 3, 1, 81),
    (4, 0, 1, 79), (4, 1, .5, 76), (4, 1.5, .5, 77), (4, 2, 2, 79),
    (5, 0, 1, 72), (5, 1, .5, 77), (5, 1.5, .5, 77), (5, 2, 1, 81), (5, 3, .5, 84), (5, 3.5, .5, 82),
    (6, 0, 1, 81), (6, 1, 1, 77), (6, 2, .75, 79), (6, 2.75, .25, 77), (6, 3, 1, 74),
    (7, 0, .5, 76), (7, .5, .5, 77), (7, 1, .5, 79), (7, 1.5, .5, 82), (7, 2, 1, 81), (7, 3, 1, 79),
    (8, 0, 1, 77), (8, 1, .5, 72), (8, 1.5, .5, 69), (8, 2, 2, 65),
]
PICKUP3 = [(0, 2.5, .5, 67), (0, 3, .5, 69), (0, 3.5, .5, 70)]
CHB = {1: ["F"] * 4, 2: ["C7", "C7", "F", "F"], 3: ["Bb"] * 4, 4: ["C7"] * 4, 5: ["F"] * 4,
       6: ["Dm", "Dm", "Gm", "Gm"], 7: ["C7"] * 4, 8: ["F"] * 4}
CH = {
    "F": dict(oom=(41, 36), pah=[57, 60, 65], hi=[65, 69, 72]),
    "C": dict(oom=(36, 43), pah=[55, 60, 64], hi=[64, 67, 72]),
    "C7": dict(oom=(36, 43), pah=[55, 58, 64], hi=[64, 67, 70]),
    "Bb": dict(oom=(34, 41), pah=[53, 58, 62], hi=[62, 65, 70]),
    "Dm": dict(oom=(38, 45), pah=[57, 62, 65], hi=[62, 65, 69]),
    "Gm": dict(oom=(43, 38), pah=[55, 58, 62], hi=[62, 67, 70]),
    "A7": dict(oom=(45, 40), pah=[55, 61, 64], hi=[61, 64, 67]),
    "Fm": dict(oom=(41, 36), pah=[56, 60, 65], hi=[65, 68, 72]),
}
F = I.m2f

SECTIONS = [
    ("hook", 0.0, T.FLASH), ("story", T.FLASH, 15.0), ("admirals", 15.0, 17.3), ("lab", 17.3, 22.35),
    ("mb", 22.35, 27.85), ("dropout", 27.85, 35.4), ("luckily", 35.4, 40.25), ("explain", 40.25, 52.3),
    ("plan", 52.3, 54.7), ("lake", 54.7, 61.3), ("ending", 61.3, T.DUR),
]
def swingb(b):
    fl = np.floor(b)
    fr_ = b - fl
    return fl + (2 / 3 if fr_ in (0.5, 0.75) else (1 / 3 if fr_ == 0.25 else fr_))


def theme(t_bar1, bars=range(1, 9), transpose=0, pickup=False, swing=False, late=0.0):
    ev = []
    for (b, beat, d, m) in THEME + (PICKUP3 if pickup else []):
        if b == 0 and not pickup:
            continue
        if b != 0 and b not in bars:
            continue
        bb = swingb(beat) if swing else beat
        ev.append((t_bar1 + (b - 1) * 4 * Q + bb * Q + late, d * Q, m + transpose))
    return sorted(ev)


class Band:
    def __init__(self):
        self.tr = {}
        self.send = {}
        self.cues = []

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0, send=0.15):
        buf = self.track(name, send)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(1831)


def _r():
    return rng(int(R.integers(1 << 30)))


def oompah(b, t_bar, chords, vel=0.6, every=True, pah_vel=0.4, bounce=False, pah=True):
    """tuba on the beats (root/fifth alternating) + after-beat horns on the &s; bounce = octave eighths"""
    for beat in range(4):
        c = CH[chords[beat]]
        t = t_bar + beat * Q
        if bounce:
            lo = c["oom"][0] if c["oom"][0] >= 36 else c["oom"][0] + 12
            b.add("tuba", I.brass(F(lo), 0.2, vel, _r(), "tuba", scoop=-30), t, -0.1)
            b.add("tuba", I.brass(F(lo + 12), 0.16, vel * 0.85, _r(), "tuba", scoop=-45), t + Q / 2, -0.1)
        elif every or beat in (0, 2):
            m = c["oom"][beat % 2] if every else c["oom"][0 if beat == 0 else 1]
            b.add("tuba", I.brass(F(m), 0.3, vel * (1.0 if beat in (0, 2) else 0.88), _r(), "tuba"), t, -0.1)
        if pah:
            if every:
                for k, m in enumerate(c["pah"]):
                    b.add("pah", I.brass(F(m), 0.15, pah_vel, _r(), "horn", scoop=-12), t + Q / 2 + 0.004 * k, 0.32 - 0.12 * k)
            elif beat in (1, 3):
                for k, m in enumerate(c["pah"]):
                    b.add("pah", I.brass(F(m), 0.17, pah_vel, _r(), "horn", scoop=-12), t + 0.004 * k, 0.32 - 0.12 * k)


SN = {
    "light": [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 1],
    "march": [3, 0, 1, 1, 2, 0, 1, 0, 3, 0, 1, 1, 2, 0, 1, 0],
    "drive": [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
}


def snare_bar(b, t_bar, pat, vel, steps=range(16), cres=0.0):
    for s in steps:
        v = SN[pat][s]
        if not v:
            continue
        t = t_bar + s * Q / 4
        vv = vel * (1 + cres * s / 16) * {1: 0.5, 2: 0.9, 3: 0.95}[v] * R.uniform(0.93, 1.05)
        if v == 3:
            b.add("snare", I.snare(vv * 0.4, _r()), t - 0.026, 0.05)
        b.add("snare", I.snare(vv, _r()), t + R.normal(0, 0.002), 0.05)


def roll(b, t0, t1, v0, v1, accent=None, at=None):
    for t, v in I.snare_roll(t0, t1, v0, v1, _r()):
        b.add("snare", I.snare(v, _r(), dur=0.14, buzz=True), t, 0.05)
    if accent:
        at = t1 if at is None else at
        b.add("snare", I.snare(accent * 0.4, _r()), at - 0.026, 0.05)
        b.add("snare", I.snare(accent, _r()), at, 0.05)


def melody(b, name, notes, vel, transpose=0, fn="glock", p=0.0, gate=0.9):
    for (t, d, m) in notes:
        m = m + transpose
        if fn == "glock":
            x = I.glock(F(m), vel * R.uniform(0.92, 1.05), _r())
        elif fn == "fife":
            x = I.fife(F(m), d * gate, vel * R.uniform(0.94, 1.04), _r())
        elif fn == "vibes":
            x = I.vibes(F(m), vel * R.uniform(0.92, 1.05), _r(), dur=max(1.2, d + 0.8), damp=d + 0.35)
        elif fn == "musicbox":
            x = I.musicbox(F(m), vel * R.uniform(0.92, 1.05), _r())
        b.add(name, x, t, p)


def chorus(b, name, notes, voices, seed, joins=None, falters=None, spread=0.75, vel=1.0, solo_gain=1.0):
    """several soldiers whistling the same tune: own detune, timing, vibrato, breath and place in the column"""
    rr = rng(seed)
    for v in range(voices):
        rv = rng(seed * 101 + v)
        nv = [(t, d, m, vel * rv.uniform(0.85, 1.0)) for (t, d, m) in notes if joins is None or t >= joins[v] - 1e-6]
        if not nv:
            continue
        fal = (falters[v], -rv.uniform(1.2, 3.2)) if falters else None
        t0, y = I.whistle(nv, rv, detune=rv.uniform(-11, 11) if v else 0.0, jit=0.010, lag=rv.uniform(0, 0.022) if v else 0.0,
                          vib_rate=rv.uniform(5.0, 6.6), vib_depth=rv.uniform(10, 22), breath=rv.uniform(0.04, 0.07), falter=fal)
        g = (solo_gain if v == 0 else rv.uniform(0.45, 0.8))
        p = 0.0 if v == 0 else spread * rr.uniform(-1, 1)
        if v:  # the rest of the column is further away: a little duller
            y = lp(y, rv.uniform(5000, 9000), 1)
        b.add(name, y, t0, p, g)




def cut_all(b, t, fade=0.012, keep=()):
    """dead stop: everything (except `keep`) is silent from t"""
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade))
    g[a + ns(fade):] = 0
    for k in b.tr:
        if k not in keep:
            b.tr[k] *= g[None, :]


def build():
    b = Band()
    for name, send in [("fife", 0.16), ("glock", 0.22), ("tuba", 0.10), ("pah", 0.18), ("snare", 0.13), ("cymbal", 0.16),
                       ("stab", 0.16), ("timpani", 0.18), ("pad", 0.25), ("vibes", 0.26), ("musicbox", 0.26),
                       ("pluck", 0.18), ("brush", 0.12), ("triangle", 0.25), ("bone", 0.2)]:
        b.track(name, send)

    # ============ HOOK 0 - 4.33: tutti theme bars 1-2, fill under 'out of ice.', cut by the white flash, button ON it
    h = theme(0.0, bars=[1, 2])
    melody(b, "fife", h, 0.62, 0, "fife", 0.25)
    melody(b, "glock", h, 0.5, 12, "glock", -0.35)
    for bar in (1, 2):
        tb = (bar - 1) * 2.0
        oompah(b, tb, CHB[bar], 0.66, True, 0.42)
        snare_bar(b, tb, "march", 0.6, steps=range(16) if bar == 1 else range(8))
    roll(b, 3.0, 4.28, 0.22, 0.6)
    b.add("cymbal", I.cymbal(0.45, _r()), 0.0, 0.0)
    b.cues.append((0.0, "hook: theme bars 1-2 tutti (fife + glock + tuba/after-beats + snare), roll 3.0-4.3"))
    cut_all(b, T.FLASH - 0.02)
    for m in [41, 53, 57, 60, 65, 69]:
        b.add("stab", I.brass(F(m), 0.2, 0.8, _r(), "stab", scoop=-15), T.FLASH, (m - 56) / 20)
    b.add("tuba", I.brass(F(29), 0.25, 0.8, _r(), "tuba"), T.FLASH, -0.1)
    b.add("glock", I.glock(F(89), 0.6, _r()), T.FLASH, -0.35)
    b.add("cymbal", I.cymbal(0.4, _r(), dur=1.2), T.FLASH, 0.0)
    b.cues.append((T.FLASH, "F button + clash exactly on the white flash (frame 130)"))

    # ============ STORY 5.0 - 15.0: light theme bars 1-5 (glock + fife, tuba on 1/3, after-beats on 2/4, light snare)
    roll(b, 4.6, 4.97, 0.12, 0.42, accent=0.45, at=5.0)
    s0 = 5.0
    st_ = theme(s0, bars=range(1, 6))
    melody(b, "glock", st_, 0.36, 12, "glock", -0.35)
    melody(b, "fife", st_, 0.44, 0, "fife", 0.25)
    for bar in range(1, 6):
        tb = s0 + (bar - 1) * 2
        oompah(b, tb, CHB[bar], 0.5, bar >= 3, 0.34)
        snare_bar(b, tb, "light", 0.34 + 0.03 * bar, steps=range(16) if bar < 5 else range(12))
    b.add("cymbal", I.cymbal(0.3, _r()), 9.0, 0.0)
    b.add("glock", I.glock(F(96), 0.5, _r()), T.fr(T.W["pyke"] + 22), 0.0)   # doubles the lightbulb ding
    b.cues.append((5.0, "story: theme bars 1-5, light band (fuller from 9.0 = 'So an inventor...')"))

    # ============ ADMIRALS 15.0 - 17.3: pompous stop-time tuba 'harrumph', rest for the crack, glock 'uh-oh'
    for t, m, v in [(15.0, 41, 0.8), (15.5, 36, 0.75), (16.0, 41, 0.8)]:
        b.add("tuba", I.brass(F(m), 0.32, v, _r(), "tuba"), t, -0.1)
        for k, mm in enumerate([53, 57, 60]):
            b.add("pah", I.brass(F(mm), 0.22, 0.5, _r(), "horn"), t + 0.004 * k, 0.3 - 0.12 * k)
    snare_bar(b, 15.0, "light", 0.3, steps=range(9))
    for t, m in [(16.95, 81), (17.15, 77)]:
        b.add("glock", I.glock(F(m + 12), 0.5, _r(), dur=0.9), t, -0.2)
    b.cues.append((15.0, "admirals: three pompous tuba + horn hits (F-C-F), silence for the crack (16.47), glock 'uh-oh' 16.95"))

    # ============ LAB 17.5 - 21.5: busy inventor - pizzicato bass + music box theme, ta-da after 'Pykrete.'
    l0 = 17.5
    lt = theme(l0, bars=[1, 2])
    melody(b, "musicbox", lt, 0.55, 12, "musicbox", 0.2)
    for k in range(16):
        t = l0 + k * Q / 2
        c = CH[CHB[1 + k // 8][(k // 2) % 4]]
        m = c["oom"][0] + (12 if c["oom"][0] < 40 else 0) + (7 if k % 2 else 0)
        b.add("pluck", I.pluck(F(m), 0.55, _r(), dur=0.35), t, -0.1)
    for k in range(8):
        b.add("brush", I.brush(0.3, _r()), l0 + k * Q + Q / 2, 0.15)
    b.add("pad", I.pad([F(m) for m in (57, 60, 65)], 0.6, 0.25, _r(), att=0.2, rel=0.3), 21.5, 0.0)
    tada = 22.22
    for m in [41, 53, 57, 60, 65, 72]:
        b.add("stab", I.brass(F(m), 0.3, 0.7, _r(), "stab", scoop=-12), tada, (m - 56) / 20)
    b.add("glock", I.glock(F(89), 0.6, _r()), tada, -0.3)
    b.add("cymbal", I.cymbal(0.35, _r(), dur=1.4), tada, 0.0)
    b.cues.append((17.5, "inventor: music-box theme over bouncing pizzicato eighths and brushes"))
    b.cues.append((tada, "ta-da: F stab + glock + cymbal right after 'Pykrete.' (21.52-22.16)"))

    # ============ MOUNTBATTEN 22.5 - 27.85: pompous strut, then dominant pedal + roll, DEAD STOP before the shot
    m0 = 22.75
    mt = theme(m0, bars=[1, 2])
    melody(b, "fife", mt, 0.5, 0, "fife", 0.25)
    for bar in (1, 2):
        tb = m0 + (bar - 1) * 2
        oompah(b, tb, CHB[bar], 0.6, True, 0.4)
        snare_bar(b, tb, "march", 0.5)
    b.add("cymbal", I.cymbal(0.3, _r()), m0, 0.0)
    tb = m0 + 4.0                                     # 26.75: C7 pedal, tuba eighths, roll crescendo
    for k in range(4):
        b.add("tuba", I.brass(F(36), 0.18, 0.6 + 0.06 * k, _r(), "tuba"), tb + k * 0.25, -0.1)
        for j, mm in enumerate(CH["C7"]["pah"]):
            b.add("pah", I.brass(F(mm), 0.12, 0.42 + 0.05 * k, _r(), "horn"), tb + k * 0.25 + 0.125 + 0.004 * j, 0.3 - 0.12 * j)
    roll(b, tb, 27.84, 0.35, 0.95)
    cut_all(b, 27.84, keep=("cymbal",))
    b.cues.append((22.75, "Mountbatten's strut: theme bars 1-2, full oom-pah + march snare"))
    b.cues.append((26.75, "C7 pedal + snare roll crescendo, DEAD STOP at 27.84 (first shot 27.93)"))
    b.cues.append((27.85, "silence through BANG 1, the shatter, BANG 2 and the ricochet"))

    # ============ LUCKILY 35.6 - 40.2: sneaky staccato pizzicato, vibes peek; rising line into 'interested', 'ooh' chord
    k0 = 35.6
    for k in range(9):
        t = k0 + k * Q
        m = [41, 36, 41, 36, 46, 41, 43, 36, 41][k]
        b.add("pluck", I.pluck(F(m), 0.6, _r(), dur=0.3, bright=0.35), t, -0.1)
    for (t, m) in [(35.85, 77), (36.35, 81), (36.85, 79)]:
        b.add("vibes", I.vibes(F(m), 0.35, _r(), dur=0.8, damp=0.3), t, 0.25)
    for j, m in enumerate([72, 74, 76, 77, 79, 81, 82, 84]):
        b.add("vibes", I.vibes(F(m), 0.25 + 0.03 * j, _r(), dur=0.6, damp=0.25), 37.75 + j * 0.25, 0.25)
    for m in [65, 69, 72, 76]:
        b.add("vibes", I.vibes(F(m), 0.38, _r(), dur=1.6), 39.85, 0.2)
    b.add("triangle", I.triangle(0.25, _r()), 39.85, 0.35)
    b.cues.append((35.6, "'Luckily': sneaky staccato pizzicato, vibes peeking"))
    b.cues.append((37.75, "rising vibes line into 'very interested', Fmaj7 'ooh' chord at 39.85"))

    # ============ EXPLAIN 40.5 - 52.0: curious music box over pads (F - Dm - Bb - C7 ...), thins under the cracks
    prog = [("F", 40.5), ("Dm", 42.5), ("Bb", 44.5), ("C7", 46.5), ("F", 48.5), ("Dm", 50.0), ("C7", 51.0)]
    for i, (c, t) in enumerate(prog):
        t1 = prog[i + 1][1] if i + 1 < len(prog) else 52.1
        b.add("pad", I.pad([F(m) for m in CH[c]["pah"]], t1 - t, 0.3, _r(), att=0.35, rel=0.4), t, 0.0)
        b.add("pluck", I.pluck(F(CH[c]["oom"][0] + 12), 0.5, _r(), dur=1.0, bright=0.3), t, -0.1)
        hi = CH[c]["hi"]
        steps = int(round((t1 - t) / Q))
        for k in range(steps):
            b.add("musicbox", I.musicbox(F(hi[[0, 1, 2, 1][k % 4]] + 12), 0.4, _r()), t + k * Q, 0.2)
    b.cues.append((40.5, "science: curious music-box arpeggios over soft pads, F - Dm - Bb - C7 - F - Dm - C7"))

    # ============ PLAN 52.4 - 54.6: grand tutti for the 2000 ft ship
    p0 = 52.4
    pt = theme(p0, bars=[1])
    melody(b, "fife", pt, 0.62, 0, "fife", 0.25)
    melody(b, "glock", pt, 0.5, 12, "glock", -0.35)
    oompah(b, p0, CHB[1], 0.7, True, 0.46)
    snare_bar(b, p0, "march", 0.55)
    b.add("cymbal", I.cymbal(0.45, _r()), p0, 0.0)
    b.add("timpani", I.timpani(F(41), 0.7, _r()), p0, -0.1)
    for m in [41, 53, 57, 60, 65]:
        b.add("stab", I.brass(F(m), 0.5, 0.6, _r(), "stab", scoop=-10), 54.4, (m - 56) / 20)
    b.add("timpani", I.timpani(F(41), 0.6, _r()), 54.4, -0.1)
    b.cues.append((52.4, "grand tutti, theme bar 1 + timpani/cymbal for 'two thousand feet long', F stab 54.4"))

    # ============ LAKE 54.9 - 60.4: soft golden march (bars 3-4), runs down on C7, stops for the stamp; sad wah-wah
    g0 = 54.9
    gt = theme(g0, bars=[3, 4])
    melody(b, "fife", gt, 0.4, 0, "fife", 0.25)
    melody(b, "glock", gt, 0.3, 12, "glock", -0.35)
    for bar in (3, 4):
        tb = g0 + (bar - 3) * 2
        oompah(b, tb, CHB[bar], 0.45, False, 0.3)
        snare_bar(b, tb, "light", 0.28)
    for k, t in enumerate([58.9, 59.5, 60.15]):      # running down: slower and slower tuba
        b.add("tuba", I.brass(F([36, 43, 36][k]), 0.3, 0.55 - 0.08 * k, _r(), "tuba"), t, -0.1)
    cut_all(b, 60.38, keep=("cymbal",))
    for k, (t, m, d, fall) in enumerate([(60.8, 60, 0.13, 0), (60.96, 59, 0.13, 0), (61.12, 58, 0.13, 0), (61.28, 57, 0.75, -1.0)]):
        b.add("bone", I.brass(F(m), d, 0.62, _r(), "horn", scoop=-35, rel=0.12, fall=fall), t, 0.0)
    b.cues.append((54.9, "lake: soft golden march, theme bars 3-4, light snare"))
    b.cues.append((58.9, "the band runs down: slower and slower tuba, stops at 60.38 for the stamp (60.4)"))
    b.cues.append((60.8, "sad 'wah-wah-wah-waah' (muted horn, last note falls) after 'cancelled'"))

    # ============ ENDING 61.8 - 69.3: gentle music box + vibes, theme bars 5-7 over pads, last F chord after 'lose'
    e0 = 61.8
    et = theme(e0, bars=[5, 6, 7])
    melody(b, "musicbox", et, 0.5, 0, "musicbox", 0.2)
    melody(b, "vibes", et, 0.3, -12, "vibes", -0.2)
    for bar in (5, 6, 7):
        tb = e0 + (bar - 5) * 2
        for half in (0, 1):
            c = CHB[bar][half * 2]
            b.add("pad", I.pad([F(m) for m in CH[c]["pah"]], 1.0, 0.28, _r(), att=0.3, rel=0.35), tb + half, 0.0)
            b.add("pluck", I.pluck(F(CH[c]["oom"][0] + 12), 0.45, _r(), dur=0.9, bright=0.3), tb + half, -0.1)
    for t in (T.T_["three"], T.T_["summers"]):
        b.add("triangle", I.triangle(0.2, _r(), dur=0.8), t + 0.05, 0.35)
    fin = 67.85
    for m in [53, 57, 60, 65, 69, 72]:
        b.add("vibes", I.vibes(F(m), 0.35, _r(), dur=1.5), fin, 0.2)
    b.add("pad", I.pad([F(m) for m in (53, 57, 60, 65)], 1.2, 0.3, _r(), att=0.05, rel=0.4), fin, 0.0)
    b.add("musicbox", I.musicbox(F(89), 0.45, _r()), fin, 0.2)
    b.cues.append((61.8, "ending: music box + vibes, theme bars 5-7 over soft pads; triangle tings on 'three' / 'summers'"))
    b.cues.append((fin, "last F chord (vibes + pad + music box) after 'lose' (67.53-67.72), fades out by 69.33"))
    end = np.ones(N)
    a = ns(T.DUR - 1.2)
    end[a:] = np.linspace(1, 0, N - a) ** 1.5
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b

TARGET = {  # relative balance inside the band (LU, measured on each track's own active span)
    "bone": -2.0, "fife": -1.0, "glock": -6.0, "tuba": -2.5, "pah": -7.5, "snare": -5.5, "cymbal": -11.0,
    "stab": -3.0, "timpani": -5.0, "pad": -3.5, "vibes": -2.0, "musicbox": -1.5, "pluck": -4.0, "brush": -13.0, "triangle": -15.0,
}


def render(b, ref=-20.0):
    hall = make_ir(1.5, 7, pre=0.018, hf=1.4)
    yard = make_ir(0.9, 8, pre=0.008, hf=1.8, early=[(0.11, 0.5, -0.4), (0.19, 0.35, 0.5)])
    dry = np.zeros((2, N))
    wet_hall = np.zeros((2, N))
    wet_yard = np.zeros((2, N))
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g
        b.tr[k] = x
        dry += x
        if k == "whistle":
            wet_yard += 0.16 * x
        else:
            wet_hall += b.send[k] * x
    out = dry + 0.7 * convolve_st(wet_hall.mean(0), hall) + 0.8 * convolve_st(wet_yard.mean(0), yard)
    out = hp(out, 30, 2)
    return out, levels
