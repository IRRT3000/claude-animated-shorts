// "The Summer Everyone Danced" as one three.js scene: Strasbourg in 1518 (the horse market square with the council's
// wooden stage, the guild hall, the hitching rail, a bread stall, the saint's column, the street to the pink cathedral
// with Frau Troffea's door) and, 3 km away, green hills with the saint's shrine and the wagon road. update(id, f, camera)
// poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, setSight, prop, house, Ray, Kit } from "./build";
import { ctex, cloudHD, grassHD, planksHD, stoneHD, roofHD, cobbleHD, facadeHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, STAGE, DECK, GUILD, RAIL, STALL, COLUMN, COL_H, BENCH, DOOR, CATH_Z, HILL, ROAD, SHRINE,
  camAt, hillH, roadAt, nightAt, doorsAt, stageAt, wagonPose, CLEAR, STEP_OUT, V3, smooth, clamp01,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: trees are drawn by build.ts
void LFB;

/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 120, el: 42 }, 6: { az: 115, el: 40 }, 9: { az: 120, el: 42 }, 13: { az: 140, el: 12 }, 14: { az: 145, el: 12 }, 16: { az: 140, el: 10 } };

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
/** the cathedral's rose window: deep blue glass, red and gold panes, stone tracery */
const roseTex = () => ctex("dpRose", 512, 512, (g) => {
  g.fillStyle = "#b9776c"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#26305e"; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.fill();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    g.fillStyle = k % 2 ? "#a83a4a" : "#d6a842"; g.beginPath(); g.arc(256 + 170 * Math.cos(a), 256 + 170 * Math.sin(a), 30, 0, 7); g.fill();
    g.strokeStyle = "#c98a7c"; g.lineWidth = 12; g.beginPath(); g.moveTo(256 + 60 * Math.cos(a), 256 + 60 * Math.sin(a)); g.lineTo(256 + 236 * Math.cos(a), 256 + 236 * Math.sin(a)); g.stroke();
  }
  g.fillStyle = "#3a6ab0"; g.beginPath(); g.arc(256, 256, 58, 0, 7); g.fill();
  g.strokeStyle = "#c98a7c"; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.stroke(); g.beginPath(); g.arc(256, 256, 62, 0, 7); g.stroke();
  g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 130, 0, 7); g.stroke();
});
/** striped market awning */
const awningTex = () => ctex("dpAwning", 256, 128, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f3ead6" : "#c0353a"; g.fillRect(i * 32, 0, 32, 128); }
});
/** dirt road: warm ochre with wheel ruts and pebbles */
const roadTex = () => ctex("dpRoad", 512, 512, (g, r) => {
  g.fillStyle = "#c9a46a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 500; k++) { g.fillStyle = ["#b8935a", "#d6b47c", "#a8844e"][Math.floor(r() * 3)]; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 5, 0, 7); g.fill(); }
  g.fillStyle = "rgba(110,80,40,0.25)"; g.fillRect(130, 0, 34, 512); g.fillRect(348, 0, 34, 512);
});
/** the doorway darkness */
const DARK = () => lam("dpDark", () => ({ color: "#1c1410" }));

const MAT = {
  wood: () => lam("dpWood", () => ({ color: "#b07a48" })), woodD: () => lam("dpWoodD", () => ({ color: "#6a4430" })),
  pine: () => lam("dpPine", () => ({ map: planksHD(), color: "#e0b078" })), iron: () => lam("dpIron", () => ({ color: "#5a5a64" })),
  stone: () => lam("dpStoneTrim", () => ({ color: "#c9b89c" })), pink: () => lam("dpPink", () => ({ map: stoneHD("dpPinkT", ["#c98a7c", "#c08072", "#d29484", "#b8786a"], "#8e5a52") })),
  pinkTrim: () => lam("dpPinkTrim", () => ({ color: "#d79a8a" })), red: () => lam("dpRed", () => ({ color: "#c0353a" })),
  gold: () => lam("dpGold", () => ({ color: "#e0b040" })), cream: () => lam("dpCream", () => ({ color: "#efe6d0" })),
  grey: () => lam("dpGrey", () => ({ map: stoneHD("dpGreyT", ["#b8b0a4", "#aea698", "#c2baae", "#a69e92"], "#7e766a") })),
};
const shadowAll = (o: THREE.Object3D) => o.traverse((m) => { const x = m as THREE.Mesh; if (x.isMesh && !x.layers.isEnabled(NOINK)) { x.castShadow = true; x.receiveShadow = true; } });
const pointShape = (w: number, h: number) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w); s.quadraticCurveTo(w / 2, h - w * 0.2, 0, h); s.quadraticCurveTo(-w / 2, h - w * 0.2, -w / 2, h - w); s.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(s, 16);
};
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
    t.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z, x1, y, z, cx, y + rise, z].concat(z === z0 ? [] : []), 3));
    if (z === z1) t.setIndex([0, 1, 2]); else t.setIndex([0, 2, 1]);
    t.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    t.computeVertexNormals();
    b.add(t, wall);
  }
};

type StagePart = { o: THREE.Object3D; base: THREE.Vector3; seed: number };

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
  private moon: THREE.Mesh;
  private stageParts: StagePart[] = [];
  private guildL: THREE.Object3D; private guildR: THREE.Object3D; private clutter: THREE.Object3D[] = [];
  private trofDoor: THREE.Object3D;
  private wagon: THREE.Group; private wheels: THREE.Mesh[] = [];
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
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.1), fog: false, depthWrite: false }));
    this.moon.layers.set(NOINK); this.moon.renderOrder = -0.5; R.add(this.moon);

    // ---- Strasbourg ----
    setSight(sightLines("town"));
    const r = rng(23);
    const b = new Batch();
    const ground = new THREE.PlaneGeometry(1600, 1600); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 240, uv.getY(i) * 240);
    b.add(ground, lam("dpField", () => ({ map: grassHD() })));
    const cob = lam("dpCobble", () => ({ map: cobbleHD() }));
    b.add(boxGeo(V(-24, 0, -44), V(24, 0.04, 26), 8), cob);     // the horse market square
    b.add(boxGeo(V(-5, 0, -84), V(5, 0.04, -44), 8), cob);      // the street north to the cathedral
    b.add(boxGeo(V(-17, 0, -88), V(17, 0.04, -78), 8), cob);    // the cathedral plaza
    b.add(boxGeo(V(-3.2, 0, 26), V(3.2, 0.04, 900), 8), cob);   // the road south
    // houses round the square (gaps: the street north, the road south, the guild hall on the west side)
    let k = 0;
    const H = (x: number, z: number, yaw: number, w: number, d: number, h: number) => house(b, x, z, yaw, w, d, h, k++ % 8);
    for (const z of [-34, 3, 14]) H(-20, z, Math.PI / 2, 8, 8, 7 + r() * 2.5);
    for (const z of [-32, -20, -8, 3, 15]) H(20, z, -Math.PI / 2, 8, 8, 7 + r() * 2.5);
    for (const x of [-17, -9]) H(x, 30, Math.PI, 7, 8, 7 + r() * 2);
    for (const x of [9, 17]) H(x, 30, Math.PI, 7, 8, 7 + r() * 2);
    for (const x of [-18.5, -10]) H(x, -48, 0, 8, 8, 7.5 + r() * 2);
    for (const x of [10, 18.5]) H(x, -48, 0, 8, 8, 7.5 + r() * 2);
    for (const z of [-58, -66, -74]) H(-9, z, Math.PI / 2, 7.5, 8, 7 + r() * 2.5);
    for (const z of [-58, -66, -74]) H(9, z, -Math.PI / 2, 7.5, 8, 7 + r() * 2.5);
    // Frau Troffea's house: east side of the street, front at x = 4.5 (her door at DOOR)
    {
      const w = 7, h = 8.4, st = { wall: "#e8b9a0", shutter: "#2f6a43", timber: true };
      const front = lam("dpTrofFront", () => ({ map: facadeHD("dpTrofF", w, h, { ...st, door: false }) }));
      const fq = new THREE.PlaneGeometry(w, h); fq.rotateY(-Math.PI / 2); fq.translate(4.5, h / 2, -50.5); b.add(fq, front);
      b.add(boxGeo(V(4.52, 0, -54), V(12.5, h, -47)), lam("dpTrofWall", () => ({ color: "#e8b9a0" })));
      gable(b, 4.5, 12.5, h, -54, -47, 3.4, lam("roof#b8644f", () => ({ map: roofHD("#b8644f"), side: THREE.DoubleSide })), lam("dpTrofWall", () => ({ color: "#e8b9a0" })));
      b.add(boxGeo(V(4.3, 0, -50.85), V(4.55, 2.45, -50.7)), MAT.woodD()); b.add(boxGeo(V(4.3, 0, -49.3), V(4.55, 2.45, -49.15)), MAT.woodD());
      b.add(boxGeo(V(4.3, 2.35, -50.85), V(4.55, 2.55, -49.15)), MAT.woodD());
      b.add(boxGeo(V(4.46, 0, -50.7), V(4.5, 2.35, -49.3)), DARK());
      b.add(boxGeo(V(3.9, 0, -51.0), V(4.5, 0.16, -49.0)), MAT.stone()); // door step
    }
    // the guild hall: a big timber-framed hall on the west side, double doors facing the square
    {
      const x0 = -27, x1 = -14.5, z0 = -21, z1 = -7, h = 9.5;
      const st = { wall: "#efdcb8", shutter: "#8c3b4a", timber: true };
      const fr = new THREE.PlaneGeometry(z1 - z0, h); fr.rotateY(Math.PI / 2); fr.translate(x1, h / 2, (z0 + z1) / 2);
      b.add(fr, lam("dpGuildF", () => ({ map: facadeHD("dpGuildFT", z1 - z0, h, { ...st, door: false }) })));
      b.add(boxGeo(V(x0, 0, z0), V(x1 - 0.02, h, z1)), lam("dpGuildW", () => ({ color: "#efdcb8" })));
      gable(b, x0, x1, h, z0, z1, 5, lam("roof#c9775a", () => ({ map: roofHD("#c9775a"), side: THREE.DoubleSide })), lam("dpGuildW", () => ({ color: "#efdcb8" })));
      b.add(boxGeo(V(x1 - 0.02, 0, GUILD[2] - 1.7), V(x1 + 0.25, 3.7, GUILD[2] - 1.45)), MAT.woodD());
      b.add(boxGeo(V(x1 - 0.02, 0, GUILD[2] + 1.45), V(x1 + 0.25, 3.7, GUILD[2] + 1.7)), MAT.woodD());
      b.add(boxGeo(V(x1 - 0.02, 3.45, GUILD[2] - 1.7), V(x1 + 0.25, 3.8, GUILD[2] + 1.7)), MAT.woodD());
      b.add(boxGeo(V(x1 - 3, 0, GUILD[2] - 1.45), V(x1 - 0.05, 3.45, GUILD[2] + 1.45)), DARK());
      // a guild sign: a gold pretzel-less emblem board on an iron arm (no lettering)
      b.add(boxGeo(V(x1, 4.6, GUILD[2] - 0.05), V(x1 + 1.4, 4.68, GUILD[2] + 0.05)), MAT.iron());
      b.add(boxGeo(V(x1 + 0.5, 3.9, GUILD[2] - 0.04), V(x1 + 1.3, 4.6, GUILD[2] + 0.04)), MAT.gold());
    }
    // the pink sandstone cathedral: west front with a rose window, one tall north spire
    {
      const Z = CATH_Z, P = MAT.pink();
      b.add(boxGeo(V(-15, 0, Z - 40), V(15, 30, Z), 6), P);
      b.add(boxGeo(V(-15, 30, Z - 10), V(-5, 50, Z), 6), P);                         // north tower
      const oct = new THREE.CylinderGeometry(3.6, 4.2, 12, 8); oct.translate(-10, 56, Z - 5); b.add(oct, P);
      const sp = new THREE.ConeGeometry(3.6, 30, 8); sp.translate(-10, 77, Z - 5); b.add(sp, P);
      b.add(boxGeo(V(5, 30, Z - 10), V(15, 42, Z), 6), P);                           // the unfinished south tower
      for (let x = 5.5; x < 15; x += 1.6) b.add(boxGeo(V(x, 42, Z - 0.6), V(x + 0.8, 43.2, Z)), MAT.pinkTrim());
      gable(b, -5, 5, 30, Z - 40, Z - 0.5, 9, P, P);
      for (const x of [-15, -9.5, -4.6, 4.6, 9.5, 15]) b.add(boxGeo(V(x - 0.7, 0, Z), V(x + 0.7, x === -15 || x === 15 ? 44 : 40, Z + 1.0)), MAT.pinkTrim()); // buttresses
      const rose = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), lam("dpRoseM", () => ({ map: roseTex() }))); rose.position.set(0, 21, Z + 0.05);
      b.add(rose.geometry.clone().translate(0, 21, Z + 0.05), lam("dpRoseM", () => ({ map: roseTex() })));
      for (const [x, w, h] of [[0, 4.2, 9], [-7, 3, 7], [7, 3, 7]] as const) {
        b.add(pointShape(w + 1.2, h + 1.0).translate(x, 0, Z + 0.03), MAT.pinkTrim());
        b.add(pointShape(w, h).translate(x, 0, Z + 0.06), DARK());
      }
      for (const x of [-12, -7, 7, 12]) b.add(pointShape(1.6, 6).translate(x, 12, Z + 0.05), lam("dpGlass", () => ({ color: "#2e3a6a" })));
      for (const x of [-12.5, -7.5]) b.add(pointShape(1.4, 7).translate(x + 2.5, 36, Z + 0.05), lam("dpGlass", () => ({ color: "#2e3a6a" })));
    }
    // the hitching rail of the horse market
    for (let x = RAIL[0] - 4; x <= RAIL[0] + 4; x += 2) b.add(boxGeo(V(x - 0.07, 0, RAIL[2] - 0.07), V(x + 0.07, 1.1, RAIL[2] + 0.07)), MAT.woodD());
    b.add(boxGeo(V(RAIL[0] - 4.2, 0.95, RAIL[2] - 0.06), V(RAIL[0] + 4.2, 1.07, RAIL[2] + 0.06)), MAT.wood());
    b.add(boxGeo(V(RAIL[0] - 2.5, 0, RAIL[2] - 1.2), V(RAIL[0] + 0.5, 0.55, RAIL[2] - 0.6)), MAT.woodD()); // water trough
    // the bread stall: a trestle table, an empty bread rack, a striped awning
    {
      const [sx, , sz] = STALL;
      b.add(boxGeo(V(sx - 1.4, 0.82, sz - 0.6), V(sx + 1.4, 0.9, sz + 0.6)), MAT.wood());
      for (const [ax, az] of [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]]) b.add(boxGeo(V(sx + ax - 0.05, 0, sz + az - 0.05), V(sx + ax + 0.05, 0.82, sz + az + 0.05)), MAT.woodD());
      for (const ax of [-1.45, 1.45]) b.add(boxGeo(V(sx + ax - 0.05, 0, sz - 0.75), V(sx + ax + 0.05, 2.4, sz - 0.65)), MAT.woodD());
      for (const y of [1.2, 1.65]) b.add(boxGeo(V(sx - 1.4, y, sz - 0.75), V(sx + 1.4, y + 0.05, sz - 0.4)), MAT.wood()); // empty shelves
      const aw = new THREE.PlaneGeometry(3.2, 1.6); aw.rotateX(-Math.PI / 2 + 0.45); aw.translate(sx, 2.35, sz - 0.1);
      b.add(aw, lam("dpAwningM", () => ({ map: awningTex(), side: THREE.DoubleSide })));
      b.add(boxGeo(V(sx - 0.9, 0.9, sz - 0.2), V(sx - 0.3, 1.02, sz + 0.25)), lam("dpBasket", () => ({ color: "#c49a5a" }))); // an empty basket
    }
    // the saint's column on the square
    {
      const [cx, , cz] = COLUMN;
      b.add(boxGeo(V(cx - 0.9, 0, cz - 0.9), V(cx + 0.9, 0.7, cz + 0.9)), MAT.grey());
      const col = new THREE.CylinderGeometry(0.32, 0.38, COL_H - 0.9, 16); col.translate(cx, 0.7 + (COL_H - 0.9) / 2, cz); b.add(col, MAT.grey());
      b.add(boxGeo(V(cx - 0.6, COL_H - 0.2, cz - 0.6), V(cx + 0.6, COL_H, cz + 0.6)), MAT.grey());
    }
    // the neighbours' bench against a house front
    b.add(boxGeo(V(BENCH[0] - 0.25, 0.42, BENCH[2] - 1.2), V(BENCH[0] + 0.25, 0.48, BENCH[2] + 1.2)), MAT.wood());
    for (const dz of [-1.0, 1.0]) b.add(boxGeo(V(BENCH[0] - 0.2, 0, BENCH[2] + dz - 0.05), V(BENCH[0] + 0.2, 0.42, BENCH[2] + dz + 0.05)), MAT.woodD());
    // a few trees and barrels
    for (const [x, z, h] of [[-13, 22, 8], [14, -38, 8.5], [21.5, 23, 7.5]] as const) prop(b, kit, "tree_oak", x + r(), 0, z + r(), h, r() * 6);
    for (let i = 0; i < 40; i++) { const x = (r() < 0.5 ? -1 : 1) * (14 + r() * 120), z = 60 + r() * 600; prop(b, kit, r() < 0.4 ? "tree_cone" : "tree_oak", x, 0, z, 7 + r() * 5, r() * 6); }
    for (const [x, z] of [[17, -16], [17.6, -15.2], [-15.6, -2]] as const) { const br = new THREE.CylinderGeometry(0.36, 0.36, 0.9, 14); br.translate(x, 0.45, z); b.add(br, MAT.wood()); }
    b.build(R);
    setSight([]);

    // ---- the wooden stage (built in shot 8, torn down in shot 10) ----
    {
      const [x, , z] = STAGE, add = (o: THREE.Object3D) => { shadowAll(o); R.add(o); this.stageParts.push({ o, base: o.position.clone(), seed: this.stageParts.length }); };
      const mk = (min: THREE.Vector3, max: THREE.Vector3, m: THREE.Material) => {
        const c = min.clone().add(max).multiplyScalar(0.5), g = boxGeo(min.clone().sub(c), max.clone().sub(c));
        const o = new THREE.Mesh(g, m); o.position.copy(c); return o;
      };
      for (const [sx, sz] of [[-3.3, -2.0], [3.3, -2.0], [-3.3, 2.0], [3.3, 2.0], [0, -2.0], [0, 2.0]]) add(mk(V(x + sx - 0.14, 0, z + sz - 0.14), V(x + sx + 0.14, DECK, z + sz + 0.14), MAT.woodD()));
      for (let i = 0; i < 7; i++) add(mk(V(x - 3.5 + i, DECK - 0.1, z - 2.25), V(x - 3.5 + i + 0.98, DECK, z + 2.25), MAT.pine()));
      add(mk(V(x - 3.5, 0.2, z + 2.2), V(x + 3.5, DECK - 0.1, z + 2.26), MAT.red()));      // front skirt
      for (let s = 0; s < 3; s++) add(mk(V(x - 1.0, 0, z + 2.26 + (2 - s) * 0.4), V(x + 1.0, (s + 1) * DECK / 4, z + 2.26 + (3 - s) * 0.4), MAT.wood())); // steps
      for (const sx of [-3.4, 3.4]) add(mk(V(x + sx - 0.07, DECK, z - 2.2), V(x + sx + 0.07, DECK + 2.6, z - 2.06), MAT.woodD())); // bunting poles
      // bunting: a string of little flags between the back poles
      const bun = new THREE.Group(); bun.position.set(x, DECK + 2.3, z - 2.13);
      const cols = ["#c0353a", "#e0b040", "#3f7ab5", "#3f8a52"];
      for (let i = 0; i < 11; i++) {
        const t = i / 10, fx = -3.3 + 6.6 * t, fy = -0.45 * (1 - (2 * t - 1) ** 2);
        const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([fx - 0.24, fy, 0, fx + 0.24, fy, 0, fx, fy - 0.5, 0], 3)); tri.computeVertexNormals();
        bun.add(new THREE.Mesh(tri, lam("dpBun" + (i % 4), () => ({ color: cols[i % 4], side: THREE.DoubleSide }))));
      }
      add(bun);
    }
    // ---- the guild hall doors + the clutter pushed out on "cleared" ----
    {
      const x1 = -14.5, hinge = (dz: number) => { const g = new THREE.Group(); g.position.set(x1 + 0.04, 0, GUILD[2] + dz); R.add(g); return g; };
      this.guildL = hinge(-1.45); this.guildR = hinge(1.45);
      const leaf = (g: THREE.Object3D, s: number) => { const m = new THREE.Mesh(boxGeo(V(0, 0, s > 0 ? -1.45 : 0), V(0.1, 3.45, s > 0 ? 0 : 1.45)), lam("dpDoor", () => ({ color: "#7a4a2a" }))); g.add(m); shadowAll(g); };
      leaf(this.guildL, -1); leaf(this.guildR, 1);
      const tab = new THREE.Group();
      tab.add(new THREE.Mesh(boxGeo(V(-0.4, 0.7, -0.9), V(0.4, 0.78, 0.9)), MAT.wood()));
      for (const [a, c] of [[-0.32, -0.8], [0.32, -0.8], [-0.32, 0.8], [0.32, 0.8]]) tab.add(new THREE.Mesh(boxGeo(V(a - 0.04, 0, c - 0.04), V(a + 0.04, 0.7, c + 0.04)), MAT.woodD()));
      const barrel = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.85, 14), MAT.wood()); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); m.position.y = 0.34; g.add(m); return g; };
      const bench = new THREE.Group(); bench.add(new THREE.Mesh(boxGeo(V(-0.2, 0.42, -0.9), V(0.2, 0.48, 0.9)), MAT.wood()));
      for (const c of [-0.75, 0.75]) bench.add(new THREE.Mesh(boxGeo(V(-0.16, 0, c - 0.05), V(0.16, 0.42, c + 0.05)), MAT.woodD()));
      for (const o of [tab, barrel(), bench, barrel()]) { shadowAll(o); R.add(o); this.clutter.push(o); }
    }
    // ---- Troffea's door ----
    { const g = new THREE.Group(); g.position.set(4.47, 0, -50.7); g.add(new THREE.Mesh(boxGeo(V(-0.06, 0, 0), V(0.0, 2.33, 1.4)), lam("dpDoorT", () => ({ color: "#3f6a8a" })))); shadowAll(g); R.add(g); this.trofDoor = g; }

    // ---- the hills and the shrine ----
    setSight(sightLines("hill"));
    const hb = new Batch();
    const hg = new THREE.PlaneGeometry(1000, 1000, 200, 200); hg.rotateX(-Math.PI / 2);
    const pos = hg.attributes.position as THREE.BufferAttribute, huv = hg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { pos.setY(i, hillH(pos.getX(i), pos.getZ(i))); huv.setXY(i, huv.getX(i) * 160, huv.getY(i) * 160); }
    hg.computeVertexNormals(); hg.translate(HILL[0], 0, HILL[2]);
    hb.add(hg, lam("dpHillGrass", () => ({ map: grassHD(), color: "#e4f0c8" })));
    // the road: a ribbon over the terrain
    {
      const N = 120, P: number[] = [], U: number[] = [], I: number[] = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, a = roadAt(u), c = roadAt(Math.min(1, u + 0.004)), d = roadAt(Math.max(0, u - 0.004));
        const tx = c[0] - d[0], tz = c[2] - d[2], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
        for (const s of [-1.6, 1.6]) { const x = a[0] + nx * s, z = a[2] + nz * s; P.push(x, hillH(x - HILL[0], z - HILL[2]) + 0.06, z); U.push(s < 0 ? 0 : 1, u * 30); }
        if (i < N) I.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
      hb.add(g, lam("dpRoadM", () => ({ map: roadTex() })));
    }
    // the shrine chapel: a small stone nave on the rise, bell gable over the door, the saint on a plinth by the door
    {
      const [x, y, z] = SHRINE, G = MAT.grey();
      hb.add(boxGeo(V(x - 3.2, y - 1.5, z - 10), V(x + 3.2, y + 5.5, z - 0.6), 4), G);
      gable(hb, x - 3.2, x + 3.2, y + 5.5, z - 10, z - 0.6, 3.2, lam("roof#a8584a", () => ({ map: roofHD("#a8584a"), side: THREE.DoubleSide })), G);
      hb.add(boxGeo(V(x - 0.9, y + 8.4, z - 1.0), V(x + 0.9, y + 10.6, z - 0.4)), G); // bell gable
      hb.add(archShape(0.9, 1.4).translate(x, y + 8.8, z - 0.38), DARK());
      const bell = new THREE.CylinderGeometry(0.18, 0.32, 0.5, 14); bell.translate(x, y + 9.2, z - 0.7); hb.add(bell, MAT.gold());
      hb.add(archShape(2.0, 3.0).translate(x, y, z - 0.57), MAT.stone());
      hb.add(archShape(1.6, 2.7).translate(x, y, z - 0.54), lam("dpShrineDoor", () => ({ color: "#8c3b2a" })));
      hb.add(boxGeo(V(x - 1.6, y - 0.6, z - 0.6), V(x + 1.6, y + 0.12, z + 0.4)), MAT.stone());   // the step
      hb.add(boxGeo(V(x - 2.9, y - 0.6, z - 0.4), V(x - 1.9, y + 0.9, z + 0.6)), G);              // the saint's plinth
      for (const sx of [-1, 1]) hb.add(archShape(0.6, 1.4).rotateY(sx * Math.PI / 2).translate(x + sx * 3.22, y + 2.6, z - 5), lam("dpGlass", () => ({ color: "#2e3a6a" })));
      // a low stone wall round the yard
      for (const [x0, z0, x1, z1] of [[-7, 2.5, -2, 2.5], [2, 2.5, 7, 2.5], [-7, 2.5, -7, -11], [7, 2.5, 7, -11]] as const) {
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 1.2);
        for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, wx = x0 + (x1 - x0) * u, wz = z0 + (z1 - z0) * u, wy = hillH(wx, wz - 40);
          hb.add(boxGeo(V(x + wx - 0.62, wy - 0.4, z + wz - 0.62 + 40 - 40), V(x + wx + 0.62, wy + 0.75, z + wz + 0.62)), G); }
      }
    }
    // September trees on the hills
    const hr = rng(7);
    for (let i = 0; i < 70; i++) {
      const a = hr() * Math.PI * 2, d = 16 + hr() * 160, lx = Math.cos(a) * d, lz = -40 + Math.sin(a) * d;
      if (Math.min(...ROAD.map(([rx, rz]) => Math.hypot(rx - lx, rz - lz))) < 6) continue;
      prop(hb, kit, hr() < 0.3 ? "tree_cone" : "tree_oak", HILL[0] + lx, hillH(lx, lz) - 0.2, HILL[2] + lz, 6 + hr() * 5, hr() * 6);
    }
    hb.build(R);
    setSight([]);
    // the wagon (moves along the road)
    {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(boxGeo(V(-0.8, 0.75, -1.4), V(0.8, 0.85, 1.4)), MAT.wood()));
      for (const s of [-1, 1]) w.add(new THREE.Mesh(boxGeo(V(s * 0.8 - 0.05, 0.85, -1.4), V(s * 0.8 + 0.05, 1.3, 1.4)), MAT.woodD()));
      w.add(new THREE.Mesh(boxGeo(V(-0.8, 0.85, -1.45), V(0.8, 1.3, -1.35)), MAT.woodD()));
      for (const s of [-0.35, 0.35]) w.add(new THREE.Mesh(boxGeo(V(s - 0.04, 0.6, 1.4), V(s + 0.04, 0.68, 3.4)), MAT.woodD())); // shafts
      for (const [sx, sz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 18), MAT.woodD()); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.5, sz);
        w.add(wh); this.wheels.push(wh);
      }
      shadowAll(w); R.add(w); this.wagon = w;
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
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig (shot 4 time-lapses day -> moonlit night three times) ----
    const nt = nightAt(id, f), L = LIGHTS[s.light], N = LIGHTS.moon;
    const K = LOOK[s.light], KN = LOOK.moon, sunDir = this.shotSun(id, s, L);
    const mixN = (a: number[], b2: number[]) => a.map((v, i) => v + (b2[i] - v) * nt) as [number, number, number];
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol).lerp(new THREE.Color(N.sunCol), nt); this.sun.intensity = L.sunI + (N.sunI - L.sunI) * nt;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 12, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...mixN(L.lit, N.lit)); TONE.uShadeCol.value.set(...mixN(L.shade, N.shade)); TONE.uShadeLift.value.set(...mixN(L.lift, N.lift));
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...mixN(L.charTint, N.charTint)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds, moon ----
    const su = this.skyMat.uniforms, tmpC = new THREE.Color();
    K.sky.c.forEach((h, i) => { untone(h, su["c" + i].value); if (nt > 0) su["c" + i].value.lerp(untone(KN.sky.c[i], tmpC), nt); });
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); if (nt > 0) this.fog.color.lerp(untone(N.fog, tmpC), nt);
    this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    for (const m of this.clouds) {
      const i = m.userData.k as number, near = i >= 7, a = ((i % 7) / 7) * Math.PI * 2 + (near ? 0.65 : 0.3), d = near ? 300 + (i % 3) * 40 : 600 + (i % 3) * 60, w = (near ? 80 : 130) + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 4, (near ? 95 : 120) + (i % 4) * 34, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); m.visible = s.light !== "moon" && nt < 0.5;
    }
    const moonUp = s.light === "moon" || nt > 0.5;
    this.moon.visible = moonUp;
    if (moonUp) {
      const fw = V(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize();
      const rt = V(-fw.z, 0, fw.x);
      this.moon.position.copy(cam.position).addScaledVector(fw, 600).addScaledVector(rt, -90).add(V(0, 230, 0));
      this.moon.scale.setScalar(16); this.moon.lookAt(cam.position);
    }
    // ---- the set pieces by shot ----
    const st = stageAt(id, f);
    this.stageParts.forEach((p, i) => {
      const n = this.stageParts.length;
      let k = 0, fly = 0;
      if (id === 10 && f >= 1231) { fly = clamp01((f - 1231 - (i % 6) * 1.5) / 14); k = fly < 1 ? 1 : 0; }
      else k = clamp01(st * n * 1.0 - i * 0.85);
      p.o.visible = k > 0.02 && s.place === "town";
      p.o.position.copy(p.base);
      p.o.rotation.set(0, 0, 0);
      if (fly > 0) {
        const sd = Math.sin(p.seed * 12.9898) * 43758.5453, rr = sd - Math.floor(sd);
        p.o.position.x += (rr - 0.5) * 7 * fly; p.o.position.y += 4.5 * Math.sin(Math.PI * Math.min(1, fly * 1.2)) * (0.6 + rr); p.o.position.z += 3 * fly * (0.4 + rr);
        p.o.rotation.set(fly * (rr * 5 - 2.5), fly * rr * 3, fly * (2 - rr * 4));
      } else if (k < 1) p.o.position.y += 2.2 * (1 - smooth(k)); // planks drop in from above
    });
    const dr = doorsAt(id, f);
    this.guildL.rotation.y = 1.9 * dr; this.guildR.rotation.y = -1.9 * dr;
    this.clutter.forEach((o, i) => {
      const u = id === 8 ? smooth((f - CLEAR - i * 3) / 14) : id >= 9 ? 1 : 0;
      o.visible = id >= 8 && id <= 10 && u > 0;
      o.position.set(-15.6 + 5.2 * u + (i % 2) * 0.6, 0, GUILD[2] - 1.0 + i * 0.7);
      o.rotation.set(0, (1 - u) * 0.6 + i * 0.4, 0);
      if (i === 1 || i === 3) o.rotation.z = u * 4 * (i === 1 ? 1 : -1) * 0; // barrels slide
    });
    this.trofDoor.rotation.y = id === 3 ? -1.6 * smooth((f - (STEP_OUT - 10)) / 10) : id === 4 || id === 5 ? -1.6 : 0;
    const wp = wagonPose(id, f);
    this.wagon.visible = s.place === "hill";
    this.wagon.position.set(...wp.p); this.wagon.rotation.set(0, wp.yaw, 0);
    this.wheels.forEach((w) => { w.rotation.x = -wp.u * 120; });
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
