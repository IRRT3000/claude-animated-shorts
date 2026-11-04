// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export type LightName = "day" | "golden" | "lab" | "night" | "stage" | "dusk";
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // the physics lab by day: warm sun through tall windows, cool-violet shade
  lab: {
    az: 140, el: 38,
    lit: [1.55, 1.4, 1.14], shade: [0.4, 0.33, 0.3], lift: [0.06, 0.05, 0.09], lambert: 0.4, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.93, 0.86], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.94, 0.9, 0.94],
    blob: [0.6, 0.55, 0.58], actorShadow: false,
    top: "#c9b08a", hor: "#ecd9b6", skyCurve: [0.0, 0.5, 0.6], fog: "#ecd9b6", fogNear: 40, fogFar: 400, sunDisc: "#000000",
    sunCol: "#ffe8c4", sunI: 2.6, sky: "#f3e2c8", ground: "#8a6a50", hemiI: 0.6,
    bias: -0.00025, normalBias: 0.01,
  },
  // the lab at night under its lamps, a storm outside (world.ts dims everything at the power cut)
  night: {
    az: 35, el: 55,
    lit: [1.3, 1.08, 0.78], shade: [0.14, 0.14, 0.26], lift: [0.03, 0.04, 0.1], lambert: 0.45, sideK: 0.8, term: 0.18,
    charTint: [1.0, 0.88, 0.74], charShade: 0.8, charGrad: 0.1, bodyGrad: 0.26, sideTint: [0.8, 0.82, 0.98],
    blob: [0.5, 0.48, 0.6], actorShadow: false,
    top: "#1e2340", hor: "#2c3358", skyCurve: [0.0, 0.5, 0.6], fog: "#2c3358", fogNear: 40, fogFar: 400, sunDisc: "#000000",
    sunCol: "#ffd9a0", sunI: 2.4, sky: "#5a6090", ground: "#3a3040", hemiI: 0.4,
    bias: -0.00025, normalBias: 0.01,
  },
  // the prize stage: one warm spotlight, plum shadows
  stage: {
    az: 30, el: 50,
    lit: [1.75, 1.45, 1.08], shade: [0.2, 0.12, 0.24], lift: [0.05, 0.03, 0.08], lambert: 0.45, sideK: 0.8, term: 0.16,
    charTint: [1.0, 0.92, 0.82], charShade: 0.82, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.9, 0.82, 0.95],
    blob: [0.45, 0.38, 0.5], actorShadow: true,
    top: "#2a1830", hor: "#3a2038", skyCurve: [0.0, 0.5, 0.6], fog: "#3a2038", fogNear: 40, fogFar: 400, sunDisc: "#000000",
    sunCol: "#ffe2b0", sunI: 3.0, sky: "#a07090", ground: "#40202a", hemiI: 0.35,
    bias: -0.0004, normalBias: 0.012,
  },
  // the lab at dusk, 2013: low golden sun through the windows, long shadows, violet shade
  dusk: {
    az: 125, el: 14,
    lit: [1.6, 0.95, 0.5], shade: [0.2, 0.17, 0.32], lift: [0.04, 0.05, 0.14], lambert: 0.4, sideK: 0.82, term: 0.1,
    charTint: [1.0, 0.8, 0.6], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.8, 0.95],
    blob: [0.72, 0.7, 0.88], actorShadow: true,
    top: "#d89a6a", hor: "#f2c48a", skyCurve: [0.0, 0.5, 0.6], fog: "#f2c48a", fogNear: 40, fogFar: 400, sunDisc: "#000000",
    sunCol: "#ffb36b", sunI: 4.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.45,
    bias: -0.0006, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  lab: {
    sky: { c: ["#ecd9b6", "#e0c8a0", "#d4b48e", "#c9a27a", "#b8906a"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.03, 0.02, 0.0],
    sat: 1.08,
  },
  night: {
    sky: { c: ["#2c3358", "#262c4e", "#212646", "#1e2340", "#181c34"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#8a90b0", mid: "#5a6088", shade: "#3a4068" },
    bounce: [0.0, 0.0, 0.02],
    sat: 1.04,
  },
  stage: {
    sky: { c: ["#3a2038", "#342034", "#2e1c30", "#2a1830", "#22142a"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.04, 0.0, 0.02],
    sat: 1.12,
  },
  dusk: {
    sky: { c: ["#f2c48a", "#eab07c", "#e09a74", "#d89a6a", "#c08070"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
};
