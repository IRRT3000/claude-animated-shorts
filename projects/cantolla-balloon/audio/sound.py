# Sound for "The Man Who Fell Through a Roof" (Cantolla): an original light Mexican-flavoured vals in G (3/4, 132 bpm:
# guitar-like plucked strums, a fife "violin" lead, horn stabs, music box at night) + synthesized SFX timed to the
# picture (frames from remotion/src/videos/cantolla/story.ts + cast.ts) + the voice, gain only. Same house mix as the
# teaspoon short: music ~10 LU under the voice and ducked 3 dB on words, SFX ~14 LU under. Master -16 LUFS,
# <= -1 dBTP, exactly 2040 frames / 48 kHz / stereo. Writes mix.wav, stems and cues.md.
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
TOTAL = 2040
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
SHOTS = {1: (0, 99, "sky"), 2: (99, 161, "room"), 3: (161, 268, "room"), 4: (268, 316, "night"), 5: (316, 404, "bull"),
         6: (404, 472, "bull"), 7: (472, 560, "bull"), 8: (560, 600, "bull"), 9: (600, 639, "sky"), 10: (639, 670, "sky"),
         11: (670, 718, "sky"), 12: (718, 759, "sky"), 13: (759, 833, "sky"), 14: (833, 912, "street"), 15: (912, 968, "room"),
         16: (968, 1045, "room"), 17: (1045, 1157, "sky"), 18: (1157, 1241, "plaza"), 19: (1241, 1328, "plaza"), 20: (1328, 1380, "sky"),
         21: (1380, 1450, "sky"), 22: (1450, 1536, "sky"), 23: (1536, 1594, "sky"), 24: (1594, 1652, "field"), 25: (1652, 1720, "field"),
         26: (1720, 1759, "night"), 27: (1759, TOTAL, "fiesta")}


def env_for(kinds, fade=0.25):
    e = np.zeros(N)
    for a, b, k in SHOTS.values():
        if k in kinds:
            e[ns(fr(a)):min(N, ns(fr(b)))] = 1
    k = ns(fade)
    return np.convolve(e, np.ones(k) / k, "same")


def build_sfx():
    r = rng(42)
    S = np.zeros((2, N))
    sky, room, bull, street, plaza, field, night, fiesta = (env_for([k]) for k in ("sky", "room", "bull", "street", "plaza", "field", "night", "fiesta"))
    # ---- ambiences ----
    S += G.breeze(DUR, r, 1.2, 0.4, 1400) * (sky * 1.0 + field * 0.6 + street * 0.3)[None, :] * dbg(-26)
    S += pan(G.bird_chirps(DUR, r, 0.5, "sparrow"), -0.4) * (street + plaza + field * 0.6)[None, :] * dbg(-34)
    loop = sum(G.babble(10.0, r, r.uniform(110, 230), r.uniform(0.9, 1.15), 3.8, 0.8) for _ in range(6))
    crowd_m = np.tile(loop, int(np.ceil(N / len(loop))))[:N]
    S += st(crowd_m) * (bull * 1.0 + plaza * 0.35 + fiesta * 0.5)[None, :] * dbg(-26)
    S += G.crickets(DUR, r, 3)[None, :] * (night + fiesta * 0.7)[None, :] * dbg(-40)
    S += G.water_bed(DUR, r, 0.6, 1.2) * (plaza * 0.8)[None, :] * dbg(-30)
    # the brazier roar under the envelope in the sky shots
    roar = lp(colored(N, r, 1.0), 380, 2) * (0.6 + 0.4 * np.abs(np.sin(phase(np.full(N, 0.7)))))
    S += st(roar) * (sky * 0.7 + bull * 0.4)[None, :] * dbg(-30)

    def whoosh(t, d=0.6, g=-18, p=0.0, lo=400, hi=2400):
        cue(t - d * 0.35, "whoosh", G.whoosh(d, r, 0.35, lo, hi), g, p, S)

    def flap(t, n=8, g=-22, p=0.0):
        for k in range(n):
            cue(t + k * 0.045 + r.uniform(0, 0.02), "wing flap", G.whoosh(0.09, r, 0.3, 900, 3500, 0.4, 0.05, 0.4), g, p + r.uniform(-0.3, 0.3), S)

    def crash(t, g=-10):
        cue(t, "roof crash", G.wood_crack(r), g, 0.0, S)
        cue(t + 0.02, "glass", sum(G.clink(r, r.uniform(2500, 6000), 0.25, 1.4) * 1.0 for _ in range(1)), g - 2, 0.2, S)
        for k in range(10):
            cue(t + 0.03 + k * 0.035 + r.uniform(0, 0.03), "glass bits", G.clink(r, r.uniform(3000, 7500), 0.15, 1.2), g - 6, r.uniform(-0.6, 0.6), S)

    def thud(t, g=-12):
        d = tt(0.35)
        cue(t, "thud", np.exp(-d / 0.07) * np.sin(phase(90 * (1 + 1.5 * np.exp(-d / 0.03)))) + 0.3 * lp(r.standard_normal(len(d)), 600) * np.exp(-d / 0.04), g, 0.0, S)

    def whack(t, g=-14):
        cue(t, "broom whack", G.whoosh(0.18, r, 0.6, 1200, 5000, 0.4, 0.05, 0.6), g - 4, 0.2, S)
        d = tt(0.12)
        cue(t + 0.12, "whack", bp(r.standard_normal(len(d)), 600, 3000, 1) * np.exp(-d / 0.02), g, 0.2, S)

    def click(t, g=-18):
        cue(t, "telegraph click", G.clink(r, 1800, 0.05, 0.6), g, -0.2, S)

    def shot(t, g=-10, p=0.0):
        d = tt(0.9)
        x = bp(r.standard_normal(len(d)), 200, 5000, 1) * np.exp(-d / 0.03) + 0.6 * lp(r.standard_normal(len(d)), 300, 2) * np.exp(-d / 0.25)
        cue(t, "rifle shot", x, g, p, S)

    def hoof(t, g=-22):
        cue(t, "hoof", G.clink(r, 700, 0.08, 0.3) + 0.6 * G.boot(r, 0.5)[: ns(0.08)], g, 0.1, S)

    # ---- events ----
    whoosh(fr(10), 1.2, -14, -0.3)                                    # opening: balloon glides in
    flap(fr(20), 12, -18, 0.3); flap(fr(34), 8, -20, -0.2)            # pigeons burst across the lens
    whoosh(fr(55), 1.0, -12, 0.2, 300, 1600)                          # the drop past the tower
    crash(fr(98), -8)
    thud(fr(106), -8)                                                 # lands on the table
    cue(fr(108), "plates rattle", G.rattle(0.6, r, 40), -20, 0.0, S)
    cue(fr(121), "gasp", G.whoa(r), -22, 0.2, S)
    for k in range(4):
        whack(fr(134 + k * 7), -14)
    cue(fr(150), "oof", G.oof(r, "oof"), -18, 0.0, S)
    whoosh(fr(161), 0.6, -18)
    for f0 in range(165, 266, 6):                                     # telegraph key
        if (f0 // 6) % 5 != 4:
            click(fr(f0), -20)
    whoosh(fr(268), 0.6, -20)
    for k in range(6):                                                # sewing: cloth swishes + scissors
        cue(fr(272 + k * 7), "cloth", G.whoosh(0.25, r, 0.4, 900, 4500, 0.6, 0.15, 0.3), -28, 0.2, S)
    whoosh(fr(316), 0.8, -18)
    cue(fr(330), "crowd cheer", G.applause(2.5, r, 30) * np.linspace(0.4, 1, ns(2.5))[None, :], -20, 0.0, S)
    for f0 in range(404, 472, 8):                                     # hooves
        hoof(fr(f0), -20)
    cue(fr(424), "crowd ole", G.applause(1.6, r, 40), -18, 0.0, S)
    cue(fr(540), "lift whoosh", G.whoosh(1.5, r, 0.35, 200, 1600), -14, 0.0, S)
    cue(fr(540), "cheer", G.applause(3.0, r, 60) * np.linspace(1, 0.6, ns(3.0))[None, :], -12, 0.0, S)
    for k in range(5):
        cue(fr(544 + k * 6), "hurrah", G.hurrah(r, 140 + 30 * k, 1.0), -20, r.uniform(-0.5, 0.5), S)
    whoosh(fr(600), 0.9, -16)
    for f0 in (639, 670, 718):
        whoosh(fr(f0), 0.7, -18, 0.2)
    cue(fr(780), "gust", G.whoosh(2.2, r, 0.4, 150, 1200, 1.0, 0.4, 0.5), -10, -0.2, S)
    crash(fr(839), -9)
    cue(fr(842), "envelope flop", G.whoosh(0.9, r, 0.2, 100, 700), -14, 0.0, S)
    cue(fr(848), "neighbours gasp", G.whoa(r), -20, -0.3, S)
    cue(fr(914), "ta-da swish", G.whoosh(0.3, r, 0.4, 900, 4500, 0.6, 0.15, 0.3), -20, 0.0, S)
    cue(fr(1004), "awkward cough", G.oof(r, "ugh"), -24, 0.3, S)
    cue(fr(1013), "broom raise", G.whoosh(0.3, r, 0.5, 700, 3500), -18, 0.3, S)
    whoosh(fr(1045), 0.8, -18)
    cue(fr(1160), "ball under water", G.bubbles(1.2, r, 30, 300, 1600, (0.006, 0.03)), -20, 0.2, S)
    sp = G.splash_big(r) * 0.4
    cue(fr(1205), "ball pops out", sp[: ns(1.2)], -12, 0.1, S)
    cue(fr(1206), "boing", np.sin(phase(np.linspace(300, 900, ns(0.25)))) * np.exp(-tt(0.25) / 0.08), -18, 0.1, S)
    cue(fr(1252), "balloon rise", G.whoosh(1.6, r, 0.4, 200, 1400), -16, 0.0, S)
    whoosh(fr(1380), 1.0, -18)
    for k in range(6):                                                # rebels open fire
        shot(fr(1623 + (k % 3) * 3 + (k // 3) * 9), -10 - 2 * (k % 2), r.uniform(-0.6, 0.6))
    for k in range(4):
        cue(fr(1628 + k * 6), "bullet whiz", G.whoosh(0.22, r, 0.6, 2500, 7000, 0.3, 0.05, 0.6), -16, -0.6 + 0.4 * k, S)
    thud(fr(1676), -6)
    cue(fr(1678), "basket creak", G.creak(0.6, r, 200, 320, scale=0.9), -18, 0.0, S)
    cue(fr(1694), "phew", G.oof(r, "oh"), -20, 0.1, S)
    for k in range(10):                                               # lanterns whoosh up softly
        cue(fr(1765 + k * 23), "lantern rise", G.whoosh(0.8, r, 0.5, 300, 1500, 0.8, 0.3, 0.6), -28, r.uniform(-0.5, 0.5), S)
    cue(fr(1870), "fiesta murmur", G.applause(3.0, r, 20) * np.linspace(0, 0.7, ns(3.0))[None, :], -26, 0.0, S)
    return S


# ================================================================ score
F_ = I.m2f
BPM = 132.0
BEAT = 60 / BPM
BAR = 3 * BEAT
# our own vals theme in G (bar, beat, beats, midi)
THEME = [(0, 0, 1, 74), (0, 1, 1, 79), (0, 2, 1, 83),
         (1, 0, 2, 81), (1, 2, 1, 79),
         (2, 0, 1, 78), (2, 1, 1, 81), (2, 2, 1, 84),
         (3, 0, 3, 83),
         (4, 0, 1, 76), (4, 1, 1, 79), (4, 2, 1, 84),
         (5, 0, 2, 83), (5, 2, 1, 81),
         (6, 0, 1, 79), (6, 1, 1, 78), (6, 2, 1, 76),
         (7, 0, 3, 79)]
CHORDS = [[43, 59, 62, 67], [43, 59, 62, 67], [38, 57, 62, 66], [38, 57, 62, 66], [36, 60, 64, 67], [43, 59, 62, 67], [38, 57, 60, 66], [43, 59, 62, 67]]


def build_music():
    r = rng(7)
    M = np.zeros((2, N))
    ir = make_ir(1.4, 3, hf=1.4)

    def note(t, x, g, p=0.0):
        if 0 <= t < DUR:
            place(M, pan(x, p) if np.asarray(x).ndim == 1 else x, t, dbg(g))

    def vals(t0, bars, lead="fife", g=0.0, start_bar=0, strum=True, oct_=0):
        for (b, be, ln, m) in THEME:
            bb = b - start_bar % 8
            for rep in range((bars + 7) // 8 + 1):
                B = b + 8 * rep - start_bar
                if not (0 <= B < bars):
                    continue
                t = t0 + B * BAR + be * BEAT
                if lead == "fife":
                    note(t, I.fife(F_(m + oct_), ln * BEAT * 0.95, 0.7, r), g - 9, 0.15)
                elif lead == "pluck":
                    note(t, I.pluck(F_(m + oct_), 0.8, r, 0.9, 0.8, 0.12), g - 6, 0.15)
                elif lead == "box":
                    note(t, I.musicbox(F_(m + oct_), 0.6, r, 1.4), g - 8, -0.1)
                elif lead == "horn":
                    note(t, I.brass(F_(m - 12 + oct_), ln * BEAT * 0.9, 0.7, r, "horn"), g - 12, 0.1)
        for B in range(bars):
            t = t0 + B * BAR
            ch = CHORDS[(B + start_bar) % 8]
            note(t, I.pluck(F_(ch[0]), 0.85, r, 1.1, 0.3, 0.2), g - 7, -0.2)     # bass on 1
            if strum:
                for k in (1, 2):                                                 # strummed chord on 2 and 3
                    for j, m in enumerate(ch[1:]):
                        note(t + k * BEAT + j * 0.012, I.pluck(F_(m), 0.5, r, 0.5, 0.7, 0.15), g - 14, 0.25)

    def padc(t, ch, d, g, warm=900):
        note(t, I.pad([F_(m) for m in ch], d, 0.5, r, 0.5, 1.0, warm), g)

    def glock(t, m, g=-10):
        note(t, I.glock(F_(m), 0.7, r, 1.6), g, 0.3)

    # hook (0-3.3): bright vals in the sky, a stab on the crash, then a comic stop
    vals(0.1, 7, "fife", 0)
    note(fr(98), I.brass(F_(55), 0.35, 0.9, r, "stab"), -8)
    note(fr(98), I.cymbal(0.6, r, 1.6), -16)
    for k, m in enumerate((47, 46, 45)):                              # beaten up: trombone-ish slide down
        note(fr(132) + k * 0.28, I.brass(F_(m), 0.26, 0.7, r, "tuba"), -12)
    # clerk by day (5.4-8.9): plucks only; by night: music box
    vals(fr(164), 6, "pluck", -2, start_bar=0, strum=False)
    vals(fr(270), 3, "box", -2, start_bar=4, strum=False, oct_=12)
    padc(fr(268), [55, 59, 62, 66], 1.8, -16, 700)
    # bullring (10.5-18.7): full vals with horn, cymbal on the lift
    vals(fr(318), 18, "horn", 1, start_bar=0)
    vals(fr(318) + 8 * BAR, 10, "fife", -2, start_bar=0, strum=False)
    note(fr(540), I.cymbal(0.7, r, 2.4), -12)
    glock(fr(540), 91, -12); glock(fr(546), 95, -12)
    # flights (20-25): vals continues, rising glocks on "another / another / higher"
    vals(fr(600), 8, "fife", 0, start_bar=0)
    for f0, m in zip((646, 674, 694, 718), (79, 83, 86, 91)):
        glock(fr(f0), m, -10)
    # gust (25.3-27.8): music falls apart, low tuba sinks, stab on the crash
    for k, m in enumerate((50, 48, 46, 43)):
        note(fr(780) + k * 0.4, I.brass(F_(m), 0.38, 0.75, r, "tuba"), -12)
    note(fr(839), I.brass(F_(43), 0.4, 0.9, r, "stab"), -8); note(fr(839), I.cymbal(0.6, r, 1.6), -16)
    # luckily (30.4): tiny fanfare; unluckily (32.3): deadpan stop + two low plods
    for k, m in enumerate((67, 71, 74, 79)):
        note(fr(914) + k * 0.1, I.brass(F_(m), 0.18 if k < 3 else 0.6, 0.7, r, "horn"), -12)
    for k, m in enumerate((43, 42)):
        note(fr(990) + k * 0.7, I.brass(F_(m), 0.5, 0.7, r, "tuba"), -12)
    # explainer (34.8-44.3): soft ostinato and pad; boing on the beach ball
    for b in range(int((fr(1328) - fr(1045)) / BAR)):
        t = fr(1047) + b * BAR
        ch = CHORDS[(b // 2) % 8]
        for k in range(3):
            note(t + k * BEAT, I.pluck(F_(ch[1 + k % 3] + 12), 0.5, r, 0.6, 0.5, 0.18), -15, 0.3 * (-1) ** k)
        if b % 2 == 0:
            padc(t, [m + 12 for m in ch[1:]], BAR * 2, -20, 800)
    glock(fr(1205), 86, -10); glock(fr(1209), 91, -10)
    vals(fr(1252), 4, "fife", -2, start_bar=4, strum=False)
    # fifty years (44.3): golden pad; 1914 (46-51): horn vals again, quieter
    padc(fr(1328), [55, 59, 62, 67], 2.0, -13, 900)
    vals(fr(1384), 12, "horn", -2, start_bar=0)
    # rebels (53.1-55): drop to a snare tension roll, silence after the shots
    for k in range(28):
        note(fr(1560) + k * 0.07, I.snare(0.2 + 0.5 * k / 28, r, 0.2), -20 + 6 * k / 28, 0.1)
    note(fr(1676), I.timpani(F_(43), 0.8, r, 1.6), -10)
    # back home / he never came down (57.3-60.6): music box alone, slow
    for k, m in enumerate((74, 79, 83, 81, 79)):
        note(fr(1722) + k * 0.75, I.musicbox(F_(m + 12), 0.5, r, 1.8), -10, -0.1)
    # finale (60.4-68): the vals returns, slow and warm, full; final button on "name"
    padc(fr(1790), [55, 59, 62, 67], 6.0, -14, 900)
    vals(fr(1812), 12, "fife", -1, start_bar=0)
    note(fr(1979), I.pluck(F_(67), 0.9, r, 1.4, 0.6), -4)
    note(fr(1979) + BEAT * 0.5, I.pluck(F_(55), 0.9, r, 1.4, 0.6), -6)
    glock(fr(1986), 91, -10)
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
    k = ns(0.12)
    key = np.convolve(key, np.ones(k) / k, "same")
    m *= dbg(-3.0 * key)[None, :]
    m *= dbg((Lv - 10.0) - lufs(m))
    s *= dbg((Lv - 14.0) - lufs(s))
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
        f.write("# Cantolla short: sound cues\n\n")
        f.write(f"mix: {lufs(y):.2f} LUFS, true peak {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s\n\n")
        f.write(f"stems (at mix gain): voice {lufs(v * dbg(G0)):.1f}, music {lufs(m * dbg(G0)):.1f}, sfx {lufs(s * dbg(G0)):.1f} LUFS\n\n")
        f.write("| time | frame | cue | gain dB |\n|---|---|---|---|\n")
        for t, n_, g in sorted(CUES):
            f.write(f"| {t:6.2f} | {round(t * FPS)} | {n_} | {g} |\n")
    print(f"mix {lufs(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, {y.shape[1] / SR:.3f} s, cues {len(CUES)}")


if __name__ == "__main__":
    main()
