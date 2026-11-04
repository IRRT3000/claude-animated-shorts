// Timeline of "The Drop Nobody Has Ever Seen" (the Queensland pitch drop): shots timed to the voice
// (projects/pitch-drop/voice/words.json; frame numbers below = word onsets at 30 fps), the apparatus state
// (pitch in the funnel, the hanging drop, the pile in the beaker, the bell jar), and the camera grammar of the
// bridge short: hard cuts on big reframes, smootherstep glides of 18-40 f, every hold creeps in, flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 2010; // voice ends 1951 ("jar." 1937) + the last plip + a button
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
// A sandstone university quad under a subtropical sky (the hook), the physics lab with the experiment, and a small
// prize stage. Each set is far from the others (walls hide one from the other).
export const CAMPUS: V3 = [0, 0, 0];            // quad: building front at z = -20
export const LAB: V3 = [0, 0, -400];            // lab floor centre; back wall z = -4, door in the right wall
export const APP: V3 = add(LAB, [0, 0, -2.6]);  // foot of the cabinet the experiment stands on
export const CAB_H = 0.9;                       // cabinet top
export const TIP_Y = 1.3;                       // funnel stem tip (above the floor)
export const BEAKER_Y = 0.95;                   // beaker inner bottom
export const CHAIR: V3 = add(APP, [0.95, 0, 0.6]);
export const BENCH: V3 = add(LAB, [-3.0, 0, -0.2]);   // Parnell's workbench (top at 0.9), he stands behind it
export const PARNELL: V3 = add(BENCH, [0, 0, -0.62]);
export const BLOCK: V3 = add(BENCH, [0.25, 0.9, 0.05]); // the lump of pitch on the bench
export const DOOR: V3 = add(LAB, [3.05, 0, -3.95]); // in the back wall, between the right window and the bookcase
export const TRIPOD: V3 = add(APP, [-0.85, 0, 1.05]);   // the 2000 camera
export const WATER: V3 = add(APP, [-0.62, CAB_H, 0.12]); // the water funnel of the explainer (outside the bell jar)
export const HONEY: V3 = add(APP, [0.62, CAB_H, 0.22]);  // the honey jar
export const STAGE: V3 = [0, 0, -800];          // prize stage: platform top at 0.8
export const STAGE_H = 0.8;

// ---------------- shots ----------------
export type Light = "day" | "lab" | "night" | "stage" | "dusk";
export type Place = "campus" | "lab" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; crowd: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 160, light: "day", place: "campus", crowd: 1 },   // hook: the quad -> the drop, "nobody"
  { id: 2, a: 160, b: 296, light: "lab", place: "lab", crowd: 0 },    // Parnell: solid could secretly be a liquid
  { id: 3, a: 296, b: 423, light: "lab", place: "lab", crowd: 0 },    // the hammer: it shatters like glass
  { id: 4, a: 423, b: 534, light: "lab", place: "lab", crowd: 0 },    // melted into the funnel, three years
  { id: 5, a: 534, b: 610, light: "lab", place: "lab", crowd: 0 },    // cut the bottom open. And waited.
  { id: 6, a: 610, b: 676, light: "lab", place: "lab", crowd: 0 },    // eight years later, one drop fell
  { id: 7, a: 676, b: 772, light: "lab", place: "lab", crowd: 0 },    // nine years later another; one a decade
  { id: 8, a: 772, b: 938, light: "lab", place: "lab", crowd: 0 },    // luckily: John Mainstone, 52 years
  { id: 9, a: 938, b: 1013, light: "lab", place: "lab", crowd: 0 },   // unluckily: he never saw a drop fall
  { id: 10, a: 1013, b: 1065, light: "lab", place: "lab", crowd: 0 }, // missed it by a day
  { id: 11, a: 1065, b: 1166, light: "lab", place: "lab", crowd: 0 }, // stepped out for a drink: five minutes
  { id: 12, a: 1166, b: 1314, light: "night", place: "lab", crowd: 0 },// the camera and the power cut
  { id: 13, a: 1314, b: 1467, light: "lab", place: "lab", crowd: 0 }, // pitch is a liquid: 200 billion x water
  { id: 14, a: 1467, b: 1550, light: "lab", place: "lab", crowd: 0 }, // cold honey, a few decades
  { id: 15, a: 1550, b: 1637, light: "stage", place: "stage", crowd: 1 }, // the Ig Nobel Prize
  { id: 16, a: 1637, b: 1745, light: "dusk", place: "lab", crowd: 0 },// 2013: the empty chair, still waiting
  { id: 17, a: 1745, b: TOTAL, light: "lab", place: "lab", crowd: 0 },// twist: touched the pile, bumped the jar
];
/** crossfades (frames) at time / place changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 12: 8, 13: 8, 15: 8, 16: 14, 17: 8 };
export const FLASH_AT = 160;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the experiment ----------------
/** frames a drop lets go and falls (6 f fall): "fell" 650, "another" 702, "decade" 745, the missed day 1026,
 *  the drink 1110, the power cut 1249. The ninth only separates when the jar is bumped (1930). */
export const FALLS = [646, 698, 741, 1024, 1108, 1247];
export const FALL_F = 6;
export const BUMP = 1928;          // "bumped": the base wobbles
export const SEPARATE = 1931;      // the ninth drop breaks off
export const TOUCH = 1842;         // "touched": the long ninth drop reaches the pile
export const STEM_CUT = 541;       // "cut"
export const POUR = [430, 470] as const; // the hot pitch runs into the funnel
/** pitch present in the funnel (0..1 fill) */
export const fillAt = (f: number) => (f < 160 ? 1 : f < POUR[0] ? 0 : f < POUR[1] ? smooth((f - POUR[0]) / (POUR[1] - POUR[0])) : 1);
/** the glass bell jar covers the experiment (from the 1930s on; lifted in the twist) */
export const jarOn = (f: number) => f < 160 || f >= 600;
export const jarLift = (f: number) => 0.32 * smooth((f - 1884) / 38) * (f >= 1745 ? 1 : 0);
/** drops in the beaker. Time jumps between shots 7 and 10 add the drops nobody was there for. */
export const pileAt = (f: number) => {
  if (f < 160) return 8;
  let n = FALLS.filter((x) => f >= x + FALL_F).length;
  if (f >= 772) n += 2;     // the 1950s-60s drops before Mainstone took over
  if (f >= SEPARATE) n += 1;
  return n;
};
/** height of the pile top above the floor */
export const pileTop = (n: number) => BEAKER_Y + (n ? 0.03 + 0.011 * n : 0);
/** length of the hanging drop below the stem tip (m) and the falling drop's drop-distance (null = none) */
export const dropAt = (f: number): { len: number; fall: number | null } => {
  if (f < 160) return { len: 0.17, fall: null };
  if (f < STEM_CUT) return { len: 0, fall: null };
  const reach = TIP_Y - pileTop(8) - 0.004; // the ninth drop: tip to pile
  if (f >= 1745) {
    if (f >= SEPARATE) return { len: 0.012, fall: null };
    return { len: lin([[1745, 0.16], [TOUCH, reach]], f), fall: null };
  }
  let prev = STEM_CUT;
  for (const x of FALLS) {
    if (f < x) return { len: 0.02 + 0.14 * smooth((f - prev) / Math.max(1, x - prev)) ** 0.7, fall: null };
    if (f < x + FALL_F) { const u = (f - x) / FALL_F; return { len: 0.03, fall: u * u * 0.18 }; }
    prev = x + FALL_F;
  }
  return { len: lin([[1253, 0.03], [1745, 0.15]], f), fall: null };
};
/** the base wobbles after the bump (rad about z) */
export const wobbleAt = (f: number) => { const u = f - BUMP; return u < 0 || u > 40 ? 0 : 0.05 * Math.exp(-u / 9) * Math.sin(u * 0.95); };
/** window daylight in the lab (1 day .. 0 night): time-lapse cycles over "three years", "eight years", "a decade",
 *  the missed day, and "a few decades" */
export const windowLight = (id: number, f: number) => {
  const cyc = (a: number, b: number, n: number) => (f >= a && f < b ? 0.5 + 0.5 * Math.cos(((f - a) / (b - a)) * n * Math.PI * 2) : 1);
  if (id === 4) return cyc(476, 528, 3);
  if (id === 6) return cyc(612, 640, 3);
  if (id === 7) return cyc(721, 768, 4);
  if (id === 10) return cyc(1014, 1036, 1);
  if (id === 14) return cyc(1504, 1546, 5);
  return 1;
};
/** calendar page flips in the same time-lapses (page index increases) */
export const calendarAt = (id: number, f: number) => {
  if (id === 4) return Math.floor(clamp01((f - 476) / 52) * 6);
  if (id === 6) return 6 + Math.floor(clamp01((f - 612) / 28) * 8);
  if (id === 7) return 14 + Math.floor(clamp01((f - 721) / 47) * 10);
  if (id === 10) return 30 + Math.floor(clamp01((f - 1014) / 22) * 1);
  if (id === 14) return 40 + Math.floor(clamp01((f - 1504) / 42) * 10);
  return id < 4 ? 0 : id < 8 ? 24 : 30;
};
/** wall clock minutes (shot 11: five minutes sweep while he is out) */
export const clockMin = (f: number) => (f < 1065 ? 10 + f / 180 : f < 1166 ? 20 + 5 * smooth((f - 1092) / 30) : 40 + f / 180);
/** the lab lights die on "the drop" (1238); lightning flashes outside */
export const POWER_OFF = 1236;
export const lightningAt = (f: number) => { for (const x of [1180, 1247, 1294]) { const u = f - x; if (u >= 0 && u < 6) return [1, 0.3, 0.8, 0.2, 0.5, 0.1][u]; } return 0; };
/** Mainstone's hair over "fifty-two years": dark -> grey -> white */
export const hairAge = (f: number) => (f < 899 ? 0 : f < 909 ? 1 : 2);
/** the hammer strike in shot 3 (0 raised .. 1 struck), on "shatters" (363) */
export const hammerAt = (f: number) => (f < 346 ? 0 : f < 361 ? 0.25 * smooth((f - 346) / 15) : f < 363 ? 0.25 + 0.75 * ((f - 361) / 2) : 1);
export const SHATTER = 363;
export const popAt = (f: number, f0: number) => clamp01((f - f0) / 6);

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
export const A = (x: number, y: number, z: number) => add(APP, [x, y, z]);
export const Lb = (x: number, y: number, z: number) => add(LAB, [x, y, z]);
const P = (x: number, y: number, z: number) => add(PARNELL, [x, y, z]);
const C = (x: number, y: number, z: number) => add(CHAIR, [x, y, z]);
const St = (x: number, y: number, z: number) => add(STAGE, [x, y, z]);
export const PARNELL_EYE = P(0, 1.78, 0);
export const SIT_EYE = C(0, 1.4, 0);

// framings; each pushes in from the frame its key starts
const S1a = (f: number) => zoom([-16, 3.2, 24], [1, 7.5, -20], 46, pushK(f, 0, 0.0016, 0.004, 30), { roll: -0.03 });   // the quad
const S1b = (f: number) => dolly(A(0.65, 1.55, 1.9), A(0, 1.36, 0), pushK(f, 80, 0.003, 0.006, 24), { fov: 38 });       // "experiment": the bell jar
const S1c = (f: number) => dolly(A(0.14, 1.24, 0.62), A(0, 1.2, 0), pushK(f, 104, 0.004), { fov: 36, roll: 0.04 });     // "nobody": the drop
const S2a = (f: number) => dolly(P(1.0, 1.65, 3.2), P(0.1, 1.35, 0), pushK(f, 160, 0.0022), { fov: 40 });                // Parnell at his bench
const S2b = (f: number) => dolly(P(0.35, 1.8, 1.55), add(PARNELL_EYE, [0.05, -0.12, 0]), pushK(f, 242, 0.003, 0.006, 24), { fov: 40, roll: -0.035 }); // "secretly"
const S2c = (f: number) => zoom(P(1.5, 1.6, 4.4), P(0.15, 1.3, 0), 40, pushK(f, 264, 0.003, 0.007, 30));                  // "liquid"
const S3a = (f: number) => dolly(P(-0.9, 1.7, 2.9), P(0.1, 1.25, 0.4), pushK(f, 296, 0.0024), { fov: 40 });               // pitch + hammer
const S3b = (f: number) => dolly(add(BLOCK, [0.55, 0.3, 1.5]), add(BLOCK, [-0.12, 0.42, 0]), pushK(f, 359, 0.003, 0.008, 24), { fov: 40, roll: 0.04 }); // shatters
const S4a = (f: number) => dolly(A(0.55, 1.8, 1.1), A(0, 1.52, 0), pushK(f, 423, 0.0028), { fov: 40 });                  // pouring into the funnel
const S4b = (f: number) => dolly(Lb(3.6, 2.2, 4.6), A(-0.4, 1.5, 0), pushK(f, 474, 0.0016), { fov: 44 });                // three years: the lab time-lapse
const S5a = (f: number) => dolly(A(0.28, 1.32, 0.68), A(0, 1.32, 0), pushK(f, 534, 0.003, 0.007, 22), { fov: 38 });       // cut the bottom open
const S5b = (f: number) => dolly(A(2.7, 1.45, 3.4), A(0.55, 1.15, 0.2), pushK(f, 572, 0.0022), { fov: 40, roll: 0.03 });  // and waited
const S6a = (f: number) => dolly(A(0.5, 1.7, 3.1), A(-0.4, 1.7, -0.9), pushK(f, 610, 0.0022), { fov: 42 });               // calendar, empty chair
const S6b = (f: number) => dolly(A(0.3, 1.14, 0.8), A(0, 1.12, 0), pushK(f, 638, 0.003, 0.007, 24), { fov: 38 });         // the first drop falls
const S7a = (f: number) => dolly(A(-0.32, 1.16, 0.82), A(0, 1.12, 0), pushK(f, 676, 0.0028), { fov: 38, roll: -0.03 });   // another
const S7b = (f: number) => dolly(Lb(-3.3, 2.0, 4.3), A(0.1, 1.45, 0), pushK(f, 719, 0.0018), { fov: 44 });                // one a decade
const S8a = (f: number) => dolly(Lb(-1.4, 1.7, 3.6), Lb(1.9, 1.25, -2.6), pushK(f, 772, 0.0018), { fov: 46 });             // Mainstone comes in
const S8b = (f: number) => dolly(C(0.6, 1.47, 2.0), add(SIT_EYE, [0, -0.05, 0]), pushK(f, 838, 0.0028, 0.006, 24), { fov: 40, roll: 0.03 }); // "John Mainstone"
const S8c = (f: number) => dolly(A(1.6, 1.4, 2.3), A(0.5, 1.2, 0.1), pushK(f, 895, 0.0024), { fov: 42 });                 // fifty-two years
const S9a = (f: number) => dolly(C(0.22, 1.42, 1.6), add(SIT_EYE, [0, 0.0, 0]), pushK(f, 938, 0.003), { fov: 36, roll: -0.03 }); // his eyes
const S9b = (f: number) => dolly(A(0.16, 1.25, 0.62), A(0, 1.2, 0), pushK(f, 968, 0.0026), { fov: 36 });                  // the drop that doesn't
const S10a = (f: number) => dolly(A(-1.6, 1.5, 4.9), A(0.8, 1.25, 0.8), pushK(f, 1013, 0.002), { fov: 44 });            // empty chair, a day
const S11a = (f: number) => dolly(Lb(-1.6, 1.75, 3.4), Lb(1.9, 1.25, -2.7), pushK(f, 1065, 0.0018), { fov: 46 });           // he steps out
const S11b = (f: number) => dolly(A(0.3, 1.14, 0.8), A(0, 1.12, 0), pushK(f, 1102, 0.003), { fov: 38 });                  // the drop falls
const S11c = (f: number) => dolly(A(-1.4, 1.5, 4.6), A(0.85, 1.25, 0.75), pushK(f, 1115, 0.0024, 0.006, 24), { fov: 42, roll: 0.035 }); // five minutes
const S12a = (f: number) => dolly(Lb(-2.2, 1.6, 3.8), A(0.25, 1.25, 0.7), pushK(f, 1166, 0.0018), { fov: 42 });           // night, the camera
const S12b = (f: number) => dolly(A(0.7, 1.4, 2.2), A(-0.15, 1.22, 0.3), pushK(f, 1232, 0.0026, 0.006, 24), { fov: 40 });  // lights out, drop falls
const S12c = (f: number) => dolly(A(-0.08, 1.44, 0.55), add(TRIPOD, [0, 1.34, 0]), pushK(f, 1286, 0.003, 0.008, 22), { fov: 38, roll: -0.04 }); // dead camera
const S13a = (f: number) => dolly(A(-0.31, 1.42, 2.0), A(-0.31, 1.25, 0.06), pushK(f, 1314, 0.0022), { fov: 40 });            // water vs pitch
const S13b = (f: number) => dolly(A(-0.8, 1.34, 0.95), A(-0.62, 1.22, 0.12), pushK(f, 1383, 0.003, 0.006, 26), { fov: 40, roll: 0.03 }); // 200 billion
const S14a = (f: number) => dolly(add(HONEY, [0.22, 0.36, 1.05]), add(HONEY, [0, 0.27, 0]), pushK(f, 1467, 0.003), { fov: 38 });  // cold honey
const S14b = (f: number) => dolly(A(1.7, 1.6, 2.7), A(0.3, 1.3, 0), pushK(f, 1502, 0.002), { fov: 42 });                  // a few decades
const S15a = (f: number) => dolly(St(1.7, 2.0, 5.2), St(0, 1.9, 0), pushK(f, 1546, 0.0022), { fov: 42 });                 // the prize stage
const S15b = (f: number) => dolly(St(0.45, 2.55, 1.9), St(0, 2.45, 0), pushK(f, 1608, 0.003, 0.007, 24), { fov: 40, roll: 0.035 }); // "Prize"
const S16a = (f: number) => dolly(C(1.5, 1.25, 2.5), C(-0.35, 0.95, -0.2), pushK(f, 1630, 0.0014), { fov: 42 });          // the empty chair
const S16b = (f: number) => dolly(A(0.45, 1.32, 1.65), A(0, 1.22, 0), pushK(f, 1712, 0.0016), { fov: 38 });               // still waiting
const S17a = (f: number) => dolly(A(0.3, 1.16, 0.74), A(0, 1.13, 0), pushK(f, 1741, 0.0022, 0.005, 30), { fov: 38 });     // the ninth drop touches
const S17b = (f: number) => dolly(A(0.05, 1.5, 2.5), A(0, 1.42, 0), pushK(f, 1880, 0.0022, 0.005, 24), { fov: 44 });      // the jar is lifted, bump
const S17c = (f: number) => dolly(A(-0.26, 1.16, 0.7), A(0, 1.12, 0), pushK(f, 1940, 0.0016), { fov: 38, roll: 0.03 });  // it broke off

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 80, cut: true, s: S1b }, { f: 104, cut: true, s: S1c }],
  2: [{ f: 160, s: S2a }, { f: 242, cut: true, s: S2b }, { f: 264, cut: true, s: S2c }],
  3: [{ f: 296, s: S3a }, { f: 359, cut: true, s: S3b }],
  4: [{ f: 423, s: S4a }, { f: 474, cut: true, s: S4b }],
  5: [{ f: 534, s: S5a }, { f: 572, cut: true, s: S5b }],
  6: [{ f: 610, s: S6a }, { f: 638, cut: true, s: S6b }],
  7: [{ f: 676, s: S7a }, { f: 719, cut: true, s: S7b }],
  8: [{ f: 772, s: S8a }, { f: 838, cut: true, s: S8b }, { f: 895, cut: true, s: S8c }],
  9: [{ f: 938, s: S9a }, { f: 968, cut: true, s: S9b }],
  10: [{ f: 1013, s: S10a }],
  11: [{ f: 1065, s: S11a }, { f: 1102, cut: true, s: S11b }, { f: 1115, cut: true, s: S11c }],
  12: [{ f: 1162, s: S12a }, { f: 1232, cut: true, s: S12b }, { f: 1286, cut: true, s: S12c }],
  13: [{ f: 1310, s: S13a }, { f: 1383, dur: 30, s: S13b }],
  14: [{ f: 1467, s: S14a }, { f: 1502, cut: true, s: S14b }],
  15: [{ f: 1546, s: S15a }, { f: 1608, cut: true, s: S15b }],
  16: [{ f: 1630, s: S16a }, { f: 1712, dur: 30, s: S16b }],
  17: [{ f: 1741, s: S17a }, { f: 1880, cut: true, s: S17b }, { f: 1940, cut: true, s: S17c }],
};

/** impact kicks (flip sign every frame, decay over 7 f): "liquid", "shatters", the first drop, the missed day,
 *  "five minutes", the power "cut", "Prize", and the bump */
const KICKS: [number, number][] = [[267 / FPS, 0.45], [363 / FPS, 0.6], [652 / FPS, 0.4], [1042 / FPS, 0.4],
  [1133 / FPS, 0.45], [1296 / FPS, 0.55], [1612 / FPS, 0.5], [BUMP / FPS, 0.6]];
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
  { f: 0, cInf: 0 },                                    // quad wide
  { f: 80, cInf: 12 },                                  // bell jar (focus = look)
  { f: 104, cInf: 15 },                                 // the drop
  { f: 160, cInf: 10, focus: () => PARNELL_EYE },
  { f: 242, cInf: 13, focus: () => PARNELL_EYE },
  { f: 264, cInf: 8, focus: () => PARNELL_EYE },
  { f: 296, cInf: 10, focus: () => add(BLOCK, [0, 0.1, 0]) },
  { f: 359, cInf: 14 },
  { f: 423, cInf: 13 },
  { f: 474, cInf: 5 },                                  // lab wide
  { f: 534, cInf: 15 },
  { f: 572, cInf: 10, focus: () => SIT_EYE },
  { f: 610, cInf: 8 },
  { f: 638, cInf: 15 },
  { f: 719, cInf: 5 },
  { f: 772, cInf: 6 },
  { f: 838, cInf: 13, focus: () => SIT_EYE },
  { f: 895, cInf: 10, focus: () => SIT_EYE },
  { f: 938, cInf: 15, focus: () => SIT_EYE },
  { f: 968, cInf: 15 },
  { f: 1013, cInf: 7, focus: () => add(DOOR, [-0.6, 1.6, 1.0]) },
  { f: 1065, cInf: 5 },
  { f: 1102, cInf: 15 },
  { f: 1115, cInf: 7, focus: () => add(DOOR, [-0.55, 1.6, 1.0]) },
  { f: 1162, cInf: 6 },
  { f: 1232, cInf: 11 },
  { f: 1286, cInf: 14 },
  { f: 1310, cInf: 11 },
  { f: 1467, cInf: 14 },
  { f: 1502, cInf: 8 },
  { f: 1546, cInf: 8, focus: () => St(0, 2.4, 0) },
  { f: 1608, cInf: 13, focus: () => St(0, 2.45, 0) },
  { f: 1630, cInf: 9, focus: () => C(0, 0.9, 0) },
  { f: 1712, cInf: 13 },
  { f: 1741, cInf: 15 },
  { f: 1880, cInf: 8 },
  { f: 1940, cInf: 15 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
