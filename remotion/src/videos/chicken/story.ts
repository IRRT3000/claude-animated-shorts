// Timeline of "The Chicken That Lived Without a Head" (Mike, Fruita, Colorado, 1945-47): shots timed to the voice
// (projects/headless-chicken/voice/words.json; frame numbers below = word onsets at 30 fps), the story state (Mike's head,
// his weight, the x-ray glows) and the camera grammar of the series: hard cuts on big reframes, smootherstep
// glides, every hold creeps in, flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 2130; // voice ends ~2062 ("dinner.") + a short button
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
// Fruita, Colorado, 1945: the Olsens' farmyard (white farmhouse facing +z, red barn, the coop, the chopping stump, a
// rail fence, corn) under red mesa cliffs. Far away from it: the farmhouse KITCHEN, a university LAB, the sideshow
// tent on a desert fair lot (SHOW), a Phoenix MOTEL at night, its ROOM, and the little main street of TOWN.
export const FARM: V3 = [0, 0, 0];
export const HOUSE_Z = -16;                       // the farmhouse front wall (porch to z = -13)
export const COOP: V3 = [7, 0, -5];               // the coop (front opening facing +z)
export const STUMP: V3 = [2, 0, 2];               // the chopping stump (top 0.5 m)
export const STUMP_TOP = 0.5;
export const FENCE_Z = 5;                         // the rail fence along z = 5
export const POST: V3 = [2.2, 0, 5];              // the fence post that hides the axe
export const KITCHEN: V3 = [-2000, 0, 0];         // 5 x 5 m, table at its centre, window in the back wall
export const TABLE_TOP = 0.78;
export const LAB: V3 = [2000, 0, 0];              // 6 x 5 m, bench in front of the back wall, lightbox on it
export const LIGHTBOX: V3 = [2000, 1.75, -2.44];  // the x-ray lightbox (1.3 x 1.0 m) on the back wall
export const SHOW: V3 = [4000, 0, 0];             // the sideshow tent (open front facing +z), a desert lot, a road at z = 34
export const SCALE: V3 = [4000.9, 0, -1.2];       // the big platform scale under the tent
export const MOTEL: V3 = [6000, 0, 0];            // the motel: a low block along x at z = -8, the neon sign at x + 6
export const ROOM: V3 = [8000, 0, 0];             // a motel room: bed, lamp, suitcase, Mike's crate
export const TOWN: V3 = [10000, 0, 0];            // the main street along z, bunting across it

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "lab" | "dusk" | "moon";
export type Place = "farm" | "kitchen" | "lab" | "show" | "motel" | "room" | "town";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 106, light: "golden", place: "farm" },     // a farmer went out to get dinner
  { id: 2, a: 106, b: 158, light: "golden", place: "farm" },   // dinner did not cooperate
  { id: 3, a: 158, b: 316, light: "day", place: "farm" },      // Fruita, Colorado; Mike; raised the axe
  { id: 4, a: 316, b: 364, light: "lab", place: "kitchen" },   // his mother-in-law loved the neck
  { id: 5, a: 364, b: 440, light: "day", place: "farm" },      // so Lloyd aimed high; a little too high
  { id: 6, a: 440, b: 488, light: "day", place: "farm" },      // the axe took the head
  { id: 7, a: 488, b: 588, light: "lab", place: "lab" },       // missed the main vein, one ear, most of the brain stem
  { id: 8, a: 588, b: 680, light: "day", place: "farm" },      // shook it off, pecking for corn
  { id: 9, a: 680, b: 788, light: "moon", place: "farm" },     // that night: head under his wing
  { id: 10, a: 788, b: 952, light: "lab", place: "kitchen" },  // keep him; the eyedropper
  { id: 11, a: 952, b: 1145, light: "lab", place: "lab" },     // scientists; a blood clot; the brain stem
  { id: 12, a: 1145, b: 1272, light: "day", place: "show" },   // a promoter; on tour; twenty-five cents
  { id: 13, a: 1272, b: 1335, light: "day", place: "show" },   // Life magazine took his picture
  { id: 14, a: 1335, b: 1433, light: "day", place: "farm" },   // other farmers tried; none made it
  { id: 15, a: 1433, b: 1575, light: "day", place: "show" },   // kept growing; two and a half to almost eight
  { id: 16, a: 1575, b: 1640, light: "night", place: "motel" },// one night in a motel in Phoenix
  { id: 17, a: 1640, b: 1742, light: "lab", place: "room" },   // Mike started choking; the syringe?
  { id: 18, a: 1742, b: 1792, light: "night", place: "show" }, // left behind at the show
  { id: 19, a: 1792, b: 1866, light: "dusk", place: "farm" },  // survived an axe for eighteen months
  { id: 20, a: 1866, b: 1932, light: "night", place: "show" }, // could not survive a forgotten syringe
  { id: 21, a: 1932, b: 2010, light: "day", place: "town" },   // his town still throws him a party
  { id: 22, a: 2010, b: TOTAL, light: "golden", place: "kitchen" }, // Lloyd only wanted dinner
];
export const XFADE: Record<number, number> = { 3: 10, 4: 8, 9: 10, 11: 10, 16: 10, 19: 12, 21: 10, 22: 12 };
export const FLASH_AT = 158;
export const FLASH2_AT = 1302;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the story state ----------------
export const DINNER = 89, JAW = 128, MIKE = 262, AXE = 295;      // hens peek; Lloyd's jaw drops; "Mike"; "axe"
export const NECK = 349, HIGH = 389, TOOHIGH = 423;              // Ma licks her lips; the aim goes up, then up again
export const WHOOSH = 449, HEAD = 466;                           // the axe falls behind the post; "head"
export const VEIN = 500, EAR = 524, STEM = 560;                  // the x-ray glows
export const SHOOK = 606, CORN = 646;                            // the shake; the pecks
export const TUCK = 718, HABIT = 754;                            // stump under the wing; asleep
export const KEEP = 812, DROP = 857, MILK = 886, WATER = 901, THROAT = 933;
export const EXAM = 1002, CLOT = 1045, STEM2 = 1109, REST = 1121;
export const PROMO = 1156, TOUR = 1198, CENTS = 1243;
export const SNAP = 1302, TRIED = 1356, NONE = 1401;
export const GROW = 1458, TWO = 1484, EIGHT = 1530, NOHEAD = 1550;
export const PHOENIX = 1622, CHOKE = 1660, SYR = 1688, LEFT = 1746;
export const AXE2 = 1821, FORGOT = 1893, PARTY = 1973, WANTED = 2036;
/** Mike's weight in pounds (shot 15's scale; his card puffs up with it) */
export const lbsAt = (f: number) => (f < TWO ? 2.5 : 2.5 + 5.3 * smooth((f - TWO) / (EIGHT - TWO + 4)));
export const popAt = (f: number, f0: number) => clamp01((f - f0) / 6);
const at = (o: V3) => (x: number, y: number, z: number): V3 => add(o, [x, y, z]);
export const FA = at(FARM), K = at(KITCHEN), L = at(LAB), SH = at(SHOW), M = at(MOTEL), R = at(ROOM), T = at(TOWN);

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
export const LLOYD_STUMP: V3 = FA(1.25, 0.04, 1.75);   // Lloyd at the chopping stump (Mike on the stump to his left)
export const MA_P: V3 = K(0.0, 0.04, -0.75);           // the mother-in-law at the kitchen table
export const LLOYD_K: V3 = K(-0.75, 0.04, -0.55);       // Lloyd at the kitchen table
export const CLARA_K: V3 = K(0.75, 0.04, -0.55);        // Clara at the kitchen table
export const BENCH: V3 = L(0, 0.9, -1.6);              // the lab bench top centre
export const MIKE_K: V3 = K(0.0, TABLE_TOP, 0.05);     // Mike's crate on the kitchen table
export const eye = (p: V3, h = 1.45): V3 => [p[0], p[1] + h, p[2]];

// framings; each pushes in from the frame its key starts
const S1a = (f: number) => dolly(FA(5.4, 1.7, 1.2), FA(1.4, 1.25, -9.0), pushK(f, 0, 0.0024, 0.006, 24), { fov: 46 });        // Lloyd off the porch with the axe
const S2a = (f: number) => dolly(FA(3.6, 0.32, 0.9), FA(2.0, 0.85, -3.4), pushK(f, 106, 0.003, 0.008, 22), { fov: 50, roll: 0.03 }); // low: headless Mike struts past
const S3a = (f: number) => zoom(FA(14, 34, 80), FA(0, 6, -40), 50, pushK(f, 154, 0.0016));                                         // over the farm to the mesas
const S3b = (f: number) => dolly(FA(7.7, 1.45, -1.7), FA(7.0, 1.25, -4.3), pushK(f, 222, 0.003, 0.008, 22), { fov: 42 });           // Lloyd lifts Mike
const S3c = (f: number) => dolly(FA(4.2, 1.35, 5.6), FA(1.7, 1.15, 1.7), pushK(f, 274, 0.0026, 0.007, 22), { fov: 44, roll: -0.03 }); // the axe goes up
const S4a = (f: number) => dolly(K(0.35, 1.25, 1.75), K(0.0, 1.05, -0.7), pushK(f, 312, 0.003, 0.008, 22), { fov: 42 });              // Ma at the table
const S5a = (f: number) => dolly(FA(3.3, 1.2, 4.1), FA(1.75, 1.0, 1.9), pushK(f, 364, 0.0028, 0.007, 22), { fov: 42, roll: 0.03 });  // Lloyd aims
const S5b = (f: number) => dolly(FA(2.35, 0.95, 3.0), FA(1.95, 0.85, 2.0), pushK(f, 404, 0.003, 0.009, 20), { fov: 40 });            // too high: close on Mike
const S6a = (f: number) => dolly(FA(2.75, 1.25, 7.6), FA(2.0, 0.95, 2.0), pushK(f, 440, 0.0026, 0.008, 20), { fov: 44 });            // behind the fence post
const S7a = (f: number) => dolly(L(0.15, 1.65, 0.6), L(0.0, 1.72, -2.4), pushK(f, 484, 0.0028, 0.006, 24), { fov: 40 });              // the x-ray lightbox
const S8a = (f: number) => dolly(FA(3.6, 0.9, 6.0), FA(2.4, 0.55, 2.8), pushK(f, 586, 0.0026, 0.007, 24), { fov: 46 });              // he shook it off
const S8b = (f: number) => dolly(FA(3.15, 0.38, 4.2), FA(2.6, 0.25, 2.9), pushK(f, 632, 0.003, 0.008, 22), { fov: 44, roll: -0.03 }); // pecking
const S9a = (f: number) => dolly(FA(7.2, 1.25, -2.2), FA(7.0, 1.0, -4.6), pushK(f, 676, 0.0024, 0.006, 24), { fov: 44 });             // the roost at night
const S10a = (f: number) => dolly(K(0.0, 1.45, 1.9), K(0.0, 1.0, -0.6), pushK(f, 784, 0.0022, 0.006, 24), { fov: 46 });              // the Olsens and Mike
const S10b = (f: number) => dolly(K(0.25, 1.15, 0.8), K(0.0, 0.98, 0.0), pushK(f, 846, 0.003, 0.008, 22), { fov: 40, roll: 0.03 });   // the eyedropper
const S11a = (f: number) => dolly(L(1.6, 1.6, 1.2), L(0.0, 1.15, -1.6), pushK(f, 948, 0.0022, 0.006, 24), { fov: 46 });                // scientists round the bench
const S11b = (f: number) => dolly(L(-0.1, 1.68, 0.2), L(0.0, 1.72, -2.4), pushK(f, 1030, 0.003, 0.007, 22), { fov: 40 });             // the clot, the brain stem
const S11c = (f: number) => dolly(L(-1.2, 1.5, 1.4), L(0.0, 1.2, -1.6), pushK(f, 1116, 0.0026, 0.007, 22), { fov: 44, roll: -0.03 }); // the shrug
const S12a = (f: number) => dolly(SH(-3.4, 1.6, 9.5), SH(-2.4, 1.3, 4.8), pushK(f, 1141, 0.0026, 0.007, 24), { fov: 44 });            // the promoter pops in
const S12b = (f: number) => zoom(SH(-30, 6, 52), SH(0, 1.2, 34), 46, pushK(f, 1188, 0.0016));                                          // the car on the desert road
const S12c = (f: number) => dolly(SH(3.0, 1.5, 9.0), SH(1.6, 1.2, 5.6), pushK(f, 1220, 0.0026, 0.007, 22), { fov: 44, roll: 0.03 });   // coins in the jar
const S13a = (f: number) => dolly(SH(-1.4, 1.4, 3.2), SH(0.3, 1.1, -0.9), pushK(f, 1268, 0.0026, 0.007, 22), { fov: 44 });            // the photographer, flash
const S14a = (f: number) => dolly(FA(-9.0, 1.5, 9.5), FA(-9.0, 1.0, 3.6), pushK(f, 1331, 0.0022, 0.006, 24), { fov: 46 });           // other farmers
const S15a = (f: number) => dolly(SH(1.6, 1.25, 2.4), SH(0.9, 1.0, -1.2), pushK(f, 1429, 0.0024, 0.007, 24), { fov: 42 });            // Mike on the scale
const S15b = (f: number) => dolly(SH(1.15, 0.95, 1.0), SH(0.9, 0.85, -1.2), pushK(f, 1540, 0.003, 0.009, 20), { fov: 40, roll: 0.03 }); // with no head
const S16a = (f: number) => zoom(M(16, 3.2, 22), M(3, 2.8, -4), 48, pushK(f, 1571, 0.0018, 0.005, 24));                                 // the motel at night
const S17a = (f: number) => dolly(R(1.1, 1.3, 1.9), R(-0.3, 0.8, -0.8), pushK(f, 1636, 0.0026, 0.007, 24), { fov: 44 });               // Mike coughs; Lloyd sits up
const S17b = (f: number) => dolly(R(-0.4, 1.4, 1.6), R(0.6, 0.75, -0.6), pushK(f, 1684, 0.0028, 0.008, 22), { fov: 44, roll: -0.03 });  // the suitcase
const S18a = (f: number) => dolly(SH(0.2, 1.35, 2.6), SH(-0.4, 0.95, -0.4), pushK(f, 1738, 0.0026, 0.008, 22), { fov: 42 });           // the empty tent: the syringe
const S19a = (f: number) => dolly(FA(3.3, 1.0, 4.4), FA(2.0, 0.7, 2.0), pushK(f, 1788, 0.0022, 0.006, 24), { fov: 44 });                // the empty stump at dusk
const S20a = (f: number) => dolly(SH(-0.15, 1.12, 0.55), SH(-0.42, 0.92, -0.42), pushK(f, 1862, 0.0028, 0.007, 24), { fov: 40, roll: 0.03 }); // the syringe alone
const S21a = (f: number) => zoom(T(-2.2, 2.4, 22), T(0.5, 2.6, -2), 50, pushK(f, 1928, 0.0018, 0.005, 24));                             // the festival
const S22a = (f: number) => dolly(K(0.6, 1.3, 1.9), K(-0.55, 1.0, -0.4), pushK(f, 2006, 0.0024, 0.006, 24), { fov: 42 });                // Lloyd alone with an empty plate

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 106, s: S2a }],
  3: [{ f: 154, s: S3a }, { f: 222, cut: true, s: S3b }, { f: 274, cut: true, s: S3c }],
  4: [{ f: 312, s: S4a }],
  5: [{ f: 364, s: S5a }, { f: 404, cut: true, s: S5b }],
  6: [{ f: 440, s: S6a }],
  7: [{ f: 484, s: S7a }],
  8: [{ f: 586, s: S8a }, { f: 632, cut: true, s: S8b }],
  9: [{ f: 676, s: S9a }],
  10: [{ f: 784, s: S10a }, { f: 846, cut: true, s: S10b }],
  11: [{ f: 948, s: S11a }, { f: 1030, cut: true, s: S11b }, { f: 1116, cut: true, s: S11c }],
  12: [{ f: 1141, s: S12a }, { f: 1188, cut: true, s: S12b }, { f: 1220, cut: true, s: S12c }],
  13: [{ f: 1268, s: S13a }],
  14: [{ f: 1331, s: S14a }],
  15: [{ f: 1429, s: S15a }, { f: 1540, cut: true, s: S15b }],
  16: [{ f: 1571, s: S16a }],
  17: [{ f: 1636, s: S17a }, { f: 1684, cut: true, s: S17b }],
  18: [{ f: 1738, s: S18a }],
  19: [{ f: 1788, s: S19a }],
  20: [{ f: 1862, s: S20a }],
  21: [{ f: 1928, s: S21a }],
  22: [{ f: 2006, s: S22a }],
};

/** impact kicks (flip sign every frame, decay over 7 f) */
const KICKS: [number, number][] = [[JAW / FPS, 0.5], [AXE / FPS, 0.4], [NECK / FPS, 0.4], [TOOHIGH / FPS, 0.35], [WHOOSH / FPS, 0.6], [HEAD / FPS, 0.4],
  [SHOOK / FPS, 0.45], [CORN / FPS, 0.35], [737 / FPS, 0.35], [DROP / FPS, 0.4], [CLOT / FPS, 0.45], [PROMO / FPS, 0.45], [CENTS / FPS, 0.4],
  [SNAP / FPS, 0.5], [NONE / FPS, 0.4], [EIGHT / FPS, 0.5], [NOHEAD / FPS, 0.55], [CHOKE / FPS, 0.45], [LEFT / FPS, 0.45], [1907 / FPS, 0.45],
  [PARTY / FPS, 0.45], [2048 / FPS, 0.4]];
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
  { f: 0, cInf: 8 }, { f: 106, cInf: 14 }, { f: 154, cInf: 0 }, { f: 222, cInf: 12 }, { f: 274, cInf: 10 },
  { f: 312, cInf: 12 }, { f: 364, cInf: 11 }, { f: 404, cInf: 15 }, { f: 440, cInf: 8, focus: () => FA(2.2, 0.9, 5.0) },
  { f: 484, cInf: 10 }, { f: 586, cInf: 9 }, { f: 632, cInf: 15 }, { f: 676, cInf: 10 }, { f: 784, cInf: 9 }, { f: 846, cInf: 14 },
  { f: 948, cInf: 9 }, { f: 1030, cInf: 10 }, { f: 1116, cInf: 10 }, { f: 1141, cInf: 9 }, { f: 1188, cInf: 2 }, { f: 1220, cInf: 10 },
  { f: 1268, cInf: 10 }, { f: 1331, cInf: 6 }, { f: 1429, cInf: 11 }, { f: 1540, cInf: 15 }, { f: 1571, cInf: 3 }, { f: 1636, cInf: 10 },
  { f: 1684, cInf: 12 }, { f: 1738, cInf: 12 }, { f: 1788, cInf: 9 }, { f: 1862, cInf: 16 }, { f: 1928, cInf: 3 }, { f: 2006, cInf: 10 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
