// Timeline of "The Man Who Fell Through a Roof" (Joaquín de la Cantolla): shots timed to the voice
// (projects/cantolla-balloon/voice/words.json, frame numbers = word onsets at 30 fps), where every balloon is, and the
// camera grammar of the bridge/teaspoon shorts: hard cuts on big reframes, smootherstep glides, every hold creeps in,
// flip kicks on impacts. The opening is all motion: a glide beside the falling balloon, pigeons and a bell tower
// sweeping across the lens, then the crash through the skylight.
export const FPS = 30;
export const TOTAL = 2040;
export const D0 = 0; // ground level (build.ts houses stand on it)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 2;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** Catmull-Rom through keyed points [frame, pos] */
const path = (keys: [number, V3][], f: number): V3 => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) {
    const [f1, p1] = keys[i - 1], [f2, p2] = keys[i], p0 = (keys[i - 2] ?? keys[i - 1])[1], p3 = (keys[i + 1] ?? keys[i])[1];
    const t = (f - f1) / (f2 - f1), t2 = t * t, t3 = t2 * t;
    return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)) as V3;
  }
  return keys[keys.length - 1][1];
};

// ---------------- places ----------------
/** Mexico City: plaza with a fountain at the origin, cathedral on the north side, flat-roofed houses all round */
export const FOUNTAIN: V3 = [0, 0, 0];
export const FOUNT_R = 3.2, FOUNT_WATER = 0.55;
export const CATH = { z: -34, towerX: 9, towerW: 8, body: 24, belfry: 31, top: 35 };
/** the house on Salto del Agua street whose skylight he fell through (flat roof at y = H) */
export const SKY_HOUSE = { x: 50, z: -10, w: 10, d: 10, h: 8 };
export const SKYLIGHT: V3 = [SKY_HOUSE.x, SKY_HOUSE.h, SKY_HOUSE.z];
/** the dining room under that skylight, built as its own set far away (fog hides it from the city) */
export const ROOM: V3 = [0, 0, 2500];
export const ROOM_W = 7, ROOM_D = 6, ROOM_H = 4;
export const TABLE: V3 = [ROOM[0], 0, ROOM[2] - 0.6];
export const TABLE_H = 0.78;
/** the 1863 bullring (Plaza de Toros del Paseo Nuevo, our own design) */
export const BULL: V3 = [0, 0, -2500];
export const ARENA_R = 22;
/** the Chalco valley, 1914 */
export const CHALCO: V3 = [2500, 0, 0];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "city" | "room" | "bull" | "chalco";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 99, light: "day", place: "city" },        // hook: gliding beside the falling balloon, pigeons, bell tower
  { id: 2, a: 99, b: 161, light: "day", place: "room" },      // through the skylight onto the table; the family beats him up
  { id: 3, a: 161, b: 268, light: "day", place: "room" },     // by day: telegraph clerk tapping the key
  { id: 4, a: 268, b: 316, light: "golden", place: "room" },  // by night: sewing balloons
  { id: 5, a: 316, b: 404, light: "day", place: "bull" },     // 1863: the bullring full of people
  { id: 6, a: 404, b: 472, light: "day", place: "bull" },     // he rides in as a charro
  { id: 7, a: 472, b: 560, light: "day", place: "bull" },     // climbs in ... and goes up
  { id: 8, a: 560, b: 600, light: "day", place: "bull" },     // "He called it Moctezuma": low angle, it rises over the crowd
  { id: 9, a: 600, b: 639, light: "day", place: "city" },     // "And it actually flew": over the city
  { id: 10, a: 639, b: 670, light: "day", place: "city" },    // "So he built another one"
  { id: 11, a: 670, b: 718, light: "day", place: "city" },    // "And another. Higher over the city"
  { id: 12, a: 718, b: 759, light: "day", place: "city" },    // "longer over the rooftops"
  { id: 13, a: 759, b: 833, light: "day", place: "city" },    // a gust of cold air pushes him down
  { id: 14, a: 833, b: 912, light: "day", place: "city" },    // through a skylight, on Salto del Agua street
  { id: 15, a: 912, b: 968, light: "day", place: "room" },    // luckily, he landed on his feet
  { id: 16, a: 968, b: 1045, light: "day", place: "room" },   // unluckily, in somebody's dining room
  { id: 17, a: 1045, b: 1157, light: "day", place: "city" },  // hot air is lighter than the cold air around it
  { id: 18, a: 1157, b: 1241, light: "day", place: "city" },  // the beach ball under water
  { id: 19, a: 1241, b: 1328, light: "day", place: "city" },  // a balloon is a beach ball, the sky is the pool
  { id: 20, a: 1328, b: 1380, light: "golden", place: "city" }, // fifty years
  { id: 21, a: 1380, b: 1450, light: "day", place: "chalco" }, // 1914, an old man
  { id: 22, a: 1450, b: 1536, light: "day", place: "chalco" }, // one last time, with Alberto Braniff
  { id: 23, a: 1536, b: 1594, light: "day", place: "chalco" }, // the wind carries them over rebel country
  { id: 24, a: 1594, b: 1652, light: "day", place: "chalco" }, // the soldiers below opened fire
  { id: 25, a: 1652, b: 1720, light: "day", place: "chalco" }, // they came down alive
  { id: 26, a: 1720, b: 1759, light: "golden", place: "room" }, // back home, his heart gave out: his sombrero on its peg
  { id: 27, a: 1759, b: TOTAL, light: "golden", place: "city" }, // thousands of paper balloons; they still carry his name
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 8, 5: 6, 20: 10, 21: 10, 26: 14, 27: 16 };
export const FLASH_AT = 161;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- balloons ----------------
/** envelope kinds: three hot-air balloons he built (striped gores) and Braniff's 1914 gas balloon (netted sphere) */
export type BKind = "moctezuma" | "second" | "third" | "gas";
/** pos = the basket floor; sway = small pendulum roll (rad); collapse 0 (full) .. 1 (envelope flat on the roof);
 *  fire = brazier glow 0..1; people = who rides in the basket */
export type BalloonPose = { kind: BKind; pos: V3; sway: number; collapse: number; fire: number; riders: ("young" | "old" | "braniff")[] };
const swayAt = (f: number, a = 0.05) => a * Math.sin(f * 0.09) + 0.4 * a * Math.sin(f * 0.23 + 1);

/** the hook flight: from behind the cathedral, past the east bell tower, down onto the skylight house */
export const HOOK_PATH: [number, V3][] = [
  [-20, [-10, 46, -118]], [0, [-6, 45.5, -100]], [30, [5, 44, -68]], [52, [16, 39, -44]], [75, [30, 24, -24]], [98, [SKY_HOUSE.x, SKY_HOUSE.h + 0.3, SKY_HOUSE.z]],
];
/** the gust shot (13): drifting over the roofs, then pressed down onto the same house */
const GUST_PATH: [number, V3][] = [
  [740, [-6, 30, 40]], [759, [4, 29, 30]], [790, [20, 25, 14]], [815, [32, 17, 2]], [839, [SKY_HOUSE.x, SKY_HOUSE.h + 0.3, SKY_HOUSE.z]],
];
export const balloonsAt = (id: number, f: number): BalloonPose[] => {
  const young = ["young"] as ("young")[];
  switch (id) {
    case 1: { const p = path(HOOK_PATH, f); return [{ kind: "moctezuma", pos: p, sway: swayAt(f, 0.07) + 0.12 * smooth((f - 52) / 30), collapse: 0, fire: 0.6, riders: young }]; }
    case 5: return [{ kind: "moctezuma", pos: add(BULL, [0, 0, 0]), sway: 0, collapse: 0, fire: 1, riders: [] }];
    case 6: return [{ kind: "moctezuma", pos: add(BULL, [0, 0, 0]), sway: 0, collapse: 0, fire: 1, riders: [] }];
    case 7: { const up = easeIn((f - 538) / 40) * 10; return [{ kind: "moctezuma", pos: add(BULL, [0, up, 0]), sway: swayAt(f, 0.02 * smooth((f - 538) / 10)), collapse: 0, fire: 1, riders: f >= 500 ? young : [] }]; }
    case 8: { const up = 10 + (f - 560) * 0.32 + 0.004 * (f - 560) ** 2; return [{ kind: "moctezuma", pos: add(BULL, [0.4 * (f - 560) * 0.1, up, 0]), sway: swayAt(f, 0.04), collapse: 0, fire: 1, riders: young }]; }
    case 9: return [{ kind: "moctezuma", pos: [-30 + 0.35 * (f - 600), 48 + 0.06 * (f - 600), 20], sway: swayAt(f, 0.04), collapse: 0, fire: 0.8, riders: young }];
    case 10: return [{ kind: "second", pos: [-4 + 0.3 * (f - 639), 44, -24], sway: swayAt(f, 0.04), collapse: 0, fire: 0.8, riders: young }];
    case 11: return [{ kind: "third", pos: [10 + 0.3 * (f - 670), 74 + 0.12 * (f - 670), -10], sway: swayAt(f, 0.03), collapse: 0, fire: 0.8, riders: young }];
    case 12: return [{ kind: "moctezuma", pos: [-60 + 0.55 * (f - 718), 24, 30], sway: swayAt(f, 0.05), collapse: 0, fire: 0.8, riders: young }];
    case 13: { const p = path(GUST_PATH, f); return [{ kind: "moctezuma", pos: p, sway: swayAt(f, 0.05) + 0.18 * smooth((f - 770) / 20) * (1 - smooth((f - 820) / 20)), collapse: 0, fire: 0.3, riders: young }]; }
    case 14: return [{ kind: "moctezuma", pos: [SKY_HOUSE.x, SKY_HOUSE.h + 0.3, SKY_HOUSE.z], sway: 0, collapse: smooth((f - 841) / 26), fire: 0, riders: f < 839 ? young : [] }];
    case 17: return [{ kind: "moctezuma", pos: [0, 30 + 0.05 * (f - 1045), -14], sway: swayAt(f, 0.03), collapse: 0, fire: 1, riders: young }];
    case 19: { const up = easeIn((f - 1250) / 50) * 22 + Math.max(0, f - 1300) * 0.25; return [{ kind: "moctezuma", pos: [0, FOUNT_WATER + 2.2 + up, -12], sway: swayAt(f, 0.03), collapse: 0, fire: 1, riders: young }]; }
    case 20: return [{ kind: "moctezuma", pos: [-40 + 0.25 * (f - 1328), 46, -110], sway: swayAt(f, 0.03), collapse: 0, fire: 0.8, riders: young }];
    case 21: case 22: case 23: case 24: {
      const x = -60 + 0.32 * (f - 1380), y = lin([[1380, 46], [1536, 44], [1594, 27], [1652, 22]], f);
      return [{ kind: "gas", pos: add(CHALCO, [x, y, 0]), sway: swayAt(f, id === 24 ? 0.06 : 0.03), collapse: 0, fire: 0, riders: ["old", "braniff"] }];
    }
    case 25: { // coming down in a field: drop, touch down at 1676, bounce and tip
      const y = lin([[1652, 18], [1676, 0], [1684, 1.2], [1692, 0]], f);
      return [{ kind: "gas", pos: add(CHALCO, [40 + 0.12 * (f - 1652), y, 0]), sway: f < 1676 ? swayAt(f, 0.05) : 0.25 * smooth((f - 1680) / 10), collapse: smooth((f - 1690) / 30) * 0.6, fire: 0, riders: f < 1690 ? ["old", "braniff"] : [] }];
    }
    default: return [];
  }
};
/** world position of the basket floor of balloon 0 in shot id (for cameras and riders) */
export const basketAt = (id: number, f: number): V3 => balloonsAt(id, f)[0]?.pos ?? [0, 0, 0];
/** the first moment the hook balloon crashes (kick + glass) */
export const CRASH_HOOK = 98, CRASH_GUST = 839;

// ---------------- paper lanterns (finale) ----------------
/** lantern k: release frame, start point and drift (deterministic) */
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const LANTERN_N = 420;
export const lanternAt = (k: number, f: number): V3 | null => {
  if (k === 0) { // the first lone lantern of shot 26/27, rising past the lens
    const u = (f - 1760) / FPS;
    return u < 0 ? null : [6.1, 1.0 + 1.1 * u, 9.6];
  }
  const t0 = 1800 + hh(k, 1) * 200, u = (f - t0) / FPS;
  if (u < 0) return null;
  const a = hh(k, 2) * Math.PI * 2, r = 6 + 110 * Math.sqrt(hh(k, 3));
  const x = Math.cos(a) * r + 0.6 * u * Math.sin(k), z = Math.sin(a) * r - 0.5 * u;
  return [x, 1.4 + (0.9 + 0.6 * hh(k, 4)) * u * (1 + 0.04 * u), z];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
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
const R = (x: number, y: number, z: number): V3 => add(ROOM, [x, y, z]);
const B = (x: number, y: number, z: number): V3 => add(BULL, [x, y, z]);
const C = (x: number, y: number, z: number): V3 => add(CHALCO, [x, y, z]);
/** a point on the balloon envelope / basket of shot id at frame f (offset from the basket floor) */
const bal = (id: number, f: number, o: V3): V3 => add(basketAt(id, f), o);

// people's marks in the room (feet)
export const ON_TABLE: V3 = [TABLE[0], TABLE_H, TABLE[2]];
export const FAMILY: V3[] = [R(-1.55, 0, -0.1), R(1.6, 0, -0.2), R(-0.5, 0, -1.75), R(0.8, 0, -1.8)]; // papa, mama, nino, abuela
export const DESK: V3 = R(-2.0, 0, -1.4); // telegraph desk (the clerk stands behind it, facing the lens)
export const CLERK_AT: V3 = R(-2.0, 0, -2.25);
export const SEW_AT: V3 = R(1.4, 0, -1.3);
// people in the bullring and the plaza
export const HORSE_PATH = (f: number): V3 => B(-16 + 0.13 * (f - 404), 0, 6);
export const CROWD_SEATS = 140;
export const KID_AT: V3 = [2.0, 0, -2.75];  // the kid at the fountain rim with the beach ball
export const BALL0: V3 = [1.55, FOUNT_WATER - 0.05, -1.6];
export const ballAt = (f: number): V3 => {
  if (f < 1164) return [BALL0[0], FOUNT_WATER - 0.15, BALL0[2]]; // held under
  const u = (f - 1164) / FPS;
  if (f < 1205) return [BALL0[0], FOUNT_WATER - 0.15 + 0.02 * Math.sin(u * 30), BALL0[2]]; // let go: a beat of nothing (it's under)
  const v = (f - 1205) / FPS;
  return [BALL0[0] + 0.3 * v, FOUNT_WATER + 6.5 * v - 4.9 * v * v * 0.6, BALL0[2]];
};
export const REBELS: V3[] = [C(5, 0, -6), C(9, 0, -3.5), C(13, 0, -6.5), C(2, 0, -2.5), C(16, 0, -3), C(7, 0, -9)];
export const LANDING: V3 = C(43, 0, 0);
export const FIESTA: V3[] = [[-3, 0, 6], [-1.2, 0, 7.4], [1.0, 0, 6.6], [2.8, 0, 7.8], [4.4, 0, 6.2], [-4.8, 0, 8.4]];

const S1a = (f: number): Shot => { // glide behind and above the balloon, the tower crossing in the foreground
  const b = basketAt(1, f), up = smooth((f - 46) / 30);
  return { pos: add(b, [-7.5 + 2 * up, 3.2 + 3 * up, 13 - 2 * up]), look: add(b, [1.2, 3.6 - 3.5 * up, -1]), fov: 50, roll: -0.05 + 0.09 * up };
};
const S1b = (f: number): Shot => { // over the roof edge: the balloon drops past, the camera tilts down after it
  const b = basketAt(1, f);
  return dolly([SKY_HOUSE.x - 9, SKY_HOUSE.h + 6.5, SKY_HOUSE.z + 13], add(b, [0, 3.5, 0]), pushK(f, 75, 0.004), { fov: 48, roll: 0.05 });
};
const S2a = (f: number) => dolly(R(1.6, 1.15, 3.2), R(0, 2.6, -0.6), pushK(f, 99, 0.003, 0.008, 20), { fov: 50, roll: -0.04 });
const S2b = (f: number) => dolly(R(-0.3, 1.5, 2.9), R(0.05, 1.5, -0.6), pushK(f, 120, 0.0028, 0.006, 24), { fov: 46, roll: 0.03 });
const S3a = (f: number) => dolly(add(CLERK_AT, [1.6, 1.55, 2.4]), add(CLERK_AT, [-0.1, 1.2, -0.3]), pushK(f, 161, 0.0022), { fov: 40 });
const S3b = (f: number) => dolly(add(DESK, [0.7, 1.15, 1.7]), add(DESK, [0.15, 0.85, 0.25]), pushK(f, 232, 0.003, 0.006, 24), { fov: 42, roll: 0.03 });
const S4a = (f: number) => dolly(add(SEW_AT, [-1.6, 1.6, 2.8]), add(SEW_AT, [0.3, 1.35, -0.5]), pushK(f, 268, 0.0025), { fov: 42, roll: -0.03 });
const S5a = (f: number) => zoom(B(-46, 34, 46), B(0, 3, 0), 44, pushK(f, 316, 0.0016, 0.004, 30));
const S5b = (f: number) => zoom(B(-13, 2.6, 15), B(3, 7, -8), 46, pushK(f, 376, 0.0022));
const S6a = (f: number) => { const h = HORSE_PATH(f); return dolly(add(h, [1.2, 1.8, 6.4]), add(h, [0.8, 1.9, 0]), pushK(f, 404, 0.0015), { fov: 40 }); };
const S6b = (f: number) => { const h = HORSE_PATH(f); return dolly(add(h, [3.6, 1.4, 4.4]), add(h, [0.6, 2.4, 0]), pushK(f, 436, 0.0025, 0.005, 24), { fov: 40, roll: 0.035 }); };
const S7a = (f: number) => dolly(B(2.6, 2.6, 6.8), B(0.3, 2.2, 0.2), pushK(f, 472, 0.0025), { fov: 42 });
const S7b = (f: number) => zoom(B(-7, 1.7, 15), bal(7, f, [0, 6.5, 0]), 46, pushK(f, 534, 0.002), { roll: -0.04 });
const S8a = (f: number) => { const b = basketAt(8, f); return zoom(B(-4, 1.6, 19), [b[0], 1.6 + (b[1] + 3 - 1.6) * 0.55, b[2]], 62, pushK(f, 560, 0.002), { roll: 0.05 }); };
const S9a = (f: number) => zoom(add(basketAt(9, f), [-26, 10, 34]), bal(9, f, [0, 5, 0]), 46, pushK(f, 600, 0.0025, 0.006, 26));
const S10a = (f: number) => zoom([-30, 32, 26], bal(10, f, [0, 6, 0]), 44, pushK(f, 639, 0.003));
const S11a = (f: number) => zoom([-30, 52, 70], bal(11, f, [0, -4, 0]), 52, pushK(f, 670, 0.0015, 0.004, 30), { roll: 0.03 });
const S12a = (f: number): Shot => { const b = basketAt(12, f); return { pos: add(b, [-6, 4, 12]), look: add(b, [5, 2.5, -2]), fov: 46, roll: -0.04 }; };
const S13a = (f: number): Shot => { const b = basketAt(13, f); return dolly(add(b, [-12, 7, 15]), add(b, [0, 5, 0]), pushK(f, 759, 0.002), { fov: 46, roll: lin([[759, 0], [800, 0.06], [833, -0.03]], f) }); };
const S14a = (f: number) => zoom([SKY_HOUSE.x - 9, 1.6, SKY_HOUSE.z + 18], [SKY_HOUSE.x, SKY_HOUSE.h + 4, SKY_HOUSE.z], 44, pushK(f, 833, 0.0022, 0.007, 24));
const S14b = (f: number) => zoom([SKY_HOUSE.x - 8, 1.5, SKY_HOUSE.z + 11], [SKY_HOUSE.x - 3, 3.4, SKY_HOUSE.z + 4], 46, pushK(f, 857, 0.0022), { roll: 0.03 });
const S15a = (f: number) => dolly(R(0.2, 1.5, 3.4), add(ON_TABLE, [0, 1.1, 0]), pushK(f, 912, 0.0028, 0.007, 26), { fov: 44 });
const S16a = (f: number) => dolly(R(2.7, 2.7, 2.7), R(-0.2, 1.0, -0.9), pushK(f, 968, 0.0022, 0.006, 26), { fov: 56, roll: 0.03 });
const S17a = (f: number) => zoom(bal(17, f, [-12, 2, 16]), bal(17, f, [0, 6, 0]), 46, pushK(f, 1045, 0.0018));
const S17b = (f: number) => dolly(bal(17, f, [-5, 5, 13]), bal(17, f, [0, 7.5, 0]), pushK(f, 1085, 0.0022, 0.005, 24), { fov: 52, roll: -0.03 });
const S18a = (f: number) => dolly(add(BALL0, [0.6, 0.9, 3.0]), add(BALL0, [0.2, 0.25, 0]), pushK(f, 1157, 0.0025), { fov: 42 });
const S18b = (f: number): Shot => { const b = ballAt(f); return { pos: add(BALL0, [0.9, 0.55, 3.6]), look: [b[0], Math.max(1.0, b[1] * 0.85), b[2]], fov: 50, roll: 0.03 }; };
const S19a = (f: number): Shot => zoom([4, 1.2, 14], bal(19, f, [0, 5.5, 0]), 50, pushK(f, 1241, 0.0015), { roll: -0.03 });
const S20a = (f: number) => zoom([40, 26, 30], bal(20, f, [0, 5, 0]), 40, pushK(f, 1328, 0.002));
const S21a = (f: number) => zoom(C(-110, 22, 70), bal(21, f, [0, 6, 0]), 44, pushK(f, 1380, 0.0015));
const S22a = (f: number) => dolly(bal(22, f, [2.2, 1.6, 4.4]), bal(22, f, [0, 1.25, 0]), pushK(f, 1450, 0.0022, 0.005, 24), { fov: 42 });
const S23a = (f: number) => zoom(bal(23, f, [-2.6, 3.8, 4.4]), bal(23, f, [5, -15, -2]), 58, pushK(f, 1536, 0.002), { roll: 0.03 });
const S24a = (f: number) => zoom(C(-4, 1.2, 16), C(8, 13, -5), 64, pushK(f, 1594, 0.002, 0.007, 20), { roll: -0.05 });
const S24b = (f: number) => dolly(bal(24, f, [-2.4, 1.4, 4.2]), bal(24, f, [0, 1.3, 0]), pushK(f, 1623, 0.003, 0.008, 20), { fov: 44, roll: 0.04 });
const S25a = (f: number) => zoom(C(30, 1.6, 16), add(LANDING, [0, 2.5, 0]), 46, pushK(f, 1652, 0.002));
const S25b = (f: number) => dolly(add(LANDING, [2.2, 1.3, 5.5]), add(LANDING, [3.6, 0.7, 0.4]), pushK(f, 1696, 0.0025), { fov: 42 });
const S26a = (f: number) => dolly(R(1.8, 1.5, 2.6), R(-0.6, 1.4, -2.6), pushK(f, 1720, 0.0015), { fov: 42 });
const S27a = (f: number): Shot => { const l = lanternAt(0, f) ?? [6.1, 1, 9.6]; return { pos: [l[0] + 0.4, Math.max(1.4, l[1] - 1.4), l[2] + 4.6], look: [l[0], l[1] + 0.4, l[2]], fov: 46, roll: 0.02 }; };
const S27b = (f: number) => zoom([0, 3.5, 34], [0, 16, -10], 50, pushK(f, 1862, 0.0018, 0.004, 30));
const S27c = (f: number) => zoom([-6, 2.0, 16], [0, 12, -6], 52, pushK(f, 1947, 0.002), { roll: -0.03 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 72, dur: 20, s: S1b }],
  2: [{ f: 99, s: S2a }, { f: 120, cut: true, s: S2b }],
  3: [{ f: 161, s: S3a }, { f: 232, cut: true, s: S3b }],
  4: [{ f: 264, s: S4a }],
  5: [{ f: 316, s: S5a }, { f: 376, cut: true, s: S5b }],
  6: [{ f: 404, s: S6a }, { f: 436, cut: true, s: S6b }],
  7: [{ f: 472, s: S7a }, { f: 534, cut: true, s: S7b }],
  8: [{ f: 560, s: S8a }],
  9: [{ f: 600, s: S9a }],
  10: [{ f: 639, s: S10a }],
  11: [{ f: 670, s: S11a }],
  12: [{ f: 718, s: S12a }],
  13: [{ f: 759, s: S13a }],
  14: [{ f: 833, s: S14a }, { f: 857, cut: true, s: S14b }],
  15: [{ f: 912, s: S15a }],
  16: [{ f: 968, s: S16a }],
  17: [{ f: 1045, s: S17a }, { f: 1085, cut: true, s: S17b }],
  18: [{ f: 1157, s: S18a }, { f: 1205, cut: true, s: S18b }],
  19: [{ f: 1241, s: S19a }],
  20: [{ f: 1323, s: S20a }],
  21: [{ f: 1375, s: S21a }],
  22: [{ f: 1450, s: S22a }],
  23: [{ f: 1536, s: S23a }],
  24: [{ f: 1594, s: S24a }, { f: 1623, cut: true, s: S24b }],
  25: [{ f: 1652, s: S25a }, { f: 1696, cut: true, s: S25b }],
  26: [{ f: 1713, s: S26a }],
  27: [{ f: 1751, s: S27a }, { f: 1862, cut: true, s: S27b }, { f: 1947, cut: true, s: S27c }],
};

/** impact kicks (flip sign every frame, decay over 7 f) */
const KICKS: [number, number][] = [[CRASH_HOOK / FPS, 0.9], [106 / FPS, 0.6], [132 / FPS, 0.5], [CRASH_GUST / FPS, 0.8], [1205 / FPS, 0.4], [1623 / FPS, 0.6], [1676 / FPS, 0.7]];
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
  { f: 0, cInf: 0 },                                   // hook: all sharp, all motion
  { f: 99, cInf: 10 },                                 // room
  { f: 161, cInf: 11 }, { f: 232, cInf: 14 }, { f: 268, cInf: 10 },
  { f: 316, cInf: 0 }, { f: 404, cInf: 8 }, { f: 472, cInf: 10 }, { f: 534, cInf: 0 },
  { f: 718, cInf: 6 }, { f: 759, cInf: 0 }, { f: 833, cInf: 0 },
  { f: 912, cInf: 12 }, { f: 968, cInf: 8 },
  { f: 1045, cInf: 0 }, { f: 1157, cInf: 13 }, { f: 1205, cInf: 9 }, { f: 1241, cInf: 6 },
  { f: 1328, cInf: 0 }, { f: 1450, cInf: 9 }, { f: 1536, cInf: 0 }, { f: 1594, cInf: 7 }, { f: 1623, cInf: 10 },
  { f: 1652, cInf: 0 }, { f: 1696, cInf: 9 }, { f: 1720, cInf: 10 }, { f: 1812, cInf: 4 }, { f: 1862, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
