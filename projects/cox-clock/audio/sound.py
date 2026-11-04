# Sound for "The Clock Nobody Had to Wind": original score (a light Georgian gavotte-minuet in G, 3/4, 112 bpm:
# harpsichord-like plucks, flute, music box, warm pads) + synthesized SFX timed to the picture (frames from
# remotion/src/videos/cox/story.ts + cast.ts) + the voice, gain only. The clock ticks under the whole film (louder on the
# dial close-ups) and everything stops dead on "off." (STOP). Standard mix: music +3 dB house standard (~-10 LU under
# the voice, ducked 3 dB on words), SFX -6 dB (~-14 LU). Master -16 LUFS, <= -1 dBTP, exactly TOTAL frames / 48 kHz.
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
TOTAL = 1940
STOP = 1890          # second hand stops (story.ts)
SWITCH = 1876        # the guard's switch flips
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts)
SHOTS = {1: (0, 70, "street"), 101: (70, 160, "dial"), 2: (160, 300, "hall"), 3: (300, 365, "street"), 103: (365, 400, "hall"),
         4: (400, 528, "dial"), 5: (528, 624, "hall"), 6: (624, 712, "hall"), 7: (712, 848, "hall"), 8: (848, 922, "hall"),
         9: (922, 975, "sky"), 10: (975, 1125, "case"), 11: (1125, 1188, "sky"), 111: (1188, 1320, "case"), 12: (1320, 1445, "hall"),
         13: (1445, 1512, "sky"), 14: (1512, 1675, "sky"), 15: (1675, 1886, "gallery"), 116: (1886, TOTAL, "dial")}


def env_for(kind, fade=0.2):
    e = np.zeros(N)
    for a, b, k in SHOTS.values():
        if k == kind:
            e[ns(fr(a)):min(N, ns(fr(b)))] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


def storm_at(f):  # story.ts stormAt
    return np.interp(f, [922, 956, 1445, 1600, 1622, 1675], [0.25, 0.6, 0.35, 0.45, 1.0, 0.9])


# ================================================================ SFX
def tick_sound(r, tock):
    """one escapement tick: a small brass clink + a dry wooden knock in the case"""
    k = modal(0.12, [(420 if tock else 470, 1.0, 0.012), (1150, 0.4, 0.006)], r) * 0.8
    c = G.clink(r, 2600 if tock else 3100, 0.09, 0.6) * 0.7
    k[: len(c)] += c[: len(k)]
    return k


def build_sfx():
    r = rng(17)
    S = np.zeros((2, N))
    street, hall, sky, case, dial, gal = (env_for(k) for k in ("street", "hall", "sky", "case", "dial", "gallery"))
    after = (np.arange(N) < ns(fr(STOP))).astype(float)
    # ---- ambiences ----
    S += G.breeze(DUR, r, 0.8, 0.3, 1000) * (street + 0.3 * sky)[None, :] * dbg(-32)
    S += pan(G.bird_chirps(DUR, r, 0.4, "sparrow"), -0.4) * street[None, :] * dbg(-36)
    crowd = sum(pan(G.babble(DUR, r, b, sc, 4.0, 0.6), p) for b, sc, p in ((120, 0.9, -0.6), (165, 1.0, 0.4), (210, 1.15, -0.1), (140, 0.95, 0.7)))
    S += crowd * (street * 0.7 + hall * 1.0)[None, :] * dbg(-40)
    room = lp(colored(N, r, 1.0), 400, 2)
    S += np.stack([room, room]) * (hall + case + gal * 0.7)[None, :] * dbg(-42)
    # wind and rain over London (follows the cloud cover)
    fN = np.arange(N) / SR * FPS
    stormE = storm_at(fN) * sky
    S += G.breeze(DUR, r, 1.4, 0.5, 1400) * (sky * 0.6 + stormE * 0.8)[None, :] * dbg(-26)
    rain = np.stack([hp(colored(N, r, 0.3), 1500, 2), hp(colored(N, r, 0.3), 1500, 2)])
    S += rain * np.clip((stormE - 0.4) * 1.6, 0, 1)[None, :] * dbg(-30)
    # ---- the clock: one tick per second (tick / tock), loud on the dial close-ups, gone after STOP ----
    tickE = (0.25 * hall + 0.55 * case + 1.0 * dial + 0.25 * gal) * after
    for s in range(int(DUR) + 1):
        t = s + 0.02
        if t >= DUR:
            break
        g = tickE[min(N - 1, ns(t))]
        if g > 0.02:
            cue(t, "tick", tick_sound(r, s % 2 == 1), -12 + 20 * np.log10(g), 0.1 if s % 2 else -0.1, S)
    # ---- events ----
    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def swish(t, g=-22):
        cue(t, "cloth swish", G.whoosh(0.35, r, 0.4, 900, 4500, 0.6, 0.15, 0.3), g, 0.0, S)

    def pop(t, f0=520, g=-18):
        d = tt(0.18)
        cue(t, "pop", np.exp(-d / 0.04) * np.sin(phase(f0 * (1 + 3 * np.exp(-d / 0.02)))), g, 0.0, S)

    def thunder(t, g, d=3.5):
        n = ns(d)
        e = np.exp(-tt(d) / 1.1) * (1 - np.exp(-tt(d) / 0.03))
        x = lp(colored(n, r, 1.8), 300, 2) * e + hp(r.standard_normal(n), 2000) * np.exp(-tt(d) / 0.05) * 0.3
        cue(t, "thunder", x / np.abs(x).max(), g, 0.0, S)

    def ratchet(t0, t1, rate0, rate1, g=-20, p=0.0):
        t = t0
        while t < t1:
            u = (t - t0) / (t1 - t0)
            cue(t, "ratchet click", G.clink(r, 1800, 0.05, 0.5), g - 4 * u, p, S)
            t += 1 / (rate0 + (rate1 - rate0) * u)

    for k, f0 in enumerate(range(8, 70, 14)):                                  # footsteps on cobbles
        cue(fr(f0), "step", G.stroll_step(r, 0.4), -28, -0.3 + 0.12 * k, S)
    whoosh(fr(70), 0.5, -22)                                                    # cut to the dial
    whoosh(fr(160), 0.7, -16)                                                   # flash -> Cox
    swish(fr(244), -22)                                                         # smug head tilt
    cue(fr(264), "reveal shimmer", G.whoosh(1.0, r, 0.2, 2000, 8000, 0.5, 0.4, 0.6), -18, 0.0, S)
    for k, f0 in enumerate((318, 326, 333)):                                    # coin flips and lands
        cue(fr(f0), "coin", G.clink(r, 4200 - 300 * k, 0.25, 1.0), -18 - 2 * k, -0.2, S)
    cue(fr(342), "shop bell", I.glock(I.m2f(91), 0.5, r, 1.4) + 0.6 * I.glock(I.m2f(88), 0.4, r, 1.4), -20, 0.2, S)
    for f0 in (400, 416, 435):                                                  # "No key. No crank. No weights."
        pop(fr(f0), 300, -26)
    pop(fr(507), 900, -20)                                                      # kept on ticking
    cue(fr(630), "magic sparkle", G.whoosh(0.8, r, 0.2, 3000, 9000, 0.5, 0.3, 0.8), -18, -0.2, S)
    swish(fr(655), -20)                                                         # servant leans out
    d = tt(0.7)                                                                 # the cat: a short "mrrp?"
    f = 520 + 260 * np.sin(np.pi * np.clip(d / 0.55, 0, 1)) + 12 * np.sin(phase(np.full(len(d), 6.0)))
    meow = sum(np.sin(k * phase(f)) / k ** 1.3 for k in range(1, 7)) * np.sin(np.pi * np.clip(d / 0.6, 0, 1)) ** 0.7
    cue(fr(696), "cat mrrp", bp(meow, 500, 3500), -22, 0.25, S)
    ratchet(fr(805), fr(848), 22, 3, -18, -0.3)                                 # the lottery wheel
    cue(fr(822), "crowd ooh", sum(pan(G.babble(1.4, r, b, 1.1, 5, 0.9), p) for b, p in ((170, -0.4), (210, 0.3), (250, 0.0))), -24, 0.0, S)
    cue(fr(852), "applause", G.applause(2.4, r, 14) * np.linspace(1, 0.3, ns(2.4))[None, :], -18, 0.0, S)
    whoosh(fr(922), 0.7, -14)                                                   # hard cut to the sky
    thunder(fr(954), -12)                                                       # "weather"
    whoosh(fr(975), 0.6, -20)
    cue(fr(1084), "glass ting", G.clink(r, 5200, 0.6, 1.2), -20, 0.2, S)       # "seventy kilos"
    for f0, up in ((1205, True), (1221, False)):                                # mercury rises / falls
        n = ns(0.5)
        fq = np.linspace(500, 900, n) if up else np.linspace(900, 450, n)
        x = np.sin(phase(fq)) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.6 + G.bubbles(0.5, r, 20, 900, 2600, (0.004, 0.02))[:n] * 0.3
        cue(fr(f0), "mercury slide", x, -18, 0.0, S)
    ratchet(fr(1281), fr(1300), 14, 10, -16, 0.1)                               # the tiny push winds it
    for f0, inh in ((1386, True), (1412, False)):                              # breathe in / out
        n = ns(0.8)
        e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
        cue(fr(f0), "breath", bp(r.standard_normal(n), 700 if inh else 500, 3000) * e * 0.5, -22, 0.0, S)
    whoosh(fr(1445), 0.9, -18)                                                  # up into the golden sky
    thunder(fr(1620), -8, 4.5)                                                  # "storm"
    whoosh(fr(1675), 1.0, -22)                                                  # to the gallery
    for k, f0 in enumerate(range(1690, 1830, 21)):                              # gallery footsteps
        cue(fr(f0), "step", G.stroll_step(r, 0.2), -32, 0.4 - 0.1 * k, S)
    cue(fr(SWITCH), "switch click", modal(0.15, [(1900, 1.0, 0.01), (3400, 0.5, 0.005)], r) + np.pad(G.clink(r, 2400, 0.08, 0.6) * 0.5, (0, ns(0.15) - ns(0.08))), -10, -0.2, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 112.0
BEAT = 60 / BPM
BAR = 3 * BEAT
# our own minuet theme in G (bar, beat, beats, midi)
THEME = [(0, 0, 1, 74), (0, 1, .5, 71), (0, 1.5, .5, 72), (0, 2, 1, 74),
         (1, 0, 1, 79), (1, 1, 1, 78), (1, 2, 1, 76),
         (2, 0, 1, 74), (2, 1, .5, 72), (2, 1.5, .5, 71), (2, 2, 1, 69),
         (3, 0, 2, 71), (3, 2, 1, 67),
         (4, 0, 1, 72), (4, 1, .5, 74), (4, 1.5, .5, 76), (4, 2, 1, 72),
         (5, 0, 1, 71), (5, 1, 1, 74), (5, 2, 1, 79),
         (6, 0, 1, 78), (6, 1, .5, 76), (6, 1.5, .5, 74), (6, 2, 1, 72),
         (7, 0, 3, 67)]
CHORDS = [[43, 59, 62], [48, 60, 64], [50, 54, 57, 60], [43, 59, 62], [48, 60, 64], [43, 59, 62, 67], [50, 54, 57, 60], [43, 55, 59, 62]]


def build_music():
    r = rng(9)
    M = np.zeros((2, N))
    ir = make_ir(1.6, 3, hf=1.4)

    def note(t, x, g, p=0.0):
        if 0 <= t < fr(STOP) + 0.02 or t >= fr(STOP) + 0.4:
            place(M, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def minuet(t0, bars, lead="pluck", g=0.0, bass=True, chords=True, oct_=0, start_bar=0, until=None):
        for (b, be, ln, m) in THEME:
            if not (start_bar <= b < start_bar + bars):
                continue
            t = t0 + (b - start_bar) * BAR + be * BEAT
            if until and t >= until:
                continue
            if lead == "pluck":
                note(t, I.pluck(F_(m + oct_), 0.8, r, 0.9, 0.8, 0.12), g - 6, 0.15)
            elif lead == "fife":
                note(t, I.fife(F_(m + oct_), ln * BEAT * 0.95, 0.65, r), g - 9, 0.1)
            elif lead == "box":
                note(t, I.musicbox(F_(m + 12 + oct_), 0.6, r, 1.4), g - 8, -0.1)
        for b in range(start_bar, start_bar + bars):
            t = t0 + (b - start_bar) * BAR
            if until and t >= until:
                continue
            ch = CHORDS[b % 8]
            if bass:
                note(t, I.pluck(F_(ch[0] - 12 if ch[0] > 40 else ch[0]), 0.8, r, 1.1, 0.3, 0.2), g - 7, -0.2)
            if chords:
                for k in (1, 2):
                    for m in ch[1:]:
                        note(t + k * BEAT, I.pluck(F_(m), 0.45, r, 0.5, 0.6, 0.15), g - 15, 0.25)

    def padc(t, ch, d, g, warm=900):
        note(t, I.pad([F_(m) for m in ch], d, 0.5, r, 0.5, 1.0, warm), g)

    def glock(t, m, g=-10):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, 0.3)

    # hook + Cox (0 - 10 s): plucky minuet; a sparkle on "Perpetual Motion"
    minuet(0.2, 8, "pluck", 0, until=fr(300))
    for k, m in enumerate((79, 83, 86, 91)):
        glock(fr(266) + k * 0.09, m, -12)
    # the crowd and the inserts (10 - 17.6): music box over light plucks, stopping on each "No"
    minuet(fr(300), 3, "box", -2, bass=True, chords=False, start_bar=0, until=fr(398))
    for f0 in (402, 418, 437):
        note(fr(f0), I.pluck(F_(43), 0.8, r, 0.6, 0.3), -6)
    glock(fr(507), 86, -10)
    # day / week / month (17.6 - 20.8): three rising pads
    for k, (f0, ch) in enumerate(((531, [55, 59, 62]), (554, [57, 60, 64]), (589, [59, 62, 67]))):
        padc(fr(f0), [m + 12 for m in ch], 1.2, -14 + k)
    # theories (20.8 - 23.7): pizzicato question, a little "?" glock each
    for f0, m in ((633, 79), (659, 81), (697, 84)):
        note(fr(f0), I.pluck(F_(m - 12), 0.7, r, 0.5, 0.7), -8)
        glock(fr(f0) + 0.15, m, -14)
    # Cox smiles, the lottery, luckily (23.7 - 30.7): minuet returns, bright
    minuet(fr(714), 6, "pluck", 0, start_bar=2, until=fr(922))
    # unluckily: deadpan stop + low tuba plods into the weather
    for k, m in enumerate((43, 42, 41, 38)):
        note(fr(925) + 0.15 + k * 0.4, I.brass(F_(m), 0.4, 0.7, r, "tuba"), -12, -0.1)
    # explainer (32.5 - 48.2): soft ostinato + pad, a glock on every mercury move
    for b in range(int((fr(1445) - fr(977)) / BAR)):
        t = fr(977) + b * BAR
        ch = CHORDS[(b // 2) % 4]
        for k in range(3):
            note(t + k * BEAT, I.pluck(F_(ch[1 + k % (len(ch) - 1)]), 0.5, r, 0.6, 0.5, 0.18), -15, 0.3 * (-1) ** k)
        if b % 2 == 0:
            padc(t, [m + 12 for m in ch[1:]], BAR * 2, -20, 800)
    glock(fr(1205), 86, -12); glock(fr(1221), 79, -12); glock(fr(1290), 91, -11)
    # breathing the sky (48.2 - 55.8): golden fife over a wide pad; storm brush roll + timpani on "storm"
    padc(fr(1445), [55, 59, 62, 67], 5.0, -12, 900)
    minuet(fr(1450), 4, "fife", -3, bass=True, chords=False, start_bar=4)
    for k in range(24):
        note(fr(1590) + k * 0.1, I.brush(0.3 + 0.5 * k / 24, r, 0.2), -22 + 7 * k / 24, 0.2)
    note(fr(1620), I.timpani(F_(38), 0.9, r, 2.2), -6)
    # today (55.8 - 62.7): quiet music box, the theme slowed
    minuet(fr(1680), 6, "box", -5, bass=False, chords=False, start_bar=0)
    padc(fr(1680), [55, 59, 62], 6.0, -18, 700)
    # the twist: everything stops dead on "off." - one low deadpan button half a second later
    note(fr(STOP) + 0.6, I.pluck(F_(31), 0.9, r, 1.4, 0.3), -6)
    wet = convolve_st(M, ir)
    out = M + wet * dbg(-9)
    cut = ns(fr(STOP))                       # hard stop (with a 20 ms fade) - only the button and its tail remain
    out[:, cut:cut + ns(0.02)] *= np.linspace(1, 0, ns(0.02))[None, :]
    keep = ns(fr(STOP) + 0.55)
    out[:, cut + ns(0.02):keep] = 0
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
    # after STOP the room goes quiet too (ambience fades in 0.3 s), the switch click stays
    k0 = ns(fr(STOP))
    amb = np.ones(N); amb[k0:] = np.maximum(0.15, 1 - (np.arange(N - k0) / ns(0.3)))
    key = np.zeros(N)
    for w in words():
        key[ns(w["start"] - 0.05):ns(w["end"] + 0.1)] = 1
    kk = ns(0.12)
    key = np.convolve(key, np.ones(kk) / kk, "same")
    m *= dbg(-3.0 * key)[None, :]
    m *= dbg((Lv - 10.0 + 3.0) - lufs(m))                 # music bed, +3 dB house standard
    s *= dbg((Lv - 14.0 - 6.0 + 6.0) - lufs(s))           # sfx -6 dB from the bridge reference (~-14 LU)
    s *= amb[None, :]
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
        f.write("# Cox clock short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            if n_ != "tick":
                f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
        f.write(f"\n+ {sum(1 for c in CUES if c[1] == 'tick')} clock ticks (one per second until STOP {STOP})\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
