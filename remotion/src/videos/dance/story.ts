// Timeline of "The Summer Everyone Danced" (the Strasbourg dancing plague of 1518): shots timed to the voice
// (projects/dancing-plague/voice/words.json; frame numbers below = word onsets at 30 fps), the story state (the stage,
// the band, the crowd size, the red shoes) and the camera grammar of the bridge short: hard cuts on big reframes,
// smootherstep glides of 18-40 f, every hold creeps in, flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 2070; // voice ends 2010 ("shoes.") + a short button
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
// Strasbourg, 1518: the horse market square (the stage, the guild hall, the hitching rail, a bread stall, the saint's
// column), a street north to the pink cathedral (Frau Troffea's door); and 3 km away the hills with the saint's shrine.
export const TOWN: V3 = [0, 0, 0];
export const STAGE: V3 = [0, 0, -6];           // the wooden stage: 7 x 4.5 m, deck at 1.3 m, steps on its +z side
export const DECK = 1.3;
export const GUILD: V3 = [-14, 0, -14];          // the guild hall's front door (the building stands at x < -14, facing +x)
export const RAIL: V3 = [13, 0, -20];            // hitching rail with the horses (it is the horse market)
export const STALL: V3 = [13, 0, 10];            // the empty bread stall
export const COLUMN: V3 = [-9, 0, 12];           // the saint's column (statue on top)
export const COL_H = 3.6;
export const BENCH: V3 = [-14.2, 0, 3];          // the neighbours' bench against a house front
export const DOOR: V3 = [4.0, 0, -50];           // Frau Troffea's front door (street east side, facing -x)
export const CATH_Z = -80;                       // the cathedral's west front
export const HILL: V3 = [3000, 0, 0];            // the hills: the shrine on a rise
/** height of the hill terrain at local (x, z) */
export const hillH = (x: number, z: number) => {
  const m = (cx: number, cz: number, r: number, h: number) => { const d = ((x - cx) ** 2 + (z - cz) ** 2) / (r * r); return d < 1 ? h * (1 - d) * (1 - d) : 0; };
  return m(0, -40, 60, 9) + m(-70, -110, 70, 16) + m(80, -140, 80, 20) + m(-120, -20, 50, 8) + m(110, 10, 45, 6);
};
export const SHRINE: V3 = [HILL[0], hillH(0, -40), HILL[2] - 40]; // chapel door step
/** the wagon road: from the valley floor up to the shrine door (local hill x, z) */
export const ROAD: [number, number][] = [[-6, 60], [8, 40], [14, 20], [4, 2], [-8, -14], [-4, -26], [0, -34]];
export const roadAt = (u: number): V3 => {
  const n = ROAD.length - 1, s = clamp01(u) * n, i = Math.min(n - 1, Math.floor(s)), k = s - i;
  const p0 = ROAD[Math.max(0, i - 1)], p1 = ROAD[i], p2 = ROAD[i + 1], p3 = ROAD[Math.min(n, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (-a + 3 * b - 3 * c + d) * k * k * k);
  const x = cr(p0[0], p1[0], p2[0], p3[0]), z = cr(p0[1], p1[1], p2[1], p3[1]);
  return [HILL[0] + x, hillH(x, z), HILL[2] + z];
};

// ---------------- shots ----------------
export type Light = "day" | "golden" | "moon" | "dusk";
export type Place = "town" | "hill";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 120, light: "day", place: "town" },      // hook: a whole city caught a disease that made people dance
  { id: 2, a: 120, b: 190, light: "day", place: "town" },    // the doctors' cure? more dancing
  { id: 3, a: 190, b: 345, light: "day", place: "town" },    // Strasbourg, July: Frau Troffea steps out and dances
  { id: 4, a: 345, b: 445, light: "day", place: "town" },    // no music, no reason; days (time-lapse)
  { id: 5, a: 445, b: 515, light: "day", place: "town" },    // thirty neighbours join her
  { id: 6, a: 515, b: 650, light: "day", place: "town" },    // four hundred, on bleeding feet
  { id: 7, a: 650, b: 828, light: "day", place: "town" },    // the doctors: hot blood, dance it out
  { id: 8, a: 828, b: 1072, light: "day", place: "town" },   // guild halls, the stage, a band, strong men
  { id: 9, a: 1072, b: 1177, light: "day", place: "town" },  // luckily the music worked; unluckily on everyone
  { id: 10, a: 1177, b: 1345, light: "day", place: "town" }, // the council spun around; the ban
  { id: 11, a: 1345, b: 1526, light: "moon", place: "town" },// mass panic: hungry, sick, a saint who cursed with dancing
  { id: 12, a: 1526, b: 1686, light: "day", place: "town" }, // like a yawn; your feet start moving
  { id: 13, a: 1686, b: 1794, light: "golden", place: "hill" }, // carted off to the shrine in the hills
  { id: 14, a: 1794, b: 1911, light: "golden", place: "hill" }, // red shoes; by September the dancing stopped
  { id: 15, a: 1911, b: 1980, light: "dusk", place: "town" }, // the cure wasn't a band
  { id: 16, a: 1980, b: TOTAL, light: "dusk", place: "hill" },// it was new shoes
];
/** crossfades (frames) at time / place changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 3: 8, 11: 10, 12: 8, 13: 12, 15: 10, 16: 8 };
export const FLASH_AT = 190;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the story state ----------------
export const STEP_OUT = 282;      // "stepped": Troffea's door opens, she steps into the street
export const FIRST_DANCE = 322;   // "dancing": she starts
/** the days time-lapse in shot 4 ("didn't stop for days"): 0 day .. 1 night */
export const nightAt = (id: number, f: number) => (id === 4 && f >= 398 ? 0.5 - 0.5 * Math.cos(clamp01((f - 398) / 42) * 3 * Math.PI * 2) : 0);
/** neighbours joining in shot 5: how many of the 30 are dancing */
export const joinedAt = (f: number) => Math.floor(clamp01((f - 455) / 46) * 30);
/** the guild hall doors burst open on "cleared" */
export const CLEAR = 845;
export const doorsAt = (id: number, f: number) => (id === 8 ? smooth((f - CLEAR) / 6) : id >= 9 && id <= 10 ? 1 : 0);
/** the stage: 0 nothing .. 1 built (shot 8b, "built a wooden stage"), torn down in 10b ("tore down") */
export const BUILD0 = 889, BUILD1 = 922, TEAR = 1231;
export const stageAt = (id: number, f: number) => {
  if (id < 8) return 0;
  if (id === 8) return f < 887 ? 0 : clamp01((f - BUILD0) / (BUILD1 - BUILD0));
  if (id === 9) return 1;
  if (id === 10) return f < TEAR ? 1 : 1 - clamp01((f - TEAR) / 20);
  return 0;
};
/** the band is on the stage from "hired a band" (961) to "sent the band home" (1265) */
export const BAND_ON = 958, BAND_OFF = 1265;
export const bandPlays = (id: number, f: number) => (id === 8 && f >= BAND_ON) || id === 9 || (id === 10 && f < 1226);
/** "it worked on everyone": the council, the doctors and the strong men start dancing */
export const EVERYONE = 1147;
/** the council's spin on "spun around" */
export const spinAt = (f: number) => clamp01((f - 1193) / 22);
/** the crier's bell on "banned" */
export const BAN = 1296;
/** the yawns: someone yawns on "yawn" (1582), you yawn on "yawn" (1596); the neighbour dances on "dance" (1632);
 *  the feet start on "start" (1655) */
export const YAWN1 = 1580, YAWN2 = 1594, NDANCE = 1630, FEET = 1653;
/** the wagon along the road (shot 13: up the road; later parked below the shrine) */
export const wagonAt = (id: number, f: number) => (id === 13 ? 0.3 + 0.16 * clamp01((f - 1680) / 66) : 0.8);
export const wagonPose = (id: number, f: number) => {
  const u = wagonAt(id, f), p = roadAt(u), q = roadAt(u + 0.01);
  return { p, yaw: Math.atan2(q[0] - p[0], q[2] - p[2]), u };
};
/** red shoes are handed over on "shoes" (1825); "stopped" (1889): everyone stops */
export const SHOES = 1823, STOPPED = 1887;
export const popAt = (f: number, f0: number) => clamp01((f - f0) / 6);
export const T = (x: number, y: number, z: number) => add(TOWN, [x, y, z]);
export const H = (x: number, y: number, z: number): V3 => [HILL[0] + x, hillH(x, z) + y, HILL[2] + z];

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
export const TROF_ST: V3 = T(2.2, 0.04, -50);   // Troffea in the street outside her door
export const DOC_P: V3 = T(4.5, 0.04, 6);        // the doctors' patient on the square
export const STRONG_P: V3 = T(-3.5, 0.04, 2.5);  // the strong men holding a dancer up
export const MASTER_P: V3 = T(-11.0, 0.04, -9.8); // the council in front of the guild hall
export const eye = (p: V3, h = 1.45): V3 => [p[0], p[1] + h, p[2]];

// framings; each pushes in from the frame its key starts
const S1a = (f: number) => zoom(T(18, 24, 40), T(-3, 9, -34), 54, pushK(f, 0, 0.0016, 0.004, 30), { roll: -0.03 });               // the city and its dancing square
const S1b = (f: number) => dolly(T(-1.5, 3.2, 12), T(0.5, 1.4, 2), pushK(f, 84, 0.003, 0.007, 24), { fov: 42, roll: 0.03 });     // "made people dance"
const S2a = (f: number) => dolly(add(DOC_P, [0.0, 1.6, 5.6]), add(DOC_P, [-0.25, 1.3, 0]), pushK(f, 120, 0.0024, 0.007, 24), { fov: 40 }); // doctor + patient
const S3a = (f: number) => zoom(T(-2.0, 1.6, -28), T(0, 30, -80), 68, pushK(f, 186, 0.0018));                                      // Strasbourg: the street + the cathedral
const S3b = (f: number) => dolly(T(-3.2, 1.6, -45.5), T(2.8, 1.3, -50.2), pushK(f, 238, 0.0022, 0.006, 24), { fov: 42 });         // her door: she steps out
const S4a = (f: number) => dolly(add(TROF_ST, [-1.4, 1.45, 3.0]), eye(TROF_ST, 1.1), pushK(f, 345, 0.0026, 0.006, 24), { fov: 40, roll: -0.03 }); // alone, no music
const S4b = (f: number) => zoom(T(-6.5, 3.4, -40), T(1.5, 1.6, -51), 46, pushK(f, 394, 0.0018));                                   // days: time-lapse
const S5a = (f: number) => zoom(T(-7.5, 5.0, -36), T(1.0, 1.0, -50), 50, pushK(f, 445, 0.0018, 0.004, 24));                       // thirty neighbours
const S6a = (f: number) => zoom(T(-20, 20, 30), T(1, 0, -10), 52, pushK(f, 515, 0.0016, 0.005, 30));                              // four hundred on the square
const S6b = (f: number) => dolly(T(0.7, 0.35, 4.6), T(0.1, 0.22, 3.0), pushK(f, 612, 0.003, 0.008, 20), { fov: 40, roll: 0.035 }); // bleeding feet
const S7a = (f: number) => dolly(add(DOC_P, [0.1, 1.8, 7.5]), add(DOC_P, [-0.8, 1.35, 0]), pushK(f, 650, 0.0022), { fov: 42 });     // the diagnosis
const S7b = (f: number) => dolly(add(DOC_P, [-0.5, 1.85, 2.3]), add(DOC_P, [-0.58, 1.85, 0]), pushK(f, 700, 0.003, 0.008, 20), { fov: 38, roll: 0.03 }); // hot blood: the flask
const S7c = (f: number) => dolly(add(DOC_P, [-0.5, 1.7, 7.5]), add(DOC_P, [-0.8, 1.25, 0]), pushK(f, 737, 0.0022, 0.006, 24), { fov: 42 }); // dance it out
const S8a = (f: number) => dolly(T(-4.0, 2.2, -5.0), T(-13.0, 1.8, -13.0), pushK(f, 828, 0.0024, 0.006, 24), { fov: 46 });       // the guild hall doors
const S8b = (f: number) => zoom(T(9, 3.2, 9), T(0, 1.1, -6), 46, pushK(f, 887, 0.0018, 0.005, 24));                               // the stage goes up
const S8c = (f: number) => dolly(T(1.0, 2.4, 4.5), T(0, 2.3, -6.5), pushK(f, 953, 0.003, 0.007, 24), { fov: 42, roll: -0.03 });   // a band
const S8d = (f: number) => dolly(add(STRONG_P, [0.3, 1.6, 5.6]), add(STRONG_P, [0, 1.4, 0]), pushK(f, 984, 0.0024, 0.006, 24), { fov: 46 }); // strong men
const S9a = (f: number) => dolly(T(2.5, 2.2, 9.5), T(0, 1.8, -5.5), pushK(f, 1072, 0.0024, 0.006, 24), { fov: 44 });                  // the music worked
const S9b = (f: number) => zoom(T(14, 9, 22), T(-1, 0.5, -6), 52, pushK(f, 1112, 0.0018, 0.006, 30));                             // on everyone
const S10a = (f: number) => dolly(add(MASTER_P, [1.0, 1.55, 2.8]), eye(MASTER_P, 1.3), pushK(f, 1177, 0.0026, 0.006, 24), { fov: 40 }); // the spin
const S10b = (f: number) => zoom(T(-8, 2.6, 10), T(0, 1.2, -6), 46, pushK(f, 1226, 0.002, 0.006, 24), { roll: 0.03 });            // tore down the stage
const S10c = (f: number) => dolly(T(8.5, 1.9, 13), T(2.0, 1.1, 1.5), pushK(f, 1263, 0.0022), { fov: 40 });                        // the band goes home
const S10d = (f: number) => dolly(T(-1.5, 1.5, 9.0), T(-6.5, 1.8, 13.5), pushK(f, 1293, 0.0026, 0.007, 24), { fov: 42, roll: -0.03 }); // the ban
const S11a = (f: number) => zoom(T(18, 18, 30), T(-2, 1, -14), 50, pushK(f, 1342, 0.0016));                                       // night: panic
const S11b = (f: number) => dolly(add(STALL, [-2.4, 1.6, 5.4]), add(STALL, [0.2, 1.2, 0.6]), pushK(f, 1408, 0.0026, 0.006, 24), { fov: 42 }); // hungry, sick
const S11c = (f: number) => dolly(add(COLUMN, [0.6, 2.2, 4.4]), add(COLUMN, [0, COL_H + 0.9, 0]), pushK(f, 1447, 0.0024, 0.007, 24), { fov: 50, roll: 0.035 }); // the saint
const S12a = (f: number) => dolly(add(BENCH, [5.0, 1.25, 0.0]), add(BENCH, [0.3, 1.0, 0.0]), pushK(f, 1526, 0.0024, 0.006, 24), { fov: 46 }); // the yawns
const S12b = (f: number) => dolly(add(BENCH, [5.2, 1.4, 1.6]), add(BENCH, [1.0, 1.0, 0.3]), pushK(f, 1612, 0.0022), { fov: 44 }); // the neighbour dances
const S12c = (f: number) => dolly(add(BENCH, [2.7, 0.4, 1.5]), add(BENCH, [0.6, 0.3, 0.85]), pushK(f, 1643, 0.003, 0.008, 20), { fov: 40, roll: 0.03 }); // his feet
const S13a = (f: number) => { const w = wagonPose(13, f); return zoom(H(-12, 5, 12), [w.p[0] + Math.sin(w.yaw) * 1.6, w.p[1] + 1.2, w.p[2] + Math.cos(w.yaw) * 1.6], 40, pushK(f, 1680, 0.0016)); }; // the wagon, tracked
const S13b = (f: number) => dolly(H(5.5, 2.3, -26), H(0, 2.4, -41), pushK(f, 1745, 0.0022, 0.006, 24), { fov: 46 });             // the shrine
const S14a = (f: number) => dolly(H(0.9, 1.5, -32.4), H(0.0, 1.2, -36.2), pushK(f, 1794, 0.0026, 0.007, 24), { fov: 42 });    // red shoes
const S14b = (f: number) => dolly(H(-4.5, 2.4, -23), H(0, 1.0, -36), pushK(f, 1848, 0.0018, 0.006, 24), { fov: 46, roll: 0.03 }); // the dancing stopped
const S15a = (f: number) => dolly(T(5.8, 1.4, 4.6), T(0, 0.8, -2.4), pushK(f, 1906, 0.0022, 0.006, 24), { fov: 46 });          // the band, idle
const S16a = (f: number) => dolly(H(1.3, 0.45, -32.4), H(0.2, 0.35, -35.0), pushK(f, 1976, 0.0026, 0.007, 24), { fov: 40, roll: -0.03 }); // new shoes

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 84, cut: true, s: S1b }],
  2: [{ f: 120, s: S2a }],
  3: [{ f: 186, s: S3a }, { f: 238, cut: true, s: S3b }],
  4: [{ f: 345, s: S4a }, { f: 394, cut: true, s: S4b }],
  5: [{ f: 445, s: S5a }],
  6: [{ f: 515, s: S6a }, { f: 612, cut: true, s: S6b }],
  7: [{ f: 650, s: S7a }, { f: 700, cut: true, s: S7b }, { f: 737, cut: true, s: S7c }],
  8: [{ f: 828, s: S8a }, { f: 887, cut: true, s: S8b }, { f: 953, cut: true, s: S8c }, { f: 984, cut: true, s: S8d }],
  9: [{ f: 1072, s: S9a }, { f: 1112, cut: true, s: S9b }],
  10: [{ f: 1177, s: S10a }, { f: 1226, cut: true, s: S10b }, { f: 1263, cut: true, s: S10c }, { f: 1293, cut: true, s: S10d }],
  11: [{ f: 1342, s: S11a }, { f: 1408, cut: true, s: S11b }, { f: 1447, cut: true, s: S11c }],
  12: [{ f: 1526, s: S12a }, { f: 1612, cut: true, s: S12b }, { f: 1643, cut: true, s: S12c }],
  13: [{ f: 1680, s: S13a }, { f: 1745, cut: true, s: S13b }],
  14: [{ f: 1794, s: S14a }, { f: 1848, cut: true, s: S14b }],
  15: [{ f: 1906, s: S15a }],
  16: [{ f: 1976, s: S16a }],
};

/** impact kicks (flip sign every frame, decay over 7 f): "dance", "more dancing", "dancing", "days", "feet", "hot blood",
 *  "out", "cleared", "band", "everyone", "tore", "banned", "dancing" (the curse), "stopped", "band", "shoes" */
const KICKS: [number, number][] = [[101 / FPS, 0.45], [161 / FPS, 0.45], [FIRST_DANCE / FPS, 0.45], [424 / FPS, 0.4], [632 / FPS, 0.5], [707 / FPS, 0.5],
  [809 / FPS, 0.4], [CLEAR / FPS, 0.5], [961 / FPS, 0.4], [EVERYONE / FPS, 0.55], [TEAR / FPS, 0.55], [BAN / FPS, 0.5], [1502 / FPS, 0.45],
  [STOPPED / FPS, 0.5], [1962 / FPS, 0.4], [1995 / FPS, 0.45]];
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
  { f: 0, cInf: 0 },
  { f: 84, cInf: 11 },
  { f: 120, cInf: 12, focus: () => eye(add(DOC_P, [-1.0, 0, 0]), 1.55) },
  { f: 186, cInf: 0 },
  { f: 238, cInf: 8 },
  { f: 345, cInf: 13, focus: () => eye(TROF_ST, 1.4) },
  { f: 394, cInf: 5 },
  { f: 445, cInf: 4 },
  { f: 515, cInf: 0 },
  { f: 612, cInf: 15 },
  { f: 650, cInf: 11 },
  { f: 700, cInf: 15 },
  { f: 737, cInf: 10 },
  { f: 828, cInf: 9 },
  { f: 887, cInf: 0 },
  { f: 953, cInf: 10 },
  { f: 984, cInf: 11 },
  { f: 1072, cInf: 9 },
  { f: 1112, cInf: 0 },
  { f: 1177, cInf: 12 },
  { f: 1226, cInf: 5 },
  { f: 1263, cInf: 9 },
  { f: 1293, cInf: 10 },
  { f: 1342, cInf: 0 },
  { f: 1408, cInf: 11 },
  { f: 1447, cInf: 9 },
  { f: 1526, cInf: 12 },
  { f: 1612, cInf: 9 },
  { f: 1643, cInf: 15 },
  { f: 1680, cInf: 0 },
  { f: 1745, cInf: 6 },
  { f: 1794, cInf: 13 },
  { f: 1848, cInf: 7 },
  { f: 1906, cInf: 10 },
  { f: 1976, cInf: 14 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
