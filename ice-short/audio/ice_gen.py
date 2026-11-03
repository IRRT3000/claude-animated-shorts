# Procedural sound effects for "The Ship Made of Ice" (own numpy synthesis, built on dsp.py / sfx_gen.py):
# open sea + bow wash + gulls, distant torpedo boom + hull groan, steel clanks, lightbulb ding, ice cracks (one that
# runs through, one that stops at straw / sawdust), sawdust pour, freezer door + cold hiss, indoor pistol shots,
# ice block shatter + tinkling shards, ricochet whine, wall thud, propeller planes fly-by, oars, rubber stamp,
# clock tick, water trickle and a last melting "bloop".
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, peq, colored, smooth_noise, fades, shape, phase, modal, pan, st, widen)
import sfx_gen as G

_pm = G._place_mono


# ================================================================ sea
def ocean(dur, r, swell=1.0, wash=0.6, wind=0.5):
    """open Atlantic: slow swells (0.1-0.2 Hz), foam hiss on the crests, a little wind"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        sw = 0.55 + 0.45 * smooth_noise(n, r, 0.16)
        rum = lp(colored(n, r, 1.6), 380, 2) * sw * swell
        foam = bp(colored(n, r, 0.4), 900, 6000, 1) * np.clip(sw - 0.35, 0, 1) ** 1.6 * wash * 0.9
        w = lp(colored(n, r, 1.0), 700, 2) * (0.6 + 0.4 * smooth_noise(n, r, 0.2)) * wind
        out[ch] = rum + foam + w
    return out


def bow_wash(dur, r):
    """the hull pushing through the sea right under the camera: steady broadband rush with slow surges"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        s = 0.7 + 0.3 * smooth_noise(n, r, 0.35)
        out[ch] = (bp(colored(n, r, 0.6), 250, 5000, 1) * s + 0.4 * lp(colored(n, r, 1.5), 200, 2)) * s
    return out


def gull(r):
    """one herring-gull 'kyow' (formant-ish glide with a rough edge)"""
    d = r.uniform(0.28, 0.42)
    t = tt(d)
    f = r.uniform(1150, 1500) * (1 + 0.35 * np.sin(np.pi * t / d) ** 0.7 - 0.25 * t / d)
    ph = phase(f)
    y = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
    y *= 1 + 0.4 * np.sin(phase(np.full(len(t), r.uniform(28, 40))))
    return bp(y, 900, 5200, 1) * np.sin(np.pi * t / d) ** 1.2


def gulls(dur, r, density=0.35):
    n = ns(dur)
    out = np.zeros((2, n))
    tm = r.uniform(0.3, 1.2)
    while tm < dur - 0.6:
        for j in range(r.integers(1, 4)):
            g = gull(r) * r.uniform(0.4, 1.0)
            p = r.uniform(-0.8, 0.8)
            seg = pan(g, p)
            k = ns(tm + j * r.uniform(0.32, 0.5))
            if k < n:
                out[:, k:k + seg.shape[1]] += seg[:, : n - k]
        tm += r.exponential(1 / density) + 0.8
    return out


def boom_distant(r):
    """torpedo hit on a freighter far away: low thud, rolling rumble, water thrown up"""
    d = 3.2
    n = ns(d)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    thud = np.sin(phase(46 * (1 + 0.6 * np.exp(-t / 0.05)))) * np.exp(-t / 0.35) * 2.2
    rumble = lp(colored(n, r, 1.8), 260, 2) * (1 - np.exp(-t / 0.03)) * np.exp(-t / 0.9) * 1.6
    crack = bp(nz, 300, 2500, 1) * np.exp(-t / 0.04) * 0.8
    spray = G.bubbles(d, r, 300 * np.exp(-np.maximum(t - 0.3, 0) / 0.6) * (t > 0.3) + 2, 400, 2600, (0.006, 0.025),
                      np.clip((t - 0.3) / 0.2, 0, 1) * np.exp(-np.maximum(t - 0.5, 0) / 0.8)) * 0.5
    return fades(lp(thud + rumble + crack, 2500, 1) + spray, 0.0, 0.4)


def hull_groan(dur, r):
    """the hit freighter's steel groaning as it rolls over (far away, so dull)"""
    c = G.creak(dur, r, 18, 34, G.CHAIN[:4], [(0, 0), (0.25, 0.8), (0.7, 1.0), (1, 0)], rough=0.25, noise=0.08, scale=0.55)
    return lp(c, 1400, 2)


# ================================================================ study / lab
def steel_clank(r, big=1.0):
    """a girder dropping away from the heap: heavy steel 'dunk' with a ring"""
    d = 0.9
    m = [(r.uniform(140, 190), 1.0, 0.18), (r.uniform(380, 460), 0.7, 0.12), (r.uniform(820, 980), 0.5, 0.08),
         (r.uniform(1500, 1800), 0.3, 0.05), (r.uniform(2600, 3100), 0.18, 0.03)]
    y = modal(d, m, r)
    t = tt(d)
    y += lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.012) * 1.2
    return fades(y * big, 0.0, 0.1)


def bulb_ding(r):
    """the idea lightbulb: filament click + small bright bell ding"""
    d = 1.4
    t = tt(d)
    bell = modal(d, [(2093, 1.0, 0.55), (2093 * 2.76, 0.35, 0.18), (2093 * 5.4, 0.15, 0.06), (1046.5, 0.25, 0.4)], r)
    clk = bp(r.standard_normal(len(t)), 2000, 9000, 1) * np.exp(-t / 0.002) * 0.6
    return fades(bell * 0.8 + clk, 0.0, 0.2)


def clock(dur, r, rate=1.0):
    """slow wall clock in the study: tick . tock"""
    n = ns(dur)
    y = np.zeros(n)
    k = 0
    tm = r.uniform(0.05, 0.5)
    while tm < dur:
        f0 = 2400 if k % 2 == 0 else 2050
        c = modal(0.06, [(f0, 1.0, 0.008), (f0 * 2.3, 0.4, 0.004)], r)
        c += bp(r.standard_normal(len(c)), 1500, 7000, 1) * np.exp(-tt(0.06) / 0.0015) * 0.5
        _pm(y, c, tm)
        tm += 1.0 / rate
        k += 1
    return y


def room_tone(dur, r, size=1.0, hum=0.0):
    """quiet interior air: a soft low noise floor, a faint electrical hum under the lamps"""
    n = ns(dur)
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    for ch in range(2):
        out[ch] = lp(colored(n, r, 1.3), 500 + 300 * size, 2) * (0.85 + 0.15 * smooth_noise(n, r, 0.1))
        if hum:
            out[ch] += hum * 0.04 * (np.sin(TAU * 100 * t) + 0.4 * np.sin(TAU * 200 * t) + 0.15 * np.sin(TAU * 300 * t))
    return out


def ice_crack_run(r, dur=0.9, stop=None):
    """a crack running through clear ice: accelerating sharp ticks + a high groan, ending in a dry split ('stop' = it
    is caught after `stop` s: the ticks die out and a dull 'tock' ends it)"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    end = stop if stop else dur * 0.85
    tm = 0.0
    while tm < end:
        u = tm / end
        tick = modal(0.05, [(r.uniform(2500, 5500), 1.0, 0.004), (r.uniform(6000, 9000), 0.5, 0.002)], r)
        tick += hp(r.standard_normal(ns(0.05)), 2500) * np.exp(-tt(0.05) / 0.0012) * 0.8
        _pm(y, tick * r.uniform(0.35, 1.0) * (0.5 + 0.5 * u), tm)
        tm += r.exponential(1.0 / (25 + 140 * u * u))
    gro = G.creak(end, r, 160, 420, G.SMALLMETAL, [(0, 0), (0.6, 0.6), (1, 1)], rough=0.3, noise=0.05, scale=0.6) * 0.35
    _pm(y, gro, 0.0)
    if stop:
        tock = modal(0.3, [(r.uniform(320, 420), 1.0, 0.03), (r.uniform(800, 1000), 0.5, 0.015)], r)
        tock += lp(r.standard_normal(ns(0.3)), 1200) * np.exp(-tt(0.3) / 0.006) * 0.6
        _pm(y, tock * 0.9, stop)
    else:
        sp = modal(0.6, [(r.uniform(1700, 2200), 1.0, 0.03), (r.uniform(3200, 4200), 0.8, 0.02), (r.uniform(5500, 7500), 0.5, 0.01)], r)
        sp += hp(r.standard_normal(ns(0.6)), 1500) * np.exp(-tt(0.6) / 0.004) * 1.2
        sp += np.sin(phase(np.full(ns(0.6), 120.0))) * np.exp(-tt(0.6) / 0.06) * 0.6
        _pm(y, sp * 1.4, end)
    return fades(y, 0.0, 0.05)


def mud_crack(r, dur=0.6, stop=0.5):
    """a crack in a dry mud brick: dull crumbly crunches that stop dead at the straw"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < stop:
        g = lp(r.standard_normal(ns(0.04)), r.uniform(1200, 2600)) * np.exp(-tt(0.04) / 0.006)
        g += modal(0.04, [(r.uniform(400, 900), 0.6, 0.006)], r)
        _pm(y, g * r.uniform(0.3, 1.0), tm)
        tm += r.exponential(1.0 / 70)
    sift = bp(r.standard_normal(ns(0.5)), 1500, 6000, 1) * np.exp(-tt(0.5) / 0.15) * 0.15
    _pm(y, sift, stop)
    return fades(y, 0.0, 0.05)


def sawdust_pour(dur, r):
    """sawdust tipped from a sack into a tub of water: soft granular hiss + a few clumps plopping"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.12, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)
    gr = G.bubbles(dur, r, 900 * env + 1, 2500, 8000, (0.001, 0.004), env, rise=(0, 1)) * 0.5
    hiss = bp(colored(n, r, 0.3), 2500, 9000, 1) * env * (0.7 + 0.3 * smooth_noise(n, r, 6)) * 0.35
    plops = G.bubbles(dur, r, 6 * env + 0.1, 250, 900, (0.01, 0.03), env) * 0.6
    return hiss + gr + plops


def freezer_open(r):
    """big ice-box door: latch clunk, rubber seal pop, hinge creak, cold air rushing out"""
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    y = np.zeros(n)
    latch = modal(0.25, [(310, 1.0, 0.03), (720, 0.7, 0.02), (1650, 0.4, 0.01)], r) + lp(r.standard_normal(ns(0.25)), 1500) * np.exp(-tt(0.25) / 0.004)
    _pm(y, latch, 0.0)
    pop = lp(r.standard_normal(ns(0.12)), 600) * np.exp(-tt(0.12) / 0.015) * 0.8
    _pm(y, pop, 0.09)
    _pm(y, G.creak(0.5, r, 140, 90, G.SMALLMETAL, [(0, 0), (0.3, 1), (1, 0)], rough=0.12, noise=0.02, scale=0.8) * 0.45, 0.12)
    cold = bp(colored(n, r, 0.5), 1200, 7000, 1) * np.clip((t - 0.1) / 0.2, 0, 1) * np.exp(-np.maximum(t - 0.3, 0) / 0.5) * 0.5
    return fades(y + cold, 0.0, 0.2)


def cold_hiss(dur, r):
    """frosty mist curling off the block: very soft airy hiss with a few frost crackles"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
    y = bp(colored(n, r, 0.2), 3000, 10000, 1) * env * 0.3
    y += G.bubbles(dur, r, 14 * env + 0.1, 4000, 9000, (0.001, 0.003), env, rise=(0, 1)) * 0.25
    return y


def knock(r):
    """knuckles on a solid frozen block: hard, short 'tok'"""
    d = 0.25
    t = tt(d)
    y = modal(d, [(r.uniform(700, 900), 1.0, 0.02), (r.uniform(1600, 2000), 0.5, 0.01), (r.uniform(3000, 3800), 0.3, 0.005)], r)
    y += bp(r.standard_normal(len(t)), 500, 5000, 1) * np.exp(-t / 0.002) * 0.6
    return y


# ================================================================ the meeting room
def door_open(r):
    """heavy panelled door: handle clack, hinge creak"""
    d = 1.2
    y = np.zeros(ns(d))
    h = modal(0.2, [(900, 1.0, 0.02), (2300, 0.6, 0.01), (4100, 0.3, 0.006)], r) + bp(r.standard_normal(ns(0.2)), 800, 6000, 1) * np.exp(-tt(0.2) / 0.002)
    _pm(y, h * 0.7, 0.0)
    _pm(y, G.creak(0.75, r, 60, 130, G.WOOD, [(0, 0), (0.3, 1), (0.8, 0.7), (1, 0)], rough=0.18, noise=0.04) * 0.6, 0.15)
    return y


def gunshot(r):
    """service pistol fired inside a panelled room: crack, chest-thump body, slide clack (the room tail is the reverb send)"""
    d = 0.7
    n = ns(d)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    crack = bp(nz, 400, 11000, 2) * np.exp(-t / 0.0035) * 3.0
    blast = bp(colored(n, r, 0.8), 150, 4000, 1) * np.exp(-t / 0.03) * 1.6
    body = np.sin(phase(95 * (1 + 1.2 * np.exp(-t / 0.006)))) * np.exp(-t / 0.06) * 2.0
    slide = modal(0.12, [(2600, 1.0, 0.008), (4700, 0.6, 0.004)], r) * 0.35
    y = crack + blast + body
    _pm(y, slide, 0.035)
    y = np.tanh(y * 1.2) / np.tanh(1.2)
    return fades(y, 0.0, 0.15)


def pistol_draw(r):
    """pistol out of the holster: leather slide + hammer cock click"""
    d = 0.6
    n = ns(d)
    t = np.arange(n) / SR
    leather = bp(colored(n, r, 0.5), 700, 5000, 1) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.12) * 0.5
    y = leather
    _pm(y, G.clink(r, 3300, 0.06) * 0.6, 0.32)
    _pm(y, G.clink(r, 2500, 0.08) * 0.8, 0.40)
    return y


def shatter(r):
    """the pure ice block bursting: hard crack + thump, then a shower of glassy shards that tinkle on the table and floor"""
    d = 2.2
    n = ns(d)
    t = np.arange(n) / SR
    y = np.zeros(n)
    hit = hp(r.standard_normal(n), 1200) * np.exp(-t / 0.006) * 2.2
    hit += np.sin(phase(80 * (1 + 0.5 * np.exp(-t / 0.01)))) * np.exp(-t / 0.07) * 1.5
    y += hit
    for i in range(14):            # big pieces breaking off right away
        md = [(r.uniform(1800, 4200), 1.0, r.uniform(0.02, 0.06)), (r.uniform(4500, 8500), 0.6, 0.015)]
        _pm(y, modal(0.2, md, r) * r.uniform(0.4, 1.0), abs(r.normal(0, 0.02)))
    tm = 0.08                        # shards landing and skittering: dense, then sparse
    while tm < d - 0.2:
        u = tm / d
        md = [(r.uniform(2500, 7500), 1.0, r.uniform(0.01, 0.05)), (r.uniform(6000, 11000), 0.5, 0.008)]
        _pm(y, modal(0.15, md, r) * r.uniform(0.15, 0.8) * (1 - u) ** 1.5, tm)
        tm += r.exponential(1.0 / (90 * (1 - u) ** 2 + 4))
    return fades(y, 0.0, 0.3)


def ricochet(r):
    """bullet hitting the pykrete and coming straight back: dull 'thwack' on the block, then the classic falling whine"""
    d = 0.9
    n = ns(d)
    t = np.arange(n) / SR
    thwack = modal(0.2, [(520, 1.0, 0.02), (1300, 0.7, 0.012), (2900, 0.4, 0.006)], r)
    thwack += bp(r.standard_normal(ns(0.2)), 600, 7000, 1) * np.exp(-tt(0.2) / 0.003) * 1.2
    y = np.zeros(n)
    _pm(y, thwack, 0.0)
    wt = np.clip(t - 0.03, 0, None)
    f = 3400 * np.exp(-wt / 0.55) + 900
    f *= 1 + 0.012 * np.sin(phase(np.full(n, 38.0)))
    wenv = np.clip(wt / 0.02, 0, 1) * np.exp(-wt / 0.28) * (t > 0.03)
    ph = phase(f)
    whine = (np.sin(ph) + 0.18 * np.sin(2 * ph)) * wenv * 0.8
    whine += bp(r.standard_normal(n), 2500, 8000, 1) * wenv * 0.12
    return fades(y + whine, 0.0, 0.1)


def wall_thud(r):
    """the bullet burying itself in the panelling at the far end of the room + a little plaster dust"""
    d = 0.7
    t = tt(d)
    y = modal(d, [(170, 1.0, 0.05), (360, 0.7, 0.035), (720, 0.4, 0.02)], r)
    y += lp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.008) * 0.8
    _pm(y, G.bubbles(0.5, r, 60, 3000, 8000, (0.001, 0.003), np.exp(-tt(0.5) / 0.12), rise=(0, 1)) * 0.2, 0.03)
    return y


def gasps(r, voices=8):
    """the generals ducking: a ripple of short gasps / whoas"""
    out = np.zeros((2, ns(0.9)))
    for v in range(voices):
        w = G.whoa(r, base=r.uniform(95, 140), dur=r.uniform(0.28, 0.42))
        k = ns(abs(r.normal(0.04, 0.06)))
        seg = pan(w * r.uniform(0.45, 1.0), r.uniform(-0.8, 0.8))
        out[:, k:k + seg.shape[1]] += seg[:, : out.shape[1] - k]
    return out


def chairs(r, n_=6, span=0.6):
    """wooden chairs creaking as the generals lean in"""
    out = np.zeros((2, ns(span + 0.6)))
    for k in range(n_):
        c = G.creak(r.uniform(0.18, 0.35), r, r.uniform(90, 160), r.uniform(140, 260), G.WOOD, rough=0.12, noise=0.03)
        seg = pan(c * r.uniform(0.4, 1.0), r.uniform(-0.8, 0.8))
        k0 = ns(r.uniform(0, span))
        out[:, k0:k0 + seg.shape[1]] += seg[:, : out.shape[1] - k0]
    return out


def murmur(dur, r, people=10):
    out = np.zeros((2, ns(dur)))
    for p in range(people):
        b = G.babble(dur, r, r.uniform(90, 140), r.uniform(0.92, 1.05), rate=r.uniform(3.6, 4.6), active=0.55, fmax=3000)
        out += pan(lp(b, 2500, 1) * r.uniform(0.4, 1.0), r.uniform(-0.8, 0.8))
    return out


# ================================================================ lake
def lake_bed(dur, r, birds=0.4, cricket=0.0):
    """mountain lake, golden hour: lapping on the shore, light breeze, loons/thrushes far off"""
    n = ns(dur)
    out = G.breeze(dur, r, 0.6, 0.12, 700)
    lap = G.bubbles(dur, r, 18, 300, 1600, (0.008, 0.03)) * 0.5 + bp(colored(n, r, 0.9), 200, 1500, 1) * (0.5 + 0.5 * smooth_noise(n, r, 0.4)) * 0.4
    out += st(lap)
    out += pan(G.bird_chirps(dur, r, birds, "blackbird") * 0.07, 0.5)
    out += pan(G.bird_chirps(dur, r, birds * 0.6, "sparrow") * 0.04, -0.5)
    if cricket:
        out += pan(G.crickets(dur, r, 3) * 0.012 * cricket, -0.3)
    return out


def prop_plane(r, dur=1.7, f0=118.0, doppler=0.12):
    """one propeller fighter: blade buzz (harmonics of the blade rate) + engine roar, pitch falls as it passes"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = f0 * (1 + doppler * np.tanh((0.5 - u) * 5))
    ph = phase(f)
    buzz = sum((k ** -0.9) * np.sin(k * ph + r.uniform(0, TAU)) for k in range(1, 22))
    buzz *= 1 + 0.25 * np.sin(phase(f * 0.25))
    roar = bp(colored(n, r, 0.8), 150, 3000, 1) * 0.8
    return lp(buzz * 0.5 + roar, 4000, 1)


def flyby(r, dur=2.8):
    """four planes in a vee passing over left -> right"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for k, (dt, g) in enumerate([(0.0, 1.0), (0.12, 0.8), (0.16, 0.8), (0.4, 0.6)]):
        p = prop_plane(r, dur, r.uniform(108, 128))
        u = np.clip((t - dt) / dur, 0, 1)
        env = np.exp(-((u - 0.5) / 0.22) ** 2)
        x = p * env * g
        pn = np.clip((u - 0.5) * 2.2, -1, 1)
        th = (pn + 1) * np.pi / 4
        out += np.stack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)
    return fades(out, 0.2, 0.3)


def oar(r):
    """one oar stroke: dip, pull swirl, drip-off"""
    d = 1.0
    t = tt(d)
    dip = G.bubbles(0.4, r, 160, 300, 2000, (0.006, 0.02), np.exp(-tt(0.4) / 0.1)) * 0.6
    swirl = bp(colored(len(t), r, 0.8), 200, 1500, 1) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.35) * 0.4
    drip = G.bubbles(d, r, 12, 1500, 4000, (0.004, 0.012), np.clip((t - 0.45) / 0.1, 0, 1) * np.exp(-np.maximum(t - 0.5, 0) / 0.3), rise=(10, 30)) * 0.5
    y = swirl + drip
    _pm(y, dip, 0.0)
    _pm(y, G.creak(0.2, r, 140, 100, G.WOOD, rough=0.1, noise=0.02) * 0.25, 0.1)
    return y


def stamp(r):
    """CANCELLED: a big rubber stamp slammed onto the blueprint on a wooden table"""
    d = 0.9
    t = tt(d)
    thump = np.sin(phase(78 * (1 + 0.7 * np.exp(-t / 0.008)))) * np.exp(-t / 0.07) * 2.2
    paper = bp(r.standard_normal(len(t)), 500, 6000, 1) * np.exp(-t / 0.01) * 1.1
    table = modal(d, [(160, 0.9, 0.08), (340, 0.7, 0.05), (620, 0.45, 0.035), (1100, 0.25, 0.02)], r)
    rattle = sum(G.clink(r, r.uniform(1500, 3000), 0.08) * 0.15 for _ in range(1))
    y = thump + paper + table
    _pm(y, rattle, 0.03)
    return fades(np.tanh(y * 0.9), 0.0, 0.1)


def hammer_far(r):
    return lp(G.hammer_hit(r, 0.8), 2500, 2)


def season_whoosh(r, dur=0.9):
    """a summer passing in a blink: airy whoosh with a breath of warm wind"""
    return G.whoosh(dur, r, peak=dur * 0.45, f_lo=300, f_hi=2400, width=0.9, tail=0.25, air=0.25)


def trickle(dur, r, amount=1.0):
    """melting ice: thin water trickles and drips into the lake"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
    y = G.bubbles(dur, r, 40 * amount * env + 0.1, 900, 3800, (0.003, 0.012), env, rise=(6, 20)) * 0.6
    y += G.bubbles(dur, r, 4 * amount * env + 0.05, 1500, 4500, (0.004, 0.012), env, rise=(10, 30)) * 0.6
    return widen(y, r, 9, 0.8)


def bloop(r):
    """the last of the ship slipping under: soft round water 'bloop' + a couple of bubbles"""
    d = 0.9
    t = tt(d)
    f = 520 * np.exp(-t / 0.08) + 190
    y = np.sin(phase(f)) * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.12)
    y += G.bubbles(d, r, 8, 500, 1500, (0.01, 0.03), np.exp(-tt(d) / 0.3)) * 0.4
    return fades(y, 0.0, 0.1)


def engine_throb(dur, r, rate=6.5):
    """far freighter diesel: low thump train under the swell"""
    n = ns(dur)
    t = np.arange(n) / SR
    am = (0.5 + 0.5 * np.sin(TAU * rate * t)) ** 3
    return lp(colored(n, r, 1.5) * am + 0.3 * np.sin(TAU * 52 * t) * am, 180, 2)
