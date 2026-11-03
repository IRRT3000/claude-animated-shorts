// Timeline of "The Ship Made of Ice": 19 shots timed to the voice words (ice-short/voice/words.json, 30 fps),
// the story state (melt, cracks, bullet, crowd poses) and the camera grammar of the bridge short: continuous slow
// push-ins, symmetric smootherstep glides of 18-40 f, cuts on big reframes, 7-frame flip kicks on impacts.
// Every set lives at its own world origin (SETS) so one scene holds the whole film; framings are set-local.
export const FPS = 30;
export const TOTAL = 2080; // last word "lose" ends at 2032 f + 1.6 s tail on the calm lake
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- sets ----------------
// sea: open Atlantic, y = 0 water. carrier hull along +z (600 m in the story, built at 1:2 = 300 m so it reads).
// study: Pyke's cluttered study/lab (floor y = 0), window to the sea. room: the Quebec meeting room, long table along z,
// Mountbatten at the -z end, the two test blocks on a side table at the +z end. insert: a neutral workbench for the
// crack demos (ice block / mud brick / pykrete). lake: Patricia Lake under mountains, the prototype hull moored.
export type SetId = "sea" | "study" | "room" | "insert" | "lake";
export const SETS: Record<SetId, V3> = { sea: [0, 0, 0], study: [600, 2, 0], room: [700, 2, 0], insert: [800, 2, 0], lake: [-700, 0, 0] };
export const at = (set: SetId, p: V3): V3 => [SETS[set][0] + p[0], SETS[set][1] + p[1], SETS[set][2] + p[2]];

// ---------------- word marks (frames, from words.json; reactions land 0-3 f before the word) ----------------
export const W = {
  war: 31, aircraft: 78, ice0: 112, y1942: 141, sinking: 192, steel: 240, inventor: 303, pyke: 333, iceFree: 368,
  free: 383, ocean: 402, admirals: 452, cracks: 500, mixes: 530, sawdust: 562, freezes: 570, himself: 623, pykrete: 646,
  mountbatten: 703, generals: 786, pistol: 823, shoots1: 836, shatters: 895, shoots2: 940, bounces: 995, back: 1018,
  luckily: 1066, unluckily: 1119, interested: 1176, tiny: 1258, crack: 1267, straight: 1289, mud: 1346, straw: 1365,
  catches: 1403, spreads: 1441, sawdust2: 1471, cold: 1532, thousand: 1605, test: 1660, lake: 1696, planes: 1720,
  warOn: 1754, cancelled: 1814, only: 1859, fought: 1914, sat: 1953, three: 1991, summers: 2008, lose: 2026,
};

// ---------------- story state (pure functions of frame) ----------------
/** gunshots / impacts (frames): muzzle flash + kick + SFX */
export const SHOT1 = W.shoots1 + 2, SHOT2 = W.shoots2 + 2;   // trigger pulled just after "shoots"
export const SHATTER = W.shatters - 2;                       // pure ice block bursts
export const RICO = W.bounces - 2;                           // bullet hits pykrete and comes straight back
/** pure ice block: 0 intact -> 1 burst (shards fly 20 f) */
export const shatterU = (f: number) => clamp01((f - SHATTER) / 20);
/** ricochet bullet path in room-local metres: from the pykrete block back down the room over the generals' heads */
export const bulletAt = (f: number): V3 | null => {
  if (f < RICO || f > RICO + 14) return null;
  const u = (f - RICO) / 14; return [0.35 - 0.6 * u, 1.35 + 0.25 * Math.sin(Math.PI * u), 4.2 - 11 * u];
};
/** generals: 0 seated, 1 ducked (ricochet), back up on "Luckily", leaning in on "interested" */
export const duckU = (f: number) => lin([[RICO - 1, 0], [RICO + 4, 1], [W.luckily - 6, 1], [W.luckily + 10, 0]], f);
export const leanU = (f: number) => smooth((f - (W.interested - 20)) / 18);
/** crack demo: a crack front 0..1 across the block; on straw / sawdust it stops at the first fibre (~0.32) */
export const crackIce = (f: number) => clamp01((f - (W.crack - 3)) / 26);
export const crackMud = (f: number) => Math.min(0.55, clamp01((f - (W.catches - 30)) / 30));
export const crackPyk = (f: number) => Math.min(0.22, clamp01((f - (W.sawdust2 + 8)) / 24));
/** prototype at Patricia Lake: 1 = full block, shrinks over "three whole summers" (three steps, one per season pulse) */
export const meltLeft = (f: number) =>
  lin([[W.sat, 1], [W.three - 4, 0.92], [W.three + 6, 0.66], [W.summers - 2, 0.6], [W.summers + 8, 0.36], [W.lose - 6, 0.3], [W.lose + 10, 0]], f);
/** season tint at the lake ending: 0 summer, 1 winter (snow on the shore), pulses between the summers */
export const winterU = (f: number) => lin([[W.sat, 0], [W.three - 8, 0], [W.three, 0.9], [W.three + 8, 0], [W.summers - 8, 0], [W.summers, 0.9], [W.summers + 8, 0]], f);

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "march" | "fall" | "water" | "bank" | "tourists" | "none" | "convoy" | "pyke" | "admirals" | "lab" | "generals" | "demo" | "crew" | "leaving";
export type ShotDef = { id: number; a: number; b: number; set: SetId; light: Light; crowd: Crowd; tau: (t: number) => number; beat: string; towns?: boolean };
const id = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 130, set: "sea", light: "day", crowd: "crew", tau: id, beat: "hook: the white ice carrier ploughs the swell, planes on deck" },
  { id: 2, a: 130, b: 240, set: "sea", light: "day", crowd: "convoy", tau: id, beat: "1942: grey convoy, a freighter hit and sinking (splash on 'sinking')" },
  { id: 3, a: 240, b: 287, set: "study", light: "day", crowd: "none", tau: id, beat: "'steel is running out': the steel heap by the window shrinks to one girder" },
  { id: 4, a: 287, b: 383, set: "study", light: "day", crowd: "pyke", tau: id, beat: "Pyke in his study, lightbulb fx on 'idea', points at the window" },
  { id: 5, a: 383, b: 449, set: "sea", light: "day", crowd: "none", tau: id, beat: "'ice is free / ocean is full of it': icebergs drifting, push in" },
  { id: 6, a: 449, b: 518, set: "study", light: "day", crowd: "admirals", tau: id, beat: "two admirals frown; a test ice block cracks on 'cracks' (kick)" },
  { id: 7, a: 518, b: 671, set: "study", light: "day", crowd: "lab", tau: id, beat: "Pyke tips sawdust into a tub (562), freezer door (570), proud pose by the block (623), CU of the pykrete block (646)" },
  { id: 8, a: 671, b: 889, set: "room", light: "day", crowd: "generals", tau: id, beat: "Mountbatten walks in (703), wide of the generals' table (786), pistol out (823), shoots the ice block (836)" },
  { id: 9, a: 889, b: 927, set: "room", light: "day", crowd: "generals", tau: id, beat: "'It shatters': ice block bursts, shards, kick" },
  { id: 10, a: 927, b: 1066, set: "room", light: "day", crowd: "generals", tau: id, beat: "shoots the pykrete (940), the bullet comes straight back down the room (995), everyone ducks" },
  { id: 11, a: 1066, b: 1119, set: "room", light: "day", crowd: "generals", tau: id, beat: "'Luckily': generals peek up over the table, unharmed" },
  { id: 12, a: 1119, b: 1209, set: "room", light: "day", crowd: "generals", tau: id, beat: "'Unluckily': generals lean in, very interested (CU row of faces)" },
  { id: 13, a: 1209, b: 1321, set: "insert", light: "day", crowd: "demo", tau: id, beat: "one tiny crack runs straight through a clear ice block" },
  { id: 14, a: 1321, b: 1471, set: "insert", light: "day", crowd: "demo", tau: id, beat: "mud brick with straw: the crack stops at the straw" },
  { id: 15, a: 1471, b: 1569, set: "insert", light: "day", crowd: "demo", tau: id, beat: "pykrete: crack stops at the sawdust; cold mist stays in" },
  { id: 16, a: 1569, b: 1641, set: "sea", light: "day", crowd: "crew", tau: id, beat: "the planned ship: aerial, 2000 ft, planes tiny on the deck" },
  { id: 17, a: 1641, b: 1712, set: "lake", light: "golden", crowd: "crew", tau: id, beat: "the test hull on a Canadian mountain lake, crew on top" },
  { id: 18, a: 1712, b: 1842, set: "lake", light: "golden", crowd: "leaving", tau: id, beat: "planes fly over (1720), crew packs up and rows away, a stamp slams on the blueprint (1814, kick)" },
  { id: 19, a: 1842, b: TOTAL, set: "lake", light: "golden", crowd: "none", tau: id, beat: "the hull alone; three summers pass, it shrinks to calm water on 'lose'" },
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 2: 0, 5: 6, 13: 8, 16: 8, 17: 8, 19: 10 };
export const FLASH_AT = 130;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
// Grammar (motion.md): every move is a symmetric smootherstep glide of 18-40 f (peak speed = 1.875 x distance / dur,
// so dur >= 0.075 x the move in 720p px keeps the peak near the reference 14-25 px/f); a reframe bigger than about
// half a frame width or 40 % zoom is a hard cut on its key frame. Glides are centred on the old key frame (the
// whoosh in the sound mix peaks there), so a glide key starts dur/2 earlier. Holds push in (dolly toward the look
// point or a fov zoom near walls/towers): 0.15-0.35 %/f, ~0.6 %/f for ~35 f on the punch words. Rolls of 4-8 deg
// over >= 18 f on emphasis beats, held tilt <= 0.07 rad.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
/** reference camera ease: symmetric smootherstep (attack = release, ~10 f each on a 23 f move) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (with 8 f soft edges) for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** zoom push (camera stays put, for lenses next to towers / houses): tan(fov/2) shrinks by k */
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
/** a roll-only move on top of an existing framing */


// ---- framings (set-local helpers: S(set)(pos, look) -> world) ----
const P = (set: SetId) => (p: V3) => at(set, p);
const sea = P("sea"), st = P("study"), rm = P("room"), ins = P("insert"), lk = P("lake");
// shot 1: low over the swell beside the bow -> rising 3/4 that shows the whole deck (centred on "aircraft carrier")
const S1a = (f: number) => dolly(sea([-62, 22, 262 + 6 * T(f)]), sea([4, 12, 100 + 6 * T(f)]), pushK(f, 0, 0.0025), { fov: 46, roll: -0.04 });
const S1b = (f: number) => dolly(sea([-115, 62, 270 + 6 * T(f)]), sea([0, 8, 40 + 6 * T(f)]), pushK(f, 66, 0.002), { fov: 44, roll: 0.03 });
// shot 2: convoy wide, punch toward the hit freighter on "sinking"
const S2a = (f: number) => zoom(sea([60, 18, -260]), sea([0, 4, -140]), 42, pushK(f, 130, 0.002));
const S2b = (f: number) => zoom(sea([60, 18, -260]), sea([-8, 3, -150]), 34, pushK(f, 186, 0.0015, 0.006, 30), { roll: -0.04 });
// shot 3: steel heap by the study window, push on "running out"
const S3a = (f: number) => dolly(st([2.6, 1.3, -3.2]), st([0.6, 0.7, 0.4]), pushK(f, 240, 0.003, 0.006, 30), { fov: 40 });
// shot 4: MS Pyke at his desk -> CU on "idea" (roll) -> over-shoulder to the window on "ice is free"
const S4a = (f: number) => dolly(st([0.4, 1.55, -3.4]), st([0, 1.45, 0]), pushK(f, 287, 0.0025), { fov: 40 });
const S4b = (f: number) => dolly(st([0.2, 1.6, -2.1]), st([0, 1.6, 0]), pushK(f, 344, 0.002), { fov: 36, roll: 0.04 });
const S4c = (f: number) => dolly(st([-0.9, 1.8, 0.9]), st([-0.5, 1.6, 4.5]), pushK(f, 366, 0.0025), { fov: 40, roll: -0.03 });
// shot 5: icebergs on the open sea, slow push (sharp, establishing)
const S5a = (f: number) => dolly(sea([140, 9, 60]), sea([110, 6, -40]), pushK(f, 383, 0.0025), { fov: 42 });
// shot 6: two admirals frown -> insert of the ice block on the desk cracking ("cracks", kick)
const S6a = (f: number) => dolly(st([-1.2, 1.65, -2.6]), st([-1.6, 1.55, 0.6]), pushK(f, 449, 0.0025), { fov: 38, roll: -0.035 });
const S6b = (f: number) => dolly(st([0.9, 1.15, -0.9]), st([1.0, 0.95, 0.5]), pushK(f, 488, 0.003, 0.006, 24), { fov: 34 });
// shot 7: sawdust tub (wide lab) -> freezer -> proud Pyke MS -> pykrete block CU punch
const S7a = (f: number) => dolly(st([2.8, 1.9, -2.0]), st([2.2, 0.9, 1.0]), pushK(f, 518, 0.0025), { fov: 42 });
const S7b = (f: number) => dolly(st([3.4, 1.6, -0.6]), st([4.6, 1.2, 1.2]), pushK(f, 566, 0.003), { fov: 38, roll: 0.035 });
const S7c = (f: number) => dolly(st([2.0, 1.6, -2.6]), st([2.2, 1.45, 0.6]), pushK(f, 600, 0.0025), { fov: 38 });
const S7d = (f: number) => dolly(st([2.7, 1.2, -0.4]), st([2.7, 1.0, 0.7]), pushK(f, 642, 0.002, 0.006, 26), { fov: 34, roll: -0.04 });
// shot 8: door end of the room (Mountbatten enters) -> high wide of the table ("top Allied generals") ->
//          CU pistol hand -> over-shoulder down the room at the ice block
const S8a = (f: number) => dolly(rm([1.4, 1.7, -2.5]), rm([0, 1.5, -6.5]), pushK(f, 671, 0.0025), { fov: 40 });
const S8b = (f: number) => dolly(rm([2.6, 2.95, -7.9]), rm([0, 0.8, 0.8]), pushK(f, 780, 0.002), { fov: 50, roll: 0.03 });
const S8c = (f: number) => dolly(rm([0.8, 1.45, -4.6]), rm([0.25, 1.3, -5.8]), pushK(f, 819, 0.003, 0.006, 20), { fov: 34, roll: -0.04 });
const S8d = (f: number) => dolly(rm([-0.6, 1.75, -7.4]), rm([0.4, 1.15, 4.2]), pushK(f, 832, 0.0025), { fov: 36 });
// shot 9: ice block CU at the far end as it bursts
const S9a = (f: number) => dolly(rm([-0.4, 1.3, 2.2]), rm([0.35, 1.1, 4.2]), pushK(f, 889, 0.003), { fov: 38 });
// shot 10: same angle on the pykrete block -> reverse down the room as the bullet comes back (generals duck)
const S10a = (f: number) => dolly(rm([-0.5, 1.3, 2.3]), rm([0.35, 1.1, 4.4]), pushK(f, 927, 0.003), { fov: 38, roll: 0.03 });
const S10b = (f: number) => dolly(rm([0.5, 1.6, 5.6]), rm([0, 1.1, -3]), pushK(f, 990, 0.002), { fov: 46, roll: -0.045 });
// shot 11: low along the table edge: heads peek up ("Luckily")
const S11a = (f: number) => dolly(rm([0.95, 1.6, 5.7]), rm([0, 0.85, -0.5]), pushK(f, 1066, 0.0025), { fov: 50 });
// shot 12: CU row of generals' faces leaning in, punch on "interested"
const S12a = (f: number) => dolly(rm([2.6, 1.35, -2.8]), rm([1.2, 1.3, 0.6]), pushK(f, 1119, 0.0025), { fov: 38, roll: 0.03 });
const S12b = (f: number) => dolly(rm([2.0, 1.3, -1.6]), rm([1.2, 1.3, 0.6]), pushK(f, 1170, 0.002, 0.006, 30), { fov: 34, roll: -0.03 });
// shots 13-15: workbench inserts, each block centred at insert (0, 1, 0)
const S13a = (f: number) => dolly(ins([0.6, 1.35, -1.5]), ins([0, 1.05, 0]), pushK(f, 1209, 0.003, 0.006, 30), { fov: 36 });
const S14a = (f: number) => dolly(ins([-0.6, 1.3, -1.5]), ins([0, 1.05, 0]), pushK(f, 1321, 0.0025), { fov: 38, roll: 0.03 });
const S14b = (f: number) => dolly(ins([-0.05, 1.18, -1.0]), ins([0.05, 1.02, 0]), pushK(f, 1398, 0.002, 0.006, 30), { fov: 34, roll: -0.03 });
const S15a = (f: number) => dolly(ins([0.5, 1.4, -1.4]), ins([0, 1.05, 0]), pushK(f, 1471, 0.0025), { fov: 36 });
// shot 16: aerial of the planned 2000 ft ship (scale by tiny planes), punch on "thousand"
const S16a = (f: number) => dolly(sea([-160, 120, 260]), sea([0, 0, 20]), pushK(f, 1565, 0.0015, 0.005, 30), { fov: 44 });
// shot 17: golden wide of the lake, prototype hull at lake (0, 0, 0), mountains behind
const S17a = (f: number) => zoom(lk([-40, 7, -70]), lk([0, 2, 0]), 40, pushK(f, 1641, 0.002));
// shot 18: planes overhead (tilt up), crew rows away, stamp insert on the blueprint (lake jetty table)
const S18a = (f: number) => dolly(lk([-14, 2.0, -22]), lk([0, 9, 10]), pushK(f, 1712, 0.002), { fov: 44, roll: 0.04 });
const S18b = (f: number) => dolly(lk([-10, 2.2, -18]), lk([0, 1.4, 0]), pushK(f, 1750, 0.002), { fov: 40 });
const S18c = (f: number) => dolly(lk([-6.2, 1.9, -9.4]), lk([-6.4, 1.0, -8.2]), pushK(f, 1806, 0.003), { fov: 34, roll: -0.04 });
// shot 19: the hull alone, locked-off-feeling slow creep while it melts; final pull-back to calm water
const S19a = (f: number) => dolly(lk([-18, 3.5, -26]), lk([0, 1.2, 0]), pushK(f, 1842, 0.0018), { fov: 40 });
const S19b = (f: number) => dolly(lk([-30, 9, -48]), lk([0, 0.5, 0]), pushK(f, 2000, 0.001), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 66, dur: 30, s: S1b }],                       // glide centred on 81 ("aircraft carrier")
  2: [{ f: 130, s: S2a }, { f: 186, cut: true, s: S2b }],                  // cut on "sinking"
  3: [{ f: 240, s: S3a }],
  4: [{ f: 287, s: S4a }, { f: 344, dur: 20, s: S4b }, { f: 366, cut: true, s: S4c }],
  5: [{ f: 383, s: S5a }],
  6: [{ f: 449, s: S6a }, { f: 488, cut: true, s: S6b }],                  // cut to the block just before "cracks"
  7: [{ f: 518, s: S7a }, { f: 566, cut: true, s: S7b }, { f: 600, cut: true, s: S7c }, { f: 642, cut: true, s: S7d }],
  8: [{ f: 671, s: S8a }, { f: 780, cut: true, s: S8b }, { f: 819, cut: true, s: S8c }, { f: 832, cut: true, s: S8d }],
  9: [{ f: 889, s: S9a }],
  10: [{ f: 927, s: S10a }, { f: 990, cut: true, s: S10b }],
  11: [{ f: 1066, s: S11a }],
  12: [{ f: 1119, s: S12a }, { f: 1162, dur: 22, s: S12b }],                // centred on 1173 ("interested")
  13: [{ f: 1209, s: S13a }],
  14: [{ f: 1321, s: S14a }, { f: 1390, dur: 22, s: S14b }],                // centred on 1401 ("catches")
  15: [{ f: 1471, s: S15a }],
  16: [{ f: 1565, s: S16a }],
  17: [{ f: 1641, s: S17a }],
  18: [{ f: 1712, s: S18a }, { f: 1750, cut: true, s: S18b }, { f: 1806, cut: true, s: S18c }],
  19: [{ f: 1842, s: S19a }, { f: 1990, dur: 40, s: S19b }],
};

// impact kicks (reference v14): the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in
// 7 f, roll +-0.23 deg per unit; they start on the first frame at/after the event. No hand-held float.
const KICKS: [number, number][] = [[(W.cracks - 2) / FPS, 0.6], [SHOT1 / FPS, 0.8], [SHATTER / FPS, 1.2], [SHOT2 / FPS, 0.8], [RICO / FPS, 1.6], [(W.cancelled - 2) / FPS, 1.0]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a; // metres at the look distance for 3 px x a
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished (for picking billboard views per key, not per frame) */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: depth of field + foreground framing ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                   // hook wides on the sea: sharp
  { f: 240, cInf: 12 },                                // steel heap MS
  { f: 287, cInf: 10 },                                // Pyke MS
  { f: 344, dur: 20, cInf: 13 },                       // Pyke CU on "idea"
  { f: 366, cInf: 7 },                                 // over-shoulder to the window
  { f: 383, cInf: 0 },                                 // icebergs (establishing)
  { f: 449, cInf: 12 },                                // admirals MS
  { f: 488, cInf: 15 },                                // ice block insert
  { f: 518, cInf: 8 },                                 // lab wide-ish
  { f: 566, cInf: 12 }, { f: 600, cInf: 11 }, { f: 642, cInf: 15 },
  { f: 671, cInf: 10 },                                // Mountbatten at the door
  { f: 780, cInf: 0 },                                 // high wide of the table
  { f: 819, cInf: 14 },                                // pistol CU
  { f: 832, cInf: 10, focus: () => at("room", [0.35, 1.1, 4.2]) }, // over-shoulder, the block sharp
  { f: 889, cInf: 15 }, { f: 927, cInf: 15 },          // block CUs
  { f: 990, cInf: 0 },                                 // reverse down the room (the bullet must read)
  { f: 1066, cInf: 10 }, { f: 1119, cInf: 12 }, { f: 1162, dur: 22, cInf: 14 },
  { f: 1209, cInf: 16 }, { f: 1321, cInf: 15 }, { f: 1471, cInf: 16 }, // inserts
  { f: 1569, cInf: 0 },                                // aerial
  { f: 1641, cInf: 5 },                                // golden lake
  { f: 1712, cInf: 0 }, { f: 1806, cInf: 14 },         // planes / stamp insert
  { f: 1842, cInf: 5 }, { f: 1990, dur: 40, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
/** what the lens focuses on (DOF): the DOF table's focus point, else the camera look point */
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

/** near framing objects: visible while a <= f < b; kit = a GLB name accepted by build.ts prop() (world-space pos) */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 287, b: 366, kit: "lantern", pos: at("study", [0.9, 0.9, -2.2]), s: 0.45 },          // desk lamp corner on Pyke MS
  { a: 1066, b: 1119, kit: "cart", pos: at("room", [1.9, 0, 2.6]), s: 0.6, yaw: 0.4 },        // chair/cart edge low in frame
  { a: 1641, b: 1712, kit: "plant_bushDetailed", pos: at("lake", [-34, 0, -60]), s: 1.4 },   // shore bush, bottom-left
  { a: 1842, b: 1990, kit: "tree_cone", pos: at("lake", [-14, 0, -20]), s: 3.2 },            // pine on the near shore
];

// ---------------- legacy bridge exports ----------------
// world.ts / cast.ts still build the bridge set until their ice-short rewrite (pipeline steps 5-6); these keep them
// compiling and are removed with that rewrite. Nothing in the ice timeline reads them.
export const D0 = 6.0, HALF = 27, FILES = [-1.65, -0.55, 0.55, 1.65], ROW_GAP = 1.3, COUNT = 74;
export const PARK: V3 = [70, D0, -75];
export const front = (tau: number) => 26 - 1.6 * (tau - 4.4);
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1;
export const SNAP = 34.62, DROP0 = 36.35, DROP1 = 36.95, DROP_H = 6.6;
export const amp = (_tau: number) => 0;
export const stomp = (_tau: number) => 1;
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26);
export const dropU = (_tau: number) => 0;
export type BridgeState = { bounce: number; drop: number; snap: number; collapsed: boolean };
export const deckY = (z: number, b: BridgeState) => D0 + b.bounce * shapeZ(z) - b.drop * DROP_H * dropW(z);
export const bridgeState = (_id: number, _t: number): BridgeState => ({ bounce: 0, drop: 0, snap: 0, collapsed: false });
export const ANCHOR: V3 = [-2.7, D0 + 0.62, -37];
export const snapEnd = (snap: number): V3 => { const u = easeOut(snap); return [ANCHOR[0] - 0.6 * u, ANCHOR[1] + 5.5 * u - 2.0 * u * u, ANCHOR[2] + 4.5 * u]; };
