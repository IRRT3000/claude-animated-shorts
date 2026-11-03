# Sound for "The Teaspoon That Calmed a Pond": original score (a light Georgian minuet in F, 3/4, 108 bpm: harpsichord-
# like plucks, flute, music box, warm pads) + synthesized SFX timed to the picture (frames from remotion/src/videos/
# teaspoon/story.ts + cast.ts) + the voice, gain only. Standard mix: music ~-10 LU under the voice (+3 dB house
# standard) ducked 3 dB while words are spoken, SFX -6 dB from the bridge levels. Master -15 LUFS, <= -1 dBTP,
# exactly 2046 frames / 48 kHz / stereo / 24-bit. Writes mix.wav, stems and cues.md.
import json
import os
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st, integrated, true_peak,
                 read_wav, write_wav, modal, phase, colored, smooth_noise)
import instruments as I
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
TOTAL = 2046
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
CUES = []


def lufs(x):
    return integrated(st(x))


def cue(t, name, x, gain_db, p=0.0, buf=None):
    """place a mono/stereo sound at t (s) with a gain in dB (relative to the SFX stem reference)"""
    x = pan(x, p) if np.asarray(x).ndim == 1 else x
    place(buf, x, t, dbg(gain_db))
    CUES.append((t, name, gain_db))


# ================================================================ picture timeline (mirrors story.ts)
SHOTS = {1: (0, 150, "pond"), 2: (150, 314, "sea"), 3: (314, 444, "sea"), 4: (444, 574, "golden"), 5: (574, 751, "pond"),
         6: (751, 885, "pond"), 7: (885, 977, "pond"), 8: (977, 1046, "pond"), 9: (1046, 1190, "pond"), 10: (1190, 1326, "macro"),
         11: (1326, 1460, "pond"), 12: (1460, 1647, "macro"), 13: (1647, 1844, "pond"), 14: (1844, 1955, "golden"), 15: (1955, TOTAL, "golden")}
TIP_HOOK, TIP = 100, 708


def env_for(kind, fade=0.25):
    """0..1 envelope over the film where shots of this place are on screen (crossfaded)"""
    e = np.zeros(N)
    for a, b, k in SHOTS.values():
        if k == kind:
            i0, i1 = ns(fr(a)), min(N, ns(fr(b)))
            e[i0:i1] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


# ================================================================ SFX
def build_sfx():
    r = rng(42)
    S = np.zeros((2, N))
    # ---- ambiences ----
    pond, sea, gold, macro = env_for("pond"), env_for("sea"), env_for("golden"), env_for("macro")
    wind_lvl = pond * 1.0 + sea * 0.8 + gold * 0.35 + macro * 0.6
    S += G.breeze(DUR, r, 1.0, 0.35, 1100) * wind_lvl[None, :] * dbg(-30)
    S += pan(G.bird_chirps(DUR, r, 0.45, "sparrow"), -0.4) * (pond + 0.4 * gold)[None, :] * dbg(-36)
    S += pan(G.bird_chirps(DUR, r, 0.3, "blackbird"), 0.5) * (pond + gold)[None, :] * dbg(-38)
    lap = G.water_bed(DUR, r, 0.35, 0.5)
    S += lap * (pond * 0.6 + macro * 1.2 + gold * 0.4)[None, :] * dbg(-30)
    waves = np.zeros((2, N))
    for ch in range(2):
        sw = 0.5 + 0.5 * np.sin(phase(np.full(N, 0.13)) + ch)
        waves[ch] = lp(colored(N, r, 1.2), 900, 2) * (0.4 + 0.6 * sw ** 2)
    S += waves * sea[None, :] * dbg(-24)
    S += G.crickets(DUR, r, 3)[None, :] * gold[None, :] * dbg(-44)
    # ship: timber creaks and a flag
    for t0 in (5.6, 7.9, 9.6, 11.8, 13.4):
        cue(t0, "ship creak", G.creak(0.9, r, 70, 120, scale=1.2), -26, r.uniform(-0.5, 0.5), S)
    cue(5.2, "flag flutter", G.flag_flutter(9.5, r) * np.linspace(1, 0.6, ns(9.5)), -34, 0.3, S)
    # ---- events ----
    def clink(t, g=-14):
        cue(t, "spoon clink", G.clink(r, 3800, 0.18), g, 0.2, S)

    def plip(t, g=-12):
        d = tt(0.35)
        x = np.exp(-d / 0.05) * np.sin(phase(700 * (1 + 2.5 * d))) + G.bubbles(0.35, r, 30, 600, 2200, (0.004, 0.02)) * 0.4
        cue(t, "oil drop plip", x, g, 0.15, S)

    def whoosh(t, d=0.6, g=-18, p=0.0):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, 400, 2400), g, p, S)

    def swish(t, g=-22):
        cue(t, "cloth swish", G.whoosh(0.35, r, 0.4, 900, 4500, 0.6, 0.15, 0.3), g, 0.0, S)

    def pop(t, f0=520, g=-18):
        d = tt(0.18)
        cue(t, "pop", np.exp(-d / 0.04) * np.sin(phase(f0 * (1 + 3 * np.exp(-d / 0.02)))), g, 0.0, S)

    def step(t, g=-24, p=0.0):
        cue(t, "footstep", G.stroll_step(r, 0.4), g, p, S)

    # hook: spoon tips, drop, the first calm ring
    clink(fr(TIP_HOOK - 4))
    plip(fr(TIP_HOOK + 16))
    whoosh(fr(150), 0.7, -14)                                        # flash to the sea
    swish(fr(330), -20)                                              # captain shrugs
    cue(fr(372), "bucket clank", G.clink(r, 900, 0.25, 0.4), -20, 0.3, S)
    sp = G.splash_big(r) * 0.25
    cue(fr(392), "dishwater splash", sp[: ns(1.2)], -16, 0.35, S)
    cue(fr(388), "pour", G.bubbles(1.4, r, 160, 300, 1800, (0.005, 0.02)), -22, 0.35, S)
    for k, f0 in enumerate(range(452, 574, 24)):                     # walking with the question
        step(fr(f0), -26, -0.2 + 0.1 * k)
    pop(fr(505), 640, -18)                                           # the question mark pops up
    whoosh(fr(574), 0.8, -18)                                        # back to the windy pond
    for f0 in range(632, 684, 13):                                   # walks up the jetty (hollow planks)
        cue(fr(f0), "jetty step", G.stroll_step(r, 0.2) + 0.5 * modal(0.3, [(140, 0.6, 0.05), (310, 0.4, 0.03)], r), -22, 0.0, S)
    clink(fr(TIP - 4))
    plip(fr(TIP + 16))
    for f0 in (834, 847, 865):                                       # "wider, and wider, and wider"
        whoosh(fr(f0), 0.5, -20, 0.3)
    cue(fr(980), "applause", G.applause(2.4, r, 3) * np.linspace(1, 0.3, ns(2.4))[None, :], -18, 0.0, S)
    cue(fr(1118), "cane twist", G.creak(0.45, r, 300, 520, scale=0.7), -22, 0.2, S)
    cue(fr(1140), "oil glug", G.bubbles(1.6, r, 9, 180, 700, (0.02, 0.06)), -16, 0.2, S)
    for k in range(6):                                               # gusts over the water, bonks off the oil
        f0 = 1190 + k * 22
        whoosh(fr(f0 + 40), 0.6, -22, -0.4 + 0.15 * k)
        if f0 < 1240:
            pop(fr(f0 + 50), 380, -24)
    cue(fr(1275), "ripples rise", G.water_bed(1.8, r, 1.0, 2.5)[:, : ns(1.8)] * np.linspace(0.2, 1, ns(1.8))[None, :], -20, 0.0, S)
    cue(fr(1374), "sheet squeak", G.creak(0.4, r, 600, 900, scale=0.6), -24, 0.1, S)
    swish(fr(1418), -20)                                             # "nothing to hold" shrug
    for k in range(14):                                              # molecules arrive one by one
        pop(fr(1470 + k * 11), 700 + 40 * k, -27)
    pop(fr(1610), 380, -22)
    clink(fr(1685), -18)                                             # "one teaspoon"
    whoosh(fr(1707), 0.8, -18)                                       # crane up to half an acre
    cue(fr(1786), "tiny ting", G.clink(r, 6200, 0.3, 1.2), -20, 0.0, S)
    whoosh(fr(1844), 0.9, -20)                                       # golden
    swish(fr(1972), -20)                                             # the final shrug
    for k, f0 in enumerate(range(2004, TOTAL - 4, 13)):              # walks off
        cue(fr(f0), "jetty step", G.stroll_step(r, 0.2), -24 - 2 * k, -0.3, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 108.0
BEAT = 60 / BPM
BAR = 3 * BEAT
# minuet theme in F (bar, beat, beats, midi)
THEME = [(0, 0, 1, 72), (0, 1, .5, 74), (0, 1.5, .5, 76), (0, 2, 1, 77),
         (1, 0, 1, 79), (1, 1, 1, 77), (1, 2, 1, 76),
         (2, 0, 1, 74), (2, 1, .5, 76), (2, 1.5, .5, 77), (2, 2, 1, 79),
         (3, 0, 2, 72), (3, 2, 1, 67),
         (4, 0, 1, 70), (4, 1, .5, 72), (4, 1.5, .5, 74), (4, 2, 1, 76),
         (5, 0, 1, 77), (5, 1, 1, 79), (5, 2, 1, 81),
         (6, 0, 1, 79), (6, 1, .5, 77), (6, 1.5, .5, 76), (6, 2, 1, 74),
         (7, 0, 3, 77)]
CHORDS = [[53, 57, 60], [48, 55, 58, 64], [46, 53, 58, 62], [48, 52, 55], [50, 53, 57], [46, 53, 58], [48, 55, 58, 64], [41, 53, 57, 60]]


def build_music():
    r = rng(7)
    M = np.zeros((2, N))
    ir = make_ir(1.6, 3, hf=1.4)

    def note(t, x, g, p=0.0):
        if 0 <= t < DUR:
            place(M, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def minuet(t0, bars, lead="pluck", g=0.0, bass=True, chords=True, oct_=0, start_bar=0):
        for (b, be, ln, m) in THEME:
            if not (start_bar <= b < start_bar + bars):
                continue
            t = t0 + (b - start_bar) * BAR + be * BEAT
            if lead == "pluck":
                note(t, I.pluck(F_(m + oct_), 0.8, r, 0.9, 0.8, 0.12), g - 6, 0.15)
            elif lead == "fife":
                note(t, I.fife(F_(m + oct_), ln * BEAT * 0.95, 0.65, r), g - 9, 0.1)
            elif lead == "box":
                note(t, I.musicbox(F_(m + 12 + oct_), 0.6, r, 1.4), g - 8, -0.1)
        for b in range(start_bar, start_bar + bars):
            t = t0 + (b - start_bar) * BAR
            ch = CHORDS[b % 8]
            if bass:
                note(t, I.pluck(F_(ch[0] - 12), 0.8, r, 1.1, 0.3, 0.2), g - 7, -0.2)
            if chords:
                for k in (1, 2):
                    for m in ch[1:]:
                        note(t + k * BEAT, I.pluck(F_(m), 0.45, r, 0.5, 0.6, 0.15), g - 15, 0.25)

    def padc(t, ch, d, g, warm=900):
        note(t, I.pad([F_(m) for m in ch], d, 0.5, r, 0.5, 1.0, warm), g)

    def glock(t, m, g=-10):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, 0.3)

    # hook (0 - 5 s): plucky minuet, sparkle on the drop
    minuet(0.25, 2, "pluck", 0)
    glock(fr(TIP_HOOK + 18), 84, -12); glock(fr(TIP_HOOK + 24), 88, -14)
    # sea (5 - 14.8): flute melody over a rolling pad
    padc(fr(150), [53, 60, 65, 69], 4.8, -14); padc(fr(150) + 4.8, [50, 57, 62, 65], 4.8, -14)
    minuet(fr(156), 6, "fife", -2, bass=True, chords=False, start_bar=0)
    # years (14.8 - 19.1): golden music box, slower feel
    minuet(fr(450), 4, "box", -3, bass=False, chords=False, start_bar=4)
    padc(fr(444), [53, 57, 60, 64], 4.4, -16, 700)
    # windy pond (19.1 - 29.4): minuet returns and builds; three rising glocks on "wider"
    minuet(fr(578), 6, "pluck", -1, start_bar=0)
    for f0, m in zip((834, 847, 865), (79, 84, 88)):
        glock(fr(f0), m, -9)
    # mirror (29.4 - 32.5): shimmer
    padc(fr(885), [53, 60, 64, 69, 72], 3.2, -12, 1400)
    for k in range(8):
        glock(fr(890) + k * 0.33, [84, 88, 91, 96][k % 4], -16)
    # luckily (32.5 - 34.8): bouncy; unluckily: deadpan stop + low tuba plods
    minuet(fr(977), 2, "pluck", 0, start_bar=4)
    for k, m in enumerate((41, 40, 39, 36)):
        note(fr(1046) + 0.2 + k * 0.85, I.brass(F_(m), 0.6, 0.7, r, "tuba"), -12, -0.1)
    # explainer (39.6 - 55): soft ostinato + pad
    for b in range(int((fr(1647) - fr(1190)) / BAR)):
        t = fr(1192) + b * BAR
        ch = CHORDS[(b // 2) % 4]
        for k in range(3):
            note(t + k * BEAT, I.pluck(F_(ch[k % len(ch)] + 12), 0.5, r, 0.6, 0.5, 0.18), -14, 0.3 * (-1) ** k)
        if b % 2 == 0:
            padc(t, [m + 12 for m in ch], BAR * 2, -19, 800)
    # twist (55 - 61.4): brush roll build, timpani on "millionth"
    for k in range(40):
        tk = fr(1652) + k * 0.12
        note(tk, I.brush(0.3 + 0.5 * k / 40, r, 0.2), -20 + 6 * k / 40, 0.2)
    note(fr(1786), I.timpani(F_(41), 0.9, r, 2.0), -8)
    glock(fr(1786), 96, -14)
    # golden ending (61.5 - 68.2): warm pad + flute reprise, a final button on "maths"
    padc(fr(1844), [53, 57, 60, 65], 4.0, -12, 900)
    minuet(fr(1848), 4, "fife", -3, bass=True, chords=False, start_bar=4)
    note(fr(1983), I.pluck(F_(65), 0.9, r, 1.2, 0.6), -4)
    note(fr(1983) + BEAT * 0.5, I.pluck(F_(60), 0.9, r, 1.2, 0.6), -6)
    glock(fr(1990), 89, -10)
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
    # duck the music while words are spoken (key = words.json), 60 ms attack / 250 ms release
    key = np.zeros(N)
    for w in words():
        key[ns(w["start"] - 0.05):ns(w["end"] + 0.1)] = 1
    k = ns(0.12)
    key = np.convolve(key, np.ones(k) / k, "same")
    m *= dbg(-3.0 * key)[None, :]
    m *= dbg((Lv - 10.0) - lufs(m))                       # music bed ~10 LU under the voice
    s *= dbg((Lv - 14.0) - lufs(s))                       # sfx stem ~14 LU under the voice overall
    mix = v + m + s
    G0 = -15.0 - lufs(mix)
    y = mix * dbg(G0)
    peak = np.abs(y).max()
    ceil = dbg(-1.5)
    if peak > ceil:                                       # simple soft-knee peak control (rare after the gain)
        y = np.tanh(y / ceil) * ceil
    y = fades(y, 0.0, 0.05)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    write_wav(os.path.join(HERE, "stem_voice.wav"), v * dbg(G0))
    write_wav(os.path.join(HERE, "stem_music.wav"), m * dbg(G0))
    write_wav(os.path.join(HERE, "stem_sfx.wav"), s * dbg(G0))
    with open(os.path.join(HERE, "cues.md"), "w") as f:
        f.write("# Teaspoon short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
