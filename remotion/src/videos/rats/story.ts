// Timeline of "The Rats That Kept Their Lives" (the Hanoi rat bounty of 1902): shots timed to the voice
// (projects/rat-tails/voice/words.json; frame numbers below = word onsets at 30 fps), the story state (the sack pile,
// the basket of tails, the plague fog) and the camera grammar of the series: hard cuts on big reframes, smootherstep
// glides, every hold creeps in, flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 2010; // voice ends 1941 ("one.") + a short button
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
// Hanoi, 1902: the city hall square (the bounty desk) at the north end of a boulevard of French villas (the new
// manhole), a lake with a little tower south of it, a street of tube houses to the west, a villa garden to the east.
// Far away from it: the sewer tunnel, a French bathroom and a rat farm in the countryside.
export const CITY: V3 = [0, 0, 0];
export const HALL_Z = -22;                        // the city hall's front wall (facing +z)
export const DESK: V3 = [0, 0, -13];              // the bounty desk (top 0.8 m), clerk on its -z side
export const DESK_TOP = 0.8;
export const MAN: V3 = [2.5, 0, 24];              // the shiny manhole on the boulevard
export const PILE: V3 = [5.2, 0, 26.5];           // where the sacks pile up by the manhole
export const LAKE_Z = 96;                         // the lake's north shore
export const TOWER: V3 = [4, 0, 132];             // the little tower on its islet
export const ALLEY_Z = 48;                        // the tube-house street runs west along z = 48 (x < -9)
export const GRATE: V3 = [-24, 0, 51.2];          // the gutter grate on its north kerb
export const GARDEN: V3 = [24, 0, 62];            // the villa garden (lawn 10 x 8 m) east of the boulevard
export const SEW: V3 = [2000, 0, 0];              // the sewer: a brick tunnel along z, walkways at y = 0
export const SEW_W = 2.2, SEW_H = 1.5, SEW_R = 2.2; // half width, wall height, vault radius (crown 3.7 m)
export const CAT_Z = -10;                         // the grate shaft the cat looks down
export const BATH: V3 = [-2000, 0, 0];            // a French bathroom, 4.4 x 4.4 m, toilet against the back wall
export const LOO: V3 = [-1999.2, 0, -1.75];       // the toilet bowl centre
export const FARM: V3 = [4000, 0, 0];             // the rat farm
/** the farm's bamboo cages on two trestle tables: centre of each cage floor (+0.27) */
export const CAGES: V3[] = [];
for (const [rz, n] of [[-3.6, 7], [-5.6, 7]] as const) for (let i = 0; i < n; i++) CAGES.push([FARM[0] - 3.3 + i * 1.1, 0.97, FARM[2] + rz]);

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "lab" | "dusk";
export type Place = "city" | "sewer" | "bath" | "farm";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 106, light: "day", place: "city" },        // a city paid people to kill rats
  { id: 2, a: 106, b: 169, light: "golden", place: "farm" },   // so people started farming rats
  { id: 3, a: 169, b: 283, light: "day", place: "city" },      // Hanoi; a shiny new sewer
  { id: 4, a: 283, b: 414, light: "night", place: "sewer" },   // under their side of town; the rats loved it
  { id: 5, a: 414, b: 479, light: "lab", place: "bath" },      // popped up in French toilets
  { id: 6, a: 479, b: 542, light: "dusk", place: "city" },     // plague was spreading
  { id: 7, a: 542, b: 613, light: "day", place: "city" },      // hunters down into the pipes
  { id: 8, a: 613, b: 647, light: "night", place: "sewer" },   // by June they were killing
  { id: 9, a: 647, b: 752, light: "day", place: "city" },      // ten thousand a day; twenty thousand
  { id: 10, a: 752, b: 785, light: "night", place: "sewer" },  // it wasn't enough
  { id: 11, a: 785, b: 1172, light: "day", place: "city" },    // everyone a hunter ... the rats didn't go anywhere
  { id: 12, a: 1172, b: 1389, light: "day", place: "city" },   // no tails; catch, cut, let go
  { id: 13, a: 1389, b: 1454, light: "night", place: "sewer" },// more rats with more tails
  { id: 14, a: 1454, b: 1554, light: "golden", place: "farm" },// rats on farms
  { id: 15, a: 1554, b: 1737, light: "day", place: "city" },   // the gardener; the bounty scrapped
  { id: 16, a: 1737, b: TOTAL, light: "dusk", place: "city" }, // plague anyway; it paid for tails; a rat can live without one
];
export const XFADE: Record<number, number> = { 3: 8, 4: 10, 6: 10, 7: 8, 13: 8, 14: 12, 15: 10, 16: 12 };
export const FLASH_AT = 169;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the story state ----------------
export const PAID = 52;          // "paid": the coin pops
export const FARMING = 133;      // "farming": rats pop up in the cages
export const SHINY = 251;        // "shiny": sparkle on the manhole cover
export const DARK = 357, WARM = 370, PRED = 384; // "dark" (light dims), "warm", "no predators" (the cat)
export const POP = 426, JUMP = 435;              // the toilet lid pops; the gentleman jumps
export const POINT = 556;        // "sent": the official points at the open manhole
/** the sack pile by the manhole: 0 none .. 1 "ten thousand" .. 2 "twenty thousand" */
export const pileAt = (f: number) => (f < 655 ? 0.15 : f < 700 ? 0.15 + 0.85 * smooth((f - 655) / 22) : 1 + smooth((f - 716) / 10));
export const EVERYONE = 806, CENT = 854, STINK = 932, TAIL1 = 1018, POURED = 1065, ANYWHERE = 1148;
/** the basket of tails on the desk: how full (0..1) */
export const basketAt = (f: number) => (f < POURED - 4 ? 0.1 : 0.1 + 0.9 * smooth((f - POURED + 4) / 24));
export const NOTAIL = 1238, GRAB = 1290, SNIP = 1332, LETGO = 1354, MORE = 1395, MTAILS = 1419;
export const FARMS = 1528, WEED = 1594, WEEDS = 1655, SCRAP = 1703, PLAGUE2 = 1741, TAILS = 1870, ONE = 1926;
/** the plague fog: 0 none .. 1 over the city (shot 6 rolls in; shot 16 down the boulevard) */
export const fogAt = (id: number, f: number) => (id === 6 ? smooth((f - 482) / 56) : id === 16 ? (f < 1795 ? smooth((f - 1738) / 40) : 0.55) : 0);
export const popAt = (f: number, f0: number) => clamp01((f - f0) / 6);
export const C = (x: number, y: number, z: number): V3 => add(CITY, [x, y, z]);
export const S = (x: number, y: number, z: number): V3 => add(SEW, [x, y, z]);
export const B = (x: number, y: number, z: number): V3 => add(BATH, [x, y, z]);
export const F = (x: number, y: number, z: number): V3 => add(FARM, [x, y, z]);

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

/** where people stand (shared with cast.ts) */
export const CLERK_P: V3 = C(0.1, 0.04, -13.9);   // the clerk behind the desk
export const CUST_P: V3 = C(0.5, 0.04, -12.0);    // whoever stands at the desk
export const OFF_P: V3 = C(-2.2, 0.04, -14.6);    // the official beside the desk
export const GENT_P: V3 = B(0.0, 0.04, -1.2);   // the gentleman in the bathroom
export const FARMER_P: V3 = F(0.75, 0.04, -2.1);   // the rat farmer
export const OWNER_P: V3 = add(GARDEN, [-2.6, 0.04, 1.4]); // the villa owner
export const GARD_P: V3 = add(GARDEN, [-0.6, 0.04, 0.4]);  // the gardener
export const eye = (p: V3, h = 1.45): V3 => [p[0], p[1] + h, p[2]];

// framings; each pushes in from the frame its key starts
const S1a = (f: number) => dolly(C(1.9, 1.5, -6.6), C(0.2, 1.2, -13.2), pushK(f, 0, 0.0028, 0.007, 24), { fov: 42 });           // the desk: sack, coin
const S1b = (f: number) => dolly(C(0.9, 1.25, -10.6), C(0.15, 1.0, -13.0), pushK(f, 66, 0.003, 0.008, 22), { fov: 40, roll: -0.03 }); // close: the coin, "kill rats"
const S2a = (f: number) => dolly(F(1.0, 1.25, 2.2), F(0.25, 0.95, -3.9), pushK(f, 106, 0.0026, 0.007, 24), { fov: 46, roll: 0.03 }); // farmer + cages
const S3a = (f: number) => zoom(C(-6, 9, 168), C(0, 6, 40), 50, pushK(f, 165, 0.0016));                                       // over the lake to the city
const S3b = (f: number) => zoom(C(-0.5, 5.5, 50), C(0.5, 3.0, 12), 54, pushK(f, 225, 0.002));                         // the boulevard
const S3c = (f: number) => dolly(add(MAN, [-0.9, 1.15, 2.4]), add(MAN, [0, 0.05, 0]), pushK(f, 246, 0.003, 0.008, 22), { fov: 42 }); // the shiny manhole
const S4a = (f: number) => dolly(S(1.3, 1.7, 9), S(-0.4, 1.6, -6), pushK(f, 278, 0.0022), { fov: 50 });                           // the new tunnel
const S4b = (f: number) => dolly(S(0.2, 0.62, 2.6), S(-1.35, 0.25, 0.3), pushK(f, 322, 0.0026, 0.007, 24), { fov: 44, roll: -0.03 }); // rats lounging
const S4c = (f: number) => dolly(S(0.35, 0.55, CAT_Z + 1.0), S(0, 4.2, CAT_Z - 0.1), pushK(f, 380, 0.003, 0.008, 22), { fov: 50, roll: 0.04 }); // up the grate: the cat
const S5a = (f: number) => dolly(B(0.55, 1.15, 1.7), B(0.3, 0.72, -1.6), pushK(f, 414, 0.0028, 0.008, 24), { fov: 44 });           // bathroom: the toilet
const S6a = (f: number) => zoom(C(14, 4, 40), C(0, 12, -24), 46, pushK(f, 474, 0.0016, 0.004, 30), { roll: -0.02 });               // dusk: the tower, the fog
const S7a = (f: number) => dolly(add(MAN, [3.4, 1.7, 4.8]), add(MAN, [-0.2, 0.7, 0]), pushK(f, 538, 0.0024, 0.006, 24), { fov: 44 }); // hunters down the manhole
const S8a = (f: number) => dolly(S(0.6, 1.15, 4.2), S(-0.5, 0.8, -1.0), pushK(f, 610, 0.003, 0.008, 20), { fov: 46, roll: 0.03 });  // nets swing
const S9a = (f: number) => dolly(add(PILE, [-1.0, 1.7, 7.4]), add(PILE, [0.3, 1.6, 0]), pushK(f, 645, 0.0022, 0.006, 24), { fov: 44 }); // the pile grows
const S9b = (f: number) => zoom(add(PILE, [-1.6, 1.1, 8.5]), add(PILE, [0.3, 2.2, 0]), 50, pushK(f, 700, 0.0018, 0.006, 24), { roll: -0.03 }); // twenty thousand: a mountain
const S10a = (f: number) => dolly(S(-0.2, 0.9, 4.2), S(-1.1, 0.7, 0.0), pushK(f, 750, 0.0026), { fov: 44 });                    // wasn't enough
const S11a = (f: number) => zoom(C(4.5, 2.4, -2.5), C(0, 1.0, -12), 48, pushK(f, 782, 0.0018, 0.005, 24));                             // everyone a rat hunter
const S11b = (f: number) => dolly(C(0.8, 1.35, -11.0), C(0.05, 0.95, -13.1), pushK(f, 846, 0.003, 0.008, 22), { fov: 40, roll: 0.03 }); // one cent
const S11c = (f: number) => dolly(C(-2.0, 1.6, -7.2), C(0.0, 1.3, -13.4), pushK(f, 886, 0.0022, 0.006, 24), { fov: 44 });       // sacks, the stink
const S11d = (f: number) => dolly(C(0.5, 1.6, -11.0), C(0.1, 1.55, -13.9), pushK(f, 1006, 0.003, 0.008, 22), { fov: 40 });       // just bring the tail
const S11e = (f: number) => dolly(C(2.6, 1.7, -6.6), C(0.0, 1.0, -13.2), pushK(f, 1050, 0.0022, 0.006, 24), { fov: 46 });       // the tails pour in
const S11f = (f: number) => zoom(C(-3.5, 1.1, -5.0), C(0.0, 0.7, -13.0), 50, pushK(f, 1100, 0.002, 0.006, 24), { roll: -0.03 }); // rats all round
const S12a = (f: number) => dolly(C(-0.6, 0.75, 41.0), C(0.7, 0.55, 35.2), pushK(f, 1170, 0.0024, 0.006, 24), { fov: 48 });          // officials + the tailless rat
const S12b = (f: number) => dolly(C(-21.6, 1.5, 44.5), C(-23.8, 1.0, 50.0), pushK(f, 1270, 0.0024, 0.006, 24), { fov: 44 });       // the alley: grab
const S12c = (f: number) => dolly(C(-22.6, 1.5, 47.9), C(-23.4, 1.35, 50.3), pushK(f, 1318, 0.003, 0.008, 20), { fov: 40, roll: 0.03 }); // snip
const S12d = (f: number) => dolly(C(-23.3, 0.42, 49.4), C(-23.9, 0.18, 51.1), pushK(f, 1348, 0.0026, 0.006, 24), { fov: 42 });      // let go: into the grate
const S13a = (f: number) => dolly(S(0.9, 0.7, 3.2), S(-1.3, 0.35, 0.3), pushK(f, 1385, 0.0026, 0.007, 24), { fov: 46 });           // more rats
const S14a = (f: number) => zoom(F(-3.2, 2.0, 4.2), F(0.3, 0.85, -4.2), 48, pushK(f, 1450, 0.0018, 0.005, 24));                          // the farms
const S15a = (f: number) => dolly(add(GARDEN, [0.2, 1.5, 6.4]), add(GARDEN, [-1.6, 1.0, 0.9]), pushK(f, 1550, 0.0024, 0.006, 24), { fov: 46 }); // a weed, a coin
const S15b = (f: number) => zoom(add(GARDEN, [2.5, 3.2, 8.5]), add(GARDEN, [-1, 0.5, -0.5]), 50, pushK(f, 1618, 0.0018, 0.006, 24)); // full of weeds
const S15c = (f: number) => dolly(C(1.4, 1.5, -9.8), C(0.0, 1.05, -13.3), pushK(f, 1690, 0.003, 0.008, 22), { fov: 42, roll: -0.03 }); // scrapped
const S16a = (f: number) => zoom(C(-2.5, 3.0, 46), C(1.0, 2.6, 18), 50, pushK(f, 1735, 0.0018));                                   // plague down the boulevard
const S16b = (f: number) => dolly(C(-1.3, 1.45, -9.8), C(0.35, 1.05, -13.4), pushK(f, 1792, 0.0024, 0.007, 24), { fov: 44 });          // it paid for tails
const S16c = (f: number) => dolly(add(MAN, [0.15, 0.32, 1.25]), add(MAN, [0.0, 0.16, 0.0]), pushK(f, 1890, 0.0028, 0.007, 24), { fov: 40, roll: -0.03 }); // the rat on the manhole

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 66, cut: true, s: S1b }],
  2: [{ f: 106, s: S2a }],
  3: [{ f: 165, s: S3a }, { f: 225, cut: true, s: S3b }, { f: 246, dur: 30, s: S3c }],
  4: [{ f: 278, s: S4a }, { f: 322, cut: true, s: S4b }, { f: 380, cut: true, s: S4c }],
  5: [{ f: 414, s: S5a }],
  6: [{ f: 474, s: S6a }],
  7: [{ f: 538, s: S7a }],
  8: [{ f: 610, s: S8a }],
  9: [{ f: 645, s: S9a }, { f: 700, cut: true, s: S9b }],
  10: [{ f: 750, s: S10a }],
  11: [{ f: 782, s: S11a }, { f: 846, cut: true, s: S11b }, { f: 886, cut: true, s: S11c }, { f: 1006, cut: true, s: S11d }, { f: 1050, cut: true, s: S11e }, { f: 1100, cut: true, s: S11f }],
  12: [{ f: 1170, s: S12a }, { f: 1270, cut: true, s: S12b }, { f: 1318, cut: true, s: S12c }, { f: 1348, cut: true, s: S12d }],
  13: [{ f: 1385, s: S13a }],
  14: [{ f: 1450, s: S14a }],
  15: [{ f: 1550, s: S15a }, { f: 1618, cut: true, s: S15b }, { f: 1690, cut: true, s: S15c }],
  16: [{ f: 1735, s: S16a }, { f: 1792, cut: true, s: S16b }, { f: 1890, cut: true, s: S16c }],
};

/** impact kicks (flip sign every frame, decay over 7 f) */
const KICKS: [number, number][] = [[PAID / FPS, 0.4], [83 / FPS, 0.45], [FARMING / FPS, 0.5], [SHINY / FPS, 0.35], [PRED / FPS, 0.4], [JUMP / FPS, 0.55],
  [POINT / FPS, 0.4], [636 / FPS, 0.4], [720 / FPS, 0.6], [EVERYONE / FPS, 0.45], [CENT / FPS, 0.4], [STINK / FPS, 0.4], [1028 / FPS, 0.5],
  [ANYWHERE / FPS, 0.5], [1244 / FPS, 0.55], [SNIP / FPS, 0.5], [MTAILS / FPS, 0.4], [FARMS / FPS, 0.45], [1670 / FPS, 0.5], [SCRAP / FPS, 0.55],
  [TAILS / FPS, 0.45], [ONE / FPS, 0.45]];
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
  { f: 0, cInf: 10 },
  { f: 66, cInf: 14 },
  { f: 106, cInf: 10 },
  { f: 165, cInf: 0 },
  { f: 225, cInf: 4 },
  { f: 246, dur: 30, cInf: 12 },
  { f: 278, cInf: 6 },
  { f: 322, cInf: 14 },
  { f: 380, cInf: 8 },
  { f: 414, cInf: 10 },
  { f: 474, cInf: 0 },
  { f: 538, cInf: 9 },
  { f: 610, cInf: 9 },
  { f: 645, cInf: 9 },
  { f: 700, cInf: 4 },
  { f: 750, cInf: 12 },
  { f: 782, cInf: 4 },
  { f: 846, cInf: 14 },
  { f: 886, cInf: 9 },
  { f: 1006, cInf: 13 },
  { f: 1050, cInf: 8 },
  { f: 1100, cInf: 9 },
  { f: 1170, cInf: 12, focus: () => C(0.2, 0.3, 37.9) },
  { f: 1270, cInf: 10 },
  { f: 1318, cInf: 15 },
  { f: 1348, cInf: 13 },
  { f: 1385, cInf: 14 },
  { f: 1450, cInf: 3 },
  { f: 1550, cInf: 9 },
  { f: 1618, cInf: 4 },
  { f: 1690, cInf: 12 },
  { f: 1735, cInf: 0 },
  { f: 1792, cInf: 10 },
  { f: 1890, cInf: 16 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
