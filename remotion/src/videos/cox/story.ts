// Timeline of "The Clock Nobody Had to Wind" (Cox's timepiece): shots timed to the voice
// (projects/cox-clock/voice/words.json; frame numbers below = word onsets at 30 fps), the clock's state
// (ticking / stopped, mercury level), and the camera grammar of the bridge short: hard cuts on big reframes,
// smootherstep glides of 18-40 f, every hold creeps in, flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 1940; // voice ends 1901 ("off." 1892) + tail
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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
// 1760s London street (Spring Gardens) running along x; Cox's Mechanical Museum on its north side (z < 0).
// The museum interior is a separate set far away (fog/walls hide one from the other), as is the modern V&A gallery.
export const STREET_Z = 0;                     // centre line of the street
export const MUSEUM_DOOR: V3 = [0, 0, -6];     // door of Cox's museum in the street facade
export const HALL: V3 = [0, 0, -400];          // museum hall interior: origin = foot of the clock case
export const CASE = { w: 1.3, d: 0.7, h: 2.6 }; // the glass-fronted clock case (m)
export const DIAL: V3 = add(HALL, [0, 2.05, CASE.d / 2]);     // dial centre, front face
export const JARS: V3 = add(HALL, [0, 0.75, 0.05]);           // the two mercury jars inside the case
export const COX: V3 = add(HALL, [1.35, 0, 0.9]);             // Cox stands beside his clock
export const VISITORS: V3[] = [[-1.6, 0, 3.0], [-0.5, 0, 3.4], [0.6, 0, 3.2], [1.7, 0, 3.6], [-1.1, 0, 4.5], [0.2, 0, 4.7]]
  .map((p) => add(HALL, p as V3));
export const LOTTERY: V3 = add(HALL, [-3.2, 0, 1.2]);         // the prize-lottery wheel
export const CHEST: V3 = add(HALL, [-2.4, 0, 3.0]);           // the breathing-visitor explainer (shot 12)
export const VA: V3 = [0, 0, -900];             // V&A gallery today: origin = foot of the clock on its plinth
export const SKY_EYE: V3 = [0, 60, 40];         // over the London rooftops, looking at the clouds

// ---------------- shots ----------------
export type Light = "day" | "golden" | "hall" | "gallery";
export type Place = "street" | "hall" | "sky" | "gallery";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; crowd: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 160, light: "day", place: "street", crowd: 1 },     // hook: London street -> push to the clock
  { id: 2, a: 160, b: 300, light: "hall", place: "hall", crowd: 0 },    // James Cox presents The Perpetual Motion
  { id: 3, a: 300, b: 400, light: "day", place: "street", crowd: 1 },   // people pay at the door, walk in, stare
  { id: 4, a: 400, b: 528, light: "hall", place: "hall", crowd: 1 },    // no key / no crank / no weights / ticking
  { id: 5, a: 528, b: 624, light: "hall", place: "hall", crowd: 1 },    // day / week / month (window light cycles)
  { id: 6, a: 624, b: 712, light: "hall", place: "hall", crowd: 1 },    // magic? servant? cat?
  { id: 7, a: 712, b: 848, light: "hall", place: "hall", crowd: 1 },    // Cox smiles; the lottery wheel
  { id: 8, a: 848, b: 922, light: "hall", place: "hall", crowd: 1 },    // luckily: never needed winding
  { id: 9, a: 922, b: 975, light: "day", place: "sky", crowd: 0 },      // unluckily: it needed weather
  { id: 10, a: 975, b: 1125, light: "hall", place: "hall", crowd: 0 },  // inside the case: barometer, 70 kg mercury
  { id: 11, a: 1125, b: 1320, light: "hall", place: "hall", crowd: 0 }, // pressure changes: rose / fell / wound
  { id: 12, a: 1320, b: 1445, light: "hall", place: "hall", crowd: 1 }, // chest analogy: pushes in, pulls out
  { id: 13, a: 1445, b: 1512, light: "golden", place: "sky", crowd: 0 },// breathing the sky (aerial)
  { id: 14, a: 1512, b: 1675, light: "golden", place: "sky", crowd: 0 },// wasn't perpetual; clouds & storm over London
  { id: 15, a: 1675, b: 1838, light: "gallery", place: "gallery", crowd: 1 }, // today, the V&A
  { id: 16, a: 1838, b: TOTAL, light: "gallery", place: "gallery", crowd: 1 }, // twist: they switched it off
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 5: 6, 13: 8, 15: 12 };
export const FLASH_AT = 160;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the clock ----------------
/** ticks per second of the second hand while running; it stops dead on "off." (1892) */
export const STOP = 1890;
export const running = (f: number) => f < STOP;
/** second-hand angle (rad): one step per second, a little overshoot "tick" on each step */
export const secondHand = (f: number) => {
  const g = Math.min(f, STOP), s = Math.floor(g / FPS), u = (g % FPS) / FPS;
  const step = u < 0.12 ? smooth(u / 0.12) * (1 + 0.15 * Math.sin((u / 0.12) * Math.PI)) : 1;
  return -(s + step) * (Math.PI / 30);
};
/** mercury level in the front jar (0..1). Shot 11: rises on "rose" (1205), falls on "fell" (1221),
 *  then the tiny push on "push" (1281) lifts the winding weight. Shot 12 echoes the breath in/out. */
export const mercuryAt = (f: number) => lin([[0, 0.5], [1190, 0.5], [1205, 0.5], [1216, 0.68], [1221, 0.68], [1236, 0.36],
  [1262, 0.4], [1290, 0.55], [1388, 0.55], [1402, 0.66], [1417, 0.66], [1431, 0.46], [1500, 0.5]], f);
/** the winding weight inside the case climbs a notch each time the mercury moves (0..1) */
export const weightAt = (f: number) => lin([[0, 0.4], [1281, 0.4], [1296, 0.55], [1402, 0.55], [1410, 0.62]], f);
/** cloud cover over London in the sky shots (0 clear .. 1 storm); "storm" on 1622 */
export const stormAt = (f: number) => lin([[922, 0.25], [956, 0.6], [1445, 0.35], [1600, 0.45], [1622, 1.0], [1675, 0.9]], f);
/** shot 5: the window light cycles day -> dusk -> day across "Day after day / Week after week / Month after month" */
export const windowLight = (f: number) => lin([[528, 1], [547, 1], [556, 0.3], [571, 0.3], [589, 1], [604, 0.15], [624, 1]], f);
/** shot 6 theory cards pop in on their words: magic 633, servant 652, cat 685 (0..1 pop) */
export const THEORY = { magic: 630, servant: 657, cat: 694 };
export const popAt = (f: number, f0: number) => clamp01((f - f0) / 6);
/** lottery wheel spin (rad) from "prize" (805) to rest by 848 */
export const lotteryAt = (f: number) => 9 * smooth((f - 803) / 45);
/** the guard's switch in shot 16 flips on "switched" (1878) */
export const SWITCH = 1876;

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
const H = (x: number, y: number, z: number) => add(HALL, [x, y, z]);
const G = (x: number, y: number, z: number) => add(VA, [x, y, z]);
const coxEye = add(COX, [0, 1.75, 0]);

// framings; each pushes in from the frame its key starts
const S1a = (f: number) => zoom([-26, 7, 22], [2, 3, -6], 44, pushK(f, 0, 0.0018, 0.005, 30), { roll: -0.03 });       // London street wide
const S1b = (f: number) => dolly(H(0.5, 2.1, 3.6), DIAL, pushK(f, 70, 0.003, 0.006, 30), { fov: 40 });                  // "a London jeweller built a clock" -> the dial
const S1c = (f: number) => dolly(H(0.25, 2.1, 1.4), DIAL, pushK(f, 105, 0.004), { fov: 44, roll: 0.04 });              // "nobody ever had to wind": dial CU
const S2a = (f: number) => dolly(H(2.8, 1.7, 4.4), H(0.9, 1.45, 0.7), pushK(f, 160, 0.0022), { fov: 40 });           // Cox beside the clock
const S2b = (f: number) => dolly(add(COX, [-0.6, 1.7, 2.3]), add(coxEye, [0.1, -0.15, 0]), pushK(f, 232, 0.003, 0.006, 26), { fov: 40, roll: -0.035 }); // "called it, quite modestly"
const S2c = (f: number) => zoom(H(0, 1.4, 6.5), H(0, 1.5, 0), 40, pushK(f, 264, 0.003, 0.007, 30));                  // "The Perpetual Motion" reveal
const S3a = (f: number) => dolly([7, 1.8, 5], add(MUSEUM_DOOR, [0, 1.4, 0]), pushK(f, 300, 0.0022), { fov: 42 });     // queue paying at the door
const S3b = (f: number) => dolly(H(0.6, 1.45, 0.5), H(0, 1.5, 4), pushK(f, 365, 0.003, 0.006, 24), { fov: 44, roll: 0.035 }); // reverse: faces staring
const S4a = (f: number) => dolly(H(0.35, 2.15, 1.1), add(DIAL, [0, 0, 0]), pushK(f, 400, 0.003), { fov: 38 });       // "No key": dial, no keyhole
const S4b = (f: number) => dolly(H(-1.3, 1.2, 1.4), H(-0.66, 1.2, 0), pushK(f, 418, 0.003), { fov: 40, roll: -0.03 }); // "No crank": side of the case
const S4c = (f: number) => dolly(H(0.2, 0.9, 1.6), H(0, 0.4, 0.2), pushK(f, 437, 0.0025), { fov: 40 });              // "No weights": empty chains below
const S4d = (f: number) => dolly(H(0.05, 2.08, 0.75), DIAL, pushK(f, 479, 0.003, 0.007, 30), { fov: 36, roll: 0.04 }); // "And still, it kept on ticking"
const S5a = (f: number) => dolly(H(-3.4, 1.6, 5.2), H(0, 1.4, 0), pushK(f, 528, 0.0016), { fov: 42 });               // hall wide, window light cycles
const S5b = (f: number) => dolly(H(2.6, 1.3, 4.0), H(0, 1.6, 0), pushK(f, 589, 0.0025), { fov: 40, roll: 0.03 });   // "Month after month"
const S6a = (f: number) => dolly(H(-1.0, 1.6, 6.4), H(-0.8, 1.5, 3.4), pushK(f, 624, 0.0025, 0.006, 24), { fov: 40 }); // magic (visitor with wand)
const S6b = (f: number) => dolly(H(1.8, 1.4, 1.4), H(0.4, 1.1, -0.45), pushK(f, 650, 0.003), { fov: 40, roll: -0.035 }); // servant: peek behind the case
const S6c = (f: number) => dolly(H(-0.2, 0.55, 1.6), H(0.35, 0.3, -0.5), pushK(f, 674, 0.003, 0.007, 24), { fov: 44 }); // the cat behind the case
const S7a = (f: number) => dolly(add(COX, [0.4, 1.75, 2.0]), coxEye, pushK(f, 712, 0.0028), { fov: 40 });          // Cox just smiled
const S7b = (f: number) => dolly(add(LOTTERY, [1.5, 1.6, 3.6]), add(LOTTERY, [0, 1.3, 0]), pushK(f, 800, 0.003, 0.006, 30), { fov: 42, roll: 0.035 }); // the lottery wheel
const S8a = (f: number) => dolly(H(-2.2, 1.2, 5.8), H(0, 1.7, 0), pushK(f, 848, 0.0022, 0.005, 24), { fov: 40, roll: -0.03 }); // luckily: low hero shot
const S9a = (f: number) => zoom(SKY_EYE, [0, 140, -400], 46, pushK(f, 922, 0.0025, 0.007, 26));                    // unluckily: the sky
const S10a = (f: number) => dolly(H(0.2, 1.2, 2.2), add(JARS, [0, 0.2, 0]), pushK(f, 975, 0.0022), { fov: 40 });     // case front turns transparent
const S10b = (f: number) => dolly(add(JARS, [0.55, 0.15, 0.9]), JARS, pushK(f, 1082, 0.003, 0.006, 26), { fov: 38, roll: 0.035 }); // "seventy kilos of mercury"
const S11a = (f: number) => zoom([-30, 18, 30], [0, 40, -200], 46, pushK(f, 1125, 0.002));                            // clouds roll over, pressure changes
const S11b = (f: number) => dolly(add(JARS, [-0.35, 0.1, 0.8]), add(JARS, [0, 0.05, 0]), pushK(f, 1188, 0.0025), { fov: 38 }); // mercury rose / fell
const S11c = (f: number) => dolly(H(0.3, 1.65, 0.9), H(0, 1.5, 0), pushK(f, 1260, 0.003, 0.007, 26), { fov: 40, roll: -0.035 }); // tiny push wound the clock
const S12a = (f: number) => dolly(add(CHEST, [0.9, 1.5, 2.4]), add(CHEST, [0, 1.25, 0]), pushK(f, 1320, 0.0025), { fov: 40 }); // your chest
const S12b = (f: number) => dolly(add(CHEST, [2.4, 1.4, 2.6]), add(CHEST, [1.1, 1.1, 0]), pushK(f, 1383, 0.0025), { fov: 42, roll: 0.03 }); // chest + jars in one frame
const S13a = (f: number) => zoom([0, 90, 120], [0, 4, -6], 44, pushK(f, 1445, 0.0015));                              // aerial: rooftops breathing the sky
const S14a = (f: number) => zoom([-40, 12, 40], [10, 30, -160], 44, pushK(f, 1512, 0.0018, 0.005, 30), { roll: 0.03 }); // wasn't perpetual
const S14b = (f: number) => zoom([30, 20, 60], [-10, 50, -260], 46, pushK(f, 1600, 0.0025, 0.007, 30), { roll: -0.04 }); // every cloud and storm
const S15a = (f: number) => zoom(G(-5.5, 1.7, 8.5), G(0, 1.4, 0), 42, pushK(f, 1675, 0.0016));                       // V&A gallery wide
const S15b = (f: number) => dolly(G(0.8, 1.6, 3.6), G(0, 1.7, 0), pushK(f, 1769, 0.0025), { fov: 40, roll: 0.03 });  // "the clock that nobody ever had to wind"
const S16a = (f: number) => dolly(G(-2.4, 1.6, 2.8), G(-1.6, 1.25, 0.6), pushK(f, 1838, 0.003, 0.006, 24), { fov: 40 }); // the guard at the switch
const S16b = (f: number) => dolly(G(0.05, 2.08, 0.9), G(0, 2.05, 0.35), pushK(f, 1886, 0.002), { fov: 38 });       // dial: second hand stops

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 70, cut: true, s: S1b }, { f: 105, cut: true, s: S1c }],      // "jeweller", "nobody"
  2: [{ f: 160, s: S2a }, { f: 232, cut: true, s: S2b }, { f: 264, cut: true, s: S2c }],   // "it, quite", "The Perpetual"
  3: [{ f: 300, s: S3a }, { f: 365, cut: true, s: S3b }],                                  // "and stare"
  4: [{ f: 400, s: S4a }, { f: 416, cut: true, s: S4b }, { f: 435, cut: true, s: S4c }, { f: 477, cut: true, s: S4d }],
  5: [{ f: 528, s: S5a }, { f: 587, dur: 30, s: S5b }],
  6: [{ f: 624, s: S6a }, { f: 648, cut: true, s: S6b }, { f: 674, cut: true, s: S6c }],
  7: [{ f: 712, s: S7a }, { f: 800, cut: true, s: S7b }],
  8: [{ f: 848, s: S8a }],
  9: [{ f: 922, s: S9a }],
  10: [{ f: 975, s: S10a }, { f: 1082, dur: 26, s: S10b }],
  11: [{ f: 1125, s: S11a }, { f: 1188, cut: true, s: S11b }, { f: 1260, cut: true, s: S11c }],
  12: [{ f: 1320, s: S12a }, { f: 1381, dur: 28, s: S12b }],
  13: [{ f: 1441, s: S13a }],
  14: [{ f: 1512, s: S14a }, { f: 1600, cut: true, s: S14b }],
  15: [{ f: 1669, s: S15a }, { f: 1767, cut: true, s: S15b }],
  16: [{ f: 1838, s: S16a }, { f: 1886, cut: true, s: S16b }],
};

/** impact kicks (flip sign every frame, decay over 7 f): "Perpetual Motion", "ticking", "cat",
 *  "lottery", "weather", "storm", and the stop on "off." */
const KICKS: [number, number][] = [[266 / FPS, 0.5], [507 / FPS, 0.4], [695 / FPS, 0.4], [820 / FPS, 0.4],
  [954 / FPS, 0.6], [1620 / FPS, 0.6], [1890 / FPS, 0.5]];
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
  { f: 0, cInf: 0 },                                   // street wide
  { f: 70, cInf: 12 },                                 // dial MS (focus = look)
  { f: 105, cInf: 15 },                                // dial CU
  { f: 160, cInf: 10, focus: () => coxEye },           // Cox + clock
  { f: 232, cInf: 13, focus: () => coxEye },
  { f: 264, cInf: 7 },                                 // reveal
  { f: 300, cInf: 9, focus: () => [6, 1.7, 1] },       // queue at the door
  { f: 365, cInf: 12, focus: () => add(VISITORS[1], [0, 1.6, 0]) }, // staring faces
  { f: 400, cInf: 14 },                                // inserts (focus = look)
  { f: 528, cInf: 7 },                                 // hall wide
  { f: 624, cInf: 11, focus: () => add(VISITORS[4], [0, 1.6, 0]) },
  { f: 648, cInf: 13 },
  { f: 712, cInf: 13, focus: () => coxEye },
  { f: 800, cInf: 10 },                                // lottery
  { f: 848, cInf: 8 },
  { f: 922, cInf: 0 },                                 // sky
  { f: 975, cInf: 12 },                                // jars
  { f: 1125, cInf: 0 },                                // clouds
  { f: 1188, cInf: 14 },
  { f: 1320, cInf: 11, focus: () => add(CHEST, [0, 1.4, 0]) },
  { f: 1445, cInf: 0 },                                // aerials
  { f: 1675, cInf: 6 },                                // gallery wide
  { f: 1767, cInf: 12 },
  { f: 1838, cInf: 11, focus: () => G(-1.6, 1.4, 0.6) },
  { f: 1886, cInf: 15 },                               // dial CU, the stop
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
