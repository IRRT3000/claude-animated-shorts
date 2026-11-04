// Timeline of "The Song That Ends in 2640" (John Cage's ORGAN2/ASLSP in Halberstadt): shots timed to the voice
// (projects/slow-organ/voice/words.json; frame numbers below = word onsets at 30 fps), the organ's state (pipes,
// weights, the blower), the time-lapses, and the camera grammar of the bridge short: hard cuts on big reframes,
// smootherstep glides of 18-40 f, every hold creeps in, flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 2040; // voice ends 1957 ("months.") + the first note finally sounding + a button
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
// A German market town with its old stone church (the hook, the council, the long score), the church inside (the tiny
// organ, chairs, the barn/pigsty dressing), the 1361 cathedral with its great organ, and Cage's studio. Each set is far
// from the others (walls hide one from the other).
export const TOWN: V3 = [0, 0, 0];              // market square; church west front at z = -24
export const CHURCH_Z = -24;                    // town: the church's front wall
export const CH: V3 = [0, 0, -400];             // church inside: nave x -5..5, z -14..8, walls 9 m
export const ORG: V3 = add(CH, [1.4, 0, -9]);   // the tiny organ (keyboard on its +z side)
export const KEY_Y = 0.82;                      // keyboard height
export const PIPE_Y = 1.2;                      // pipe feet (top of the case)
/** the organ's 8 pipes: [x offset, height] */
export const PIPES: [number, number][] = [[-0.52, 0.55], [-0.38, 0.7], [-0.24, 0.86], [-0.1, 1.02], [0.04, 0.92], [0.18, 0.78], [0.32, 0.64], [0.46, 0.5]];
export const BLOWER: V3 = add(ORG, [-1.25, 0, -0.1]);
export const CA: V3 = [0, 0, -800];             // the 1361 cathedral: great organ on the back wall z = -6
export const STU: V3 = [0, 0, -1200];           // Cage's studio
export const DESK: V3 = add(STU, [-0.9, 0, -0.6]);
export const PIANO: V3 = add(STU, [1.5, 0, -1.6]);
/** chairs in the church: rows facing the organ */
export const SEATS: V3[] = (() => {
  const o: V3[] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) o.push(add(CH, [-2.6 + c * 1.0 + (r % 2) * 0.12, 0, -5.2 + r * 1.25]));
  return o;
})();
/** the visitor of the luckily/unluckily beat (front row, second from the aisle) */
export const VISITOR = SEATS[3];

// ---------------- shots ----------------
export type Light = "day" | "lab" | "night" | "stage" | "dusk";
export type Place = "town" | "church" | "cathedral" | "studio";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; crowd: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 56, light: "day", place: "town", crowd: 1 },          // hook: a small German church
  { id: 2, a: 56, b: 180, light: "lab", place: "church", crowd: 0 },      // an organ is playing... until 2640
  { id: 3, a: 180, b: 320, light: "lab", place: "studio", crowd: 0 },     // Cage wrote As Slow As Possible
  { id: 4, a: 320, b: 384, light: "stage", place: "studio", crowd: 0 },   // usually about an hour
  { id: 5, a: 384, b: 460, light: "day", place: "town", crowd: 1 },       // Halberstadt took it literally
  { id: 6, a: 460, b: 650, light: "stage", place: "cathedral", crowd: 0 },// 1361, 639 years
  { id: 7, a: 650, b: 710, light: "day", place: "town", crowd: 1 },       // so that's how long
  { id: 8, a: 710, b: 856, light: "day", place: "town", crowd: 0 },       // the venue: barn, pigsty
  { id: 9, a: 856, b: 1012, light: "lab", place: "church", crowd: 0 },    // tiny organ, blower, weights
  { id: 10, a: 1012, b: 1144, light: "lab", place: "church", crowd: 0 },  // blowing across a bottle
  { id: 11, a: 1144, b: 1265, light: "lab", place: "church", crowd: 0 },  // one chord: 2,527 days
  { id: 12, a: 1265, b: 1328, light: "lab", place: "church", crowd: 1 },  // every change packs the church
  { id: 13, a: 1328, b: 1470, light: "lab", place: "church", crowd: 1 },  // seven notes to eight
  { id: 14, a: 1470, b: 1563, light: "day", place: "town", crowd: 0 },    // four percent done: the long score
  { id: 15, a: 1563, b: 1710, light: "lab", place: "church", crowd: 0 },  // luckily / unluckily
  { id: 16, a: 1710, b: 1795, light: "lab", place: "studio", crowd: 0 },  // twist: it starts with a rest
  { id: 17, a: 1795, b: TOTAL, light: "dusk", place: "church", crowd: 1 },// 2001: seventeen months of nothing
];
/** crossfades (frames) at time / place changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 6: 10, 7: 8, 11: 0, 14: 8, 17: 12 };
export const FLASH_AT = 180;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the story state ----------------
/** the organ sounds (notes rise from the pipes) */
export const FIRST_NOTE = 1992;           // the button: after 17 months of nothing, the first pipes sound
export const sounding = (id: number, f: number) => id === 2 || (id >= 9 && id <= 15 && !(id === 9 && f < 940)) || (id === 17 && f >= FIRST_NOTE) || id === 10 && f >= 1076;
/** the eighth pipe (added on "eight", 1454) */
export const ADD_PIPE = 1452;
export const pipeCount = (id: number, f: number) => (id === 2 || id === 14 || id === 15 || (id === 13 && f >= ADD_PIPE) ? 8 : 7);
/** sandbags on the keys */
export const WEIGHT = 990;
export const bagsOn = (id: number, f: number) => id !== 17 && !(id === 9 && f < WEIGHT) && id !== 3;
/** the blower switch (shot 9, "switched on" 906 -> "blower" 938) */
export const SWITCH = 924;
export const blowerOn = (id: number, f: number) => (id === 9 ? f >= SWITCH : id !== 17 || true);
/** organ assembly in shot 9: parts pop in between 862 and 890 */
export const buildAt = (f: number) => clamp01((f - 862) / 28);
/** window daylight in the church (1 day .. 0 night): time-lapses over "639 years" (cathedral), "2,527 days",
 *  "six hundred years" and "seventeen months" */
export const windowLight = (id: number, f: number) => {
  const cyc = (a: number, b: number, n: number) => (f >= a && f < b ? 0.5 + 0.5 * Math.cos(((f - a) / (b - a)) * n * Math.PI * 2) : 1);
  if (id === 6) return cyc(560, 640, 6);
  if (id === 11) return cyc(1170, 1250, 7);
  if (id === 15) return cyc(1640, 1700, 5);
  if (id === 17) return cyc(1928, 1976, 4);
  return 1;
};
/** calendar page flips in the same time-lapses */
export const calendarAt = (id: number, f: number) => {
  if (id === 11) return Math.floor(clamp01((f - 1170) / 80) * 14);
  if (id === 17) return Math.floor(clamp01((f - 1928) / 48) * 8);
  return 0;
};
/** studio wall clock minutes: one hour sweeps in shot 4 */
export const clockMin = (id: number, f: number) => (id === 4 ? 60 * smooth((f - 326) / 44) : 22);
/** the visitor's hair over "six hundred years": dark -> grey -> white */
export const visitorAge = (f: number) => (f < 1655 ? 0 : f < 1675 ? 1 : 2);
/** monks on the bellows: phase 0..1 (each tread 0.9 s) */
export const bellowsAt = (f: number, k: number) => 0.5 + 0.5 * Math.sin((f / FPS) * Math.PI * 2 / 0.9 + k * Math.PI);
/** the long score unrolled through the town (shot 14): length in metres */
export const ribbonAt = (f: number) => 40 + 900 * smooth((f - 1470) / 70);
export const popAt = (f: number, f0: number) => clamp01((f - f0) / 6);
export const T = (x: number, y: number, z: number) => add(TOWN, [x, y, z]);
export const Ch = (x: number, y: number, z: number) => add(CH, [x, y, z]);
export const O = (x: number, y: number, z: number) => add(ORG, [x, y, z]);
export const Ca = (x: number, y: number, z: number) => add(CA, [x, y, z]);
export const Su = (x: number, y: number, z: number) => add(STU, [x, y, z]);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
export const CAGE_EYE = add(DESK, [0, 1.42, 0.55]);
export const VIS_EYE = add(VISITOR, [0, 1.4, 0.14]);

// framings; each pushes in from the frame its key starts
const S1a = (f: number) => zoom(T(-13, 2.2, 22), T(0, 7, -26), 46, pushK(f, 0, 0.0018, 0.004, 30), { roll: -0.03 });          // the town and its church
const S2a = (f: number) => dolly(O(0.75, 1.75, 2.6), O(0, 1.55, 0), pushK(f, 56, 0.003, 0.006, 24), { fov: 40, roll: 0.03 });  // "an organ": the pipes sing
const S2b = (f: number) => dolly(Ch(-2.8, 2.4, 3.8), O(-0.3, 1.4, 0), pushK(f, 120, 0.0016), { fov: 44 });                      // the whole church: until 2640
const S3a = (f: number) => dolly(add(DESK, [0.6, 1.5, 2.6]), add(CAGE_EYE, [0, -0.2, 0]), pushK(f, 180, 0.0022), { fov: 40 });  // Cage at his desk
const S3b = (f: number) => dolly(add(DESK, [0.25, 1.55, 1.85]), add(CAGE_EYE, [0, -0.05, 0]), pushK(f, 270, 0.003, 0.007, 24), { fov: 40, roll: -0.035 }); // never said how slow
const S4a = (f: number) => dolly(Su(-0.6, 1.7, 3.0), Su(1.1, 1.5, -1.6), pushK(f, 320, 0.0024), { fov: 44 });                 // piano + the clock: an hour
const S5a = (f: number) => dolly(T(3.2, 1.7, -12), T(0, 1.4, -18), pushK(f, 384, 0.0024, 0.006, 24), { fov: 42 });             // the council on the square
const S6a = (f: number) => dolly(Ca(-4.6, 2.2, 5.4), Ca(-1.3, 3.4, -5), pushK(f, 456, 0.0018), { fov: 46 });                       // 1361: the great organ
const S6b = (f: number) => dolly(Ca(-2.2, 1.5, -1.6), Ca(-2.7, 1.2, -4.5), pushK(f, 512, 0.0026, 0.006, 24), { fov: 42, roll: 0.03 }); // monks on the bellows
const S6c = (f: number) => zoom(Ca(2.6, 1.8, 6), Ca(0, 4, -5.5), 48, pushK(f, 556, 0.0018));                                    // 639 years go by
const S7a = (f: number) => dolly(T(-2.6, 1.6, -13), T(0, 1.4, -18), pushK(f, 646, 0.0026, 0.007, 24), { fov: 40, roll: -0.03 }); // that's how long
const S8a = (f: number) => zoom(T(9, 1.6, -6), T(0, 6, -30), 48, pushK(f, 710, 0.0018));                                       // the old church
const S8b = (f: number) => dolly(Ch(-1.6, 1.7, 1.8), Ch(0.6, 0.9, -4.0), pushK(f, 798, 0.0024, 0.007, 24), { fov: 44 });          // a barn ... a pigsty
const S9a = (f: number) => dolly(O(-1.0, 1.6, 3.4), O(-0.2, 1.1, 0), pushK(f, 856, 0.0022), { fov: 44 });                       // the tiny organ, the blower
const S9b = (f: number) => dolly(O(0.25, 1.32, 1.05), O(0.05, KEY_Y + 0.05, 0.3), pushK(f, 958, 0.003, 0.007, 24), { fov: 40, roll: 0.035 }); // weights on the keys
const S10a = (f: number) => dolly(O(-1.9, 1.45, 3.1), O(-1.9, 1.3, 1.6), pushK(f, 1012, 0.0028), { fov: 40 });                  // blowing across a bottle
const S10b = (f: number) => dolly(O(0.2, 2.0, 1.25), O(-0.08, 2.05, 0), pushK(f, 1078, 0.003, 0.006, 24), { fov: 40, roll: -0.03 }); // air flows, never stops
const S11a = (f: number) => dolly(Ch(-3.6, 2.2, 4.8), O(-0.6, 1.3, 0), pushK(f, 1144, 0.0016), { fov: 44 });                    // 2,527 days time-lapse
const S11b = (f: number) => dolly(O(1.9, 1.8, 2.9), O(0.4, 1.7, -0.2), pushK(f, 1236, 0.003, 0.007, 24), { fov: 42, roll: 0.03 }); // "days"
const S12a = (f: number) => dolly(Ch(1.6, 2.3, -6.6), Ch(-0.2, 1.4, 6), pushK(f, 1265, 0.0022, 0.006, 24), { fov: 46 });          // the doors open: the crowd pours in
const S13a = (f: number) => dolly(Ch(-3.2, 2.0, 2.4), O(-0.4, 1.3, 0), pushK(f, 1328, 0.0018), { fov: 46 });                    // packed
const S13b = (f: number) => dolly(O(0.6, 1.9, 1.7), O(0.3, 1.75, 0), pushK(f, 1424, 0.003, 0.007, 24), { fov: 40, roll: -0.035 }); // the eighth pipe
const S14a = (f: number) => zoom(T(-16, 40, -66), T(0, 0, 34), 46, pushK(f, 1466, 0.0012));                                      // the long score: 4 %
const S14b = (f: number) => dolly(T(4.6, 1.3, 19.5), T(0.7, 0.75, 14), pushK(f, 1524, 0.003, 0.006, 24), { fov: 40, roll: 0.03 });  // the little flag at 4 %
const S15a = (f: number) => dolly(add(VISITOR, [0.4, 1.45, 2.1]), add(VIS_EYE, [0, -0.08, 0]), pushK(f, 1563, 0.0024), { fov: 40 }); // luckily
const S15b = (f: number) => dolly(add(VISITOR, [-1.6, 1.7, 3.6]), add(VISITOR, [0.6, 1.1, -1.6]), pushK(f, 1613, 0.0018, 0.005, 24), { fov: 44 }); // unluckily: he ages
const S16a = (f: number) => dolly(add(DESK, [0.08, 1.35, 0.55]), add(DESK, [0, 0.78, 0.1]), pushK(f, 1710, 0.0026, 0.008, 24), { fov: 38, roll: -0.03 }); // the score's first mark: a rest
const S17a = (f: number) => dolly(Ch(2.6, 1.8, 4.6), O(-0.6, 1.2, 0), pushK(f, 1791, 0.0018), { fov: 44 });                     // 2001: everyone waits
const S17b = (f: number) => dolly(add(SEATS[8], [0.3, 1.45, 1.9]), add(SEATS[8], [-0.35, 1.25, 0.1]), pushK(f, 1904, 0.0024, 0.006, 24), { fov: 42, roll: 0.03 }); // nothing
const S17c = (f: number) => dolly(Ch(-2.6, 2.0, 4.8), O(-0.5, 1.2, 0), pushK(f, 1926, 0.0016, 0.006, 20), { fov: 44 });           // 17 months... the first note

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 56, s: S2a }, { f: 120, dur: 40, s: S2b }],
  3: [{ f: 180, s: S3a }, { f: 270, cut: true, s: S3b }],
  4: [{ f: 320, s: S4a }],
  5: [{ f: 384, s: S5a }],
  6: [{ f: 456, s: S6a }, { f: 512, cut: true, s: S6b }, { f: 556, cut: true, s: S6c }],
  7: [{ f: 646, s: S7a }],
  8: [{ f: 710, s: S8a }, { f: 798, cut: true, s: S8b }],
  9: [{ f: 856, s: S9a }, { f: 958, cut: true, s: S9b }],
  10: [{ f: 1012, s: S10a }, { f: 1078, cut: true, s: S10b }],
  11: [{ f: 1144, s: S11a }, { f: 1236, cut: true, s: S11b }],
  12: [{ f: 1265, s: S12a }],
  13: [{ f: 1328, s: S13a }, { f: 1424, cut: true, s: S13b }],
  14: [{ f: 1466, s: S14a }, { f: 1524, cut: true, s: S14b }],
  15: [{ f: 1563, s: S15a }, { f: 1613, cut: true, s: S15b }],
  16: [{ f: 1710, s: S16a }],
  17: [{ f: 1791, s: S17a }, { f: 1904, cut: true, s: S17b }, { f: 1926, cut: true, s: S17c }],
};

/** impact kicks (flip sign every frame, decay over 7 f): "slow", "literally", "last", "pigsty", "weights",
 *  "days", "eight", "rest", and the first note */
const KICKS: [number, number][] = [[296 / FPS, 0.4], [433 / FPS, 0.45], [687 / FPS, 0.4], [832 / FPS, 0.55], [992 / FPS, 0.5],
  [1244 / FPS, 0.45], [1454 / FPS, 0.5], [1773 / FPS, 0.55], [FIRST_NOTE / FPS, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                    // town wide
  { f: 56, cInf: 14 },                                  // the pipes (focus = look)
  { f: 120, cInf: 6, dur: 40 },                         // the church
  { f: 180, cInf: 10, focus: () => CAGE_EYE },
  { f: 270, cInf: 13, focus: () => CAGE_EYE },
  { f: 320, cInf: 7 },
  { f: 384, cInf: 9 },
  { f: 456, cInf: 4 },
  { f: 512, cInf: 11 },
  { f: 556, cInf: 0 },
  { f: 646, cInf: 10 },
  { f: 710, cInf: 0 },
  { f: 798, cInf: 7 },
  { f: 856, cInf: 7 },
  { f: 958, cInf: 15 },
  { f: 1012, cInf: 13 },
  { f: 1078, cInf: 14 },
  { f: 1144, cInf: 5 },
  { f: 1236, cInf: 11 },
  { f: 1265, cInf: 5 },
  { f: 1328, cInf: 6 },
  { f: 1424, cInf: 13 },
  { f: 1466, cInf: 0 },
  { f: 1524, cInf: 12 },
  { f: 1563, cInf: 13, focus: () => VIS_EYE },
  { f: 1613, cInf: 8, focus: () => VIS_EYE },
  { f: 1710, cInf: 15 },
  { f: 1791, cInf: 5 },
  { f: 1904, cInf: 12, focus: () => add(SEATS[8], [0, 1.4, 0.14]) },
  { f: 1926, cInf: 5 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
