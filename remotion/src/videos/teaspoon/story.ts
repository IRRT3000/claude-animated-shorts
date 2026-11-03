// Timeline of "The Teaspoon That Calmed a Pond": shots timed to the voice (projects/teaspoon-pond/voice/words.json,
// frame numbers below = word onsets at 30 fps), the pond physics (where the oil film is), and the camera grammar
// of the bridge short: hard cuts on big reframes, smootherstep glides of 18-40 f, every hold creeps in, flip kicks.
export const FPS = 30;
export const TOTAL = 2046;
export const D0 = 0; // ground level (build.ts houses stand on it)
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

// ---------------- places ----------------
/** Clapham pond: an ellipse around the origin, water surface a little below the lawn */
export const POND = { rx: 60, rz: 40, y: -0.18 };
export const inPond = (x: number, z: number, m = 0) => (x / (POND.rx + m)) ** 2 + (z / (POND.rz + m)) ** 2 < 1;
/** Franklin's spot on the windward (west) bank; the wind blows toward +x */
export const JETTY = { x0: -63.5, x1: -56.4, z: 4, w: 2.2, y: 0.18 }; // little landing stage into the pond
export const FR: V3 = [-57.2, JETTY.y, 4];
export const DROP: V3 = [-56.3, POND.y, 3.8]; // where the oil lands (off the end of the jetty)
/** the friends' picnic spot just behind him */
export const FRIENDS: V3[] = [[-64.6, 0, 8.2], [-63.0, 0, 9.4], [-66.3, 0, 9.9]];
export const BED: V3 = [-74, 0, -9]; // the bedsheet explainer, on the lawn
export const PATH_Z = 58;            // the walk along the north path (shot 4)
/** the 1757 fleet, far away from the pond (fog hides one place from the other) */
export const SEA: V3 = [0, 0, -2600];
export type Ship = { x: number; z: number; yaw: number; s: number; wake: boolean };
export const SHIPS: Ship[] = [
  { x: 0, z: 0, yaw: 0, s: 1, wake: false },        // Franklin's ship (the camera rides on it in shots 2-3)
  { x: 46, z: -40, yaw: 0, s: 1, wake: true },      // one of the two with smooth wakes
  { x: 92, z: -18, yaw: 0, s: 0.95, wake: true },   // the other one (the cook's ship)
  { x: 70, z: -95, yaw: 0, s: 0.9, wake: false },
  { x: 140, z: -70, yaw: 0, s: 0.9, wake: false },
  { x: 18, z: -120, yaw: 0, s: 0.85, wake: false },
  { x: 175, z: -130, yaw: 0, s: 0.8, wake: false },
];
export const SHIP_DECK = 3.2; // deck height above the sea (m), ship scale 1

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "pond" | "sea";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; wind: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "day", place: "pond", wind: 1 },       // hook: the teaspoon (flash-forward)
  { id: 2, a: 150, b: 314, light: "day", place: "sea", wind: 1 },      // the fleet, two calm wakes
  { id: 3, a: 314, b: 444, light: "day", place: "sea", wind: 1 },      // captain shrugs, the cook's dishwater
  { id: 4, a: 444, b: 574, light: "golden", place: "pond", wind: 0.3 }, // years: walking with the question
  { id: 5, a: 574, b: 751, light: "day", place: "pond", wind: 1 },      // windy day, walks up, tips the spoon
  { id: 6, a: 751, b: 885, light: "day", place: "pond", wind: 1 },      // aerial: wider, wider, wider
  { id: 7, a: 885, b: 977, light: "day", place: "pond", wind: 1 },      // smooth as a mirror
  { id: 8, a: 977, b: 1046, light: "day", place: "pond", wind: 1 },     // luckily: friends applaud
  { id: 9, a: 1046, b: 1190, light: "day", place: "pond", wind: 1 },    // unluckily: the walking stick
  { id: 10, a: 1190, b: 1326, light: "day", place: "pond", wind: 1 },   // wind needs ripples
  { id: 11, a: 1326, b: 1460, light: "day", place: "pond", wind: 1 },   // the bedsheet
  { id: 12, a: 1460, b: 1647, light: "day", place: "pond", wind: 1 },   // one molecule thick
  { id: 13, a: 1647, b: 1844, light: "day", place: "pond", wind: 1 },   // the twist: teaspoon vs half an acre
  { id: 14, a: 1844, b: 1955, light: "golden", place: "pond", wind: 0.6 }, // measured a molecule
  { id: 15, a: 1955, b: TOTAL, light: "golden", place: "pond", wind: 0.6 }, // never did the maths
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 8, 5: 8, 10: 6, 14: 10 };
export const FLASH_AT = 150;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the oil film ----------------
/** tip of the spoon (frames): hook (flash-forward) and the real moment on "teaspoon" */
export const TIP_HOOK = 100, TIP = 708;
/** radius (m) of the calm, oil-smoothed patch. It starts at the drop point and drifts downwind as it grows
 *  (the letter: it spread "till it reached the lee side"). Three pulses on "wider, and wider, and wider". */
export const calmR = (id: number, f: number) => {
  if (id === 1) return lin([[TIP_HOOK + 6, 0], [TIP_HOOK + 20, 1.6], [150, 5.5]], f);
  if (id < 5 || id === 4) return 0;
  if (id === 5) return lin([[TIP + 6, 0], [TIP + 18, 0.9], [751, 2.2]], f);
  if (id === 6) return lin([[751, 2.2], [790, 4], [834, 6], [846, 11], [860, 12], [868, 18], [878, 19.5], [885, 22]], f);
  if (id === 7) return lin([[885, 22], [935, 27]], f);
  if (id === 10) return 27;
  if (id === 12) return lin([[1460, 20.0], [1560, 26.0], [1647, 29]], f); // the edge crosses the macro camera
  return 27;
};
export const calmC = (R: number): [number, number] => [DROP[0] + 0.92 * R, DROP[2]];
/** how choppy the open water is (0 = glass), per shot: the wind blows hardest on "a windy day" */
export const chopAt = (id: number, f: number) => {
  const s = SHOTS[id - 1];
  if (id === 4 || id === 14 || id === 15) return 0.35;
  if (id === 10) return lin([[1190, 0.25], [1260, 0.3], [1290, 1.0], [1326, 1.15]], f); // ripples grow once the wind can grab them
  return s.wind;
};

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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sea = (x: number, y: number, z: number): V3 => [SEA[0] + x, SEA[1] + y, SEA[2] + z];

/** Franklin's position over the film (he walks up to the bank in shot 5, walks off at the end) */
export const franklinAt = (id: number, f: number): V3 => {
  if (id === 5) { const u = smooth((f - 628) / 52); return [FR[0] - 8.5 * (1 - u), JETTY.y * smooth((u - 0.25) / 0.1), FR[2]]; }
  if (id === 15) { const u = clamp01((f - 2000) / 46); return [FR[0] - 1.9 * u, JETTY.y, FR[2]]; }
  if (id === 4) return [-46 + 0.95 * ((f - 444) / FPS), 0, PATH_Z];
  return FR;
};
const frEye = (id: number, f: number): V3 => add(franklinAt(id, f), [0, 1.75, 0]);

// framings (f -> camera); each pushes in from the frame its key starts
const S1a = (f: number) => dolly(add(FR, [-1.6, 1.55, 4.6]), add(FR, [0.75, 1.0, -0.6]), pushK(f, 0, 0.0028), { fov: 42 });
const S1b = (f: number) => dolly(add(FR, [0.75, 1.35, 2.3]), add(FR, [0.75, 0.75, 0]), pushK(f, 89, 0.003, 0.006, 30), { fov: 38, roll: 0.04 });
const S2a = (f: number) => dolly(sea(-4, SHIP_DECK + 1.7, 1.0), sea(50, 3, -40), pushK(f, 150, 0.0018), { fov: 42 });
const S2b = (f: number) => dolly(sea(-10, 34, 20), sea(60, 0, -36), pushK(f, 228, 0.0022, 0.005, 30), { fov: 44, roll: -0.03 });
const S3a = (f: number) => dolly(sea(-4.6, SHIP_DECK + 1.6, 3.2), sea(-1.2, SHIP_DECK + 1.5, -0.6), pushK(f, 314, 0.0025, 0.006, 26), { fov: 38 });
const S3b = (f: number) => dolly(sea(84, 2.4, -6.5), sea(91.4, SHIP_DECK * 0.95 + 0.6, -14.4), pushK(f, 359, 0.0025), { fov: 40, roll: 0.03 });
const S4a = (f: number) => { const F = franklinAt(4, f); return dolly([F[0] + 1.0, 1.55, PATH_Z + 7.4], [F[0] + 0.4, 1.3, PATH_Z], pushK(f, 444, 0.0015), { fov: 42 }); };
const S4b = (f: number) => { const F = franklinAt(4, f); return dolly([F[0] + 4.6, 1.7, PATH_Z + 2.2], [F[0], 1.55, PATH_Z], pushK(f, 495, 0.0025), { fov: 38, roll: 0.035 }); };
const S5a = (f: number) => dolly([-92, 9, 40], [-20, -1, 0], pushK(f, 574, 0.0018, 0.005, 30), { fov: 42 });
const S5b = (f: number) => { const F = franklinAt(5, f); return dolly([F[0] + 3.4, 1.6, F[2] + 6.4], [F[0] + 1.2, 1.25, F[2]], pushK(f, 628, 0.002), { fov: 40 }); };
const S5c = (f: number) => dolly(add(FR, [0.8, 1.4, 2.3]), add(FR, [0.75, 0.75, 0]), pushK(f, 695, 0.003, 0.006, 30), { fov: 38, roll: -0.04 });
const S6a = (f: number) => dolly([-70, 30, 34], [-42, -0.4, 4], pushK(f, 751, 0.0012), { fov: 44 });
const S6b = (f: number) => dolly([-74, 48, 52], [-36, -0.4, 4], pushK(f, 834, 0.0012), { fov: 46, roll: 0.03 });
const S7a = (f: number) => dolly([-66.5, 1.2, -6.5], [-25, 0.2, 10], pushK(f, 885, 0.0022, 0.006, 30), { fov: 42 });
const S8a = (f: number) => dolly(add(FR, [3.6, 1.7, 10.4]), add(FR, [-1.6, 1.3, 5.2]), pushK(f, 977, 0.0025, 0.006, 26), { fov: 40, roll: -0.035 });
const S9a = (f: number) => dolly(add(FR, [1.6, 1.6, 11.6]), add(FR, [-2.6, 1.5, 7.4]), pushK(f, 1046, 0.002, 0.005, 26), { fov: 38 });
const S9b = (f: number) => dolly(add(FR, [2.0, 1.75, 4.6]), add(FR, [0.8, 1.6, 0]), pushK(f, 1093, 0.0025), { fov: 38, roll: 0.04 });
const S9c = (f: number) => dolly(add(FR, [1.2, 1.8, 2.4]), add(FR, [0.85, 1.3, 0]), pushK(f, 1158, 0.003), { fov: 36 });
/** the oil's edge at the macro shots: calm (oiled) water on screen-left, open water on screen-right */
export const MACRO: V3 = [calmC(27)[0] + 27, POND.y, calmC(27)[1]];
const S10a = (f: number) => dolly(add(MACRO, [-0.4, 0.55, 3.0]), add(MACRO, [-0.4, 0.05, -0.6]), pushK(f, 1190, 0.0025), { fov: 40 });
const S10b = (f: number) => dolly(add(MACRO, [0.6, 0.45, 2.4]), add(MACRO, [0.9, 0.05, -0.6]), pushK(f, 1251, 0.003, 0.006, 26), { fov: 38, roll: 0.035 });
const S11a = (f: number) => dolly(add(BED, [0.6, 1.9, 4.6]), add(BED, [0, 0.75, 0]), pushK(f, 1326, 0.0025), { fov: 40 });
const S11b = (f: number) => dolly(add(BED, [1.5, 1.6, 2.6]), add(BED, [0.4, 1.2, 0.9]), pushK(f, 1418, 0.003, 0.006, 26), { fov: 38, roll: -0.04 });
const M12: V3 = [calmC(26)[0] + 26, POND.y, calmC(26)[1]];
const S12a = (f: number) => dolly(add(M12, [0, 0.42, 2.3]), add(M12, [0, 0.02, -0.8]), pushK(f, 1460, 0.0022), { fov: 40 });
const S12b = (f: number) => dolly(add(M12, [1.2, 0.3, 1.8]), add(M12, [1.5, 0.02, -0.8]), pushK(f, 1556, 0.0025, 0.006, 26), { fov: 38, roll: 0.035 });
const S13a = (f: number) => dolly(add(FR, [0.7, 1.65, 2.6]), add(FR, [0.45, 1.35, 0]), pushK(f, 1647, 0.0028, 0.006, 26), { fov: 38 });
const S13b = (f: number) => dolly([-82, 58, 46], [-34, -0.4, 4], pushK(f, 1707, 0.0018, 0.004, 30), { fov: 46 });
const S13c = (f: number) => dolly(add(MACRO, [-1.2, 0.18, 1.6]), add(MACRO, [-1.4, 0.0, -1.2]), pushK(f, 1786, 0.003), { fov: 36, roll: -0.03 });
const S14a = (f: number) => dolly([-40, 2.4, -12], [FR[0], 1.4, FR[2]], pushK(f, 1844, 0.0022), { fov: 40 });
const S15a = (f: number) => { const F = franklinAt(15, Math.min(f, 2000)); return dolly(add(F, [2.4, 1.65, 4.2]), add(F, [0.2, 1.45, 0]), pushK(f, 1955, 0.0025, 0.006, 24), { fov: 38 }); };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 89, cut: true, s: S1b }],                       // cut to the spoon on "with a"
  2: [{ f: 150, s: S2a }, { f: 228, cut: true, s: S2b }],                    // cut up behind the ships on "behind"
  3: [{ f: 314, s: S3a }, { f: 359, cut: true, s: S3b }],                    // captain; cut to the cook on "cooks"
  4: [{ f: 440, s: S4a }, { f: 495, cut: true, s: S4b }],                    // "Franklin carried that question"
  5: [{ f: 570, s: S5a }, { f: 628, cut: true, s: S5b }, { f: 695, cut: true, s: S5c }], // "walked up", "tipped"
  6: [{ f: 751, s: S6a }, { f: 834, dur: 40, s: S6b }],                      // pull up and out over "wider x3"
  7: [{ f: 885, s: S7a }],
  8: [{ f: 977, s: S8a }],
  9: [{ f: 1046, s: S9a }, { f: 1093, cut: true, s: S9b }, { f: 1158, cut: true, s: S9c }], // "he started", "walking stick"
  10: [{ f: 1186, s: S10a }, { f: 1251, dur: 26, s: S10b }],                 // glide right on "It needs tiny ripples"
  11: [{ f: 1326, s: S11a }, { f: 1418, cut: true, s: S11b }],               // "There's nothing to hold"
  12: [{ f: 1460, s: S12a }, { f: 1556, dur: 30, s: S12b }],                 // "and it smooths every ripple"
  13: [{ f: 1647, s: S13a }, { f: 1707, cut: true, s: S13b }, { f: 1786, cut: true, s: S13c }], // "half an acre", "millionth"
  14: [{ f: 1839, s: S14a }],
  15: [{ f: 1955, s: S15a }],
};

/** impact kicks (flip sign every frame, decay over 7 f) on the punch beats */
const KICKS: [number, number][] = [[TIP_HOOK / FPS, 0.6], [TIP / FPS, 0.5], [1418 / FPS, 0.4], [1983 / FPS, 0.5]];
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
  { f: 0, cInf: 13, focus: (f) => frEye(1, f) },            // hook MS
  { f: 89, cInf: 15 },                                        // spoon insert (focus = look)
  { f: 150, cInf: 0 },                                        // fleet wide
  { f: 314, cInf: 12, focus: () => sea(-1.2, SHIP_DECK + 1.75, -0.6) }, // captain MS
  { f: 359, cInf: 8 },                                        // the cook at the rail
  { f: 444, cInf: 10, focus: (f) => frEye(4, f) },           // walking with the question
  { f: 574, cInf: 0 },                                        // windy pond wide
  { f: 628, cInf: 10, focus: (f) => frEye(5, f) },
  { f: 695, cInf: 15 },                                       // spoon insert
  { f: 751, cInf: 0 },                                        // aerial, mirror wide
  { f: 977, cInf: 11, focus: () => add(FRIENDS[1], [0, 1.6, 0]) }, // friends applaud
  { f: 1093, cInf: 12, focus: (f) => frEye(9, f) },
  { f: 1158, cInf: 14 },                                      // walking-stick insert
  { f: 1190, cInf: 12 },                                      // macro water (focus = look)
  { f: 1326, cInf: 8 },                                       // bedsheet
  { f: 1460, cInf: 12 },                                      // macro skin
  { f: 1647, cInf: 14, focus: (f) => frEye(13, f) },
  { f: 1707, cInf: 0 },                                       // aerial
  { f: 1786, cInf: 14 },                                      // grazing macro
  { f: 1844, cInf: 5 },                                       // golden wide
  { f: 1955, cInf: 11, focus: (f) => frEye(15, f) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
