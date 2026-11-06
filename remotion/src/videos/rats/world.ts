// "The Rats That Kept Their Lives" as one three.js scene: Hanoi in 1902 (the city hall square with the bounty desk, a
// boulevard of French villas with a shiny new manhole, a lake with a little tower, a street of tube houses, a villa
// garden), the brick sewer under it, a French bathroom and a rat farm in the countryside. update(id, f, camera) poses
// everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, setSight, prop, house, Ray, Kit } from "./build";
import { ctex, cloudHD, grassHD, stoneHD, roofHD, cobbleHD, facadeHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, HALL_Z, DESK, DESK_TOP, MAN, LAKE_Z, TOWER, ALLEY_Z, GRATE, GARDEN, SEW, SEW_W, SEW_H, SEW_R, CAT_Z,
  BATH, LOO, FARM, CAGES, camAt, POP, SCRAP, DARK, PRED, V3, smooth, clamp01,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: trees are drawn by build.ts
void LFB;

/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 130, el: 14 }, 14: { az: 140, el: 12 }, 6: { az: 150, el: 12 }, 16: { az: 145, el: 12 } };

/** every lens position of the film looking at its subject (houses and trees there are left out) */
const sightLines = (place: string): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== place) continue;
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = fw.length();
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len: Math.min(len, 30), core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

// ---------------- paintings ----------------
const roadTex = () => ctex("rtRoad", 512, 512, (g, r) => {
  g.fillStyle = "#d2b07a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 520; k++) { g.fillStyle = ["#c29e68", "#dcbc88", "#b8925c"][Math.floor(r() * 3)]; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 5, 0, 7); g.fill(); }
});
const clockTex = () => ctex("rtClock", 256, 256, (g) => {
  g.fillStyle = "#f7f1e1"; g.strokeStyle = "#221f2e"; g.lineWidth = 12;
  g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.stroke();
  g.lineCap = "round";
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = 8; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 96 * Math.cos(a), 128 + 96 * Math.sin(a)); g.stroke(); }
  g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(186, 128); g.stroke();
});
/** the manhole cover: concentric rings and a cross-hatch, cast iron */
const coverTex = () => ctex("rtCover", 256, 256, (g) => {
  g.fillStyle = "#8f96a2"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#5a606c"; g.lineWidth = 7;
  for (const r of [120, 92, 40]) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); }
  g.lineWidth = 5; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(128 + i * 22, 50); g.lineTo(128 + i * 22, 206); g.stroke(); g.beginPath(); g.moveTo(50, 128 + i * 22); g.lineTo(206, 128 + i * 22); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(96, 86, 40, 16, -0.6, 0, 7); g.fill(); // the shine
});
/** sewer bricks: dark red-brown, mortar lines, a few damp moss patches */
const sewerBrick = () => ctex("rtSewBrick", 512, 512, (g, r) => {
  g.fillStyle = "#6a4a3a"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let i = -1; i < 8; i++) {
    const x = i * 64 + (row % 2) * 32, y = row * 32;
    g.fillStyle = ["#a85e44", "#9a5640", "#b26a4c", "#8e5038"][Math.floor(r() * 4)];
    g.fillRect(x + 3, y + 3, 58, 26);
  }
  for (let k = 0; k < 10; k++) { g.fillStyle = "rgba(90,120,60,0.35)"; g.beginPath(); g.ellipse(r() * 512, 400 + r() * 112, 30 + r() * 40, 10 + r() * 10, 0, 0, 7); g.fill(); }
});
const waterTex = (key: string, base: string, line: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = line; g.lineWidth = 5; g.lineCap = "round";
  for (let k = 0; k < 40; k++) { const x = r() * 512, y = r() * 512, w = 20 + r() * 50; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke(); }
});
/** bathroom: white tiles below, green-striped wallpaper above (a 4.4 x 3.2 m wall); window = a sunny window with a palm */
const bathWall = (window: boolean) => ctex("rtBathWall" + (window ? "W" : ""), 1024, 744, (g) => {
  const S = 1024 / 4.4, wy = 744 - 1.3 * S;
  for (let x = 0; x < 1024; x += 26) { g.fillStyle = (x / 26) % 2 ? "#dfeadf" : "#cfe0cf"; g.fillRect(x, 0, 26, wy); }
  g.fillStyle = "#f4f4ee"; g.fillRect(0, wy, 1024, 744 - wy);
  g.strokeStyle = "#c8ccc6"; g.lineWidth = 3;
  for (let y = wy; y < 744; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  for (let x = 0; x < 1024; x += 34) { g.beginPath(); g.moveTo(x, wy); g.lineTo(x, 744); g.stroke(); }
  g.fillStyle = "#3f6a8a"; g.fillRect(0, wy - 10, 1024, 14); // a blue border tile row
  if (window) {
    const x0 = 560, y0 = 120, w = 260, h = 300;
    g.fillStyle = "#8cc4ec"; g.fillRect(x0, y0, w, h);
    g.fillStyle = "#5a9a4a"; g.beginPath(); g.ellipse(x0 + 180, y0 + 120, 90, 40, -0.4, 0, 7); g.fill();
    g.strokeStyle = "#7a5a3a"; g.lineWidth = 14; g.beginPath(); g.moveTo(x0 + 190, y0 + 300); g.lineTo(x0 + 170, y0 + 130); g.stroke();
    g.strokeStyle = "#f4efe2"; g.lineWidth = 18; g.strokeRect(x0, y0, w, h); g.beginPath(); g.moveTo(x0 + w / 2, y0); g.lineTo(x0 + w / 2, y0 + h); g.moveTo(x0, y0 + h / 2); g.lineTo(x0 + w, y0 + h / 2); g.stroke();
  }
});
const checkerTex = () => ctex("rtChecker", 256, 256, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#2f3a4a" : "#efe8d8"; g.fillRect(i * 32, j * 32, 32, 32); } });
/** bamboo bars for the farm cages (transparent between the bars) */
const barsTex = () => ctex("rtBars", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { g.fillStyle = "#d6b46a"; g.fillRect(i * 32 + 11, 0, 10, 256); g.fillStyle = "#a8843e"; g.fillRect(i * 32 + 11, 120, 10, 6); }
  g.fillStyle = "#c9a25a"; g.fillRect(0, 0, 256, 14); g.fillRect(0, 242, 256, 14);
});
const riceTex = () => ctex("rtRice", 512, 512, (g, r) => {
  g.fillStyle = "#7fa86a"; g.fillRect(0, 0, 512, 512);
  for (let y = 8; y < 512; y += 24) for (let x = 6 + (y % 48 ? 0 : 10); x < 512; x += 20) {
    g.fillStyle = ["#8ec46a", "#9ad070", "#7ab85c"][Math.floor(r() * 3)];
    g.beginPath(); g.ellipse(x, y, 5, 9, 0, 0, 7); g.fill();
  }
});
const frondTex = () => ctex("rtFrond", 256, 64, (g) => {
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = "#4f9a3e"; g.beginPath(); g.moveTo(0, 32); g.quadraticCurveTo(128, -6, 256, 30); g.quadraticCurveTo(128, 70, 0, 32); g.fill();
  g.strokeStyle = "#7ab85c"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 32); g.quadraticCurveTo(128, 26, 256, 30); g.stroke();
  g.strokeStyle = "#3a7a2e"; g.lineWidth = 2; for (let x = 20; x < 240; x += 14) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 10, 8 + x / 30); g.moveTo(x, 32); g.lineTo(x + 10, 56 - x / 30); g.stroke(); }
});
const DARKM = () => lam("rtDark", () => ({ color: "#1a1210" }));

const MAT = {
  wood: () => lam("rtWood", () => ({ color: "#b07a48" })), woodD: () => lam("rtWoodD", () => ({ color: "#6a4430" })),
  iron: () => lam("rtIron", () => ({ color: "#4a4e58" })), cream: () => lam("rtCream", () => ({ color: "#efe0b8" })),
  trim: () => lam("rtTrim", () => ({ color: "#f6ecd2" })), white: () => lam("rtPorc", () => ({ color: "#f6f6f2" })),
  green: () => lam("rtHedge", () => ({ color: "#4f9a3e" })), terra: () => lam("rtTerra", () => ({ color: "#b8644f" })),
  stone: () => lam("rtStone", () => ({ map: stoneHD("rtStoneT", ["#cfc6b4", "#c4baa6", "#d8cfbe", "#bcb19c"], "#8e8676") })),
  bamboo: () => lam("rtBamboo", () => ({ color: "#d6b46a" })), thatch: () => lam("roof#c9a25a", () => ({ map: roofHD("#c9a25a"), side: THREE.DoubleSide })),
  brick: () => lam("rtSewBrickM", () => ({ map: sewerBrick(), side: THREE.DoubleSide })),
};
const shadowAll = (o: THREE.Object3D, cast = true) => o.traverse((m) => { const x = m as THREE.Mesh; if (x.isMesh && !x.layers.isEnabled(NOINK)) { x.castShadow = cast; x.receiveShadow = true; } });
const archShape = (w: number, h: number) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 16);
};
/** a gable roof over a box (ridge along z) */
const gable = (b: Batch, x0: number, x1: number, y: number, z0: number, z1: number, rise: number, mat: THREE.Material, wall: THREE.Material) => {
  const cx = (x0 + x1) / 2, w = x1 - x0, o = 0.4;
  const g = new THREE.BufferGeometry();
  const P = [[x0 - o, y - 0.2, z0 - o], [cx, y + rise, z0 - o], [cx, y + rise, z1 + o], [x0 - o, y - 0.2, z1 + o], [x1 + o, y - 0.2, z1 + o], [cx, y + rise, z1 + o], [cx, y + rise, z0 - o], [x1 + o, y - 0.2, z0 - o]];
  const idx = [0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6];
  g.setAttribute("position", new THREE.Float32BufferAttribute(idx.flatMap((i) => P[i]), 3));
  const uvs = [[0, 0], [1, 1], [0, 1], [0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1], [0, 0], [1, 0], [1, 1]].map(([u, v]) => [u * (z1 - z0) / 4, v * (w / 2) / 4]);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs.flat(), 2));
  g.computeVertexNormals();
  b.add(g, mat);
  for (const z of [z0, z1]) {
    const t = new THREE.BufferGeometry();
    t.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z, x1, y, z, cx, y + rise, z], 3));
    if (z === z1) t.setIndex([0, 1, 2]); else t.setIndex([0, 2, 1]);
    t.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    t.computeVertexNormals();
    b.add(t, wall);
  }
};
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
/** a palm: a gently curved trunk and a crown of drooping fronds */
const palm = (b: Batch, x: number, z: number, h: number, seed: number) => {
  const r = rng(seed), lean = (r() - 0.5) * 0.3, n = 10, tm = lam("rtPalmTrunk", () => ({ color: "#9a7a5a" }));
  let px = x, pz = z, py = 0;
  for (let i = 0; i < n; i++) {
    const nx = x + lean * h * ((i + 1) / n) ** 2, dy = h / n, ang = Math.atan2(nx - px, dy);
    const seg = new THREE.CylinderGeometry(0.15 - i * 0.006, 0.18 - i * 0.006, Math.hypot(dy, nx - px) + 0.08, 8);
    seg.rotateZ(-ang); at(seg, (px + nx) / 2, py + dy / 2, pz); b.add(seg, tm);
    px = nx; py += dy;
  }
  const fm = lam("rtFrondM", () => ({ map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide }));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + r(), fg = new THREE.PlaneGeometry(2.6, 0.7);
    fg.translate(1.3, 0, 0); fg.rotateX(Math.PI / 2); fg.rotateZ(-0.35 - r() * 0.3); fg.rotateY(a);
    at(fg, px, py, pz); b.add(fg, fm);
  }
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private cover: THREE.Object3D; private lid: THREE.Object3D; private boxLid: THREE.Object3D;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (bridge recipe) ----
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
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    const cmaps = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud));
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cmaps[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.userData.k = i;
      this.clouds.push(m); R.add(m);
    }

    // ---- Hanoi ----
    setSight(sightLines("city"));
    const r = rng(29);
    const b = new Batch();
    const ground = new THREE.PlaneGeometry(1600, 1600); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 240, uv.getY(i) * 240);
    ground.translate(0, 0, -700); // the lake replaces the ground south of z = 96
    b.add(ground, lam("rtField", () => ({ map: grassHD() })));
    const cob = lam("rtCobble", () => ({ map: cobbleHD() })), road = lam("rtRoadM", () => ({ map: roadTex() }));
    b.add(boxGeo(V(-24, 0, -24), V(24, 0.04, 2), 8), cob);                    // the city hall square
    b.add(boxGeo(V(-7, 0, 2), V(7, 0.04, LAKE_Z), 6), road);                  // the boulevard
    for (const s of [-1, 1]) b.add(boxGeo(V(s > 0 ? 7 : -10.5, 0, 2), V(s > 0 ? 10.5 : -7, 0.1, LAKE_Z), 8), cob); // pavements
    b.add(boxGeo(V(-80, 0, ALLEY_Z - 4), V(-7, 0.04, ALLEY_Z + 4), 6), road);   // the tube-house street
    b.add(boxGeo(V(-80, 0, ALLEY_Z + 3.4), V(-10.5, 0.12, ALLEY_Z + 4.6), 4), MAT.stone()); // north kerb
    b.add(boxGeo(V(-80, 0, ALLEY_Z - 4.6), V(-10.5, 0.12, ALLEY_Z - 3.4), 4), MAT.stone()); // south kerb
    // the city hall: a long cream block, an arcade, a clock tower over the middle
    {
      const Z = HALL_Z, h = 11, st = { wall: "#efe0b8", shutter: "#2f6a43" };
      const fq = new THREE.PlaneGeometry(36, h); fq.translate(0, h / 2, Z + 0.01); b.add(fq, lam("rtHallF", () => ({ map: facadeHD("rtHallF", 36, h, { ...st, door: false }) })));
      b.add(boxGeo(V(-18, 0, Z - 12), V(18, h, Z)), MAT.cream());
      b.add(boxGeo(V(-18.3, h, Z - 12.3), V(18.3, h + 0.5, Z + 0.3)), MAT.trim());          // cornice
      for (let x = -17.5; x <= 17.5; x += 1.0) b.add(boxGeo(V(x - 0.12, h + 0.5, Z + 0.05), V(x + 0.12, h + 1.3, Z + 0.25)), MAT.trim()); // balustrade
      b.add(boxGeo(V(-18.3, h + 1.3, Z + 0.0), V(18.3, h + 1.5, Z + 0.3)), MAT.trim());
      for (let i = 0; i < 9; i++) { const x = -16 + i * 4; b.add(archShape(2.6, 3.3).translate(x, 0, Z + 0.04), DARKM()); b.add(boxGeo(V(x + 1.4, 0, Z), V(x + 2.6, 3.8, Z + 0.35)), MAT.trim()); }
      b.add(boxGeo(V(-18, 3.8, Z), V(18, 4.2, Z + 0.4)), MAT.trim());
      b.add(boxGeo(V(-4, 0, Z - 9), V(4, 21, Z + 1.2)), MAT.cream());                           // tower
      b.add(boxGeo(V(-4.3, 21, Z - 9.3), V(4.3, 21.6, Z + 1.5)), MAT.trim());
      const clock = new THREE.CircleGeometry(2.0, 40); clock.translate(0, 17.5, Z + 1.22); b.add(clock, lam("rtClockM", () => ({ map: clockTex() })));
      const ring = new THREE.RingGeometry(2.0, 2.35, 40); ring.translate(0, 17.5, Z + 1.21); b.add(ring, MAT.trim());
      const cap = new THREE.ConeGeometry(5.6, 5, 4); cap.rotateY(Math.PI / 4); cap.translate(0, 24.1, Z - 3.9); b.add(cap, lam("roof#8f97a8", () => ({ map: roofHD("#8f97a8", true), side: THREE.DoubleSide })));
      b.add(boxGeo(V(-0.06, 26.4, Z - 3.96), V(0.06, 28.5, Z - 3.84)), MAT.iron());
      for (let s = 0; s < 4; s++) b.add(boxGeo(V(-6 + s * 0.15, 0, Z + 1.2 + s * 0.6), V(6 - s * 0.15, 0.6 - s * 0.15, Z + 1.8 + s * 0.6)), MAT.stone()); // steps
      b.add(archShape(2.6, 4.2).translate(0, 0, Z + 1.23), DARKM());
    }
    // the bounty desk (top at DESK_TOP), a chest of coins on it, stacks of coins
    {
      const [x, , z] = DESK;
      b.add(boxGeo(V(x - 1.3, DESK_TOP - 0.06, z - 0.5), V(x + 1.3, DESK_TOP, z + 0.5)), MAT.wood());
      b.add(boxGeo(V(x - 1.25, 0.2, z + 0.42), V(x + 1.25, DESK_TOP - 0.06, z + 0.48)), lam("rtDeskCloth", () => ({ color: "#2f5f6a" })));
      for (const [a, c] of [[-1.2, -0.42], [1.2, -0.42]]) b.add(boxGeo(V(x + a - 0.05, 0, z + c - 0.05), V(x + a + 0.05, DESK_TOP - 0.06, z + c + 0.05)), MAT.woodD());
      b.add(boxGeo(V(x - 0.95, DESK_TOP, z - 0.32), V(x - 0.45, DESK_TOP + 0.24, z + 0.02)), MAT.woodD()); // the coin chest
      for (const [cx, cz, n] of [[-0.3, 0.2, 5], [-0.18, 0.28, 3], [-0.36, 0.32, 2]] as const) { const c = new THREE.CylinderGeometry(0.035, 0.035, 0.012 * n, 12); c.translate(x + cx, DESK_TOP + 0.006 * n, z + cz); b.add(c, lam("rtGold", () => ({ color: "#e8bc4a" }))); }
      const st = new THREE.CylinderGeometry(0.22, 0.25, 0.46, 12); st.translate(x, 0.23, z - 1.0); b.add(st, MAT.woodD()); // the clerk's stool
    }
    // the shiny manhole: a dark hole (under the cover) + an iron rim
    { const h = new THREE.CircleGeometry(0.42, 32); h.rotateX(-Math.PI / 2); h.translate(MAN[0], 0.045, MAN[2]); b.add(h, DARKM());
      const rim = new THREE.RingGeometry(0.42, 0.5, 32); rim.rotateX(-Math.PI / 2); rim.translate(MAN[0], 0.046, MAN[2]); b.add(rim, MAT.iron()); }
    // the gutter grate on the tube-house street's north kerb
    { const [gx, , gz] = GRATE; b.add(boxGeo(V(gx - 0.45, 0.0, gz - 0.25), V(gx + 0.45, 0.045, gz + 0.25)), DARKM());
      for (let i = 0; i < 7; i++) b.add(boxGeo(V(gx - 0.42 + i * 0.14, 0.04, gz - 0.24), V(gx - 0.38 + i * 0.14, 0.07, gz + 0.24)), MAT.iron());
      b.add(boxGeo(V(gx - 0.46, 0.04, gz - 0.26), V(gx + 0.46, 0.07, gz - 0.22)), MAT.iron()); b.add(boxGeo(V(gx - 0.46, 0.04, gz + 0.22), V(gx + 0.46, 0.07, gz + 0.26)), MAT.iron()); }
    // villas along the boulevard (gaps: the tube-house street west at z 48, the garden east at z 56-70)
    let k = 0;
    const HS = (x: number, z: number, yaw: number, w: number, d: number, h: number, si: number) => house(b, x, z, yaw, w, d, h, si);
    for (let z = 8; z < 92; z += 11) {
      if (Math.abs(z - ALLEY_Z) > 8) HS(-16.5, z, Math.PI / 2, 9, 10, 7.5 + r() * 2, k++ % 5);
      if (z < 52 || z > 74) HS(16.5, z, -Math.PI / 2, 9, 10, 7.5 + r() * 2, k++ % 5);
    }
    for (const z of [-16, -5]) { HS(-29, z, Math.PI / 2, 9, 10, 8 + r() * 2, k++ % 5); HS(29, z, -Math.PI / 2, 9, 10, 8 + r() * 2, k++ % 5); }
    HS(36, GARDEN[2], -Math.PI / 2, 10, 9, 8, 1);                                               // the garden villa
    for (let x = -13; x > -78; x -= 4.3) { HS(x, ALLEY_Z - 8.6, 0, 4.1, 9, 6 + r() * 3.5, 5 + (k++ % 3)); HS(x - 1.2, ALLEY_Z + 8.6, Math.PI, 4.1, 9, 6 + r() * 3.5, 5 + (k++ % 3)); }
    // trees: a double row of tamarinds down the boulevard, palms by the lake and in the garden
    for (let z = 5; z < 92; z += 9) for (const x of [-8.8, 8.8]) prop(b, kit, "tree_oak", x + (r() - 0.5) * 0.4, 0.1, z + r(), 8 + r() * 2, r() * 6);
    for (const [x, z] of [[-12, 99], [13, 100], [27, 58], [21, 67.5]] as const) palm(b, x, z, 6 + r() * 2, x * 7 + z);
    // the villa garden: lawn, a low hedge, a flower bed
    {
      const [gx, , gz] = GARDEN;
      b.add(boxGeo(V(gx - 5, 0, gz - 4), V(gx + 5, 0.06, gz + 4)), lam("rtLawn", () => ({ map: grassHD(), color: "#e8f4d0" })));
      for (const [x0, z0, x1, z1] of [[-5, -4.4, 5, -4], [-5.4, -4.4, -5, 1.2], [-5.4, 2.8, -5, 4.4], [-5, 4, 5, 4.4], [5, -4.4, 5.4, 4.4]] as const)
        b.add(boxGeo(V(gx + x0, 0, gz + z0), V(gx + x1, 0.7, gz + z1)), MAT.green());
      b.add(boxGeo(V(gx - 4.6, 0, gz - 3.9), V(gx + 4.6, 0.18, gz - 3.2)), lam("rtSoil", () => ({ color: "#7a5a3a" })));
      for (let i = 0; i < 18; i++) { const fl = new THREE.SphereGeometry(0.13, 8, 6); fl.translate(gx - 4.3 + i * 0.5, 0.32, gz - 3.55 + (i % 2) * 0.2); b.add(fl, lam("rtFlower" + (i % 3), () => ({ color: ["#e0503a", "#f0c040", "#e86a9a"][i % 3] }))); }
    }
    // the lake: water, a stone embankment, the islet with its little tower
    {
      const w = new THREE.PlaneGeometry(400, 300); w.rotateX(-Math.PI / 2); w.translate(0, -0.35, LAKE_Z + 150);
      const wuv = w.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < wuv.count; i++) wuv.setXY(i, wuv.getX(i) * 30, wuv.getY(i) * 22);
      b.add(w, lam("rtLake", () => ({ map: waterTex("rtLakeT", "#4f9aa0", "#8fd0cc") })));
      b.add(boxGeo(V(-200, -0.6, LAKE_Z - 1), V(200, 0.1, LAKE_Z)), MAT.stone());
      const [tx, , tz] = TOWER;
      const isl = new THREE.CylinderGeometry(6, 7, 0.8, 24); isl.translate(tx, -0.2, tz); b.add(isl, lam("rtIslet", () => ({ map: grassHD() })));
      const T = lam("rtTowerM", () => ({ color: "#e2cfa0" }));
      b.add(boxGeo(V(tx - 2, 0, tz - 2), V(tx + 2, 4, tz + 2)), T);
      b.add(boxGeo(V(tx - 1.5, 4.4, tz - 1.5), V(tx + 1.5, 7, tz + 1.5)), T);
      b.add(boxGeo(V(tx - 1, 7.4, tz - 1), V(tx + 1, 9, tz + 1)), T);
      for (const [y, s] of [[4, 2.6], [7, 2.0], [9, 1.4]] as const) { const c = new THREE.ConeGeometry(s * 1.42, 0.8 + s * 0.2, 4); c.rotateY(Math.PI / 4); c.translate(tx, y + 0.3, tz); b.add(c, MAT.terra()); }
      for (const s of [-1, 1]) { b.add(archShape(1.2, 2.2).translate(tx, 0.3, tz + s * 2.02).rotateY(0), DARKM()); }
      for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 120 + r() * 60; prop(b, kit, "tree_oak", Math.cos(a) * d * 0.9, 0, LAKE_Z + 150 + Math.sin(a) * d * 0.6 + 60, 8 + r() * 4, r() * 6); }
      prop(b, kit, "tree_oak", tx - 4, 0.2, tz + 2.5, 6, 1);
    }
    for (let i = 0; i < 40; i++) { const x = (r() < 0.5 ? -1 : 1) * (40 + r() * 140), z = -60 + r() * 150; prop(b, kit, "tree_oak", x, 0, z, 8 + r() * 5, r() * 6); }
    b.build(R);
    setSight([]);
    // the manhole cover (slides off in shot 7)
    { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 32), [lam("rtIronSide", () => ({ color: "#6a707a" })), lam("rtCoverM", () => ({ map: coverTex() })), lam("rtIronSide", () => ({ color: "#6a707a" }))]);
      c.rotation.y = 0.3; g.add(c); shadowAll(g); R.add(g); this.cover = g; }
    // the coin chest lid (slammed shut when the bounty is scrapped)
    { const g = new THREE.Group(); g.position.set(DESK[0] - 0.7, DESK_TOP + 0.24, DESK[2] - 0.32);
      g.add(new THREE.Mesh(boxGeo(V(-0.26, 0, 0), V(0.26, 0.06, 0.36)), MAT.woodD())); shadowAll(g); R.add(g); this.boxLid = g; }

    // ---- the sewer: a brick tunnel along z, walkways either side of a channel, a ladder shaft, a grate shaft ----
    setSight([]);
    {
      const sb = new Batch(), [X, , Z0] = SEW, br = MAT.brick();
      const L = 40, gapAt = (z: number) => (Math.abs(z - 0) < 0.4 ? -1.2 : Math.abs(z - CAT_Z) < 0.4 ? 0 : null);
      sb.add(boxGeo(V(X - SEW_W, -0.25, Z0 - L), V(X - 0.8, 0, Z0 + L), 2), lam("rtWalk", () => ({ map: stoneHD("rtWalkT", ["#8a7a6a", "#7e6e60", "#94846e", "#76685a"], "#4a4038") })));
      sb.add(boxGeo(V(X + 0.8, -0.25, Z0 - L), V(X + SEW_W, 0, Z0 + L), 2), lam("rtWalk", () => ({})));
      sb.add(boxGeo(V(X - 0.8, -0.7, Z0 - L), V(X + 0.8, -0.6, Z0 + L), 2), br);
      const wg = new THREE.PlaneGeometry(1.6, 2 * L); wg.rotateX(-Math.PI / 2); wg.translate(X, -0.32, Z0);
      const wuv = wg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < wuv.count; i++) wuv.setXY(i, wuv.getX(i) * 0.6, wuv.getY(i) * 30);
      sb.add(wg, lam("rtSewWater", () => ({ map: waterTex("rtSewWaterT", "#4a5a3e", "#6a7a52") })));
      for (const s of [-1, 1]) {
        const wall = new THREE.PlaneGeometry(2 * L, SEW_H + 0.7); wall.rotateY(-s * Math.PI / 2); wall.translate(X + s * SEW_W, (SEW_H - 0.7) / 2, Z0);
        const u2 = wall.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u2.count; i++) u2.setXY(i, u2.getX(i) * 40, u2.getY(i) * 1.1);
        sb.add(wall, br);
        sb.add(boxGeo(V(X + s * 0.8 - 0.001, -0.7, Z0 - L), V(X + s * 0.8 + 0.001, 0, Z0 + L)), br);
      }
      // the vault in 1 m rings (a hole in the ring under each shaft)
      for (let z = -L - 0.5; z < L + 0.5; z += 1) {
        const zc = z + 0.5, gx = gapAt(zc);
        const piece = (t0: number, t1: number) => {
          if (t1 <= t0) return;
          const g = new THREE.CylinderGeometry(SEW_R, SEW_R, 1.0, Math.max(1, Math.round((t1 - t0) / (Math.PI / 20))), 1, true, t0, t1 - t0); g.rotateX(Math.PI / 2);
          const u3 = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u3.count; i++) u3.setXY(i, u3.getX(i) * 3.4, u3.getY(i) * 0.5);
          g.translate(X, SEW_H, Z0 + zc); sb.add(g, br);
        };
        if (gx === null) piece(Math.PI / 2, (3 * Math.PI) / 2);
        else { // same 20-segment grid as the whole rings (matching seams), the segments under the shaft left out
          const tc = Math.PI - Math.asin(gx / SEW_R), d = 0.56 / SEW_R, st = Math.PI / 20;
          for (let i = 0; i < 20; i++) { const a0 = Math.PI / 2 + i * st; if (Math.abs(a0 + st / 2 - tc) >= d) piece(a0, a0 + st); }
        }
      }
      for (const s of [-1, 1]) { const cap = new THREE.PlaneGeometry(2 * SEW_W, SEW_H + SEW_R + 1); cap.rotateY(s > 0 ? Math.PI : 0); cap.translate(X, (SEW_H + SEW_R - 1) / 2, Z0 + s * L); sb.add(cap, DARKM()); }
      // the ladder shaft (over the west walkway) and the grate shaft (over the channel)
      for (const [sx, sz, top] of [[-1.2, 0, 6.5], [0, CAT_Z, 4.25]] as const) {
        // each wall starts on the vault under it: sliced across x so none pokes into the tunnel or leaves a gap
        const vy = (x0: number, x1: number) => SEW_H + Math.sqrt(Math.max(0, SEW_R * SEW_R - Math.max(Math.abs(x0), Math.abs(x1)) ** 2)) - 0.04;
        for (const [a, c, d, e] of [[-0.55, -0.55, 0.55, -0.5], [-0.55, 0.5, 0.55, 0.55], [-0.55, -0.55, -0.5, 0.55], [0.5, -0.55, 0.55, 0.55]] as const) {
          const n = d - a > 0.5 ? 8 : 1;
          for (let k = 0; k < n; k++) { const x0 = sx + a + ((d - a) * k) / n, x1 = sx + a + ((d - a) * (k + 1)) / n;
            sb.add(boxGeo(V(X + x0, vy(x0, x1), Z0 + sz + c), V(X + x1, top, Z0 + sz + e), 2), br); }
        }
      }
      // ladder: rails and rungs from the walkway up the shaft
      for (const s of [-1, 1]) sb.add(boxGeo(V(X - 1.2 + s * 0.24 - 0.025, 0, Z0 - 0.48), V(X - 1.2 + s * 0.24 + 0.025, 6.4, Z0 - 0.43)), MAT.iron());
      for (let y = 0.3; y < 6.3; y += 0.3) sb.add(boxGeo(V(X - 1.45, y, Z0 - 0.47), V(X - 0.95, y + 0.03, Z0 - 0.42)), MAT.iron());
      // the grate bars at the top of the cat's shaft
      for (let i = 0; i < 6; i++) sb.add(boxGeo(V(X - 0.5 + i * 0.2 - 0.025, 4.2, Z0 + CAT_Z - 0.55), V(X - 0.5 + i * 0.2 + 0.025, 4.25, Z0 + CAT_Z + 0.55)), MAT.iron());
      // lamp brackets on the walls
      for (let z = -36; z <= 36; z += 9) for (const s of [-1, 1]) if (Math.abs(z) > 2) sb.add(boxGeo(V(X + s * (SEW_W - 0.12) - 0.06, 1.9, Z0 + z - 0.06), V(X + s * (SEW_W - 0.12) + 0.06, 2.0, Z0 + z + 0.06)), MAT.iron());
      sb.build(R, false);
      // daylight at the top of each shaft, lamp glows (emissive: they bloom)
      const glow = (w: number, h: number, c: THREE.Color, x: number, y: number, z: number, flat: boolean) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, fog: false }));
        if (flat) m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.layers.set(NOINK); R.add(m);
      };
      glow(1.0, 1.0, new THREE.Color(2.6, 2.5, 2.2), X - 1.2, 6.45, Z0, true);
      glow(2.0, 2.0, new THREE.Color(2.2, 2.3, 2.4), X, 5.2, Z0 + CAT_Z, true);
      for (let z = -36; z <= 36; z += 9) for (const s of [-1, 1]) if (Math.abs(z) > 2) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 0.9), fog: false }));
        m.position.set(X + s * (SEW_W - 0.15), 2.1, Z0 + z); m.layers.set(NOINK); R.add(m);
      }
    }

    // ---- the bathroom ----
    {
      const bb = new Batch(), [X, , Z] = BATH, W = 2.2, H = 3.2;
      const fl = new THREE.PlaneGeometry(2 * W, 2 * W); fl.rotateX(-Math.PI / 2); fl.translate(X, 0.001, Z);
      const fu = fl.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < fu.count; i++) fu.setXY(i, fu.getX(i) * 4, fu.getY(i) * 4);
      bb.add(fl, lam("rtCheckerM", () => ({ map: checkerTex() })));
      const wallM = lam("rtBathW", () => ({ map: bathWall(false) })), winM = lam("rtBathWin", () => ({ map: bathWall(true) }));
      for (const [ry, dx, dz, m] of [[0, 0, -W, wallM], [Math.PI, 0, W, wallM], [Math.PI / 2, -W, 0, wallM], [-Math.PI / 2, W, 0, winM]] as const) {
        const g = new THREE.PlaneGeometry(2 * W, H); g.rotateY(ry); g.translate(X + dx, H / 2, Z + dz); bb.add(g, m);
      }
      const ce = new THREE.PlaneGeometry(2 * W, 2 * W); ce.rotateX(Math.PI / 2); ce.translate(X, H, Z); bb.add(ce, MAT.trim());
      // the toilet: bowl, water, seat; a high cistern with a pull chain
      const [lx, , lz] = LOO;
      const bowl = new THREE.CylinderGeometry(0.22, 0.16, 0.42, 24); bowl.translate(lx, 0.21, lz); bb.add(bowl, MAT.white());
      const wat = new THREE.CircleGeometry(0.19, 24); wat.rotateX(-Math.PI / 2); wat.translate(lx, 0.405, lz); bb.add(wat, lam("rtLooWater", () => ({ color: "#8cc0d4" })));
      const seat = new THREE.TorusGeometry(0.2, 0.035, 8, 24); seat.rotateX(Math.PI / 2); seat.translate(lx, 0.44, lz); bb.add(seat, MAT.wood());
      bb.add(boxGeo(V(lx - 0.28, 1.85, Z - W + 0.02), V(lx + 0.28, 2.2, Z - W + 0.26)), MAT.white());
      bb.add(boxGeo(V(lx - 0.03, 0.4, Z - W + 0.06), V(lx + 0.03, 1.85, Z - W + 0.12)), MAT.iron());
      bb.add(boxGeo(V(lx + 0.24, 1.25, Z - W + 0.2), V(lx + 0.26, 1.85, Z - W + 0.22)), MAT.iron());
      const hd = new THREE.SphereGeometry(0.04, 10, 8); hd.translate(lx + 0.25, 1.22, Z - W + 0.21); bb.add(hd, MAT.wood());
      // a washstand and a mirror, a rug
      bb.add(boxGeo(V(X - 1.75, 0, Z - W + 0.02), V(X - 1.15, 0.85, Z - W + 0.5)), MAT.white());
      bb.add(boxGeo(V(X - 1.82, 1.25, Z - W + 0.02), V(X - 1.08, 1.95, Z - W + 0.05)), lam("rtMirror", () => ({ color: "#bcd8e4" })));
      bb.add(boxGeo(V(X - 0.9, 0.002, Z - 0.9), V(X + 0.2, 0.012, Z + 0.1)), lam("rtRug", () => ({ color: "#b8484a" })));
      bb.build(R, false);
      const g = new THREE.Group(); g.position.set(lx, 0.46, lz - 0.22);
      const lidM = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 24), MAT.wood()); lidM.position.set(0, 0.015, 0.22); g.add(lidM);
      shadowAll(g); R.add(g); this.lid = g;
    }

    // ---- the rat farm ----
    {
      const fb = new Batch(), [X, , Z] = FARM, fr = rng(5);
      const gr = new THREE.PlaneGeometry(600, 600); gr.rotateX(-Math.PI / 2); gr.translate(X, 0, Z);
      const gu = gr.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < gu.count; i++) gu.setXY(i, gu.getX(i) * 90, gu.getY(i) * 90);
      fb.add(gr, lam("rtFarmGrass", () => ({ map: grassHD(), color: "#f2f0c8" })));
      for (let i = -4; i <= 4; i++) for (let j = 0; j < 5; j++) {
        const x0 = X + i * 13 - 6, z0 = Z - 16 - j * 12;
        const p = new THREE.PlaneGeometry(12, 11); p.rotateX(-Math.PI / 2); p.translate(x0 + 6, 0.02, z0 - 5.5);
        const pu = p.attributes.uv as THREE.BufferAttribute; for (let q = 0; q < pu.count; q++) pu.setXY(q, pu.getX(q) * 2, pu.getY(q) * 2);
        fb.add(p, lam("rtRiceM", () => ({ map: riceTex() })));
      }
      // huts: bamboo walls, steep thatch
      for (const [hx, hz, w, d] of [[-8, -9, 5, 4], [8.5, -11, 6, 4.5], [-15, -2, 4.5, 4]] as const) {
        fb.add(boxGeo(V(X + hx - w / 2, 0, Z + hz - d / 2), V(X + hx + w / 2, 2.3, Z + hz + d / 2)), lam("rtHutWall", () => ({ color: "#c9a25a" })));
        fb.add(archShape(1.0, 1.8).translate(X + hx, 0, Z + hz + d / 2 + 0.01), DARKM());
        gable(fb, X + hx - w / 2, X + hx + w / 2, 2.3, Z + hz - d / 2, Z + hz + d / 2, 2.2, MAT.thatch(), lam("rtHutWall", () => ({})));
      }
      for (const [px, pz] of [[-12, -14], [13, -6], [-4, -20], [16, -18], [-19, -9], [5, -26]] as const) palm(fb, X + px + fr(), Z + pz, 6 + fr() * 3, px * 13 + pz);
      for (let i = 0; i < 30; i++) { const a = fr() * Math.PI * 2, d = 60 + fr() * 120; prop(fb, kit, "tree_oak", X + Math.cos(a) * d, 0, Z + Math.sin(a) * d - 40, 7 + fr() * 4, fr() * 6); }
      // the cage tables and cages
      const bars = lam("rtBarsM", () => ({ map: barsTex(), alphaTest: 0.5, side: THREE.DoubleSide }));
      const rows = new Set(CAGES.map((c) => c[2]));
      for (const rz of rows) {
        fb.add(boxGeo(V(X - 3.9, 0.64, rz - 0.42), V(X + 3.9, 0.7, rz + 0.42)), MAT.bamboo());
        for (const lx2 of [-3.8, 0, 3.8]) for (const s of [-1, 1]) fb.add(boxGeo(V(X + lx2 - 0.04, 0, rz + s * 0.36 - 0.04), V(X + lx2 + 0.04, 0.64, rz + s * 0.36 + 0.04)), MAT.woodD());
      }
      for (const [cx, cy, cz] of CAGES) {
        const w = 0.5, d = 0.32, h = 0.5;
        for (const [ry, dx, dz, ww] of [[0, 0, d, 2 * w], [Math.PI, 0, -d, 2 * w], [Math.PI / 2, w, 0, 2 * d], [-Math.PI / 2, -w, 0, 2 * d]] as const) {
          const g = new THREE.PlaneGeometry(ww, h); g.rotateY(ry); g.translate(cx + dx, cy + h / 2 - 0.27, cz + dz); fb.add(g, bars);
        }
        fb.add(boxGeo(V(cx - w - 0.03, cy + h - 0.27, cz - d - 0.03), V(cx + w + 0.03, cy + h - 0.22, cz + d + 0.03)), MAT.bamboo());
      }
      fb.build(R);
    }
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
    const t = f / FPS, s = SHOTS[id - 1];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ("dark" in the sewer: the lamps dim for a beat) ----
    const L = LIGHTS[s.light], K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    const dim = id === 4 && f >= DARK - 2 && f < PRED - 4 ? 0.55 : 1;
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI * dim;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 12, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(L.lit[0] * dim, L.lit[1] * dim, L.lit[2] * dim); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(L.charTint[0] * (0.6 + 0.4 * dim), L.charTint[1] * (0.6 + 0.4 * dim), L.charTint[2] * (0.6 + 0.4 * dim)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(h, su["c" + i].value); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    if (s.place === "sewer") { untone("#1c1418", this.fog.color); this.fog.near = 5; this.fog.far = 40; }
    else if (s.place === "bath") { untone(L.fog, this.fog.color); this.fog.near = 50; this.fog.far = 400; }
    else { untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; }
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) {
      const i = m.userData.k as number, near = i >= 7, a = ((i % 7) / 7) * Math.PI * 2 + (near ? 0.65 : 0.3), d = near ? 300 + (i % 3) * 40 : 600 + (i % 3) * 60, w = (near ? 80 : 130) + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 4, (near ? 95 : 120) + (i % 4) * 34, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); m.visible = s.place === "city" || s.place === "farm";
    }
    // ---- the set pieces by shot ----
    const open = id === 7 || id === 9 ? 1 : 0;
    this.cover.position.set(MAN[0] + 0.95 * open, 0.065 + 0.0 * open, MAN[2] + 0.35 * open);
    this.cover.rotation.set(0, 0.3 + open * 0.8, 0);
    const lidUp = id === 5 ? (f < POP ? 0 : Math.min(1.75, 1.75 * smooth((f - POP) / 4)) - 0.12 * Math.sin(clamp01((f - POP - 4) / 10) * Math.PI)) : 0;
    this.lid.rotation.set(-lidUp, 0, 0);
    const lidOpen = id < 15 || (id === 15 && f < SCRAP - 6) ? 1 : 0;
    let rx = -1.9 * lidOpen;
    if (id === 15 && f >= SCRAP - 6 && f < SCRAP) rx = -1.9 * (1 - smooth((f - SCRAP + 6) / 6));
    this.boxLid.rotation.set(rx, 0, 0);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const stg = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of stg.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set((p.mirror ? -sc2 : sc2) * (p.sx ?? 1), sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of stg.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.down) e2.mesh.rotation.set(Math.PI / 2, 0, p.rot ?? 0);
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

export type { V3 };
