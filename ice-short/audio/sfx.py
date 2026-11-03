# Every sound effect + ambience bed of "The Ship Made of Ice", timed to the picture (timeline.py), rendered into one
# stereo SFX stem. Standard mix: each EVENT has a "naive" level (LU relative to the voice stem, max momentary) and is
# placed SFX_DB = -6 dB under it; ambience BEDS (integrated loudness) are not reduced.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, pan, st, place, fades, make_ir, convolve_st, momentary_max, integrated)
import sfx_gen as G
import ice_gen as X
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, space="room", group=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.space = kind, p, extra, lpf, send, space
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def bed(fn, dur, fin=0.3, fout=0.4):
    return lambda: (fades(np.asarray(fn(dur)), fin, fout), 0.0)


def ev(fn, anchor=0.0):
    return lambda: (fn(), anchor)


def cues():
    C = []
    R = rng(1942)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    s = T.shot_t
    t_ = T.T_

    # ------------------------------------------------ ambience beds
    a, b = s(1)
    add(Cue(0.0, "amb_sea_hook", "open Atlantic under the ice carrier: swell, foam, wind, bow wash, gulls (shot 1)",
            bed(lambda d: X.ocean(d, rng(1), 1.0, 0.8, 0.5) + 0.7 * X.bow_wash(d, rng(2)) + 0.05 * X.gulls(d, rng(3), 0.5), b - a + 0.05, 0.05, 0.05),
            -24, "bed", send=0.0))
    a, b = s(2)
    add(Cue(a, "amb_sea_convoy", "grey convoy at sea: swell, wind, a far freighter engine throb (shot 2)",
            bed(lambda d: X.ocean(d, rng(4), 1.0, 0.5, 0.7) + st(X.engine_throb(d, rng(5)) * 0.6), b - a + 0.25, 0.02, 0.25),
            -26, "bed", send=0.0))
    a, b = s(5)
    add(Cue(a - 0.2, "amb_bergs", "icebergs drifting: swell, wind, far ice groans (shot 5)",
            bed(lambda d: X.ocean(d, rng(6), 0.8, 0.5, 0.9) + st(G.creak(d, rng(7), 25, 40, G.SMALLMETAL, rough=0.3, noise=0.05, scale=0.4) * 0.1), b - a + 0.4, 0.25, 0.3),
            -25, "bed", send=0.0))
    a, b = s(16)
    add(Cue(a - 0.25, "amb_high_wind", "aerial over the planned 2000 ft ship: high wind, far sea (shot 16)",
            bed(lambda d: G.breeze(d, rng(8), 1.0, 0.3, 1200) + 0.5 * X.ocean(d, rng(9), 0.6, 0.4, 0.2), b - a + 0.5, 0.3, 0.3),
            -26, "bed", send=0.0))
    for i, (sid, ext) in enumerate([(3, 4), (6, 7)]):
        a, b = s(sid)[0], s(ext)[1]
        if sid == 3:
            b = s(4)[1]
        add(Cue(a, "amb_study", f"Pyke's study: quiet room air + slow wall clock (shots {sid}-{ext})",
                bed(lambda d, k=i: X.room_tone(d, rng(10 + k), 0.6, 0.3) + st(X.clock(d, rng(12 + k), 1.0) * 0.35), b - a + 0.15, 0.08, 0.2),
                -34, "bed", send=0.0))
    a, b = s(8)[0], s(12)[1]
    add(Cue(a, "amb_room", "the generals' meeting room: bigger room air, lamp hum (shots 8-12)",
            bed(lambda d: X.room_tone(d, rng(14), 1.0, 0.5), b - a + 0.25, 0.1, 0.3), -36, "bed", send=0.0))
    add(Cue(a, "murmur", "the generals talking among themselves until Mountbatten walks in (fades by 24.3 s)",
            lambda: (fades(X.murmur(2.2, rng(15), 9), 0.15, 0.9), 0.0), -18, lpf=3000, send=0.3))
    a, b = s(13)[0], s(15)[1]
    add(Cue(a - 0.25, "amb_insert", "the demo bench: very quiet room air (shots 13-15)",
            bed(lambda d: X.room_tone(d, rng(16), 0.4, 0.2), b - a + 0.5, 0.25, 0.3), -40, "bed", send=0.0))
    a = s(17)[0] - 0.25
    add(Cue(a, "amb_lake", "Canadian mountain lake, golden hour: lapping, breeze, birds; crickets towards the end (shots 17-19)",
            bed(lambda d: X.lake_bed(d, rng(17), 0.45, 1.0), T.DUR - a, 0.3, 0.6), -29, "bed", send=0.0))

    # ------------------------------------------------ hook + transitions
    add(Cue(T.FLASH, "flash_whoosh", "reverse air swell into the white flash (frame 130)",
            ev(lambda r=rr(): G.whoosh(0.5, r, 0.42, 300, 2600, 0.9, 0.08, 0.2), 0.42), -10, send=0.05, space="out"))
    for f, desc in [(383, "cut out to the icebergs"), (1569, "crossfade up to the aerial"), (1641, "crossfade to the lake")]:
        add(Cue(T.fr(f), "whoosh_xfade", desc, ev(lambda r=rr(): G.whoosh(0.8, r, 0.3, 300, 1700, 0.9, 0.22, 0.12), 0.3),
                -14, send=0.08, space="out", group="whoosh"))

    # ------------------------------------------------ 1942: convoy, steel
    add(Cue(t_["sinking"] - 0.1, "torpedo_boom", "a freighter is hit far off: low boom, rumble, water thrown up (splash on 'sinking')",
            ev(lambda: X.boom_distant(rng(192))), -5, p=-0.35, send=0.25, space="out"))
    add(Cue(t_["sinking"] + 0.6, "hull_groan", "the hit freighter's steel groaning as it rolls and goes down",
            ev(lambda: fades(X.hull_groan(1.4, rng(193)), 0.2, 0.3)), -16, p=-0.35, send=0.3, space="out"))
    for k in range(8):
        tm = t_["steel"] + 0.05 + k * 0.16
        add(Cue(tm, "steel_clank", f"a girder vanishing from the steel heap {k + 1}/8 (each one quieter)",
                ev(lambda r=rr(), k=k: X.steel_clank(r, 1.0)), -10 - 1.6 * k, p=0.3, send=0.15, group="steel"))
    add(Cue(T.fr(T.W["pyke"] + 22), "bulb", "the idea lightbulb pops on over Pyke: click + bell ding",
            ev(lambda: X.bulb_ding(rng(355))), -8, p=0.0, send=0.15))

    # ------------------------------------------------ admirals, lab
    add(Cue(T.fr(T.W["cracks"] - 6), "desk_crack", "the test ice block on the side table cracks on 'cracks'",
            ev(lambda: X.ice_crack_run(rng(500), 0.35)), -5, p=0.2, send=0.1))
    add(Cue(t_["sawdust"] - 0.15, "sawdust", "Pyke tips sawdust into the tub of water",
            ev(lambda: X.sawdust_pour(1.0, rng(562))), -14, p=-0.2, send=0.08))
    add(Cue(T.fr(T.W["freezes"] - 6), "freezer", "freezer door: latch, seal pop, hinge, cold air rushing out",
            ev(lambda: X.freezer_open(rng(570))), -10, p=0.35, send=0.12))
    add(Cue(T.fr(T.W["freezes"]), "cold_mist", "frosty mist curling out of the freezer",
            ev(lambda: X.cold_hiss(1.2, rng(571))), -20, p=0.35, send=0.1))
    add(Cue(t_["pykrete"] + 0.65, "knock", "two knocks on the finished pykrete block: hard, solid (after the word)",
            ev(lambda: _knocks(rng(646))), -10, p=0.0, send=0.12))

    # ------------------------------------------------ the meeting
    add(Cue(T.fr(686), "door", "Mountbatten opens the heavy meeting-room door",
            ev(lambda: X.door_open(rng(686))), -12, p=0.15, send=0.25))
    for k in range(5):
        tm = T.fr(692) + k * 0.36
        add(Cue(tm, "steps", f"Mountbatten's footsteps on the boards {k + 1}/5", ev(lambda r=rr(): G.stroll_step(r, 0.4)),
                -16 + (1.0 if k == 0 else 0.0), p=0.1, send=0.2, group="steps"))
    add(Cue(T.fr(T.W["pistol"]) + 0.05, "draw", "pistol out of the holster: leather + hammer cock click",
            ev(lambda: X.pistol_draw(rng(823))), -14, p=0.1, send=0.15))
    add(Cue(T.SHOT1, "gunshot1", "BANG 1: pistol fired at the ice block (indoor crack + room tail)",
            ev(lambda: X.gunshot(rng(838))), 1, p=0.05, send=0.5))
    add(Cue(T.SHATTER, "shatter", "the pure ice block bursts: crack, thump, a shower of shards tinkling down",
            ev(lambda: X.shatter(rng(893))), -1, p=0.0, send=0.3))
    add(Cue(T.SHOT2, "gunshot2", "BANG 2: pistol fired at the pykrete block",
            ev(lambda: X.gunshot(rng(942))), 1, p=0.05, send=0.5))
    add(Cue(T.RICO, "ricochet", "the bullet hits the pykrete and comes straight back: thwack + falling whine",
            ev(lambda: X.ricochet(rng(993))), -2, p=-0.2, send=0.3))
    add(Cue(T.RICO + 0.04, "gasps", "the generals duck: a ripple of gasps",
            ev(lambda: X.gasps(rng(994), 8)), -12, send=0.25))
    add(Cue(T.RICO + 14 / 30, "wall_thud", "the bullet buries itself in the panelling behind them + plaster dust",
            ev(lambda: X.wall_thud(rng(1007))), -10, p=0.4, send=0.35))
    add(Cue(T.fr(T.W["luckily"] - 4), "rustle", "generals bob back up over the table (chairs)",
            ev(lambda: X.chairs(rng(1066), 4, 0.35)), -18, send=0.2, group="chairs"))
    add(Cue(T.fr(T.W["interested"] - 20), "chairs", "chairs creak as the generals lean in, very interested",
            ev(lambda: X.chairs(rng(1156), 6, 0.5)), -16, send=0.2, group="chairs"))

    # ------------------------------------------------ the science
    add(Cue(T.fr(T.W["crack"] - 3), "crack_ice", "one tiny crack runs straight through the clear ice block, ends in a dry split",
            ev(lambda: X.ice_crack_run(rng(1264), 1.0)), -6, p=0.0, send=0.08))
    add(Cue(T.fr(T.W["catches"] - 30), "crack_mud", "a crack starts in the mud brick and stops dead at the straw",
            ev(lambda: X.mud_crack(rng(1373), 0.9, 0.55)), -9, p=0.0, send=0.06))
    add(Cue(T.fr(T.W["sawdust2"] + 8), "crack_pyk", "a crack in the pykrete stops at the sawdust after a few ticks: dull tock",
            ev(lambda: X.ice_crack_run(rng(1479), 0.6, stop=0.18)), -9, p=0.0, send=0.06))
    add(Cue(t_["cold"] - 0.3, "cold_hiss", "cold mist staying in the pykrete block",
            ev(lambda: X.cold_hiss(1.6, rng(1532))), -20, p=0.0, send=0.05))

    # ------------------------------------------------ the lake
    for k in range(4):
        add(Cue(s(17)[0] + 0.3 + k * 0.55, "hammer", f"crew hammering on the test hull, across the water {k + 1}/4",
                ev(lambda r=rr(): X.hammer_far(r)), -20, p=0.25, send=0.4, space="out", group="hammer"))
    add(Cue(T.fr(1708), "flyby", "four propeller planes pass over the lake, left to right (planes got better)",
            ev(lambda: X.flyby(rng(1708), 1.5)), -9, send=0.25, space="out"))
    for k in range(4):
        add(Cue(T.fr(1758) + k * 1.05, "oar", f"the crew rowing away: oar stroke {k + 1}/4",
                ev(lambda r=rr(): X.oar(r)), -18 - 1.5 * k, p=-0.3, send=0.2, space="out", group="oars"))
    add(Cue(T.fr(T.W["cancelled"] - 2), "stamp", "CANCELLED: the rubber stamp slams onto the blueprint",
            ev(lambda: X.stamp(rng(1812))), -1, p=0.0, send=0.18, space="out"))
    for k, f in enumerate([T.W["three"] - 8, T.W["summers"] - 8]):
        add(Cue(T.fr(f), "season", f"a summer goes by in a blink: airy whoosh {k + 1}/2",
                ev(lambda r=rr(): X.season_whoosh(r, 0.6), 0.27), -16, send=0.15, space="out", group="season"))
    add(Cue(T.fr(T.W["sat"]) - 0.4, "melt", "the hull melting: water trickling and dripping into the lake",
            bed(lambda d: X.trickle(d, rng(1953), 1.0), T.fr(T.W["lose"] + 12) - T.fr(T.W["sat"]) + 0.4, 0.5, 0.4), -30, "bed", send=0.0))
    add(Cue(T.fr(T.W["lose"] + 10), "bloop", "the last of the ship slips under: one soft 'bloop' (after 'lose')",
            ev(lambda: X.bloop(rng(2036))), -12, send=0.25, space="out"))
    return C


def _knocks(r):
    y = np.zeros(ns(0.6))
    for tm in (0.0, 0.17):
        k = X.knock(r)
        G._place_mono(y, k * (1.0 if tm == 0 else 0.85), tm)
    return y


# ================================================================ render
def render(v_ref, on_event=None):
    C = cues()
    out = np.zeros((2, N))
    sends = {"room": np.zeros(N), "out": np.zeros(N)}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(sends[c.space], c.send * x.mean(0), t0)
    room = make_ir(0.85, 71, pre=0.008, hf=1.4, early=[(0.021, 0.5, -0.4), (0.037, 0.4, 0.5), (0.055, 0.3, -0.2)])
    outdoor = make_ir(1.6, 72, pre=0.02, hf=1.8, early=[(0.12, 0.35, -0.5), (0.27, 0.2, 0.6)])
    out += 0.55 * convolve_st(sends["room"], room) + 0.45 * convolve_st(sends["out"], outdoor)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.25)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
