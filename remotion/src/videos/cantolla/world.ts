// "The Man Who Fell Through a Roof" as one three.js scene, four places far apart (fog hides one from another):
// Mexico City (plaza + fountain, cathedral, flat-roofed houses, the skylight house), the dining room set, the 1863
// bullring and the Chalco valley of 1914 under the volcanoes. Balloons, the beach ball and the paper lanterns are
// posed per frame from story.ts. update(id, f, camera) is a pure function of id + f.
import * as THREE from "three";
import { Batch, V, lam, boxGeo, quad, prop, setSight, inTheWay, Ray, Kit } from "./build";
import { ctex, rep, cloudHD, cobbleHD, stoneHD, facadeHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, CATH, SKY_HOUSE, ROOM, ROOM_W, ROOM_D, ROOM_H, TABLE, TABLE_H, BULL, ARENA_R, CHALCO, FOUNT_R, FOUNT_WATER,
  DESK, SEW_AT, camAt, balloonsAt, BKind, ballAt, LANTERN_N, lanternAt, V3,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: everything is built here

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const glowTex = () => ctex("glow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = {
  1: { az: 115, el: 38 }, 9: { az: 110, el: 40 }, 10: { az: 120, el: 40 }, 11: { az: 120, el: 42 }, 12: { az: 100, el: 36 }, 13: { az: 105, el: 34 }, 14: { az: 130, el: 40 },
  2: { az: 30, el: 72 }, 15: { az: 25, el: 72 }, 16: { az: 160, el: 68 }, 3: { az: 60, el: 38 }, 4: { az: -110, el: 22 },
  5: { az: 70, el: 55 }, 6: { az: 85, el: 50 }, 7: { az: 70, el: 50 }, 8: { az: 140, el: 50 },
  17: { az: 110, el: 40 }, 18: { az: 70, el: 50 }, 19: { az: 120, el: 45 },
  20: { az: 10, el: 6 }, 21: { az: 60, el: 40 }, 22: { az: 95, el: 38 }, 23: { az: 80, el: 45 }, 24: { az: 150, el: 40 }, 25: { az: 75, el: 35 },
  26: { az: -60, el: 12 }, 27: { az: 15, el: 3 },
};
type C3 = [number, number, number];
/** per-scene light grading on top of the day / golden presets (lighting pass): warmer, cleaner skies over the city,
 *  warm interiors lit from the skylight / window / lamp, crisp highland air in Chalco, a deep dusk for the lanterns */
type Over = { lit?: C3; shade?: C3; lift?: C3; fogNear?: number; fogFar?: number; sky?: string[]; charTint?: C3; charShade?: number; sat?: number; beam?: number };
const SKY_CITY = { lit: [1.66, 1.5, 1.26] as C3, shade: [0.34, 0.31, 0.4] as C3, fogNear: 70, fogFar: 700 };
const ROOM_DAY: Over = { lit: [1.7, 1.48, 1.18], shade: [0.46, 0.38, 0.36], lift: [0.1, 0.07, 0.05], charTint: [1.02, 0.95, 0.88], beam: 1 };
const OVER: Record<number, Over> = {
  1: SKY_CITY, 9: SKY_CITY, 10: SKY_CITY, 11: SKY_CITY, 12: SKY_CITY, 13: { ...SKY_CITY, lit: [1.5, 1.42, 1.32], shade: [0.3, 0.31, 0.42] }, 17: SKY_CITY,
  14: { lit: [1.64, 1.5, 1.28], shade: [0.36, 0.32, 0.4], fogNear: 40, fogFar: 420 },
  18: { lit: [1.66, 1.52, 1.3], shade: [0.36, 0.33, 0.42], fogNear: 40, fogFar: 420 }, 19: { ...SKY_CITY, fogNear: 40 },
  2: ROOM_DAY, 15: ROOM_DAY, 16: ROOM_DAY, 3: { ...ROOM_DAY, beam: 0.8 },
  4: { lit: [1.55, 0.95, 0.5], shade: [0.3, 0.22, 0.32], lift: [0.08, 0.05, 0.08], charTint: [1.0, 0.82, 0.62], charShade: 0.9, beam: 0 },
  26: { lit: [1.6, 0.9, 0.42], shade: [0.26, 0.2, 0.32], lift: [0.06, 0.04, 0.08], beam: 0.9 },
  5: { lit: [1.68, 1.54, 1.3], fogNear: 60, fogFar: 520 }, 6: { lit: [1.68, 1.54, 1.3], fogNear: 60, fogFar: 520 }, 7: { lit: [1.68, 1.54, 1.3], fogNear: 60, fogFar: 520 }, 8: { lit: [1.68, 1.54, 1.3], fogNear: 60, fogFar: 520 },
  21: { lit: [1.62, 1.54, 1.36], shade: [0.32, 0.32, 0.42], fogNear: 120, fogFar: 1100, sat: 1.12 }, 22: { lit: [1.62, 1.54, 1.36], fogNear: 120, fogFar: 1100 },
  23: { lit: [1.62, 1.54, 1.36], fogNear: 120, fogFar: 900 }, 24: { lit: [1.6, 1.5, 1.34], fogNear: 120, fogFar: 1100 }, 25: { lit: [1.66, 1.54, 1.32], fogNear: 120, fogFar: 1100 },
  20: { fogNear: 80, fogFar: 600 },
  27: { lit: [1.25, 0.66, 0.32], shade: [0.12, 0.13, 0.3], lift: [0.03, 0.04, 0.14], fogNear: 60, fogFar: 520,
    sky: ["#ffa25e", "#ef8a68", "#b9678a", "#6a4f8e", "#34356a"], charTint: [0.95, 0.74, 0.6], charShade: 0.84 },
};

/** every lens position of the film (houses in the way of a city shot are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== "city") continue;
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = Math.min(60, fw.length());
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

const M4 = (x: number, y: number, z: number, ry = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(s, s, s));
const plane = (w: number, d: number, x: number, y: number, z: number, tile = 0) => {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z);
  if (tile) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile); }
  return g;
};

// ---------------- painted textures ----------------
/** Mexico City plaster: muted ochre, terracotta, rose, cream, cobalt, mustard (two-tone shade turns neutrals lilac: keep them warm) */
const STY = [
  { wall: "#e6c178", shutter: "#3f6fb5" }, { wall: "#c9704f", shutter: "#2f6a43" }, { wall: "#d98b7c", shutter: "#2f5f6a" },
  { wall: "#eddcb2", shutter: "#8c3b4a" }, { wall: "#5f8fc4", shutter: "#f1e3c0" }, { wall: "#d9a441", shutter: "#3f6fb5" },
  { wall: "#b5653f", shutter: "#efe3c8" },
];
const ROOF = ["#d9c39a", "#c9ab84", "#e0cfa6"];
const goreTex = (key: string, cols: string[], band: string) => ctex("gore" + key, 1024, 512, (g) => {
  const n = 16, w = 1024 / n;
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(i * w, 0, w + 1, 512); }
  g.fillStyle = "rgba(40,25,30,0.55)"; for (let i = 0; i < n; i++) g.fillRect(i * w - 2, 0, 4, 512);  // seams
  g.fillStyle = band; g.fillRect(0, 300, 1024, 46);                                                  // decorative band
  g.fillStyle = "rgba(40,25,30,0.6)"; g.fillRect(0, 298, 1024, 4); g.fillRect(0, 344, 1024, 4);
  for (let i = 0; i < 32; i++) { g.fillStyle = cols[(i + 1) % cols.length]; g.beginPath(); g.moveTo(i * 32, 346); g.lineTo(i * 32 + 16, 380); g.lineTo(i * 32 + 32, 346); g.fill(); } // scallops
  g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, 1024, 60);
});
const netTex = () => ctex("gasNet", 1024, 512, (g) => {
  g.fillStyle = "#e9d38c"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "rgba(90,70,40,0.75)"; g.lineWidth = 3;
  for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(i * 25.6, 0); g.lineTo(i * 25.6 + 60, 512); g.stroke(); g.beginPath(); g.moveTo(i * 25.6, 0); g.lineTo(i * 25.6 - 60, 512); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(0, 0, 1024, 120);
});
const wickerTex = () => ctex("wicker", 256, 128, (g) => {
  g.fillStyle = "#b8874e"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "rgba(90,55,25,0.6)"; g.lineWidth = 3;
  for (let y = 0; y < 128; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + 4); g.stroke(); }
  for (let x = 0; x < 256; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  g.fillStyle = "#8a5a2c"; g.fillRect(0, 0, 256, 14);
});
const tileTex = () => ctex("roomTiles", 512, 512, (g) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? "#c9704f" : "#efdcb2"; g.fillRect(x * 128, y * 128, 128, 128);
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x * 128 + 6, y * 128 + 6, 50, 6);
  }
  g.strokeStyle = "rgba(80,50,40,0.45)"; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
});
const roomWallTex = () => ctex("roomWall", 1024, 512, (g, r) => {
  g.fillStyle = "#ecc77c"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "140,100,60"},0.05)`; g.beginPath(); g.arc(r() * 1024, r() * 512, 20 + r() * 60, 0, 7); g.fill(); }
  g.fillStyle = "#3f6fb5"; g.fillRect(0, 400, 1024, 112);                                // talavera-blue dado
  g.fillStyle = "#efe3c8"; g.fillRect(0, 392, 1024, 10);
  for (let x = 16; x < 1024; x += 64) { g.fillStyle = "#efe3c8"; g.beginPath(); g.arc(x + 16, 456, 14, 0, 7); g.fill(); g.fillStyle = "#3f6fb5"; g.beginPath(); g.arc(x + 16, 456, 6, 0, 7); g.fill(); }
});
const fieldTex = () => ctex("fields", 1024, 1024, (g, r) => {
  const cols = ["#8fbf55", "#a9c95a", "#d9c46a", "#7aae4a", "#c8b25c", "#9cc861"];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const c = cols[Math.floor(r() * cols.length)];
    g.fillStyle = c; g.fillRect(x * 128, y * 128, 128, 128);
    g.strokeStyle = "rgba(60,80,30,0.25)"; g.lineWidth = 3;
    const rows = r() > 0.5;
    for (let k = 8; k < 128; k += 14) { g.beginPath(); if (rows) { g.moveTo(x * 128, y * 128 + k); g.lineTo(x * 128 + 128, y * 128 + k); } else { g.moveTo(x * 128 + k, y * 128); g.lineTo(x * 128 + k, y * 128 + 128); } g.stroke(); }
    g.strokeStyle = "rgba(90,70,40,0.5)"; g.lineWidth = 5; g.strokeRect(x * 128, y * 128, 128, 128);
  }
});
const sandTex = () => ctex("arenaSand", 512, 512, (g, r) => {
  g.fillStyle = "#e6c88e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,240,210" : "170,130,80"},0.18)`; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const flagStringTex = () => ctex("papelPicado", 1024, 128, (g) => {
  const cols = ["#e8445a", "#f2a531", "#3fa0d8", "#6cc04a", "#c25ad0", "#f4d23c"];
  for (let i = 0; i < 16; i++) {
    const x = i * 64; g.fillStyle = cols[i % 6];
    g.beginPath(); g.moveTo(x + 4, 6); g.lineTo(x + 60, 6); g.lineTo(x + 60, 100); for (let k = 0; k < 4; k++) g.lineTo(x + 60 - 7 - 14 * k, k % 2 ? 100 : 116); g.lineTo(x + 4, 100); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.0)"; g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 18 + 14 * k, 40, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x + 18 + 14 * k, 66, 3, 0, 7); g.fill(); }
    g.globalCompositeOperation = "source-over";
  }
  g.fillStyle = "#3a2a20"; g.fillRect(0, 0, 1024, 6);
});
const beachTex = () => ctex("beachBall", 512, 256, (g) => {
  const cols = ["#e8445a", "#ffffff", "#3fa0d8", "#ffffff", "#f4d23c", "#ffffff"];
  for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect((i * 512) / 6, 0, 512 / 6 + 1, 256); }
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 24); g.fillRect(0, 232, 512, 24);
});
const archTex = () => ctex("bullArches", 1024, 256, (g) => {
  g.fillStyle = "#e9c98a"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#b5653f"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 236, 1024, 20);
  for (let x = 20; x < 1024; x += 64) { g.fillStyle = "#5a3424"; g.beginPath(); g.moveTo(x, 220); g.lineTo(x, 110); g.arc(x + 20, 110, 20, Math.PI, 0); g.lineTo(x + 40, 220); g.closePath(); g.fill(); }
});

/** baroque church front (16 x 18 m): big arched portal, columns, niches, choir window, cornices */
const churchTex = () => ctex("churchFront", 1024, 1152, (g) => {
  const m = 64; // px per metre
  g.fillStyle = "#d9b27a"; g.fillRect(0, 0, 1024, 1152);
  g.fillStyle = "#c99a62"; for (const y of [380, 760]) g.fillRect(0, y, 1024, 26);            // cornices
  g.fillStyle = "rgba(255,240,210,0.25)"; for (const y of [380, 760]) g.fillRect(0, y, 1024, 6);
  for (const x of [250, 774]) for (const [y0, y1] of [[406, 760], [786, 1152]]) { g.fillStyle = "#c99a62"; g.fillRect(x - 22, y0, 44, y1 - y0); g.fillStyle = "rgba(255,240,210,0.3)"; g.fillRect(x - 22, y0, 8, y1 - y0); }
  const arch = (cx: number, w: number, y0: number, y1: number, col: string) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - w / 2, y1); g.lineTo(cx - w / 2, y0 + w / 2); g.arc(cx, y0 + w / 2, w / 2, Math.PI, 0); g.lineTo(cx + w / 2, y1); g.closePath(); g.fill(); };
  arch(512, 300, 800, 1152, "#b8894e"); arch(512, 240, 840, 1152, "#5a3424");                   // portal
  g.strokeStyle = "#3a2018"; g.lineWidth = 6; g.beginPath(); g.moveTo(512, 900); g.lineTo(512, 1152); g.stroke();
  for (const x of [130, 894]) { arch(x, 110, 820, 1060, "#b8894e"); arch(x, 80, 840, 1050, "#7a5a3e"); }   // niches
  g.fillStyle = "#b8894e"; g.beginPath(); g.arc(512, 560, 120, 0, 7); g.fill();                  // choir window
  g.fillStyle = "#3f5f8f"; g.beginPath(); g.arc(512, 560, 90, 0, 7); g.fill();
  g.strokeStyle = "#e8c45a"; g.lineWidth = 6; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(512, 560); g.lineTo(512 + 90 * Math.cos(a), 560 + 90 * Math.sin(a)); g.stroke(); }
  for (const x of [130, 894]) arch(x, 90, 470, 700, "#3f5f8f");                                // upper windows
  g.fillStyle = "#c99a62"; g.beginPath(); g.moveTo(240, 380); g.lineTo(512, 120); g.lineTo(784, 380); g.closePath(); g.fill(); // pediment
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(512, 290, 34, 0, 7); g.fill();
  void m;
});

// ---------------- builders ----------------
/** flat-roofed colonial house with a parapet: facade on all four sides, roof slab, cornice; left out if it blocks a city shot */
const casa = (b: Batch, x: number, z: number, w: number, d: number, h: number, si: number, detail = true) => {
  if (inTheWay(x - w / 2 - 0.5, x + w / 2 + 0.5, 0, h + 1.2, z - d / 2 - 0.5, z + d / 2 + 0.5)) return;
  const st = STY[si % STY.length], hw = w / 2, hd = d / 2;
  const fr = lam(`cf${si}_${w}_${h}`, () => ({ map: facadeHD(`cf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const sd = lam(`cs${si}_${d}_${h}`, () => ({ map: facadeHD(`cs${si}_${d}_${h}`, d, h, st) }));
  const m = M4(x, 0, z);
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), fr, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), fr, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), sd, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), sd, m);
  b.add(plane(w, d, 0, h - 0.01, 0), lam("roof" + si % 3, () => ({ color: ROOF[si % 3] })), m);
  const pm = lam("parapet" + (si % STY.length), () => ({ color: st.wall }));
  if (detail) {
    const t = 0.25, ph = 0.75;
    b.add(boxGeo(V(-hw, h, -hd), V(hw, h + ph, -hd + t)), pm, m);
    b.add(boxGeo(V(-hw, h, hd - t), V(hw, h + ph, hd)), pm, m);
    b.add(boxGeo(V(-hw, h, -hd), V(-hw + t, h + ph, hd)), pm, m);
    b.add(boxGeo(V(hw - t, h, -hd), V(hw, h + ph, hd)), pm, m);
    b.add(boxGeo(V(-hw - 0.15, h - 0.35, -hd - 0.15), V(hw + 0.15, h - 0.1, hd + 0.15)), lam("cornice", () => ({ color: "#f1e3c0" })), m);
  }
};
/** a washing line on a roof: two poles, a line, three hanging cloths */
const washing = (b: Batch, x: number, y: number, z: number, len: number, r: () => number) => {
  const pole = lam("pole", () => ({ color: "#6b4a30" }));
  for (const s of [-1, 1]) b.add(boxGeo(V(x + s * len / 2 - 0.05, y, z - 0.05), V(x + s * len / 2 + 0.05, y + 1.9, z + 0.05)), pole);
  b.add(boxGeo(V(x - len / 2, y + 1.82, z - 0.015), V(x + len / 2, y + 1.85, z + 0.015)), lam("rope", () => ({ color: "#e8dcc0" })));
  const cl = ["#f4f1ea", "#e8445a", "#3fa0d8", "#f2c64a", "#ffffff"];
  for (let k = 0; k < 3; k++) {
    const cx = x - len / 3 + (k * len) / 3 + (r() - 0.5) * 0.4, w = 0.6 + r() * 0.4, hh = 0.7 + r() * 0.4;
    const g = new THREE.PlaneGeometry(w, hh); g.translate(cx, y + 1.83 - hh / 2, z);
    b.add(g, lam("cloth" + (k + Math.floor(r() * 5)) % 5, () => ({ color: cl[(k + Math.floor(r() * 5)) % 5], side: THREE.DoubleSide })));
  }
};
/** a string of papel picado between two points */
const picado = (b: Batch, a: V3, c: V3) => {
  const dx = c[0] - a[0], dz = c[2] - a[2], L = Math.hypot(dx, dz), n = Math.ceil(L / 5);
  const mat = lam("picado", () => ({ map: flagStringTex(), side: THREE.DoubleSide, alphaTest: 0.5 }));
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, sag = (t: number) => -1.2 * 4 * t * (1 - t);
    const p0 = V(a[0] + dx * t0, a[1] + sag(t0), a[2] + dz * t0), p1 = V(a[0] + dx * t1, a[1] + sag(t1), a[2] + dz * t1);
    b.add(quad(V(p0.x, p0.y - 0.5, p0.z), V(p1.x, p1.y - 0.5, p1.z), p1, p0, 1 / n * 4, 1, (i / n) * 4, 0), mat);
  }
};

// ---------------- balloons ----------------
type BalloonObj = { g: THREE.Group; env: THREE.Group; fire: THREE.Sprite; mouthY: number };
const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48);
const hotEnvelope = () => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28, y = 2.4 + 11.6 * t; // mouth at 2.4 m above the basket floor, crown at 14
    const r = t < 0.55 ? 0.9 + 4.4 * Math.sin((t / 0.55) * Math.PI / 2) ** 1.3 : 5.3 * Math.sqrt(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 2));
    pts.push([Math.max(0.001, r), y]);
  }
  return lathe(pts);
};
const KINDS: Record<Exclude<BKind, "gas">, [string[], string]> = {
  moctezuma: [["#d2402e", "#f3ead6", "#2f8a4b", "#f3ead6"], "#e8b84a"],
  second: [["#2f5fa8", "#f2c64a"], "#c0353a"],
  third: [["#f2c64a", "#c0353a", "#f3ead6"], "#2f5fa8"],
};
const buildBalloon = (kind: BKind): BalloonObj => {
  const g = new THREE.Group(), env = new THREE.Group();
  const wick = lam("wicker", () => ({ map: wickerTex(), side: THREE.DoubleSide }));
  const rope = lam("ropeB", () => ({ color: "#d9c79c" }));
  let mouthY = 2.4;
  if (kind === "gas") {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(6.2, 48, 32), lam("gasEnv", () => ({ map: netTex() })));
    sph.position.y = 11.5; env.add(sph);
    mouthY = 5.4;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 1.4, 16, 1, true), lam("gasNeck", () => ({ color: "#d9c27a", side: THREE.DoubleSide })));
    neck.position.y = 5.6; env.add(neck);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 1.3), wick); basket.position.y = 0.55; g.add(basket);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 24), rope); ring.rotation.x = Math.PI / 2; ring.position.y = 3.2; g.add(ring);
    for (const [x, z] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) {
      const a = V(x, 1.1, z), c = V(x * 0.9, 3.2, z * 1.1), L = a.distanceTo(c);
      const cy = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L, 5), rope);
      cy.position.copy(a).add(c).multiplyScalar(0.5); cy.lookAt(c); cy.rotateX(Math.PI / 2); g.add(cy);
    }
    for (let k = 0; k < 12; k++) { // net lines from the ring up to the sphere's equator
      const a = (k / 12) * Math.PI * 2, p0 = V(0.75 * Math.cos(a), 3.2, 0.75 * Math.sin(a)), p1 = V(6.1 * Math.cos(a), 11, 6.1 * Math.sin(a)), L = p0.distanceTo(p1);
      const cy = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 4), rope);
      cy.position.copy(p0).add(p1).multiplyScalar(0.5); cy.lookAt(p1); cy.rotateX(Math.PI / 2); env.add(cy);
    }
  } else {
    const [cols, band] = KINDS[kind];
    const m = new THREE.Mesh(hotEnvelope(), lam("env_" + kind, () => ({ map: goreTex(kind, cols, band), side: THREE.DoubleSide })));
    env.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 8, 32), lam("mouthRing", () => ({ color: "#6b4a30" })));
    ring.rotation.x = Math.PI / 2; ring.position.y = 2.4; env.add(ring);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.6, 1.05, 24, 1, true), wick); basket.position.y = 0.52; g.add(basket);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), wick); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.04; g.add(floor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 6, 24), lam("basketRim", () => ({ color: "#8a5a2c" }))); rim.rotation.x = Math.PI / 2; rim.position.y = 1.05; g.add(rim);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3, p0 = V(0.66 * Math.cos(a), 1.05, 0.66 * Math.sin(a)), p1 = V(0.9 * Math.cos(a), 2.4, 0.9 * Math.sin(a)), L = p0.distanceTo(p1);
      const cy = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, L, 4), rope);
      cy.position.copy(p0).add(p1).multiplyScalar(0.5); cy.lookAt(p1); cy.rotateX(Math.PI / 2); g.add(cy);
    }
    // the brazier hanging in the mouth
    const braz = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.28, 12), lam("brazier", () => ({ color: "#3a3030" }))); braz.position.y = 2.1; env.add(braz);
  }
  g.add(env);
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(5, 2.6, 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  fire.position.y = mouthY + 0.1; fire.scale.setScalar(1.6); fire.layers.set(NOINK); env.add(fire);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.visible = false;
  return { g, env, fire, mouthY };
};

/** a 3D sombrero (the last shot of the room: on its peg) */
const sombreroMesh = () => {
  const g = new THREE.Group(), felt = lam("sombFelt", () => ({ color: "#5b4650" })), trim = lam("sombTrim", () => ({ color: "#e3e6ea" }));
  const brim = new THREE.Mesh(lathe([[0.001, 0.0], [0.62, 0.0], [0.7, 0.06], [0.68, 0.09], [0.6, 0.03], [0.001, 0.03]]), felt); g.add(brim);
  const crown = new THREE.Mesh(lathe([[0.2, 0.0], [0.19, 0.2], [0.15, 0.36], [0.06, 0.42], [0.001, 0.43]]), felt); g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.205, 0.07, 24, 1, true), trim); band.position.y = 0.06; g.add(band);
  return g;
};

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private balloons: Record<BKind, BalloonObj>;
  private ball: THREE.Mesh;
  private lanterns: THREE.InstancedMesh; private lanternGlow: THREE.InstancedMesh;
  private sets: Record<string, THREE.Group> = {};
  private volcanoes = new THREE.Group();
  private beamSky: THREE.Mesh; private beamWin: THREE.Mesh; private lamp: THREE.Group; private lampGlow: THREE.Sprite;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.renderOrder = -0.5; this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.userData.k = i;
      this.clouds.push(m); R.add(m);
    }

    // ================= Mexico City =================
    setSight(sightLines());
    const b = new Batch(), r = rng(11);
    M.street = lam("streetHD", () => ({ map: rep(cobbleHD(), 1, 1) }));
    M.plaza = lam("plazaHD", () => ({ map: stoneHD("plazaHD") }));
    b.add(plane(1200, 1200, 0, 0, 0, 8), M.street);
    b.add(plane(64, 64, 0, 0.02, 0, 4), M.plaza);
    // fountain: basin rim, water, column and bowl
    const stoneM = lam("fountStone", () => ({ color: "#d8c6a2" }));
    const rim = new THREE.CylinderGeometry(FOUNT_R, FOUNT_R + 0.1, 0.75, 40, 1, true); rim.translate(0, 0.375, 0); b.add(rim, stoneM);
    const rimIn = new THREE.CylinderGeometry(FOUNT_R - 0.32, FOUNT_R - 0.32, 0.75, 40, 1, true); rimIn.scale(-1, 1, 1); rimIn.translate(0, 0.375, 0); b.add(rimIn, stoneM);
    const top = new THREE.RingGeometry(FOUNT_R - 0.32, FOUNT_R, 40); top.rotateX(-Math.PI / 2); top.translate(0, 0.75, 0); b.add(top, stoneM);
    b.add(new THREE.CylinderGeometry(0.35, 0.5, 2.0, 16).translate(0, 1.0, 0), stoneM);
    b.add(new THREE.CylinderGeometry(1.2, 0.35, 0.4, 24).translate(0, 2.1, 0), stoneM);
    b.add(new THREE.CylinderGeometry(0.15, 0.22, 0.8, 12).translate(0, 2.6, 0), stoneM);
    const water = new THREE.Mesh(new THREE.CircleGeometry(FOUNT_R - 0.32, 40), lam("fountWater", () => ({ color: "#4fb3d9" })));
    water.rotation.x = -Math.PI / 2; water.position.y = FOUNT_WATER; R.add(water);
    // cathedral: nave, two bell towers with belfries and cupolas, crossing dome
    const cw = lam("cathWall", () => ({ map: churchTex() }));
    const cs = lam("cathStone", () => ({ color: "#d4ab72" })), dome = lam("cathDome", () => ({ color: "#e6b54a" })), domeT = lam("cathTile", () => ({ color: "#3f6fb5" }));
    b.add(boxGeo(V(-8, 0, -72), V(8, 18, CATH.z - 1)), cs);
    b.add(quad(V(-8, 0, CATH.z - 0.99), V(8, 0, CATH.z - 0.99), V(8, 18, CATH.z - 0.99), V(-8, 18, CATH.z - 0.99)), cw);
    b.add(boxGeo(V(-6, 18, CATH.z - 1.5), V(6, 22, CATH.z - 0.5)), cs); // gable
    for (const s of [-1, 1]) {
      const tx = s * CATH.towerX, h2 = CATH.towerW / 2;
      b.add(boxGeo(V(tx - h2, 0, CATH.z - 9), V(tx + h2, CATH.body, CATH.z - 1)), cs);
      b.add(boxGeo(V(tx - h2 - 0.3, CATH.body - 0.4, CATH.z - 9.3), V(tx + h2 + 0.3, CATH.body, CATH.z - 0.7)), lam("cathCornice", () => ({ color: "#f1e3c0" })));
      // belfry: four corner piers (open arches) and a roof slab
      for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(boxGeo(V(tx + px * (h2 - 0.6) - 0.6, CATH.body, CATH.z - 5 + pz * (h2 - 0.6) - 0.6), V(tx + px * (h2 - 0.6) + 0.6, CATH.belfry, CATH.z - 5 + pz * (h2 - 0.6) + 0.6)), cs);
      b.add(boxGeo(V(tx - h2 + 0.3, CATH.belfry, CATH.z - 9 + 0.3), V(tx + h2 - 0.3, CATH.belfry + 0.6, CATH.z - 1 - 0.3)), lam("cathCornice", () => ({ color: "#f1e3c0" })));
      const bell = new THREE.CylinderGeometry(0.5, 1.0, 1.4, 16); bell.translate(tx, CATH.body + 3.2, CATH.z - 5); b.add(bell, lam("bell", () => ({ color: "#b8893a" })));
      const cup = new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); cup.translate(tx, CATH.belfry + 0.6, CATH.z - 5); b.add(cup, domeT);
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 2.0, 8).translate(tx, CATH.top + 0.4, CATH.z - 5), lam("cross", () => ({ color: "#3a3030" })));
      b.add(boxGeo(V(tx - 0.6, CATH.top + 0.8, CATH.z - 5.08), V(tx + 0.6, CATH.top + 0.96, CATH.z - 4.92)), lam("cross", () => ({ color: "#3a3030" })));
    }
    const drum = new THREE.CylinderGeometry(5.2, 5.2, 4.5, 32); drum.translate(0, 20.2, -58); b.add(drum, cs);
    const dm = new THREE.SphereGeometry(5.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); dm.translate(0, 22.4, -58); b.add(dm, dome);
    b.add(new THREE.CylinderGeometry(1.0, 1.0, 2.4, 12).translate(0, 29, -58), cs);
    // houses: 10 m grid, a street every 4th row / column, the plaza and cathedral left open
    const near = (x: number, z: number) => Math.hypot(x - 20, z + 10) < 140;
    for (let i = -26; i <= 26; i++) for (let j = -26; j <= 26; j++) {
      const x = i * 10, z = j * 10;
      if (((i % 4) + 4) % 4 === 0 || ((j % 4) + 4) % 4 === 0) continue;
      if (Math.abs(x) < 38 && Math.abs(z) < 38) continue;
      if (Math.abs(x) < 22 && z < -30 && z > -80) continue;
      if (x === SKY_HOUSE.x && z === SKY_HOUSE.z) continue;
      const h = [7, 8.4, 9.8][Math.floor(r() * 3)], si = Math.floor(r() * 7);
      casa(b, x, z, 10, 10, h, si, near(x, z));
      if (near(x, z) && r() < 0.22) washing(b, x + (r() - 0.5) * 3, h, z + (r() - 0.5) * 4, 3.2, r);
    }
    // the skylight house: same build, a framed glass skylight in the middle of the roof
    casa(b, SKY_HOUSE.x, SKY_HOUSE.z, SKY_HOUSE.w, SKY_HOUSE.d, SKY_HOUSE.h, 2, true);
    const sx = SKY_HOUSE.x, sz = SKY_HOUSE.z, sh = SKY_HOUSE.h;
    b.add(boxGeo(V(sx - 1.0, sh, sz - 1.0), V(sx + 1.0, sh + 0.35, sz + 1.0)), lam("skyFrame", () => ({ color: "#6b4a30" })));
    b.add(plane(1.7, 1.7, sx, sh + 0.37, sz), lam("skyGlass", () => ({ color: "#9fd0e8" })));
    washing(b, sx + 2.6, sh, sz + 2.5, 3.0, r);
    // papel picado over the plaza edges and the street by the skylight house
    for (const [a, c] of [[[-30, 6.5, 32], [30, 6.5, 32]], [[32, 6.5, -30], [32, 6.5, 30]], [[-32, 6.5, -30], [-32, 6.5, 30]], [[35, 6.2, 2], [45, 6.2, 2]], [[35, 6.0, -4], [45, 6.0, -4]], [[35, 6.4, 8], [45, 6.4, 8]]] as [V3, V3][]) picado(b, a, c);
    // a few trees in the plaza corners
    for (const [x, z] of [[-26, 26], [26, 26], [-26, -26], [26, -26], [-26, 0], [26, 0]]) prop(b, kit, "tree_oak", x, 0, z, 7, x * 0.1);
    b.build(R);
    setSight([]);

    // ================= the dining room (own set, no shadows: the sun lights it from the side) =================
    const roomB = new Batch(), [rx, , rz] = ROOM, hw = ROOM_W / 2, hd = ROOM_D / 2;
    const wallM = lam("roomWall", () => ({ map: roomWallTex(), side: THREE.DoubleSide }));
    roomB.add(plane(ROOM_W, ROOM_D, rx, 0, rz, 1), lam("roomTiles", () => ({ map: tileTex() })));
    roomB.add(quad(V(rx - hw, 0, rz - hd), V(rx + hw, 0, rz - hd), V(rx + hw, ROOM_H, rz - hd), V(rx - hw, ROOM_H, rz - hd)), wallM);
    roomB.add(quad(V(rx - hw, 0, rz + hd), V(rx - hw, 0, rz - hd), V(rx - hw, ROOM_H, rz - hd), V(rx - hw, ROOM_H, rz + hd)), wallM);
    roomB.add(quad(V(rx + hw, 0, rz - hd), V(rx + hw, 0, rz + hd), V(rx + hw, ROOM_H, rz + hd), V(rx + hw, ROOM_H, rz - hd)), wallM);
    // window on the back wall (painted: sky + frame)
    roomB.add(quad(V(rx + 0.6, 1.2, rz - hd + 0.02), V(rx + 2.4, 1.2, rz - hd + 0.02), V(rx + 2.4, 3.1, rz - hd + 0.02), V(rx + 0.6, 3.1, rz - hd + 0.02)), lam("roomWin", () => ({ color: "#9fd0f0" })));
    for (const [x0, x1, y0, y1] of [[0.5, 2.5, 1.1, 1.22], [0.5, 2.5, 3.08, 3.2], [0.5, 0.62, 1.1, 3.2], [2.38, 2.5, 1.1, 3.2], [1.44, 1.56, 1.1, 3.2]]) roomB.add(boxGeo(V(rx + x0, y0, rz - hd), V(rx + x1, y1, rz - hd + 0.08)), lam("winFrame", () => ({ color: "#2f6a43" })));
    // beams along the ceiling
    for (let x = -hw + 0.6; x < hw; x += 1.2) roomB.add(boxGeo(V(rx + x - 0.1, ROOM_H - 0.25, rz - hd), V(rx + x + 0.1, ROOM_H, rz + hd)), lam("beamR", () => ({ color: "#6b4a30" })));
    roomB.build(R, false);
    // ceiling with the broken skylight hole (dining shots) / whole ceiling (other shots)
    const ceilM = lam("ceil", () => ({ color: "#e8d6b0", side: THREE.DoubleSide }));
    const mkSet = (name: string, fill: (bb: Batch) => void) => { const bb = new Batch(), grp = new THREE.Group(); fill(bb); bb.build(grp, false); grp.visible = false; R.add(grp); this.sets[name] = grp; };
    const T = TABLE, th = 0.8;
    mkSet("ceilHole", (bb) => {
      const hx = T[0], hz = T[2];
      for (const [x0, x1, z0, z1] of [[-hw, hx - rx - th, -hd, hd], [hx - rx + th, hw, -hd, hd], [hx - rx - th, hx - rx + th, -hd, hz - rz - th], [hx - rx - th, hx - rx + th, hz - rz + th, hd]] as const)
        bb.add(boxGeo(V(rx + x0, ROOM_H, rz + z0), V(rx + x1, ROOM_H + 0.2, rz + z1), 0, true), ceilM);
    });
    mkSet("ceilWhole", (bb) => bb.add(boxGeo(V(rx - hw, ROOM_H, rz - hd), V(rx + hw, ROOM_H + 0.2, rz + hd), 0, true), ceilM));
    mkSet("dining", (bb) => {
      const wood = lam("tableWood", () => ({ color: "#8a5a34" })), cloth = lam("tableCloth", () => ({ color: "#f3ead6" })), plate = lam("plate", () => ({ color: "#3f6fb5" }));
      bb.add(boxGeo(V(T[0] - 1.1, TABLE_H - 0.06, T[2] - 0.7), V(T[0] + 1.1, TABLE_H, T[2] + 0.7)), cloth);
      for (const [dx, dz] of [[-1, -0.6], [1, -0.6], [-1, 0.6], [1, 0.6]]) bb.add(boxGeo(V(T[0] + dx - 0.05, 0, T[2] + dz - 0.05), V(T[0] + dx + 0.05, TABLE_H - 0.06, T[2] + dz + 0.05)), wood);
      for (const [dx, dz] of [[-0.75, 0.35], [0.75, 0.35], [-0.75, -0.35], [0.75, -0.35]]) {
        bb.add(new THREE.CylinderGeometry(0.17, 0.13, 0.04, 20).translate(T[0] + dx, TABLE_H + 0.02, T[2] + dz), plate);
        bb.add(new THREE.CylinderGeometry(0.11, 0.1, 0.03, 16).translate(T[0] + dx, TABLE_H + 0.05, T[2] + dz), lam("food", () => ({ color: "#c0603a" })));
      }
      bb.add(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 16).translate(T[0], TABLE_H + 0.15, T[2]), lam("jarro", () => ({ color: "#b5653f" })));
      for (const [dx, dz] of [[-1.55, 0.1], [1.6, 0.0], [-0.5, -1.45], [0.8, -1.5]]) {
        bb.add(boxGeo(V(T[0] + dx - 0.22, 0.45, T[2] + dz - 0.22), V(T[0] + dx + 0.22, 0.5, T[2] + dz + 0.22)), wood);
        for (const [a, c] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bb.add(boxGeo(V(T[0] + dx + a - 0.03, 0, T[2] + dz + c - 0.03), V(T[0] + dx + a + 0.03, 0.45, T[2] + dz + c + 0.03)), wood);
      }
    });
    mkSet("office", (bb) => {
      const wood = lam("deskWood", () => ({ color: "#7a4f33" })), brass = lam("brass", () => ({ color: "#d9a441" }));
      bb.add(boxGeo(V(DESK[0] - 0.9, 0.0, DESK[2] - 0.4), V(DESK[0] + 0.9, 0.82, DESK[2] + 0.4)), wood);
      bb.add(boxGeo(V(DESK[0] - 0.15, 0.82, DESK[2] - 0.05), V(DESK[0] + 0.15, 0.86, DESK[2] + 0.12)), wood);
      bb.add(boxGeo(V(DESK[0] - 0.12, 0.86, DESK[2] + 0.02), V(DESK[0] + 0.12, 0.9, DESK[2] + 0.06)), brass);
      bb.add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10).translate(DESK[0] + 0.1, 0.92, DESK[2] + 0.04), lam("knob", () => ({ color: "#1f1f24" })));
      bb.add(boxGeo(V(DESK[0] - 0.75, 0.82, DESK[2] - 0.3), V(DESK[0] - 0.4, 1.1, DESK[2] - 0.05)), lam("battery", () => ({ color: "#2f5f6a" })));
      // paper tape strip
      bb.add(boxGeo(V(DESK[0] + 0.2, 0.83, DESK[2] - 0.02), V(DESK[0] + 0.85, 0.835, DESK[2] + 0.05)), lam("tape", () => ({ color: "#f7f1e1" })));
    });
    mkSet("sewing", (bb) => { // striped gores spread on a big table, half a balloon hanging from the beams
      const [cx, , cz] = SEW_AT;
      bb.add(boxGeo(V(cx - 1.0, 0.78, cz - 0.9), V(cx + 1.2, 0.84, cz - 0.1)), lam("tableWood", () => ({ color: "#8a5a34" })));
      for (const [dx, dz] of [[-0.95, -0.85], [1.15, -0.85], [-0.95, -0.15], [1.15, -0.15]]) bb.add(boxGeo(V(cx + dx - 0.04, 0, cz + dz - 0.04), V(cx + dx + 0.04, 0.78, cz + dz + 0.04)), lam("tableWood", () => ({ color: "#8a5a34" })));
      const gm = lam("env_moctezuma", () => ({ map: goreTex("moctezuma", KINDS.moctezuma[0], KINDS.moctezuma[1]), side: THREE.DoubleSide }));
      const cl = new THREE.PlaneGeometry(1.9, 0.7, 8, 2); cl.rotateX(-Math.PI / 2); cl.translate(cx + 0.1, 0.86, cz - 0.5); bb.add(cl, gm);
      const half = hotEnvelope(); half.scale(0.22, 0.22, 0.22); half.translate(cx - 0.4, 0.9, cz - 1.6); bb.add(half, gm);
    });
    {
      const s = sombreroMesh(); s.position.set(rx - 1.2, 1.72, rz - hd + 0.55); s.rotation.set(0.45, 0.25, 0.12); s.scale.setScalar(1.3);
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), lam("peg", () => ({ color: "#6b4a30" }))); peg.rotation.x = Math.PI / 2; peg.position.set(rx - 1.2, 2.05, rz - hd + 0.2);
      const grp = new THREE.Group(); grp.add(s, peg); grp.visible = false; R.add(grp); this.sets.sombrero = grp;
    }

    // light shafts: one down through the broken skylight, one slanting in through the window (additive, soft edges)
    const beamMat = () => new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(1.0, 0.86, 0.6) }, uK: { value: 0.35 } },
      vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uCol; uniform float uK; varying vec2 vU; void main(){ float e = sin(3.14159 * vU.x); float a = uK * e * e * mix(0.35, 1.0, vU.y); gl_FragColor = vec4(uCol * a, 1.0); }",
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    });
    const bs = new THREE.CylinderGeometry(0.9, 1.6, ROOM_H, 24, 1, true); bs.translate(0, ROOM_H / 2, 0);
    this.beamSky = new THREE.Mesh(bs, beamMat()); this.beamSky.position.set(TABLE[0], 0, TABLE[2]); this.beamSky.rotation.z = 0.12;
    const bw = new THREE.CylinderGeometry(0.9, 1.5, 4.2, 4, 1, true); bw.rotateY(Math.PI / 4); bw.translate(0, -2.1, 0);
    this.beamWin = new THREE.Mesh(bw, beamMat()); this.beamWin.position.set(rx + 1.5, 2.2, rz - hd + 0.1); this.beamWin.rotation.set(-0.95, 0, 0.15);
    for (const m of [this.beamSky, this.beamWin]) { m.layers.set(NOINK); m.visible = false; m.renderOrder = 6; R.add(m); }
    // the oil lamp on the sewing table (night)
    this.lamp = new THREE.Group();
    const brassL = lam("lampBrass", () => ({ color: "#c9952a" }));
    this.lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 16), brassL));
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.28, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, 0.7), side: THREE.DoubleSide }));
    chim.position.y = 0.2; this.lamp.add(chim);
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.2, 1.2, 0.45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.lampGlow.position.y = 0.22; this.lampGlow.scale.setScalar(1.1); this.lampGlow.layers.set(NOINK); this.lamp.add(this.lampGlow);
    this.lamp.position.set(SEW_AT[0] + 1.0, 0.84, SEW_AT[2] - 0.8); this.lamp.visible = false; R.add(this.lamp);

    // ================= the bullring, 1863 =================
    const bb2 = new Batch(), [bx, , bz] = BULL;
    bb2.add(plane(900, 900, bx, -0.02, bz, 8), lam("streetHD", () => ({ map: rep(cobbleHD(), 1, 1) })));
    const arena = new THREE.CircleGeometry(ARENA_R, 64); arena.rotateX(-Math.PI / 2); arena.translate(bx, 0.01, bz);
    const auv = arena.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < auv.count; i++) auv.setXY(i, auv.getX(i) * 6, auv.getY(i) * 6);
    bb2.add(arena, lam("arenaSand", () => ({ map: sandTex() })));
    const barrier = new THREE.CylinderGeometry(ARENA_R, ARENA_R, 1.5, 64, 1, true); barrier.scale(-1, 1, 1); barrier.translate(bx, 0.75, bz);
    bb2.add(barrier, lam("barrier", () => ({ color: "#b8372f", side: THREE.DoubleSide })));
    const prof: [number, number][] = [[ARENA_R + 0.01, 1.5], [ARENA_R + 1.2, 1.5]];
    for (let k = 0; k < 8; k++) { const r0 = ARENA_R + 1.2 + k * 1.3, y = 1.5 + (k + 1) * 0.85; prof.push([r0, y], [r0 + 1.3, y]); }
    prof.push([ARENA_R + 1.2 + 8 * 1.3, 1.5 + 8 * 0.85 + 1.2], [ARENA_R + 1.25 + 8 * 1.3, 0]);
    const stands = lathe(prof); stands.translate(bx, 0, bz); bb2.add(stands, lam("stands", () => ({ color: "#d9c39a", side: THREE.DoubleSide })));
    const outer = new THREE.CylinderGeometry(ARENA_R + 11.8, ARENA_R + 11.8, 9.5, 64, 1, true); outer.translate(bx, 4.75, bz);
    const ouv = outer.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < ouv.count; i++) ouv.setX(i, ouv.getX(i) * 14);
    bb2.add(outer, lam("bullArches", () => ({ map: archTex() })));
    for (let k = 0; k < 10; k++) { // flag poles on the rim
      const a = (k / 10) * Math.PI * 2, x = bx + Math.cos(a) * (ARENA_R + 11.5), z = bz + Math.sin(a) * (ARENA_R + 11.5);
      bb2.add(new THREE.CylinderGeometry(0.06, 0.06, 4, 6).translate(x, 11.5, z), lam("pole", () => ({ color: "#6b4a30" })));
      const fl = new THREE.PlaneGeometry(1.4, 0.8); fl.translate(x + 0.7, 13, z); bb2.add(fl, lam(["flagR", "flagW", "flagG"][k % 3], () => ({ color: ["#c0353a", "#f3ead6", "#2f8a4b"][k % 3], side: THREE.DoubleSide })));
    }
    for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 60 + r() * 120; prop(bb2, kit, "tree_oak", bx + Math.cos(a) * d, 0, bz + Math.sin(a) * d, 8 + r() * 4, r() * 6); }
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = 140 + r() * 30; casa(bb2, bx + Math.cos(a) * d, bz + Math.sin(a) * d, 10, 10, 8.4, i % 7, false); }
    bb2.build(R);

    // ================= the Chalco valley, 1914 =================
    const cb = new Batch(), [cx0, , cz0] = CHALCO;
    cb.add(plane(2400, 2400, cx0, 0, cz0, 120), lam("fields", () => ({ map: fieldTex() })));
    for (let i = 0; i < 140; i++) {
      const x = cx0 + (r() - 0.5) * 700, z = cz0 + (r() - 0.5) * 500;
      if (Math.abs(z - cz0) < 14 && x > cx0 - 20 && x < cx0 + 70) continue;
      prop(cb, kit, r() < 0.3 ? "tree-high-round" : "tree_oak", x, 0, z, 7 + r() * 5, r() * 6);
    }
    for (let i = 0; i < 6; i++) casa(cb, cx0 + 120 + i * 11, cz0 - 90, 10, 8, 5.5, i, false); // a village
    cb.build(R);
    // the two volcanoes on the horizon (unfogged, painted hazy)
    const haze = lam("volcHaze", () => ({ color: "#8794c4", fog: false })), snow = lam("volcSnow", () => ({ color: "#f4f6fc", fog: false }));
    for (const [x, z, h, rr, w] of [[480, -760, 260, 330, 1], [130, -860, 230, 420, 0.6]] as const) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rr, h, 48, 6, true), haze); cone.scale.set(1, 1, w); cone.position.set(cx0 + x, h / 2 - 2, cz0 + z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(rr * 0.3, h * 0.3, 48, 1, true), snow); cap.scale.set(1, 1, w); cap.position.set(cx0 + x, h - h * 0.15 - 1.5, cz0 + z);
      this.volcanoes.add(cone, cap);
    }
    this.volcanoes.traverse((o) => o.layers.set(NOINK));
    R.add(this.volcanoes);

    // ================= movable things =================
    this.balloons = { moctezuma: buildBalloon("moctezuma"), second: buildBalloon("second"), third: buildBalloon("third"), gas: buildBalloon("gas") };
    for (const k of Object.keys(this.balloons) as BKind[]) R.add(this.balloons[k].g);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), lam("beachBall", () => ({ map: beachTex() })));
    this.ball.castShadow = true; this.ball.visible = false; R.add(this.ball);
    const lg = new THREE.CylinderGeometry(0.26, 0.2, 0.5, 12); lg.translate(0, 0.25, 0);
    this.lanterns = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.0, 0.42), fog: false }), LANTERN_N);
    this.lanternGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(1.6, 0.8, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), LANTERN_N);
    for (const m of [this.lanterns, this.lanternGlow]) { m.frustumCulled = false; m.layers.set(NOINK); m.visible = false; R.add(m); }
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.place === "room" ? 0.05 : 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const O = OVER[id] ?? {};
    if (O.lit) TONE.uLitCol.value.set(...O.lit);
    if (O.shade) TONE.uShadeCol.value.set(...O.shade);
    if (O.lift) TONE.uShadeLift.value.set(...O.lift);
    if (O.sat) TONE.uSat.value = O.sat;
    if (O.charTint) CHAR.uCharTint.value.set(...O.charTint);
    if (O.charShade) CHAR.uCharShade.value = O.charShade;
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    (O.sky ?? K.sky.c).forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(O.sky ? O.sky[0] : L.fog, this.fog.color); this.fog.near = O.fogNear ?? L.fogNear; this.fog.far = O.fogFar ?? L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" && s.place !== "room";
    this.sunDisc.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
    }
    for (const m of this.clouds) {
      const i = m.userData.k as number, a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 1.5, 120 + (i % 4) * 38, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
      m.visible = s.place !== "room";
    }
    // ---- room sets ----
    const dining = id === 2 || id === 15 || id === 16;
    this.sets.ceilHole.visible = dining; this.sets.ceilWhole.visible = s.place === "room" && !dining;
    this.sets.dining.visible = dining; this.sets.office.visible = id === 3; this.sets.sewing.visible = id === 4; this.sets.sombrero.visible = id === 26;
    this.volcanoes.visible = s.place === "chalco";
    const beam = O.beam ?? 0;
    this.beamSky.visible = dining && beam > 0; this.beamWin.visible = (id === 3 || id === 26) && beam > 0;
    (this.beamSky.material as THREE.ShaderMaterial).uniforms.uK.value = 0.28 * beam * (id === 2 ? 0.6 + 0.4 * Math.min(1, (f - 99) / 10) : 1);
    (this.beamWin.material as THREE.ShaderMaterial).uniforms.uK.value = 0.24 * beam;
    (this.beamWin.material as THREE.ShaderMaterial).uniforms.uCol.value.set(...(id === 26 ? [1.0, 0.62, 0.32] : [1.0, 0.86, 0.6]) as C3);
    this.lamp.visible = id === 4; this.lampGlow.scale.setScalar(1.1 * (1 + 0.04 * Math.sin(f * 0.9) + 0.03 * Math.sin(f * 2.3)));
    // ---- balloons ----
    for (const k of Object.keys(this.balloons) as BKind[]) this.balloons[k].g.visible = false;
    for (const p of balloonsAt(id, f)) {
      const o = this.balloons[p.kind];
      o.g.visible = true; o.g.position.set(...p.pos); o.g.rotation.set(0, 0, p.sway);
      const cl = p.collapse;
      o.env.scale.set(1 + 0.45 * cl, Math.max(0.08, 1 - 0.9 * cl), 1 + 0.45 * cl);
      o.env.position.set(-2.5 * cl, -1.2 * cl, 0); o.env.rotation.z = 0.5 * cl;
      o.fire.visible = p.fire > 0.01; o.fire.scale.setScalar(1.2 + 0.8 * p.fire * (1 + 0.15 * Math.sin(f * 1.7)));
    }
    // ---- beach ball ----
    this.ball.visible = id === 18;
    if (this.ball.visible) { const p = ballAt(f); this.ball.position.set(...p); this.ball.rotation.set(0.3, f * 0.25, 0.1); }
    // ---- paper lanterns ----
    const lan = id === 27;
    this.lanterns.visible = this.lanternGlow.visible = lan;
    if (lan) {
      const q = new THREE.Quaternion(), one = V(1, 1, 1), m = new THREE.Matrix4();
      for (let k = 0; k < LANTERN_N; k++) {
        const p = lanternAt(k, f);
        if (!p) { m.makeScale(0, 0, 0); this.lanterns.setMatrixAt(k, m); this.lanternGlow.setMatrixAt(k, m); continue; }
        m.compose(V(...p), q.identity(), one); this.lanterns.setMatrixAt(k, m);
        const gs = Math.min(1.4, 0.18 * cam.position.distanceTo(this.v.set(p[0], p[1], p[2]))); m.compose(V(p[0], p[1] + 0.25, p[2]), cam.quaternion, V(gs, gs, gs)); this.lanternGlow.setMatrixAt(k, m);
      }
      this.lanterns.instanceMatrix.needsUpdate = true; this.lanternGlow.instanceMatrix.needsUpdate = true;
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow && s.place !== "room";
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}
