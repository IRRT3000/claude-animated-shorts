// "The Chicken That Lived Without a Head" as one three.js scene: the Olsens' farm at Fruita, Colorado, in 1945 (white
// farmhouse, red barn, coop, chopping stump, rail fence, corn, red mesa cliffs), the farmhouse kitchen, a university
// lab, a sideshow tent on a desert lot with a road, a Phoenix motel at night and its room, and the little main street
// on festival day. update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, setSight, prop, house, Ray, Kit } from "./build";
import { ctex, cloudHD, grassHD, stoneHD, roofHD, planksHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, FARM, HOUSE_Z, COOP, STUMP, STUMP_TOP, FENCE_Z, POST, KITCHEN, TABLE_TOP, LAB, LIGHTBOX, SHOW, SCALE, MOTEL, ROOM, TOWN,
  camAt, V3, smooth, clamp01,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: trees are drawn by build.ts
void LFB;

/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 130, el: 14 }, 2: { az: 140, el: 14 }, 19: { az: 150, el: 10 } };

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
const speckTex = (key: string, base: string, cols: string[], n = 520) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < n; k++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.ellipse(r() * 512, r() * 512, 2 + r() * 6, 1.5 + r() * 4, r() * 3, 0, 7); g.fill(); }
});
const dirtTex = () => speckTex("ckDirt", "#c9a274", ["#b8905e", "#d6b286", "#a8804e", "#dcc29a"]);
const sandTex = () => speckTex("ckSand", "#e2c08a", ["#d4ae74", "#ecd0a0", "#c99c62"], 400);
const asphaltTex = () => speckTex("ckAsph", "#4a4650", ["#3e3a44", "#56525c", "#5e5a64"], 700);
/** horizontal clapboards (the farmhouse) */
const clapTex = (key: string, col: string, line: string) => ctex(key, 256, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 21) { g.fillStyle = line; g.fillRect(0, y + 17, 256, 4); }
});
/** vertical barn boards */
const barnTex = () => ctex("ckBarn", 256, 256, (g, r) => {
  g.fillStyle = "#b8403a"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = "#8e2f2a"; g.fillRect(x, 0, 4, 256); g.fillStyle = ["#c24a40", "#b03a34", "#bc4438"][Math.floor(r() * 3)]; g.fillRect(x + 4, 0, 28, 256); }
});
/** red sandstone strata for the mesas */
const rockTex = () => ctex("ckRock", 512, 512, (g, r) => {
  const bands = ["#c8643f", "#b85a3a", "#d87a4a", "#a84e34", "#e08a5a", "#bc6040"];
  let y = 0; while (y < 512) { const h = 18 + r() * 50; g.fillStyle = bands[Math.floor(r() * bands.length)]; g.fillRect(0, y, 512, h); y += h; }
  g.strokeStyle = "rgba(90,40,30,0.35)"; g.lineWidth = 3;
  for (let k = 0; k < 30; k++) { const x = r() * 512; g.beginPath(); g.moveTo(x, r() * 512); g.lineTo(x + (r() - 0.5) * 20, r() * 512); g.stroke(); }
});
/** stripes: tent canvas, wallpaper */
const stripeTex = (key: string, a: string, b: string, n = 8, sprig?: string) => ctex(key, 256, 256, (g) => {
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * 256) / n, 0, 256 / n, 256); }
  if (sprig) for (let i = 0; i < n; i += 2) for (let y = 16; y < 256; y += 48) { g.fillStyle = sprig; g.beginPath(); g.arc((i + 0.5) * 256 / n, y + (i % 4 ? 24 : 0), 5, 0, 7); g.fill(); }
});
/** a wall with a wainscot below (kitchen / lab / motel room), w x h metres, an optional window painted on */
const roomWall = (key: string, top: string, low: string, rail: string, w: number, h: number, win?: "mesa" | "night") => ctex(key, 1024, Math.round((1024 * h) / w), (g, r) => {
  const H = Math.round((1024 * h) / w), S = 1024 / w, wy = H - 1.0 * S;
  g.fillStyle = top; g.fillRect(0, 0, 1024, wy);
  for (let x = 20; x < 1024; x += 64) for (let y = 30; y < wy; y += 70) { g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(x + (y % 140 ? 32 : 0), y, 6, 0, 7); g.fill(); }
  g.fillStyle = low; g.fillRect(0, wy, 1024, H - wy);
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let x = 0; x < 1024; x += 48) g.fillRect(x, wy, 3, H - wy);
  g.fillStyle = rail; g.fillRect(0, wy - 8, 1024, 14);
  if (win) {
    const x0 = 512 - 1.0 * S, y0 = wy - 1.75 * S, ww = 2.0 * S, hh = 1.35 * S;
    if (win === "mesa") {
      const gr = g.createLinearGradient(0, y0, 0, y0 + hh); gr.addColorStop(0, "#7ab8ec"); gr.addColorStop(1, "#cfe6f4"); g.fillStyle = gr; g.fillRect(x0, y0, ww, hh);
      g.fillStyle = "#c8643f"; g.beginPath(); g.moveTo(x0, y0 + hh * 0.75); g.lineTo(x0 + ww * 0.1, y0 + hh * 0.45); g.lineTo(x0 + ww * 0.45, y0 + hh * 0.42); g.lineTo(x0 + ww * 0.55, y0 + hh * 0.6); g.lineTo(x0 + ww * 0.8, y0 + hh * 0.5); g.lineTo(x0 + ww, y0 + hh * 0.55); g.lineTo(x0 + ww, y0 + hh); g.lineTo(x0, y0 + hh); g.fill();
      g.fillStyle = "#8ab05a"; g.fillRect(x0, y0 + hh * 0.82, ww, hh * 0.18);
    } else { g.fillStyle = "#1a2040"; g.fillRect(x0, y0, ww, hh); g.fillStyle = "#f4f0d8"; g.beginPath(); g.arc(x0 + ww * 0.7, y0 + hh * 0.3, 22, 0, 7); g.fill(); for (let k = 0; k < 20; k++) { g.fillRect(x0 + r() * ww, y0 + r() * hh * 0.6, 3, 3); } }
    g.strokeStyle = "#f4efe2"; g.lineWidth = 20; g.strokeRect(x0, y0, ww, hh); g.lineWidth = 12; g.beginPath(); g.moveTo(x0 + ww / 2, y0); g.lineTo(x0 + ww / 2, y0 + hh); g.stroke();
    g.fillStyle = "#e8d2a0"; g.fillRect(x0 - 40, y0 + hh + 6, ww + 80, 16);
  }
});
const checkerTex = (key: string, a: string, b: string, n = 8) => ctex(key, 256, 256, (g) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect((i * 256) / n, (j * 256) / n, 256 / n, 256 / n); } });
/** motel front: pink stucco, turquoise doors and windows every 3 m (one 12 x 3.2 m wall) */
const motelTex = () => ctex("ckMotel", 1024, 272, (g) => {
  g.fillStyle = "#e8a890"; g.fillRect(0, 0, 1024, 272);
  for (let i = 0; i < 4; i++) {
    const x = i * 256 + 40;
    g.fillStyle = "#3aa8a0"; g.fillRect(x, 70, 64, 202); g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(x + 52, 180, 5, 0, 7); g.fill();
    g.fillStyle = "#2a3050"; g.fillRect(x + 110, 90, 90, 80); g.strokeStyle = "#f4efe2"; g.lineWidth = 8; g.strokeRect(x + 110, 90, 90, 80);
  }
  g.fillStyle = "#c98070"; g.fillRect(0, 258, 1024, 14);
});
const DARKM = () => lam("ckDark", () => ({ color: "#1a1210" }));
const MAT = {
  wood: () => lam("ckWood", () => ({ color: "#b07a48" })), woodD: () => lam("ckWoodD", () => ({ color: "#6a4430" })),
  iron: () => lam("ckIron", () => ({ color: "#4a4e58" })), white: () => lam("ckWhite", () => ({ color: "#f4f1ea" })),
  trim: () => lam("ckTrim", () => ({ color: "#f6ecd2" })), green: () => lam("ckGreen", () => ({ color: "#4f9a3e" })),
  steel: () => lam("ckSteel", () => ({ color: "#c9ccd2" })), red: () => lam("ckRed", () => ({ color: "#c0353a" })),
  cactus: () => lam("ckCactus", () => ({ color: "#5a9a4a" })), rock: () => lam("ckRockM", () => ({ map: rockTex() })),
  floor: () => lam("ckFloor", () => ({ map: planksHD() })), straw: () => lam("ckStraw", () => ({ color: "#e2c070" })),
};
const shadowAll = (o: THREE.Object3D, cast = true) => o.traverse((m) => { const x = m as THREE.Mesh; if (x.isMesh && !x.layers.isEnabled(NOINK)) { x.castShadow = cast; x.receiveShadow = true; } });
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
const tile = (g: THREE.BufferGeometry, u: number, v: number) => { const a = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * u, a.getY(i) * v); return g; };
/** a saguaro: a ribbed trunk and two up-turned arms */
const saguaro = (b: Batch, x: number, z: number, h: number, seed: number) => {
  const r = rng(seed), m = MAT.cactus();
  b.add(at(new THREE.CylinderGeometry(0.28, 0.32, h, 10), x, h / 2, z), m); b.add(at(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), x, h, z), m);
  for (const s of [-1, 1]) {
    if (r() < 0.2) continue;
    const y = h * (0.35 + r() * 0.25), L = 0.7 + r() * 0.3, up = h * (0.25 + r() * 0.2);
    b.add(at(new THREE.CylinderGeometry(0.18, 0.18, L, 8).rotateZ(Math.PI / 2), x + s * L / 2, y, z), m);
    b.add(at(new THREE.CylinderGeometry(0.18, 0.18, up, 8), x + s * L, y + up / 2, z), m);
    b.add(at(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), x + s * L, y + up, z), m);
  }
};
/** a mesa: a steep-sided flat-topped block of red rock with a talus skirt */
const mesa = (b: Batch, x: number, z: number, w: number, h: number, seed: number) => {
  const r = rng(seed), m = MAT.rock(), n = 7;
  const g = new THREE.CylinderGeometry(w * 0.48, w * 0.55, h, n, 1); g.rotateY(r() * 3); tile(g, 3, 1);
  b.add(at(g, x, h / 2, z), m);
  const t = new THREE.CylinderGeometry(w * 0.56, w * 0.85, h * 0.28, n, 1); t.rotateY(r() * 3); tile(t, 3, 0.3); b.add(at(t, x, h * 0.14, z), lam("ckTalus", () => ({ color: "#c98a5a" })));
  const cap = new THREE.CylinderGeometry(w * 0.5, w * 0.48, h * 0.05, n, 1); b.add(at(cap, x, h + h * 0.025, z), lam("ckMesaTop", () => ({ color: "#8a9a5a" })));
};
/** a simple room: floor, four walls (back wall at z - d, with its own material), ceiling */
const room = (b: Batch, X: number, Z: number, w: number, d: number, h: number, floor: THREE.Material, wall: THREE.Material, back: THREE.Material, ceil = true) => {
  b.add(tile(new THREE.PlaneGeometry(2 * w, 2 * d).rotateX(-Math.PI / 2), w, d).translate(X, 0.001, Z), floor);
  for (const [ry, dx, dz, ww, m] of [[0, 0, -d, 2 * w, back], [Math.PI, 0, d, 2 * w, wall], [Math.PI / 2, -w, 0, 2 * d, wall], [-Math.PI / 2, w, 0, 2 * d, wall]] as const) {
    const g = new THREE.PlaneGeometry(ww, h); g.rotateY(ry); g.translate(X + dx, h / 2, Z + dz); b.add(g, m);
  }
  if (ceil) { const c = new THREE.PlaneGeometry(2 * w, 2 * d); c.rotateX(Math.PI / 2); c.translate(X, h, Z); b.add(c, MAT.trim()); }
};
/** a 1940s sedan (local +x forward) as a group: body, cabin, wheels, chrome; trailer = a little box trailer behind */
const car = (col: string, trailer: boolean) => {
  const g = new THREE.Group(), body = lam("ckCar" + col, () => ({ color: col }));
  const add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(geo, m); g.add(me); return me; };
  add(boxGeo(V(-2.2, 0.45, -0.85), V(2.2, 1.1, 0.85)), body);
  const cab = new THREE.CylinderGeometry(0.85, 0.85, 1.7, 16, 1, false, 0, Math.PI); cab.rotateX(Math.PI / 2); cab.scale(1.3, 0.75, 1); cab.translate(-0.2, 1.08, 0); add(cab, body);
  for (const s of [-1, 1]) add(at(new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.6, 0.55), 1.4, 1.08, s * 0.68), body);
  add(boxGeo(V(-1.15, 1.25, -0.86), V(0.75, 1.6, 0.86)), lam("ckGlass", () => ({ color: "#9fc4dc" })));
  add(boxGeo(V(2.18, 0.5, -0.7), V(2.26, 0.85, 0.7)), MAT.steel());
  for (const [x, z] of [[1.4, -0.86], [1.4, 0.86], [-1.4, -0.86], [-1.4, 0.86]]) add(at(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 16).rotateX(Math.PI / 2), x, 0.42, z), lam("ckTyre", () => ({ color: "#26232a" })));
  for (const s of [-1, 1]) add(at(new THREE.SphereGeometry(0.13, 10, 8), 2.2, 0.95, s * 0.6), lam("ckLamp", () => ({ color: "#fff4c8" })));
  if (trailer) {
    add(boxGeo(V(-4.9, 0.45, -0.75), V(-2.9, 1.5, 0.75)), lam("ckTrailer", () => ({ color: "#e8dcc0" })));
    add(boxGeo(V(-4.9, 1.0, -0.76), V(-2.9, 1.15, 0.76)), MAT.red());
    add(boxGeo(V(-2.9, 0.5, -0.05), V(-2.2, 0.6, 0.05)), MAT.iron());
    for (const s of [-1, 1]) add(at(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 14).rotateX(Math.PI / 2), -3.9, 0.36, s * 0.8), lam("ckTyre", () => ({})));
  }
  return g;
};
/** a cottonwood / shade tree (cartoon) */
const tree = (b: Batch, kit: Kit, x: number, z: number, h: number, seed: number) => prop(b, kit, "tree_oak", x, 0, z, h, seed);
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
  private road: THREE.Object3D; private parked: THREE.Object3D; private crate: THREE.Group;
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

    // ================= the farm =================
    setSight(sightLines("farm"));
    {
      const b = new Batch(), r = rng(31), [X, , Z] = FARM;
      b.add(tile(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), 240, 240).translate(X, 0, Z), lam("ckField", () => ({ map: grassHD(), color: "#f2e6b8" })));
      b.add(tile(new THREE.PlaneGeometry(32, 26).rotateX(-Math.PI / 2), 6, 5).translate(X + 1, 0.01, Z - 2), lam("ckDirtM", () => ({ map: dirtTex() })));
      // the farmhouse: white clapboard, gable to the front, a porch with posts and steps
      { const hz = Z + HOUSE_Z, w = 5.5, cl = lam("ckClap", () => ({ map: clapTex("ckClapT", "#f4f1ea", "#d2ccc0") }));
        b.add(boxGeo(V(X - w, 0, hz - 9), V(X + w, 5.2, hz), 3), cl);
        gable(b, X - w, X + w, 5.2, hz - 9, hz, 3.4, lam("roof#5a5f6a", () => ({ map: roofHD("#5a5f6a", true), side: THREE.DoubleSide })), cl);
        for (const wx of [-3.4, 3.4]) for (const wy of [1.2, 3.5]) { b.add(boxGeo(V(X + wx - 0.65, wy, hz + 0.01), V(X + wx + 0.65, wy + 1.4, hz + 0.05)), lam("ckWin", () => ({ color: "#2f4a6a" }))); b.add(boxGeo(V(X + wx - 0.75, wy - 0.1, hz), V(X + wx + 0.75, wy + 1.5, hz + 0.03)), MAT.trim());
          for (const s of [-1, 1]) b.add(boxGeo(V(X + wx + s * 0.8 - 0.22, wy, hz + 0.02), V(X + wx + s * 0.8 + 0.22, wy + 1.4, hz + 0.06)), lam("ckShutter", () => ({ color: "#3f6a4a" }))); }
        b.add(boxGeo(V(X - 0.6, 0.4, hz + 0.01), V(X + 0.6, 2.6, hz + 0.05)), lam("ckDoor", () => ({ color: "#8a4a34" })));
        b.add(boxGeo(V(X - 5, 0, hz), V(X + 5, 0.4, hz + 3)), MAT.floor());
        for (let s = 0; s < 3; s++) b.add(boxGeo(V(X - 1.2, 0, hz + 3 + s * 0.3), V(X + 1.2, 0.4 - (s + 1) * 0.13, hz + 3.3 + s * 0.3)), MAT.wood());
        for (const px of [-4.8, -1.4, 1.4, 4.8]) b.add(boxGeo(V(X + px - 0.09, 0.4, hz + 2.8), V(X + px + 0.09, 2.9, hz + 2.98)), MAT.white());
        b.add(boxGeo(V(X - 5.3, 2.9, hz), V(X + 5.3, 3.05, hz + 3.3)), lam("roof#5a5f6a", () => ({})));
        b.add(boxGeo(V(X + 2.6, 5.4, hz - 5), V(X + 3.4, 9.2, hz - 4.2)), lam("ckChim", () => ({ color: "#a8584a" }))); }
      // the red barn with white trim and a hay door
      { const bx = X - 17, bz = Z - 12, bm = lam("ckBarnM", () => ({ map: barnTex() }));
        b.add(boxGeo(V(bx - 5, 0, bz - 7), V(bx + 5, 5.5, bz + 6), 3), bm);
        gable(b, bx - 5, bx + 5, 5.5, bz - 7, bz + 6, 4.2, lam("roof#4a4a52", () => ({ map: roofHD("#4a4a52", true), side: THREE.DoubleSide })), bm);
        b.add(boxGeo(V(bx - 1.8, 0, bz + 6.01), V(bx + 1.8, 3.6, bz + 6.05)), lam("ckBarnDoor", () => ({ color: "#9a3530" })));
        for (const s of [-1, 1]) b.add(boxGeo(V(bx - 1.8, 1.8 + s * 0.04 - 0.08, bz + 6.05), V(bx + 1.8, 1.8 + s * 0.04 + 0.08, bz + 6.09)).rotateZ(0), MAT.white());
        b.add(boxGeo(V(bx - 0.8, 6.0, bz + 6.01), V(bx + 0.8, 7.4, bz + 6.05)), DARKM()); }
      // the coop: three walls, a sloping roof, a roost pole, nest boxes, straw floor (open to +z)
      { const [cx, , cz] = COOP, cw = lam("ckCoopW", () => ({ map: clapTex("ckCoopT", "#e8dcc0", "#b8a888") }));
        b.add(boxGeo(V(cx - 1.6, 0, cz - 1.9), V(cx + 1.6, 2.0, cz - 1.75)), cw);
        for (const s of [-1, 1]) b.add(boxGeo(V(cx + s * 1.6 - 0.08, 0, cz - 1.9), V(cx + s * 1.6 + 0.08, 2.0, cz + 0.2)), cw);
        b.add(boxGeo(V(cx - 1.8, 2.0, cz - 2.1), V(cx + 1.8, 2.12, cz + 0.45)), lam("roof#8a5a3a", () => ({ color: "#8a5a3a" })));
        b.add(boxGeo(V(cx - 1.55, 0.01, cz - 1.75), V(cx + 1.55, 0.06, cz + 0.2)), MAT.straw());
        b.add(at(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 8).rotateZ(Math.PI / 2), cx, 0.9, cz - 0.9), MAT.woodD());
        for (const s of [-1, 1]) b.add(boxGeo(V(cx + s * 1.4 - 0.04, 0, cz - 0.94), V(cx + s * 1.4 + 0.04, 0.9, cz - 0.86)), MAT.woodD());
        for (let i = 0; i < 3; i++) b.add(boxGeo(V(cx - 1.4 + i * 0.5, 1.2, cz - 1.75), V(cx - 1.0 + i * 0.5, 1.55, cz - 1.4)), MAT.wood());
        b.add(boxGeo(V(cx - 0.25, 0, cz + 0.2), V(cx + 0.25, 0.05, cz + 1.4)), MAT.wood()); }
      // the chopping stump
      { const [sx, , sz] = STUMP; b.add(at(new THREE.CylinderGeometry(0.34, 0.4, STUMP_TOP, 14), sx, STUMP_TOP / 2, sz), lam("ckBark", () => ({ color: "#7a5236" })));
        b.add(at(new THREE.CircleGeometry(0.34, 18).rotateX(-Math.PI / 2), sx, STUMP_TOP + 0.002, sz), lam("ckRings", () => ({ map: ctex("ckRingsT", 128, 128, (g) => { g.fillStyle = "#e0b880"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#b88a5a"; g.lineWidth = 3; for (let rr = 8; rr < 64; rr += 9) { g.beginPath(); g.arc(64, 64, rr, 0, 7); g.stroke(); } }) }))); }
      // the rail fence (POST is the one in front of the stump)
      for (let x = -14; x <= 16.1; x += 2.4) {
        const big = Math.abs(x - POST[0]) < 1.3, px = big ? POST[0] : x;
        b.add(boxGeo(V(X + px - (big ? 0.15 : 0.08), 0, Z + FENCE_Z - (big ? 0.15 : 0.08)), V(X + px + (big ? 0.15 : 0.08), big ? 1.4 : 1.15, Z + FENCE_Z + (big ? 0.15 : 0.08))), MAT.woodD());
      }
      for (const y of [0.55, 1.0]) b.add(boxGeo(V(X - 14, y - 0.05, Z + FENCE_Z - 0.04), V(X + 16, y + 0.05, Z + FENCE_Z + 0.04)), MAT.wood());
      // corn by the coop
      for (let i = 0; i < 70; i++) { const x = X + 10.5 + (i % 7) * 0.8 + r() * 0.2, z = Z - 3 + Math.floor(i / 7) * 0.7, h = 1.6 + r() * 0.5;
        b.add(at(new THREE.CylinderGeometry(0.03, 0.04, h, 5), x, h / 2, z), MAT.green());
        for (let k = 0; k < 3; k++) b.add(at(new THREE.PlaneGeometry(0.7, 0.12).rotateZ(-0.5 + k * 0.5).rotateY(r() * 3), x, h * (0.4 + 0.2 * k), z), lam("ckLeaf", () => ({ color: "#6aa84a", side: THREE.DoubleSide }))); }
      // a pump, a woodpile, a water trough
      b.add(boxGeo(V(X - 4.4, 0, Z - 6.2), V(X - 2.6, 0.5, Z - 5.6)), MAT.steel());
      for (let i = 0; i < 12; i++) b.add(at(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 8).rotateX(Math.PI / 2), X - 8 + (i % 4) * 0.27, 0.13 + Math.floor(i / 4) * 0.24, Z - 2), lam("ckLog", () => ({ color: "#8a5a3a" })));
      // cottonwoods, the mesas
      for (const [x, z, h] of [[-9, -24, 10], [12, -20, 11], [18, -10, 9], [-26, 6, 10], [24, 10, 9], [-6, 22, 8], [30, -30, 12]] as const) tree(b, kit, X + x, Z + z, h, x * 3 + z);
      for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = 60 + r() * 120; tree(b, kit, X + Math.cos(a) * d, Z + Math.sin(a) * d * 0.6 + 40, 7 + r() * 5, i); }
      for (const [x, z, w, h] of [[-120, -230, 140, 70], [20, -260, 180, 90], [150, -220, 120, 60], [-250, -180, 160, 55], [260, -280, 200, 80], [-40, -170, 60, 45], [90, -160, 50, 38]] as const) mesa(b, X + x, Z + z, w, h, x + z);
      b.build(R);
    }
    // ================= the kitchen =================
    setSight([]);
    {
      const b = new Batch(), [X, , Z] = KITCHEN;
      room(b, X, Z, 2.5, 2.5, 3.0, MAT.floor(), lam("ckKWall", () => ({ map: roomWall("ckKWallT", "#f2dc9a", "#7a9a6a", "#f4efe2", 5, 3) })), lam("ckKBack", () => ({ map: roomWall("ckKBackT", "#f2dc9a", "#7a9a6a", "#f4efe2", 5, 3, "mesa") })));
      // the table with a red-check cloth, two chairs behind it
      b.add(boxGeo(V(X - 0.9, TABLE_TOP - 0.05, Z - 0.55), V(X + 0.9, TABLE_TOP, Z + 0.55)), lam("ckCloth", () => ({ map: checkerTex("ckClothT", "#c0353a", "#f4f1ea", 12) })));
      b.add(boxGeo(V(X - 0.92, TABLE_TOP - 0.25, Z + 0.53), V(X + 0.92, TABLE_TOP - 0.05, Z + 0.57)), lam("ckCloth", () => ({})));
      for (const [a, c] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) b.add(boxGeo(V(X + a - 0.04, 0, Z + c - 0.04), V(X + a + 0.04, TABLE_TOP - 0.05, Z + c + 0.04)), MAT.woodD());
      // a stove, a shelf with jars, a hanging lamp
      b.add(boxGeo(V(X - 2.45, 0, Z - 2.45), V(X - 1.55, 0.85, Z - 1.8)), lam("ckStove", () => ({ color: "#efe8d8" })));
      b.add(boxGeo(V(X - 2.3, 0.85, Z - 2.45), V(X - 2.1, 2.9, Z - 2.25)), MAT.iron());
      b.add(boxGeo(V(X + 1.3, 1.6, Z - 2.48), V(X + 2.3, 1.64, Z - 2.25)), MAT.wood());
      for (let i = 0; i < 4; i++) b.add(at(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), X + 1.45 + i * 0.25, 1.74, Z - 2.36), lam("ckJar" + (i % 3), () => ({ color: ["#e0503a", "#f0c040", "#7ab85c"][i % 3] })));
      b.add(boxGeo(V(X - 0.01, 2.4, Z - 0.01), V(X + 0.01, 3.0, Z + 0.01)), MAT.iron());
      b.build(R, false);
      // the crate on the table (only in shot 10, when Mike sits in it)
      { const cb = new Batch(), [cx, cy, cz] = [X, TABLE_TOP, Z + 0.05], cm = MAT.wood();
        for (const [x0, z0, x1, z1] of [[-0.24, -0.17, 0.24, -0.15], [-0.24, 0.15, 0.24, 0.17], [-0.24, -0.17, -0.22, 0.17], [0.22, -0.17, 0.24, 0.17]] as const)
          for (const y of [0.02, 0.14]) cb.add(boxGeo(V(cx + x0, cy + y, cz + z0), V(cx + x1, cy + y + 0.08, cz + z1)), cm);
        cb.add(boxGeo(V(cx - 0.24, cy, cz - 0.17), V(cx + 0.24, cy + 0.02, cz + 0.17)), cm);
        this.crate = new THREE.Group(); cb.build(this.crate, false); R.add(this.crate); }
      // the warm bulb (blooms)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.4, 1.4), fog: false }));
      bulb.position.set(X, 2.32, Z); bulb.layers.set(NOINK); R.add(bulb);
      const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 16, 1, true), lam("ckShade", () => ({ color: "#3f6a4a", side: THREE.DoubleSide }))); shadeM.position.set(X, 2.42, Z); R.add(shadeM);
    }
    // ================= the lab =================
    {
      const b = new Batch(), [X, , Z] = LAB;
      room(b, X, Z, 3.0, 2.5, 3.2, lam("ckLabFloor", () => ({ map: checkerTex("ckLabFloorT", "#a8c4b0", "#e8ece4") })), lam("ckLWall", () => ({ map: roomWall("ckLWallT", "#e2ecd8", "#9ab8a8", "#f4f4ee", 6, 3.2) })), lam("ckLBack", () => ({ map: roomWall("ckLBackT", "#e2ecd8", "#9ab8a8", "#f4f4ee", 6, 3.2) })));
      b.add(boxGeo(V(X - 1.6, 0.85, Z - 2.0), V(X + 1.6, 0.92, Z - 1.2)), lam("ckBench", () => ({ color: "#2f3a3a" })));
      b.add(boxGeo(V(X - 1.55, 0, Z - 1.95), V(X + 1.55, 0.85, Z - 1.25)), lam("ckBenchB", () => ({ color: "#d8d0bc" })));
      // the lightbox frame around the x-ray (the picture itself is a card from cast.ts)
      const [lx, ly, lz] = LIGHTBOX;
      b.add(boxGeo(V(lx - 0.72, ly - 0.58, lz - 0.06), V(lx + 0.72, ly + 0.58, lz - 0.01)), lam("ckLBox", () => ({ color: "#c9ccd2" })));
      // a microscope, flasks, jars on a shelf
      { const mx = X + 1.1, mz = Z - 1.65; b.add(at(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 14), mx, 0.945, mz), MAT.iron());
        b.add(boxGeo(V(mx - 0.03, 0.95, mz - 0.05), V(mx + 0.03, 1.3, mz + 0.01)), MAT.iron());
        b.add(at(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10).rotateX(0.5), mx, 1.3, mz + 0.06), lam("ckMic", () => ({ color: "#2f3a5a" }))); }
      for (const [fx, c] of [[-1.25, "#7ad0b8"], [-1.05, "#f0a0c0"], [-0.85, "#f0d060"]] as const) { b.add(at(new THREE.ConeGeometry(0.08, 0.18, 12), X + fx, 1.01, Z - 1.7), lam("ckFl" + c, () => ({ color: c }))); b.add(at(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), X + fx, 1.14, Z - 1.7), lam("ckGlassN", () => ({ color: "#dff2f7" }))); }
      b.add(boxGeo(V(X - 2.9, 1.9, Z - 2.48), V(X - 1.3, 1.94, Z - 2.2)), MAT.wood());
      for (let i = 0; i < 5; i++) b.add(at(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 10), X - 2.7 + i * 0.3, 2.07, Z - 2.34), lam("ckJarL" + (i % 2), () => ({ color: ["#c9e0d8", "#e8dcc0"][i % 2] })));
      b.add(boxGeo(V(X + 1.6, 0, Z - 2.48), V(X + 2.8, 2.2, Z - 2.0)), lam("ckCab", () => ({ color: "#b8c8c0" })));
      b.build(R, false);
      for (const lxx of [-1.2, 1.2]) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.2), fog: false })); lamp.position.set(X + lxx, 3.17, Z - 0.6); lamp.layers.set(NOINK); R.add(lamp); }
    }
    // ================= the sideshow lot =================
    setSight(sightLines("show"));
    {
      const b = new Batch(), r = rng(17), [X, , Z] = SHOW;
      b.add(tile(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), 200, 200).translate(X, 0, Z), lam("ckSandM", () => ({ map: sandTex() })));
      b.add(tile(new THREE.PlaneGeometry(400, 7).rotateX(-Math.PI / 2), 60, 1).translate(X, 0.02, Z + 34), lam("ckAsphM", () => ({ map: asphaltTex() })));
      for (let x = -200; x < 200; x += 6) b.add(boxGeo(V(X + x, 0.025, Z + 33.93), V(X + x + 3, 0.03, Z + 34.07)), lam("ckLine", () => ({ color: "#f0d060" })));
      // the tent: striped canvas walls, a gable roof, a wooden floor, the pedestal, a side table, the scale
      const tent = lam("ckTent", () => ({ map: stripeTex("ckTentT", "#d8323a", "#f4efe2", 10), side: THREE.DoubleSide }));
      b.add(tile(new THREE.PlaneGeometry(10, 3.2), 3, 1).translate(X, 1.6, Z - 4), tent);
      for (const s of [-1, 1]) b.add(tile(new THREE.PlaneGeometry(7, 3.2).rotateY(Math.PI / 2), 2, 1).translate(X + s * 5, 1.6, Z - 0.5), tent);
      gable(b, X - 5, X + 5, 3.2, Z - 4, Z + 3, 2.6, tent, tent);
      for (const s of [-1, 1]) b.add(at(new THREE.CylinderGeometry(0.07, 0.07, 6.2, 8), X + s * 5, 3.1, Z + 3), MAT.wood());
      b.add(at(new THREE.CylinderGeometry(0.08, 0.08, 6.6, 8), X, 3.3, Z - 0.5), MAT.wood());
      b.add(boxGeo(V(X - 4.9, 0, Z - 3.9), V(X + 4.9, 0.06, Z + 2.9)), MAT.floor());
      { const px = X - 1.2, pz = Z - 1.0; b.add(boxGeo(V(px - 0.45, 0, pz - 0.45), V(px + 0.45, 0.9, pz + 0.45)), lam("ckSkirt", () => ({ map: stripeTex("ckSkirtT", "#3f5aa8", "#f2c64a", 12) })));
        b.add(boxGeo(V(px - 0.5, 0.9, pz - 0.5), V(px + 0.5, 0.95, pz + 0.5)), MAT.wood()); }
      { const tx = X - 0.45, tz = Z - 0.45; b.add(boxGeo(V(tx - 0.35, 0.82, tz - 0.25), V(tx + 0.35, 0.88, tz + 0.25)), MAT.woodD());
        for (const [a, c] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) b.add(boxGeo(V(tx + a - 0.025, 0, tz + c - 0.025), V(tx + a + 0.025, 0.82, tz + c + 0.025)), MAT.woodD()); }
      { const [sx, , sz] = SCALE; b.add(boxGeo(V(sx - 0.4, 0, sz - 0.3), V(sx + 0.4, 0.15, sz + 0.3)), MAT.steel());
        b.add(boxGeo(V(sx - 0.05, 0.15, sz - 0.3), V(sx + 0.05, 1.2, sz - 0.22)), MAT.iron());
        b.add(at(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24).rotateX(Math.PI / 2), sx, 1.4, sz - 0.27), MAT.red()); }
      // the ticket booth with a glass jar on the counter
      { const bx = X + 1.8, bz = Z + 5.0; b.add(boxGeo(V(bx - 0.8, 0, bz - 0.6), V(bx + 0.8, 1.05, bz + 0.6)), lam("ckBooth", () => ({ map: stripeTex("ckBoothT", "#f2c64a", "#d8323a", 6) })));
        b.add(boxGeo(V(bx - 0.9, 1.05, bz - 0.7), V(bx + 0.9, 1.1, bz + 0.7)), MAT.wood());
        for (const s of [-1, 1]) b.add(boxGeo(V(bx + s * 0.8 - 0.04, 1.1, bz - 0.6), V(bx + s * 0.8 + 0.04, 2.4, bz - 0.52)), MAT.wood());
        b.add(boxGeo(V(bx - 0.95, 2.4, bz - 0.8), V(bx + 0.95, 2.5, bz + 0.7)), MAT.red());
        b.add(at(new THREE.CylinderGeometry(0.13, 0.12, 0.3, 16), bx - 0.2, 1.25, bz + 0.4), lam("ckJarG", () => ({ color: "#cfe6ee" }))); }
      // pennant poles, crates, cacti, far mountains
      for (const x of [-6.5, 6.5]) b.add(at(new THREE.CylinderGeometry(0.06, 0.06, 5, 8), X + x, 2.5, Z + 4), MAT.wood());
      for (let i = 0; i < 3; i++) b.add(boxGeo(V(X - 6.5 + i * 0.7, 0, Z + 1 + (i % 2) * 0.3), V(X - 5.9 + i * 0.7, 0.6, Z + 1.6 + (i % 2) * 0.3)), MAT.wood());
      for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 120, z = -30 + r() * 120; if (Math.abs(x) < 12 && z < 14) continue; if (Math.abs(z - 34) < 6) continue; saguaro(b, X + x, Z + z, 3 + r() * 3, i); }
      for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.9 + (i / 12) * Math.PI * 0.8, d = 300 + r() * 120, w = 120 + r() * 80;
        const c = new THREE.ConeGeometry(w, 40 + r() * 50, 6); b.add(at(c, X + Math.cos(a) * d, 20, Z + Math.sin(a) * d), lam("ckMtn", () => ({ color: "#a88aa8" }))); }
      b.build(R);
      this.road = car("#3f7ab5", true); shadowAll(this.road); R.add(this.road);
    }
    // ================= the motel at night =================
    setSight([]);
    {
      const b = new Batch(), r = rng(23), [X, , Z] = MOTEL;
      b.add(tile(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), 200, 200).translate(X, 0, Z), lam("ckSandM", () => ({})));
      b.add(tile(new THREE.PlaneGeometry(30, 14).rotateX(-Math.PI / 2), 5, 3).translate(X, 0.015, Z), lam("ckAsphM", () => ({})));
      const mt = lam("ckMotelM", () => ({ map: motelTex() }));
      for (const [x0, x1] of [[-12, 0], [0, 12]]) b.add(tile(new THREE.PlaneGeometry(x1 - x0, 3.2), 1, 1).translate(X + (x0 + x1) / 2, 1.6, Z - 8), mt);
      b.add(boxGeo(V(X - 12, 0, Z - 14), V(X + 12, 3.2, Z - 8.02)), lam("ckStucco", () => ({ color: "#e8a890" })));
      b.add(boxGeo(V(X - 12.4, 3.2, Z - 14.2), V(X + 12.4, 3.45, Z - 6.6)), MAT.white());
      for (let x = -11; x <= 11; x += 3.6) b.add(boxGeo(V(X + x - 0.07, 0, Z - 6.8), V(X + x + 0.07, 3.2, Z - 6.66)), MAT.white());
      // the sign: a tall pole (the neon card sits on it)
      b.add(boxGeo(V(X + 5.85, 0, Z + 1.85), V(X + 6.15, 4.0, Z + 2.15)), MAT.iron());
      for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * 90, z = -40 + r() * 80; if (Math.abs(x) < 16 && z > -16 && z < 12) continue; saguaro(b, X + x, Z + z, 3 + r() * 3.5, i + 50); }
      for (let i = 0; i < 10; i++) { const a = -Math.PI * 0.9 + (i / 10) * Math.PI * 0.8, d = 260 + r() * 100; b.add(at(new THREE.ConeGeometry(110 + r() * 60, 40 + r() * 40, 6), X + Math.cos(a) * d, 18, Z + Math.sin(a) * d), lam("ckMtn", () => ({}))); }
      b.build(R);
      // lit windows and door lamps (bloom)
      for (let i = 0; i < 8; i++) { if (i === 2 || i === 5) continue; const w = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.95), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.8), fog: false }));
        w.position.set(X - 12 + i * 3 + 1.79, 1.52, Z - 7.98); w.layers.set(NOINK); R.add(w); }
      this.parked = car("#c0353a", true); this.parked.position.set(X - 1.5, 0, Z - 3.6); this.parked.rotation.y = 0.1; shadowAll(this.parked); R.add(this.parked);
    }
    // ================= the motel room =================
    {
      const b = new Batch(), [X, , Z] = ROOM;
      room(b, X, Z, 2.2, 2.2, 2.8, lam("ckCarpet", () => ({ color: "#6a8a7a" })), lam("ckRWall", () => ({ map: roomWall("ckRWallT", "#d8c89a", "#8a6a4a", "#f4efe2", 4.4, 2.8) })), lam("ckRBack", () => ({ map: roomWall("ckRBackT", "#d8c89a", "#8a6a4a", "#f4efe2", 4.4, 2.8, "night") })));
      b.add(boxGeo(V(X - 1.4, 0, Z - 2.15), V(X + 0.0, 0.5, Z + 0.0)), lam("ckBed", () => ({ color: "#e8e0cc" })));
      b.add(boxGeo(V(X - 1.42, 0.3, Z - 1.4), V(X + 0.02, 0.56, Z + 0.02)), lam("ckQuilt", () => ({ map: checkerTex("ckQuiltT", "#d9707a", "#f4e2c8", 6) })));
      b.add(boxGeo(V(X - 1.4, 0, Z - 2.18), V(X + 0.0, 1.1, Z - 2.1)), MAT.woodD());
      b.add(boxGeo(V(X - 1.2, 0.5, Z - 2.05), V(X - 0.2, 0.68, Z - 1.6)), MAT.white());
      // nightstand and lamp
      b.add(boxGeo(V(X + 0.25, 0, Z - 2.1), V(X + 0.75, 0.6, Z - 1.6)), MAT.wood());
      b.add(at(new THREE.CylinderGeometry(0.03, 0.08, 0.35, 10), X + 0.5, 0.78, Z - 1.85), MAT.iron());
      b.add(at(new THREE.CylinderGeometry(0.12, 0.2, 0.22, 16, 1, true), X + 0.5, 1.03, Z - 1.85), lam("ckLampShade", () => ({ color: "#f2e2b0", side: THREE.DoubleSide })));
      // a luggage rack (the suitcase) and a stool with Mike's crate
      b.add(boxGeo(V(X + 0.9, 0.42, Z - 1.0), V(X + 1.7, 0.46, Z - 0.4)), MAT.wood());
      for (const [a, c] of [[0.95, -0.95], [1.65, -0.95], [0.95, -0.45], [1.65, -0.45]]) b.add(boxGeo(V(X + a - 0.02, 0, Z + c - 0.02), V(X + a + 0.02, 0.42, Z + c + 0.02)), MAT.woodD());
      b.add(boxGeo(V(X + 0.95, 0.46, Z - 0.95), V(X + 1.65, 0.68, Z - 0.45)), lam("ckCase", () => ({ color: "#8a5a34" })));
      b.add(at(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 14), X + 0.35, 0.21, Z + 0.2), MAT.wood());
      { const [cx, cy, cz] = [X + 0.35, 0.42, Z + 0.2], cm = MAT.wood();
        for (const [x0, z0, x1, z1] of [[-0.24, -0.17, 0.24, -0.15], [-0.24, 0.15, 0.24, 0.17], [-0.24, -0.17, -0.22, 0.17], [0.22, -0.17, 0.24, 0.17]] as const)
          for (const y of [0.02, 0.14]) b.add(boxGeo(V(cx + x0, cy + y, cz + z0), V(cx + x1, cy + y + 0.08, cz + z1)), cm);
        b.add(boxGeo(V(cx - 0.24, cy, cz - 0.17), V(cx + 0.24, cy + 0.02, cz + 0.17)), cm); }
      b.build(R, false);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.3, 1.2), fog: false }));
      bulb.position.set(X + 0.5, 1.0, Z - 1.85); bulb.layers.set(NOINK); R.add(bulb);
    }
    // ================= the town on festival day =================
    setSight(sightLines("town"));
    {
      const b = new Batch(), r = rng(41), [X, , Z] = TOWN;
      b.add(tile(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), 240, 240).translate(X, 0, Z), lam("ckField", () => ({})));
      b.add(tile(new THREE.PlaneGeometry(10, 200).rotateX(-Math.PI / 2), 2, 40).translate(X, 0.02, Z - 40), lam("ckAsphM", () => ({})));
      for (const s of [-1, 1]) b.add(boxGeo(V(X + (s > 0 ? 5 : -8), 0, Z - 140), V(X + (s > 0 ? 8 : -5), 0.15, Z + 60), 6), lam("ckWalk", () => ({ map: stoneHD("ckWalkT") })));
      let k = 0;
      for (let z = -60; z < 40; z += 8.5) { house(b, X - 12.5, Z + z, Math.PI / 2, 8, 9, 6 + r() * 3, k++ % 5); house(b, X + 12.5, Z + z, -Math.PI / 2, 8, 9, 6 + r() * 3, k++ % 5); }
      // the statue: a stone plinth (the metal rooster is a card from cast.ts)
      b.add(boxGeo(V(X + 2.2, 0, Z - 6.6), V(X + 3.6, 1.2, Z - 5.2)), lam("ckPlinth", () => ({ map: stoneHD("ckPlinthT") })));
      for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = 50 + r() * 120; tree(b, kit, X + Math.cos(a) * d, Z + Math.sin(a) * d * 0.6 - 30, 7 + r() * 5, i + 90); }
      for (const [x, z, w, h] of [[-100, -260, 160, 70], [60, -300, 200, 90], [200, -240, 140, 60]] as const) mesa(b, X + x, Z + z, w, h, x + z + 7);
      b.build(R);
    }
    setSight([]);
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
    const dim = 1;
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
    if (s.place === "kitchen" || s.place === "lab" || s.place === "room") { untone(L.fog, this.fog.color); this.fog.near = 50; this.fog.far = 400; }
    else { untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; }
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) {
      const i = m.userData.k as number, near = i >= 7, a = ((i % 7) / 7) * Math.PI * 2 + (near ? 0.65 : 0.3), d = near ? 300 + (i % 3) * 40 : 600 + (i % 3) * 60, w = (near ? 80 : 130) + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 4, (near ? 95 : 120) + (i % 4) * 34, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); m.visible = s.place === "farm" || s.place === "show" || s.place === "town";
    }
    // ---- the set pieces by shot ----
    { const u = id === 12 ? clamp01((f - 1186) / 40) : -1;
      this.road.visible = u >= 0; this.road.position.set(SHOW[0] - 34 + 68 * u, 0, SHOW[2] + 35.6); this.road.rotation.y = 0; }
    this.parked.visible = s.place === "motel";
    this.crate.visible = id === 10;
    void smooth;
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
