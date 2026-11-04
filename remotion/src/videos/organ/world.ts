// "The Song That Ends in 2640" as one three.js scene: a German market town with its old stone church (hook, council,
// the long score), the church inside (the tiny organ, its blower, weights on the keys, rows of chairs, a barn/pigsty
// dressing), the 1361 cathedral with its great organ and bellows, and Cage's studio. update(id, f, camera) poses
// everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, setSight, prop, house, Ray, Kit } from "./build";
import { ctex, cloudHD, grassHD, planksHD, stoneHD, roofHD, cobbleHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, CH, ORG, KEY_Y, PIPE_Y, PIPES, BLOWER, CA, STU, DESK, PIANO, SEATS, CHURCH_Z,
  camAt, windowLight, clockMin, pipeCount, bagsOn, blowerOn, buildAt, bellowsAt, ribbonAt, ADD_PIPE, SWITCH, V3, smooth, clamp01,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: trees are drawn by build.ts
void LFB;

/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 13: { az: 165, el: 40 }, 17: { az: 160, el: 30 }, 1: { az: 120, el: 40 }, 14: { az: 110, el: 38 }, 8: { az: 115, el: 36 } };

/** every lens position of the film looking at its subject (houses and trees there are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== "town") continue;
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
/** a score page: five-line staves, sparse notes; the first mark of the first staff is a big rest (no words) */
const scoreTex = (key: string, w: number, h: number, staves: number, restFirst: boolean, notes = 5) => ctex(key, w, h, (g, r) => {
  g.fillStyle = "#f6efdc"; g.fillRect(0, 0, w, h);
  const gap = h / (staves + 1), ls = gap / 9;
  g.strokeStyle = "#3a3040"; g.fillStyle = "#241726";
  for (let s = 0; s < staves; s++) {
    const y0 = gap * (s + 0.6);
    g.lineWidth = Math.max(2, ls * 0.18);
    for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(w * 0.05, y0 + l * ls); g.lineTo(w * 0.95, y0 + l * ls); g.stroke(); }
    let x = w * 0.1;
    if (restFirst && s === 0) { // a big quarter-rest squiggle
      g.lineWidth = ls * 0.55; g.lineCap = "round"; g.lineJoin = "round";
      const cx = x + ls * 1.2, t = y0 - ls * 0.2;
      g.beginPath(); g.moveTo(cx - ls * 0.4, t); g.lineTo(cx + ls * 0.5, t + ls * 1.2); g.lineTo(cx - ls * 0.3, t + ls * 2.2); g.lineTo(cx + ls * 0.5, t + ls * 3.1);
      g.quadraticCurveTo(cx - ls * 0.9, t + ls * 2.9, cx - ls * 0.1, t + ls * 4.4); g.stroke();
      x += ls * 4;
    }
    for (let n = 0; n < notes; n++) {
      x += (w * 0.8) / (notes + 1) * (0.7 + 0.6 * r());
      if (x > w * 0.92) break;
      const ny = y0 + ls * Math.floor(r() * 8) * 0.5;
      g.beginPath(); g.ellipse(x, ny, ls * 0.62, ls * 0.45, -0.35, 0, Math.PI * 2); g.fill();
      g.lineWidth = Math.max(2, ls * 0.16); g.beginPath(); g.moveTo(x + ls * 0.56, ny); g.lineTo(x + ls * 0.56, ny - ls * 3.2); g.stroke();
    }
  }
});
/** church front: warm grey sandstone blocks, a round-arched door, a round window (tile = whole facade) */
const churchFrontTex = () => ctex("orChurchFront", 1024, 1024, (g, r) => {
  g.fillStyle = "#b9a58a"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 34) for (let x = -((y / 34) % 2) * 40; x < 1024; x += 80) {
    g.fillStyle = ["#c8b497", "#bfa98c", "#d1bea2", "#b29c80"][Math.floor(r() * 4)]; g.fillRect(x + 3, y + 3, 74, 28);
  }
  g.fillStyle = "#3a2a24"; g.beginPath(); g.moveTo(420, 1024); g.lineTo(420, 780); g.arc(512, 780, 92, Math.PI, 0); g.lineTo(604, 1024); g.fill();
  g.strokeStyle = "#e0d2b8"; g.lineWidth = 16; g.beginPath(); g.arc(512, 780, 104, Math.PI, 0); g.stroke();
  g.fillStyle = "#6a4a32"; g.fillRect(432, 790, 160, 234); g.fillStyle = "#58392a"; g.fillRect(510, 790, 6, 234);
  g.fillStyle = "#33406b"; g.beginPath(); g.arc(512, 470, 74, 0, 7); g.fill(); g.strokeStyle = "#e0d2b8"; g.lineWidth = 14; g.stroke();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineWidth = 5; g.beginPath(); g.moveTo(512, 470); g.lineTo(512 + 70 * Math.cos(a), 470 + 70 * Math.sin(a)); g.stroke(); }
  for (const x of [240, 784]) { g.fillStyle = "#33406b"; g.beginPath(); g.moveTo(x - 30, 700); g.lineTo(x - 30, 600); g.arc(x, 600, 30, Math.PI, 0); g.lineTo(x + 30, 700); g.fill(); }
});
/** the church wall inside: warm whitewash over stone, worn, a darker plinth band */
const naveTex = () => ctex("orNave", 1024, 1024, (g, r) => {
  g.fillStyle = "#e4d6bc"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(150,120,90,${0.04 + 0.06 * r()})`; const x = r() * 1024, y = r() * 1024; g.fillRect(x, y, 30 + 80 * r(), 14 + 20 * r()); }
  for (let y = 0; y < 1024; y += 64) { g.fillStyle = "rgba(120,96,70,0.08)"; g.fillRect(0, y, 1024, 3); }
  g.fillStyle = "#a89070"; g.fillRect(0, 900, 1024, 124);
});
const dialTex = () => ctex("orDial", 256, 256, (g) => {
  g.fillStyle = "#f6ecd2"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.lineWidth = i % 3 ? 5 : 10; g.beginPath(); g.moveTo(128 + 92 * Math.sin(a), 128 - 92 * Math.cos(a)); g.lineTo(128 + 110 * Math.sin(a), 128 - 110 * Math.cos(a)); g.stroke(); }
});
/** calendar: cream page, red band, empty day grid (no numerals) */
const calTex = () => ctex("orCal", 256, 320, (g) => {
  g.fillStyle = "#6a4a32"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#f6efdc"; g.fillRect(14, 14, 228, 292);
  g.fillStyle = "#c0353a"; g.fillRect(14, 14, 228, 64);
  g.strokeStyle = "#b8ab90"; g.lineWidth = 4;
  for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(14 + (228 / 7) * i, 90); g.lineTo(14 + (228 / 7) * i, 300); g.stroke(); }
  for (let j = 1; j < 6; j++) { g.beginPath(); g.moveTo(20, 90 + 42 * j); g.lineTo(236, 90 + 42 * j); g.stroke(); }
});
/** hay: golden straw strokes */
const hayTex = () => ctex("orHay", 512, 512, (g, r) => {
  g.fillStyle = "#d8b45a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 900; k++) { g.strokeStyle = ["#e8c870", "#c49a40", "#f0d890", "#b88a38"][Math.floor(r() * 4)]; g.lineWidth = 2 + 2 * r(); const x = r() * 512, y = r() * 512, a = (r() - 0.5) * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 * Math.cos(a), y + 40 * Math.sin(a)); g.stroke(); }
  g.fillStyle = "#8a6a30"; g.fillRect(0, 150, 512, 10); g.fillRect(0, 350, 512, 10);
});
/** keyboard: white keys with black ones (seen from above / front) */
const keysTex = () => ctex("orKeys", 1024, 128, (g) => {
  g.fillStyle = "#f4efe2"; g.fillRect(0, 0, 1024, 128);
  const n = 28, w = 1024 / n;
  g.strokeStyle = "#5a5060"; g.lineWidth = 3;
  for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, 128); g.stroke(); }
  g.fillStyle = "#241726";
  for (let i = 0; i < n - 1; i++) if (![2, 6].includes(i % 7)) g.fillRect((i + 1) * w - w * 0.3, 0, w * 0.6, 76);
});

const TIN = new THREE.MeshPhongMaterial({ color: "#d9dbe2", specular: "#ffffff", shininess: 40, emissive: "#4a4b54" });
const MAT = {
  wood: () => lam("orWood", () => ({ color: "#b07a48" })), woodD: () => lam("orWoodD", () => ({ color: "#6a4430" })),
  pine: () => lam("orPine", () => ({ color: "#d8a868" })), brass: () => lam("orBrass", () => ({ color: "#c99a3a" })),
  iron: () => lam("orIron", () => ({ color: "#5a5a64" })), cream: () => lam("orCream", () => ({ color: "#efe6d0" })),
  stone: () => lam("orStoneTrim", () => ({ color: "#c9b89c" })), black: () => new THREE.MeshPhongMaterial({ color: "#1e1a24", specular: "#9090a0", shininess: 70 }),
  sand: () => lam("orSandbag", () => ({ color: "#d8c08a" })), grey: () => lam("orBlower", () => ({ color: "#8c96a4" })),
};
const shadowAll = (o: THREE.Object3D) => o.traverse((m) => { const x = m as THREE.Mesh; if (x.isMesh && !x.layers.isEnabled(NOINK)) { x.castShadow = true; x.receiveShadow = true; } });
/** a round-arched window as a flat shape (emissive), width w, height h (arch included), centred at its foot */
const archShape = (w: number, h: number) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 16);
};
const pointShape = (w: number, h: number) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w); s.quadraticCurveTo(w / 2, h - w * 0.2, 0, h); s.quadraticCurveTo(-w / 2, h - w * 0.2, -w / 2, h - w); s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 16);
};

type Organ = { root: THREE.Group; parts: THREE.Object3D[]; pipes: THREE.Mesh[]; bags: THREE.Group; led: THREE.MeshBasicMaterial; lever: THREE.Mesh };
/** the tiny Halberstadt-style organ: a plain pine case on legs, a short keyboard on its +z side, 8 tin pipes on top,
 *  sandbags on three keys; a grey blower box beside it with a lamp and a lever. Local origin = floor under the case. */
const tinyOrgan = (): Organ => {
  const R = new THREE.Group(), parts: THREE.Object3D[] = [];
  const add = (o: THREE.Object3D) => { R.add(o); parts.push(o); return o; };
  const legs = new Batch();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) legs.add(boxGeo(V(sx * 0.62 - 0.04, 0, sz * 0.32 - 0.04), V(sx * 0.62 + 0.04, 0.62, sz * 0.32 + 0.04)), MAT.woodD());
  const lg = new THREE.Group(); legs.build(lg); add(lg);
  const cb = new Batch();
  cb.add(boxGeo(V(-0.7, 0.62, -0.38), V(0.7, PIPE_Y, 0.3)), MAT.pine());
  cb.add(boxGeo(V(-0.72, PIPE_Y - 0.03, -0.4), V(0.72, PIPE_Y, 0.32)), MAT.wood());
  cb.add(boxGeo(V(-0.6, KEY_Y - 0.06, 0.3), V(0.6, KEY_Y - 0.01, 0.52)), MAT.wood());
  const cg = new THREE.Group(); cb.build(cg); add(cg);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.2), lam("orKeysM", () => ({ map: keysTex() }))); keys.rotation.x = -Math.PI / 2; keys.position.set(0, KEY_Y, 0.42); add(keys);
  const pipes: THREE.Mesh[] = [];
  PIPES.forEach(([x, h]) => {
    const g = new THREE.CylinderGeometry(0.045, 0.045, h, 18); g.translate(0, h / 2 + 0.12, 0);
    const foot = new THREE.CylinderGeometry(0.045, 0.012, 0.12, 18); foot.translate(0, 0.06, 0);
    const pm = new THREE.Mesh(g, TIN); pm.add(new THREE.Mesh(foot, TIN));
    const mouth = new THREE.Mesh(boxGeo(V(-0.02, 0.15, 0.036), V(0.02, 0.18, 0.047)), lam("orMouth", () => ({ color: "#3a3446" }))); pm.add(mouth);
    pm.position.set(x, PIPE_Y, -0.05); add(pm); pipes.push(pm);
  });
  const GOLD = new THREE.MeshPhongMaterial({ color: "#e2b04a", specular: "#fff4c0", shininess: 50, emissive: "#3a2a08" });
  pipes[7].material = GOLD; (pipes[7].children[0] as THREE.Mesh).material = GOLD;
  const bags = new THREE.Group();
  for (const x of [-0.3, -0.06, 0.22]) {
    const bg = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), MAT.sand()); bg.scale.set(1.15, 0.6, 1); bg.position.set(x, KEY_Y + 0.03, 0.44); bags.add(bg);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), lam("orTie", () => ({ color: "#8a6a30" }))); tie.position.set(x, KEY_Y + 0.07, 0.44); tie.rotation.x = Math.PI / 2; bags.add(tie);
  }
  R.add(bags);
  // the blower
  const bx = BLOWER[0] - ORG[0], bz = BLOWER[2] - ORG[2];
  const bl = new THREE.Mesh(boxGeo(V(bx - 0.3, 0, bz - 0.25), V(bx + 0.3, 0.62, bz + 0.25)), MAT.grey()); add(bl);
  const grill = new THREE.Mesh(boxGeo(V(bx - 0.2, 0.2, bz + 0.25), V(bx + 0.2, 0.45, bz + 0.27)), MAT.iron()); add(grill);
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.05, 0.05) });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), led); lamp.position.set(bx + 0.18, 0.55, bz + 0.26); lamp.layers.set(NOINK); add(lamp);
  const lever = new THREE.Mesh(boxGeo(V(-0.015, 0, -0.015), V(0.015, 0.14, 0.015)), lam("orLever", () => ({ color: "#c0353a" }))); lever.position.set(bx - 0.12, 0.62, bz + 0.1); add(lever);
  const duct = new THREE.CylinderGeometry(0.06, 0.06, 1, 12); duct.rotateZ(Math.PI / 2);
  const dm = new THREE.Mesh(duct, MAT.iron()); dm.scale.set(Math.abs(bx) - 1.0, 1, 1); dm.position.set((bx + 0.3 - 0.7) / 2, 0.4, bz); add(dm);
  shadowAll(R);
  return { root: R, parts, pipes, bags, led, lever };
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
  private organ: Organ;
  private windows: THREE.MeshBasicMaterial; private cWindows: THREE.MeshBasicMaterial; private sWindow: THREE.MeshBasicMaterial; private flames: THREE.MeshBasicMaterial;
  private clockMin = new THREE.Group(); private clockHr = new THREE.Group();
  private only: Record<string, THREE.Object3D> = {};
  private bellows: THREE.Mesh[] = [];
  private ribbon: THREE.Mesh; private ribbonTex: THREE.Texture;
  private doorL: THREE.Mesh; private doorR: THREE.Mesh;
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

    // ---- the town ----
    setSight(sightLines());
    const r = rng(11);
    const b = new Batch();
    const ground = new THREE.PlaneGeometry(1600, 1600); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 240, uv.getY(i) * 240);
    b.add(ground, lam("orField", () => ({ map: grassHD() })));
    const cob = lam("orCobble", () => ({ map: cobbleHD() }));
    b.add(boxGeo(V(-22, 0, -60), V(22, 0.04, 22), 8), cob);    // the square and the street past the church
    b.add(boxGeo(V(-3.2, 0, 22), V(3.2, 0.04, 900), 8), cob);  // the road south out of town
    // houses round the square (a gap for the south road)
    const styles = [3, 0, 3, 1, 4, 3, 6, 3, 0, 5];
    let k = 0;
    for (const z of [-14, -5, 4, 13]) { house(b, -19, z, Math.PI / 2, 8, 8, 6.5 + r() * 2.5, styles[k++ % 10]); house(b, 19, z, -Math.PI / 2, 8, 8, 6.5 + r() * 2.5, styles[k++ % 10]); }
    for (const x of [-15, -8]) house(b, x, 19, Math.PI, 6.5, 8, 6.5 + r() * 2, styles[k++ % 10]);
    for (const x of [8, 15]) house(b, x, 19, Math.PI, 6.5, 8, 6.5 + r() * 2, styles[k++ % 10]);
    for (const x of [-16, -9, 9, 16]) house(b, x, -30, 0, 6.5, 8, 7 + r() * 2, styles[k++ % 10]);
    for (const z of [30, 42, 56]) { house(b, -9, z, Math.PI / 2, 8, 7, 6 + r() * 2, styles[k++ % 10]); house(b, 9, z, -Math.PI / 2, 8, 7, 6 + r() * 2, styles[k++ % 10]); }
    // the church: a long Romanesque nave, a squat west tower with a pyramid roof
    const stoneM = lam("orChurchStone", () => ({ map: stoneHD("orChurchStoneT", ["#c8b497", "#bfa98c", "#d1bea2", "#b29c80"], "#8e7c66") }));
    const Z0 = CHURCH_Z;
    b.add(boxGeo(V(-6, 0, Z0 - 30), V(6, 10, Z0 - 6), 4), stoneM);
    const nr = new THREE.CylinderGeometry(0.01, 8.6, 5, 4, 1); nr.rotateY(Math.PI / 4); nr.scale(13 / 12.16, 1, 25 / 12.16); nr.translate(0, 12.4, Z0 - 18);
    b.add(nr, lam("orChRoof", () => ({ map: roofHD("#8f6a5a") })));
    b.add(boxGeo(V(-4, 0, Z0 - 6.5), V(4, 17, Z0), 4), stoneM);
    const fq = new THREE.PlaneGeometry(8, 8); fq.translate(0, 4, Z0 + 0.01); b.add(fq, lam("orChFront", () => ({ map: churchFrontTex() })));
    const tr = new THREE.ConeGeometry(6.0, 6, 4, 1); tr.rotateY(Math.PI / 4); tr.translate(0, 20, Z0 - 3.25); b.add(tr, lam("orTwRoof", () => ({ map: roofHD("#6f7a86", true) })));
    b.add(boxGeo(V(-4.25, 16.6, Z0 - 6.75), V(4.25, 17.2, Z0 + 0.25)), MAT.stone());
    for (const sx of [-1, 1]) for (const y of [9, 13.5]) { const w = new THREE.Mesh(archShape(0.9, 1.8), lam("orSlit", () => ({ color: "#2a2638" }))); w.position.set(sx * 1.7, y, Z0 + 0.02); b.add(w.geometry.clone().translate(sx * 1.7, y, Z0 + 0.02), lam("orSlit", () => ({ color: "#2a2638" }))); }
    for (const z of [-11, -17, -23, -29]) for (const sx of [-1, 1]) { const g = archShape(1.1, 2.4); g.rotateY(sx * Math.PI / 2); g.translate(sx * 6.02, 5.5, Z0 + z + 3); b.add(g, lam("orSlit", () => ({ color: "#2a2638" }))); }
    // trees on the square and in the fields
    for (const [x, z, h] of [[-12, -18, 8], [12, -19, 8.5], [-13, 8, 7.5], [13, 9, 8]] as const) prop(b, kit, "tree_oak", x + r(), 0, z + r(), h, r() * 6);
    for (let i = 0; i < 40; i++) { const x = (r() < 0.5 ? -1 : 1) * (12 + r() * 120), z = 60 + r() * 600; prop(b, kit, r() < 0.4 ? "tree_cone" : "tree_oak", x, 0, z, 7 + r() * 5, r() * 6); }
    b.build(R);
    setSight([]);
    // the long score (shot 14): a paper strip from the church door down the road; a little red flag at 4 %
    this.ribbonTex = scoreTex("orRibbon", 512, 256, 1, false, 4).clone(); this.ribbonTex.needsUpdate = true;
    this.ribbon = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1), lam("orRibbonM", () => ({ map: this.ribbonTex, side: THREE.DoubleSide })));
    this.ribbon.rotation.x = -Math.PI / 2; this.ribbon.receiveShadow = true; R.add(this.ribbon);
    const flag = new THREE.Group(); flag.position.set(0.95, 0, Z0 + 38); R.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), MAT.woodD()); pole.position.y = 1.3; flag.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ color: "#e0302a", side: THREE.DoubleSide })); cloth.position.set(0.62, 2.2, 0); flag.add(cloth);
    shadowAll(flag);
    this.only.ribbon = this.ribbon; this.only.flag = flag;

    // ---- the church inside ----
    const C = (x: number, y: number, z: number) => V(CH[0] + x, CH[1] + y, CH[2] + z);
    const cb = new Batch();
    cb.add(boxGeo(C(-5, -0.1, -14), C(5, 0.02, 8), 3), lam("orChFloor", () => ({ map: stoneHD("orFloorT", ["#b8a688", "#ae9c80", "#c2b092", "#a69478"], "#7e6e58") })));
    const nave = lam("orNaveM", () => ({ map: naveTex() }));
    cb.add(boxGeo(C(-5.3, 0, -14), C(-5, 9, 8), 9), nave); cb.add(boxGeo(C(5, 0, -14), C(5.3, 9, 8), 9), nave);
    cb.add(boxGeo(C(-5, 0, -14.3), C(5, 9, -14), 9), nave); cb.add(boxGeo(C(-5, 0, 8), C(5, 9, 8.3), 9), nave);
    cb.add(boxGeo(C(-5.3, 9, -14.3), C(5.3, 9.3, 8.3)), lam("orCeil", () => ({ map: planksHD(), color: "#9a6a44" })));
    for (let z = -13; z <= 7; z += 2.5) cb.add(boxGeo(C(-5, 8.6, z - 0.15), C(5, 9, z + 0.15)), MAT.woodD());
    for (const sx of [-1, 1]) for (let z = -12; z <= 6; z += 6) cb.add(boxGeo(C(sx * 5 - (sx > 0 ? 0.35 : 0), 0, z - 0.4), C(sx * 5 + (sx < 0 ? 0.35 : 0), 8.6, z + 0.4)), MAT.stone()); // pilasters
    // the apse arch on the front wall
    cb.add(boxGeo(C(-3.2, 0, -14.02), C(-2.6, 6, -13.9)), MAT.stone()); cb.add(boxGeo(C(2.6, 0, -14.02), C(3.2, 6, -13.9)), MAT.stone());
    const apse = archShape(5.2, 7.6); apse.translate(CH[0], CH[1], CH[2] - 13.98); cb.add(apse, lam("orApse", () => ({ color: "#cdb894" })));
    // the west door (back wall)
    cb.add(boxGeo(C(-1.5, 0, 7.85), C(-1.25, 3.6, 8.0)), MAT.stone()); cb.add(boxGeo(C(1.25, 0, 7.85), C(1.5, 3.6, 8.0)), MAT.stone());
    cb.add(boxGeo(C(-1.5, 3.6, 7.85), C(1.5, 3.9, 8.0)), MAT.stone());
    cb.add(boxGeo(C(-1.25, 0, 7.98), C(1.25, 3.6, 8.0)), lam("orOutside", () => ({ color: "#f4e8c8" })));
    cb.build(R, false);
    this.doorL = new THREE.Mesh(boxGeo(V(0, 0, 0), V(1.25, 3.55, 0.08)), lam("orDoor", () => ({ color: "#7a4a2a" }))); this.doorL.position.copy(C(-1.25, 0, 7.9)); R.add(this.doorL);
    this.doorR = new THREE.Mesh(boxGeo(V(-1.25, 0, 0), V(0, 3.55, 0.08)), lam("orDoor", () => ({ color: "#7a4a2a" }))); this.doorR.position.copy(C(1.25, 0, 7.9)); R.add(this.doorR);
    // high round-arched windows (emissive, driven by the time-lapses)
    this.windows = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6), side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (const z of [-9, -3, 3]) { const w = new THREE.Mesh(archShape(1.1, 2.6), this.windows); w.rotation.y = -sx * Math.PI / 2; w.position.copy(C(sx * 4.97, 5.3, z)); R.add(w); }
    const aw = new THREE.Mesh(archShape(1.0, 2.2), this.windows); aw.position.copy(C(0, 5.0, -13.96)); R.add(aw);
    // calendar on the right wall near the organ
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.82), lam("orCalM", () => ({ map: calTex() }))); cal.position.copy(C(-1.6, 2.4, -13.95)); R.add(cal);
    // the organ
    this.organ = tinyOrgan(); this.organ.root.position.set(...ORG); R.add(this.organ.root);
    // chairs: rows facing the organ (-z)
    const chairs = new Batch();
    for (const s of SEATS) {
      const x = s[0], z = s[2];
      chairs.add(boxGeo(V(x - 0.22, 0.44, z - 0.2), V(x + 0.22, 0.48, z + 0.2)), MAT.wood());
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) chairs.add(boxGeo(V(x + sx * 0.18 - 0.02, 0, z + sz * 0.16 - 0.02), V(x + sx * 0.18 + 0.02, 0.44, z + sz * 0.16 + 0.02)), MAT.woodD());
    }
    const chg = new THREE.Group(); chairs.build(chg); shadowAll(chg); R.add(chg); this.only.chairs = chg;
    // the barn / pigsty dressing (shot 8): hay bales, a plank pen, straw on the floor
    const barn = new Batch(), hay = lam("orHayM", () => ({ map: hayTex() }));
    for (const [x, z, y] of [[-3.8, -9, 0], [-3.8, -7.9, 0], [-3.8, -8.4, 0.5], [3.6, -11, 0], [2.5, -11.4, 0], [3.0, -11.2, 0.5], [-3.6, -3, 0]] as const)
      barn.add(boxGeo(C(x - 0.55, y, z - 0.4), C(x + 0.55, y + 0.5, z + 0.4)), hay);
    for (let x = -2.4; x <= 2.4; x += 0.6) barn.add(boxGeo(C(x - 0.04, 0, -5.2), C(x + 0.04, 0.9, -5.12)), MAT.woodD());
    for (const y of [0.35, 0.75]) barn.add(boxGeo(C(-2.45, y, -5.22), C(2.45, y + 0.1, -5.1)), MAT.wood());
    const straw = new THREE.PlaneGeometry(9, 12); straw.rotateX(-Math.PI / 2); straw.translate(CH[0], 0.03, CH[2] - 6); barn.add(straw, lam("orStraw", () => ({ map: hayTex(), color: "#c9a860" })));
    const bg = new THREE.Group(); barn.build(bg); shadowAll(bg); R.add(bg); this.only.barn = bg;

    // ---- the 1361 cathedral ----
    const K = (x: number, y: number, z: number) => V(CA[0] + x, CA[1] + y, CA[2] + z);
    const kb = new Batch();
    kb.add(boxGeo(K(-8, -0.1, -7), K(8, 0.02, 12), 3), lam("orCaFloor", () => ({ map: stoneHD("orCaFloorT", ["#8e8070", "#867868", "#968878", "#7e7060"], "#5e5246") })));
    const cw = lam("orCaWall", () => ({ map: stoneHD("orCaWallT", ["#a89880", "#9e8e76", "#b0a088", "#968670"], "#6e604e") }));
    kb.add(boxGeo(K(-8.3, 0, -7), K(-8, 15, 12), 4), cw); kb.add(boxGeo(K(8, 0, -7), K(8.3, 15, 12), 4), cw); kb.add(boxGeo(K(-8, 0, -7.3), K(8, 15, -7), 4), cw);
    kb.add(boxGeo(K(-8, 0, 12), K(8, 15, 12.3), 4), cw);
    for (const sx of [-1, 1]) for (const z of [-3, 3, 9]) kb.add(boxGeo(K(sx * 5.6 - 0.45, 0, z - 0.45), K(sx * 5.6 + 0.45, 15, z + 0.45), 3), cw);
    // the great organ: a dark oak case with three towers of pipes
    kb.add(boxGeo(K(-3.4, 0, -6.9), K(3.4, 2.6, -5.6)), MAT.woodD());
    kb.add(boxGeo(K(-3.6, 2.6, -6.9), K(3.6, 2.9, -5.4)), MAT.wood());
    kb.add(boxGeo(K(-3.4, 8.6, -6.9), K(3.4, 9.2, -5.6)), MAT.wood());
    for (const sx of [-3.45, 3.45]) kb.add(boxGeo(K(sx - 0.18, 2.9, -6.9), K(sx + 0.18, 8.6, -5.6)), MAT.woodD());
    kb.add(boxGeo(K(-1.3, 1.0, -5.62), K(1.3, 1.12, -5.3)), lam("orCaKeys", () => ({ map: keysTex() })));
    const caPipes = new Batch();
    for (let i = 0; i < 25; i++) {
      const x = -3.0 + i * 0.25, tower = Math.abs(x) < 0.5 ? 1.6 : Math.abs(Math.abs(x) - 2.2) < 0.55 ? 1.0 : 0;
      const h = 2.6 + 2.2 * (1 - Math.abs(x) / 3.2) + tower;
      const g = new THREE.CylinderGeometry(0.1, 0.1, h, 14); g.translate(CA[0] + x, 2.95 + h / 2, CA[2] - 6.1 + (tower ? 0.25 : 0));
      caPipes.add(g, TIN);
      const ft = new THREE.ConeGeometry(0.1, 0.25, 14); ft.rotateX(Math.PI); ft.translate(CA[0] + x, 2.95 - 0.02, CA[2] - 6.1 + (tower ? 0.25 : 0)); caPipes.add(ft, TIN);
    }
    kb.build(R, false);
    caPipes.build(R, false);
    // pointed windows (deep blue night) and candles
    this.cWindows = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.3, 0.7), side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (const z of [0, 6]) { const w = new THREE.Mesh(pointShape(1.4, 4.2), this.cWindows); w.rotation.y = -sx * Math.PI / 2; w.position.copy(K(sx * 7.97, 5.5, z)); R.add(w); }
    for (const x of [-4.4, 4.4]) { const w = new THREE.Mesh(pointShape(1.1, 4.6), this.cWindows); w.position.copy(K(x, 4.0, -6.97)); R.add(w); }
    this.flames = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.7) });
    const cand = new Batch();
    for (const [x, z] of [[-4.6, -4.2], [4.6, -4.2], [-4.6, 1.5], [4.6, 1.5], [-1.9, -4.8], [1.9, -4.8]] as const) {
      cand.add(new THREE.CylinderGeometry(0.04, 0.08, 1.4, 10).translate(CA[0] + x, 0.7, CA[2] + z), MAT.iron());
      cand.add(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 10).translate(CA[0] + x, 1.54, CA[2] + z), MAT.cream());
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), this.flames); fl.scale.set(0.7, 1.6, 0.7); fl.position.copy(K(x, 1.76, z)); fl.layers.set(NOINK); R.add(fl);
    }
    cand.build(R);
    // the bellows the monks tread: three wedge boxes beside the organ
    for (let i = 0; i < 2; i++) {
      const bm = new THREE.Mesh(boxGeo(V(-0.55, 0, -0.4), V(0.55, 1, 0.4)), lam("orBellows", () => ({ map: ctex("orPleats", 128, 256, (g) => { g.fillStyle = "#8a5a34"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#5a3820"; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 128, 10); g.fillStyle = "#6a4430"; g.fillRect(0, 226, 128, 30); }) })));
      bm.position.copy(K(-2.4 - i * 1.25 + 0.0, 0, -4.4)); shadowAll(bm); R.add(bm); this.bellows.push(bm);
    }

    // ---- Cage's studio ----
    const S = (x: number, y: number, z: number) => V(STU[0] + x, STU[1] + y, STU[2] + z);
    const sb = new Batch();
    sb.add(boxGeo(S(-5, -0.1, -3), S(5, 0.02, 6)), lam("orStuFloor", () => ({ map: planksHD(), color: "#c09060" })));
    const sw = lam("orStuWall", () => ({ color: "#ece4d2" }));
    sb.add(boxGeo(S(-5, 0, -3.2), S(5, 3.6, -3)), sw); sb.add(boxGeo(S(-5.2, 0, -3), S(-5, 3.6, 6)), sw); sb.add(boxGeo(S(5, 0, -3), S(5.2, 3.6, 6)), sw);
    sb.add(boxGeo(S(-5, 0, -2.98), S(5, 0.12, -2.94)), MAT.woodD());
    // desk + chair
    const dx = DESK[0], dz = DESK[2];
    sb.add(boxGeo(V(dx - 0.75, 0.72, dz - 0.05), V(dx + 0.75, 0.78, dz + 0.7)), MAT.wood());
    for (const [sx, sz] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) sb.add(boxGeo(V(dx + sx * 0.7 - 0.03, 0, dz + sz * 0.65 - 0.03 + 0.02), V(dx + sx * 0.7 + 0.03, 0.72, dz + sz * 0.65 + 0.03)), MAT.woodD());
    sb.add(boxGeo(V(dx - 0.22, 0.44, dz - 0.62), V(dx + 0.22, 0.48, dz - 0.2)), MAT.wood());
    sb.add(boxGeo(V(dx - 0.22, 0.48, dz - 0.66), V(dx + 0.22, 1.0, dz - 0.62)), MAT.wood());
    // bookshelf + plants
    sb.add(boxGeo(S(-4.6, 0, -2.95), S(-3.0, 2.2, -2.55)), MAT.woodD());
    const bookC = ["#8e2f3a", "#2f5f6a", "#c99a3a", "#3f6fb5", "#5d7a3a", "#6a4a32"];
    for (let k2 = 0; k2 < 3; k2++) for (let x = -4.5; x < -3.1;) { const w = 0.05 + r() * 0.05, h = 0.3 + r() * 0.15; sb.add(boxGeo(S(x, 0.25 + 0.65 * k2, -2.9), S(x + w, 0.25 + 0.65 * k2 + h, -2.6)), lam("orBook" + (k2 * 5 + Math.floor(-x * 10)) % 6, () => ({ color: bookC[(k2 * 5 + Math.floor(-x * 10)) % 6] }))); x += w + 0.012; }
    sb.build(R);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44), lam("orScoreM", () => ({ map: scoreTex("orScoreT", 1024, 726, 4, true, 3) })));
    desk.rotation.x = -Math.PI / 2; desk.position.set(dx, 0.785, dz + 0.35); desk.receiveShadow = true; R.add(desk);
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 6), lam("orPencil", () => ({ color: "#f0c64a" }))); pencil.rotation.set(Math.PI / 2, 0, 0.6); pencil.position.set(dx + 0.38, 0.79, dz + 0.4); R.add(pencil);
    // the grand piano: keyboard at its left end (x), the curved body running to +x
    const pg = new THREE.Group(); pg.position.set(...PIANO); R.add(pg);
    const shp = new THREE.Shape(); shp.moveTo(0, -0.75); shp.lineTo(0.4, -0.75); shp.bezierCurveTo(1.2, -0.75, 1.0, -0.1, 1.9, -0.05); shp.bezierCurveTo(2.3, 0.0, 2.2, 0.75, 1.6, 0.75); shp.lineTo(0, 0.75); shp.lineTo(0, -0.75);
    const body = new THREE.ExtrudeGeometry(shp, { depth: 0.3, bevelEnabled: false, curveSegments: 24 }); body.rotateX(-Math.PI / 2); body.translate(0, 0.62, 0);
    const pm = new THREE.Mesh(body, MAT.black()); pg.add(pm);
    const lid = new THREE.Mesh(new THREE.ShapeGeometry(shp, 24), MAT.black()); lid.rotation.x = -Math.PI / 2; lid.position.set(0, 0, -0.75);
    const lidG = new THREE.Group(); lidG.position.set(0, 0.93, 0.75); lidG.rotation.x = 0.7; lidG.add(lid); pg.add(lidG);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), MAT.black()); stick.position.set(1.2, 1.2, -0.1); stick.rotation.x = 0.35; pg.add(stick);
    for (const [x, z] of [[0.15, -0.6], [0.15, 0.6], [1.7, 0.1]] as const) { const lgm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.62, 10), MAT.black()); lgm.position.set(x, 0.31, z); pg.add(lgm); }
    const kb2 = new THREE.Mesh(boxGeo(V(-0.25, 0.7, -0.62), V(0, 0.76, 0.62)), MAT.black()); pg.add(kb2);
    const pk = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.18), lam("orKeysM", () => ({ map: keysTex() }))); pk.rotation.set(-Math.PI / 2, 0, Math.PI / 2); pk.position.set(-0.13, 0.765, 0); pg.add(pk);
    const bench = new THREE.Mesh(boxGeo(V(-0.85, 0.4, -0.3), V(-0.5, 0.48, 0.3)), MAT.black()); pg.add(bench);
    shadowAll(pg);
    // window + wall clock
    this.sWindow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.9, 1.6) });
    const swm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.6), this.sWindow); swm.position.copy(S(-1.2, 1.9, -2.93)); R.add(swm);
    const wfr = new Batch();
    wfr.add(boxGeo(S(-2.0, 1.05, -2.98), S(-0.4, 1.12, -2.85)), MAT.cream()); wfr.add(boxGeo(S(-2.0, 2.7, -2.98), S(-0.4, 2.76, -2.88)), MAT.cream());
    wfr.add(boxGeo(S(-1.23, 1.1, -2.95), S(-1.17, 2.7, -2.9)), MAT.cream()); wfr.add(boxGeo(S(-1.98, 1.9, -2.95), S(-0.42, 1.94, -2.9)), MAT.cream());
    wfr.build(R, false);
    const clock = new THREE.Group(); clock.position.copy(S(1.4, 2.5, -2.93)); R.add(clock);
    const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), MAT.woodD()); ck.rotation.x = Math.PI / 2; clock.add(ck);
    const cf = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), lam("orDialM", () => ({ map: dialTex() }))); cf.position.z = 0.03; clock.add(cf);
    const hand = (g: THREE.Group, len: number, w: number) => { const m = new THREE.Mesh(boxGeo(V(-w / 2, -0.02, 0), V(w / 2, len, 0.006)), lam("orHand", () => ({ color: "#241726" }))); g.add(m); g.position.z = 0.035; clock.add(g); };
    hand(this.clockMin, 0.21, 0.02); hand(this.clockHr, 0.14, 0.03);
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
    cam.fov = c.fov; cam.near = s.place === "town" ? 0.1 : 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const town = s.place === "town";
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + (town ? 9 : 4), town ? 12 : 4, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    let lit: [number, number, number] = [...L.lit];
    const shade: [number, number, number] = [...L.shade], tint: [number, number, number] = [...L.charTint];
    const wl = windowLight(id, f);
    if (!town) { // time-lapse: the room dims with the window light
      const k = 0.35 + 0.65 * wl; lit = lit.map((v, i) => v * k + (1 - k) * [0.22, 0.26, 0.5][i]) as typeof lit; this.sun.intensity = L.sunI * (0.3 + 0.7 * wl);
    }
    if (s.place === "cathedral") { const fl = 1 + 0.04 * Math.sin(t * 23) + 0.03 * Math.sin(t * 37); lit = lit.map((v) => v * fl) as typeof lit; }
    TONE.uLitCol.value.set(...lit); TONE.uShadeCol.value.set(...shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...tint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) {
      const i = m.userData.k as number, near = i >= 7, a = ((i % 7) / 7) * Math.PI * 2 + (near ? 0.65 : 0.3), d = near ? 300 + (i % 3) * 40 : 600 + (i % 3) * 60, w = (near ? 80 : 130) + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 4, (near ? 95 : 120) + (i % 4) * 34, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); m.visible = town;
    }
    // ---- windows, candles, clock ----
    const dusk = s.light === "dusk";
    if (dusk) this.windows.color.setRGB(0.6 + 1.8 * wl, 0.4 + 1.1 * wl, 0.35 + 0.45 * wl);
    else this.windows.color.setRGB(0.25 + 1.95 * wl, 0.3 + 1.7 * wl, 0.5 + 1.1 * wl);
    const dk = id === 6 && f >= 560 ? wl : 0.1;
    this.cWindows.color.setRGB(0.22 + 2.0 * dk, 0.26 + 1.75 * dk, 0.7 + 0.9 * dk);
    const fk = 1 + 0.15 * Math.sin(t * 19) + 0.1 * Math.sin(t * 31);
    this.flames.color.setRGB(3.2 * fk, 2.0 * fk, 0.7 * fk);
    const mins = clockMin(id, f);
    this.clockMin.rotation.z = -(mins / 60) * Math.PI * 2; this.clockHr.rotation.z = -((mins / 60 + 2) / 12) * Math.PI * 2;
    // ---- the tiny organ ----
    const O = this.organ, n = pipeCount(id, f);
    O.pipes.forEach((p, i) => { p.visible = i < 7 || n >= 8 || (id === 13 && f >= 1424); });
    if (id === 13) { const u = smooth(clamp01((f - 1430) / (ADD_PIPE - 1430))); O.pipes[7].position.y = PIPE_Y + 0.7 * (1 - u); }
    else O.pipes[7].position.y = PIPE_Y;
    O.bags.visible = bagsOn(id, f);
    const on = blowerOn(id, f) && !(id === 17 && f < 1960);
    O.led.color.setRGB(on ? 0.3 : 0.2, on ? 3.0 : 0.05, on ? 0.4 : 0.05);
    O.lever.rotation.z = id === 9 && f < SWITCH ? 0.6 : -0.6;
    const bu = id === 9 ? buildAt(f) : 1;
    O.parts.forEach((p, i) => { const k = clamp01(bu * O.parts.length - i * 0.6); p.visible = k > 0.02; p.scale.setScalar(id === 9 ? 0.6 + 0.4 * smooth(k) : 1); });
    // ---- props by shot ----
    this.only.barn.visible = id === 8;
    this.only.chairs.visible = s.place === "church" && id !== 8 && id !== 9 && id !== 10;
    O.root.visible = s.place === "church" && id !== 8;
    const open = id === 12 ? smooth((f - 1266) / 14) : id === 17 ? 0 : 0;
    this.doorL.rotation.y = 1.7 * open; this.doorR.rotation.y = -1.7 * open;
    this.ribbon.visible = this.only.flag.visible = id === 14;
    if (id === 14) {
      const len = ribbonAt(f);
      this.ribbon.scale.set(1, len, 1); this.ribbon.position.set(0, 0.06, CHURCH_Z + 0.2 + len / 2);
      this.ribbonTex.repeat.set(1, len / 10);
      this.ribbon.rotation.set(-Math.PI / 2, 0, 0);
    }
    this.bellows.forEach((bm, i) => { bm.scale.y = id === 6 ? 0.2 + 0.5 * bellowsAt(f, i) : 0.4; });
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
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

export type { V3 };
