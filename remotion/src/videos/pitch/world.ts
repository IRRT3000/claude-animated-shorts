// "The Drop Nobody Has Ever Seen" as one three.js scene: a sandstone university quad under a subtropical sky (the hook),
// the physics lab with the pitch-drop experiment (cabinet, tripod, funnel of pitch, beaker, bell jar), Parnell's bench,
// Mainstone's chair, and a small prize stage far away. update(id, f, camera) poses everything for shot `id` at frame f
// (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, setSight, prop, Ray, Kit } from "./build";
import { ctex, cloudHD, grassHD, planksHD, stoneHD, roofHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, LAB, APP, CAB_H, TIP_Y, BEAKER_Y, CHAIR, BENCH, BLOCK, DOOR, TRIPOD, WATER, HONEY, STAGE, STAGE_H,
  camAt, fillAt, jarOn, jarLift, pileAt, pileTop, dropAt, wobbleAt, windowLight, calendarAt, clockMin, POWER_OFF, lightningAt,
  SHATTER, POUR, V3,
} from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: trees are drawn by build.ts
void LFB;

/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 120, el: 40 } };

/** every lens position of the film looking at its subject (trees there are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

// ---------------- paintings ----------------
/** sandstone facade: coursed warm blocks, round-arched windows with cream frames, a cornice band (tile w x h metres) */
const sandstoneTex = (key: string, w: number, h: number, bays: number, floors: number) => ctex(key, 1024, Math.round(1024 * h / w), (g, r) => {
  const W = 1024, Hh = Math.round(1024 * h / w), px = W / w;
  g.fillStyle = "#dcae74"; g.fillRect(0, 0, W, Hh);
  for (let y = 0; y < Hh; y += 0.45 * px) for (let x = -((y / px) % 2) * 0.5 * px; x < W; x += 1.1 * px) {
    g.fillStyle = ["#e2b77e", "#d6a66c", "#e8c08a", "#d0a068"][Math.floor(r() * 4)]; g.fillRect(x + 2, y + 2, 1.1 * px - 4, 0.45 * px - 4);
  }
  g.fillStyle = "#f0dcb4"; g.fillRect(0, 0, W, 0.5 * px); g.fillRect(0, Hh - 0.35 * px, W, 0.35 * px);
  const bw = W / bays;
  for (let fl = 0; fl < floors; fl++) for (let i = 0; i < bays; i++) {
    const cx = (i + 0.5) * bw, top = (0.9 + fl * (h - 1.2) / floors) * px, ww = Math.min(1.3 * px, bw * 0.45), wh = ((h - 1.2) / floors - 1.1) * px;
    g.fillStyle = "#f0dcb4"; g.beginPath(); g.moveTo(cx - ww / 2 - 10, top + wh + 10); g.lineTo(cx - ww / 2 - 10, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2 + 10, Math.PI, 0); g.lineTo(cx + ww / 2 + 10, top + wh + 10); g.fill();
    g.fillStyle = "#3c4a66"; g.beginPath(); g.moveTo(cx - ww / 2, top + wh); g.lineTo(cx - ww / 2, top + ww / 2); g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, top + wh); g.fill();
    g.fillStyle = "#6c7fa6"; g.fillRect(cx - ww / 2 + 6, top + ww / 2, ww * 0.18, wh - ww / 2 - 6);
    g.strokeStyle = "#f0dcb4"; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, top + 4); g.lineTo(cx, top + wh); g.moveTo(cx - ww / 2, top + wh * 0.55); g.lineTo(cx + ww / 2, top + wh * 0.55); g.stroke();
    g.fillStyle = "#c79a60"; g.fillRect(cx - ww / 2 - 16, top + wh + 8, ww + 32, 14);
  }
});
/** lab wall: cream plaster over a dark wood wainscot (1.1 m), on a 4.2 m tall wall */
const labWallTex = () => ctex("pdLabWall", 512, 512, (g) => {
  g.fillStyle = "#eadfc6"; g.fillRect(0, 0, 512, 512);
  const y0 = 512 * (1 - 1.1 / 4.2);
  g.fillStyle = "#6a4a32"; g.fillRect(0, y0, 512, 512 - y0);
  g.fillStyle = "#58392a"; for (let x = 8; x < 512; x += 64) g.fillRect(x, y0 + 14, 50, 512 - y0 - 28);
  g.fillStyle = "#8a6444"; g.fillRect(0, y0 - 8, 512, 12);
});
/** blackboard: dark green slate with chalk sketches (a funnel, a drop, curves; no writing) */
const boardTex = () => ctex("pdBoard", 512, 320, (g) => {
  g.fillStyle = "#2f4a3c"; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(240,240,230,0.85)"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(70, 60); g.lineTo(170, 60); g.lineTo(130, 150); g.lineTo(130, 190); g.moveTo(110, 150); g.lineTo(110, 190); g.lineTo(70, 60); g.stroke();
  g.beginPath(); g.arc(120, 225, 14, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(240, 250); for (let x = 0; x <= 200; x += 10) g.lineTo(240 + x, 250 - 160 * (1 - Math.exp(-x / 60))); g.stroke();
  g.beginPath(); g.moveTo(240, 90); g.lineTo(240, 250); g.lineTo(450, 250); g.stroke();
  for (const [x, y] of [[300, 60], [360, 80], [420, 50]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke(); }
});
const dialTex = () => ctex("pdDial", 256, 256, (g) => {
  g.fillStyle = "#f6ecd2"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.lineWidth = i % 3 ? 5 : 10; g.beginPath(); g.moveTo(128 + 92 * Math.sin(a), 128 - 92 * Math.cos(a)); g.lineTo(128 + 110 * Math.sin(a), 128 - 110 * Math.cos(a)); g.stroke(); }
});
/** calendar: cream page, red band, empty day grid (no numerals) */
const calTex = () => ctex("pdCal", 256, 320, (g) => {
  g.fillStyle = "#6a4a32"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#f6efdc"; g.fillRect(14, 14, 228, 292);
  g.fillStyle = "#c0353a"; g.fillRect(14, 14, 228, 64);
  g.strokeStyle = "#b8ab90"; g.lineWidth = 4;
  for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(14 + (228 / 7) * i, 90); g.lineTo(14 + (228 / 7) * i, 300); g.stroke(); }
  for (let j = 1; j < 6; j++) { g.beginPath(); g.moveTo(20, 90 + 42 * j); g.lineTo(236, 90 + 42 * j); g.stroke(); }
});
/** curtain folds: vertical red ramps */
const curtainTex = () => ctex("pdCurtain", 512, 512, (g) => {
  for (let x = 0; x < 512; x++) { const k = 0.5 + 0.5 * Math.cos((x / 512) * Math.PI * 2 * 8); g.fillStyle = `rgb(${Math.round(120 + 70 * k)},${Math.round(20 + 18 * k)},${Math.round(36 + 20 * k)})`; g.fillRect(x, 0, 1, 512); }
  g.fillStyle = "#d6a842"; g.fillRect(0, 470, 512, 14);
});
/** glass: nearly clear with two soft vertical highlights so it reads */
const glassTex = () => ctex("pdGlass", 256, 64, (g) => {
  g.clearRect(0, 0, 256, 64);
  const gr = g.createLinearGradient(0, 0, 256, 0);
  for (const [u, a] of [[0, 0.05], [0.13, 0.03], [0.16, 0.42], [0.185, 0.03], [0.3, 0.015], [0.63, 0.015], [0.655, 0.22], [0.675, 0.015], [1, 0.05]] as const) gr.addColorStop(u, `rgba(255,255,255,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
});
/** cabinet front: dark wood with two drawers and brass pulls */
const cabTex = () => ctex("pdCab", 512, 288, (g) => {
  g.fillStyle = "#5a3826"; g.fillRect(0, 0, 512, 288);
  g.strokeStyle = "#2e1c14"; g.lineWidth = 8;
  for (const [x, y, w, h] of [[16, 16, 480, 70], [16, 100, 232, 172], [264, 100, 232, 172]]) g.strokeRect(x, y, w, h);
  g.fillStyle = "#c99a3a"; for (const [x, y] of [[256, 50], [230, 186], [282, 186]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
});

const MAT = {
  wood: () => lam("pdWood", () => ({ color: "#7a4a2e" })), woodD: () => lam("pdWoodD", () => ({ color: "#4e2f1e" })),
  brass: () => lam("pdBrass", () => ({ color: "#c99a3a" })), pitch: () => lam("pdPitch", () => ({ color: "#232028" })),
  iron: () => lam("pdIron", () => ({ color: "#4a4a52" })), cream: () => lam("pdCream", () => ({ color: "#efe6d0" })),
};
const glassMat = (o = 1) => new THREE.MeshBasicMaterial({ map: glassTex(), color: new THREE.Color(o, o, o), transparent: true, depthWrite: false, side: THREE.FrontSide, fog: false });
const noShadow = (o: THREE.Object3D) => o.traverse((m) => { (m as THREE.Mesh).castShadow = false; });
const shadowAll = (o: THREE.Object3D) => o.traverse((m) => { const x = m as THREE.Mesh; if (x.isMesh && !x.layers.isEnabled(NOINK)) { x.castShadow = true; x.receiveShadow = true; } });

type Rig = {
  root: THREE.Group; base: THREE.Group; pitchCone: THREE.Mesh; neck: THREE.Mesh; bulb: THREE.Mesh; falling: THREE.Mesh;
  pile: THREE.Mesh; jar: THREE.Group;
};
/** the experiment on its cabinet; local origin = foot of the cabinet */
const apparatus = (): Rig => {
  const R = new THREE.Group(), base = new THREE.Group();
  const b = new Batch();
  b.add(boxGeo(V(-0.85, 0, -0.3), V(0.85, CAB_H - 0.03, 0.3)), MAT.woodD());
  b.add(boxGeo(V(-0.88, CAB_H - 0.03, -0.33), V(0.88, CAB_H, 0.33)), MAT.wood());
  b.build(R);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.7, CAB_H - 0.05), lam("pdCabFront", () => ({ map: cabTex() })));
  front.position.set(0, (CAB_H - 0.05) / 2 + 0.02, 0.301); front.receiveShadow = true; R.add(front);
  // the wobbling part: wooden base, tripod, funnel, beaker, bell jar
  base.position.set(0, CAB_H, 0); R.add(base);
  const y = (v: number) => v - CAB_H;
  const bb = new Batch();
  bb.add(boxGeo(V(-0.34, 0, -0.26), V(0.34, 0.045, 0.26)), MAT.wood());
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5, x = 0.2 * Math.cos(a), z = 0.2 * Math.sin(a) * 0.8;
    const leg = new THREE.CylinderGeometry(0.008, 0.008, 1, 6); const top = V(0.13 * Math.cos(a), y(1.47), 0.13 * Math.sin(a)), bot = V(x, 0.045, z);
    const mid = top.clone().add(bot).multiplyScalar(0.5), len = top.distanceTo(bot);
    leg.scale(1, len, 1); leg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), top.clone().sub(bot).normalize())));
    leg.translate(mid.x, mid.y, mid.z); bb.add(leg, MAT.brass());
  }
  const ring = new THREE.TorusGeometry(0.135, 0.01, 6, 32); ring.rotateX(Math.PI / 2); ring.translate(0, y(1.47), 0); bb.add(ring, MAT.brass());
  bb.build(base);
  // funnel: glass cone + stem; the pitch inside (scaled by fill)
  const fprof = [V(0.013, y(TIP_Y), 0), V(0.013, y(1.4), 0), V(0.03, y(1.43), 0), V(0.17, y(1.66), 0), V(0.175, y(1.67), 0)].map((v) => new THREE.Vector2(v.x, v.y));
  const funnel = new THREE.Mesh(new THREE.LatheGeometry(fprof, 32), glassMat(1.0)); funnel.layers.set(NOINK); base.add(funnel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.006, 6, 32), lam("pdGlassRim", () => ({ color: "#d8e4ea" }))); rim.rotation.x = Math.PI / 2; rim.position.y = y(1.67); base.add(rim);
  const pc = new THREE.LatheGeometry([new THREE.Vector2(0.011, 0), new THREE.Vector2(0.011, 0.1), new THREE.Vector2(0.027, 0.13), new THREE.Vector2(0.155, 0.335), new THREE.Vector2(0, 0.345)], 32);
  const pitchCone = new THREE.Mesh(pc, MAT.pitch()); pitchCone.position.y = y(TIP_Y); base.add(pitchCone);
  // the hanging drop: neck + bulb; the falling drop; the pile in the beaker
  const neckG = new THREE.CylinderGeometry(0.011, 0.02, 1, 16, 1, true); neckG.translate(0, -0.5, 0);
  const neck = new THREE.Mesh(neckG, MAT.pitch()); neck.position.y = y(TIP_Y); base.add(neck);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), MAT.pitch()); base.add(bulb);
  const falling = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), MAT.pitch()); falling.scale.set(1, 1.4, 1); base.add(falling);
  const pileG = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const pile = new THREE.Mesh(pileG, MAT.pitch()); pile.position.y = y(BEAKER_Y); base.add(pile);
  const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 32, 1, true), glassMat(1.0)); beaker.position.y = y(BEAKER_Y + 0.115); beaker.layers.set(NOINK); base.add(beaker);
  const bfoot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 32), lam("pdGlassFoot", () => ({ color: "#8e9aa4" }))); bfoot.position.y = y(BEAKER_Y - 0.004); base.add(bfoot);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.005, 6, 32), lam("pdGlassRim", () => ({ color: "#d8e4ea" }))); brim.rotation.x = Math.PI / 2; brim.position.y = y(BEAKER_Y + 0.24); base.add(brim);
  // the bell jar over everything
  const jar = new THREE.Group(); base.add(jar);
  const jprof: THREE.Vector2[] = [new THREE.Vector2(0.3, 0.045)];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; jprof.push(new THREE.Vector2(0.3 * Math.cos(a), y(1.62) + 0.3 * 0.9 * Math.sin(a))); }
  const jm = new THREE.Mesh(new THREE.LatheGeometry(jprof, 40), glassMat(1.0)); jm.layers.set(NOINK); jar.add(jm);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), lam("pdGlassRim", () => ({ color: "#d8e4ea" }))); knob.position.y = y(1.62) + 0.29; jar.add(knob);
  const jrim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 40), lam("pdGlassRim", () => ({ color: "#d8e4ea" }))); jrim.rotation.x = Math.PI / 2; jrim.position.y = 0.05; jar.add(jrim);
  shadowAll(R); noShadow(jar);
  return { root: R, base, pitchCone, neck, bulb, falling, pile, jar };
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
  private rig: Rig;
  private windows: THREE.MeshBasicMaterial; private lamps: THREE.MeshBasicMaterial; private spot: THREE.MeshBasicMaterial;
  private clockMin = new THREE.Group(); private clockHr = new THREE.Group();
  private only: Record<string, THREE.Object3D> = {};
  private block: THREE.Object3D; private pieces: THREE.Object3D;
  private pot = new THREE.Group(); private rec: THREE.MeshBasicMaterial;
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
    void kit;

    // ---- the quad ----
    setSight(sightLines());
    const r = rng(7);
    const b = new Batch();
    const gr = grassHD(); void gr;
    const ground = new THREE.PlaneGeometry(800, 800); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 120, uv.getY(i) * 120);
    b.add(ground, lam("pdLawn", () => ({ map: grassHD() })));
    const path = lam("pdPath", () => ({ map: stoneHD("pdPathStone", ["#e6d6b8", "#dccaa8", "#eadcc0", "#d6c4a2"], "#b8a684") }));
    b.add(boxGeo(V(-3, 0, -19), V(3, 0.05, 60)), path); b.add(boxGeo(V(-40, 0, -18.5), V(40, 0.05, -14)), path);
    b.add(boxGeo(V(-40, 0, 6), V(40, 0.05, 9)), path);
    // the sandstone building: long wings, a central tower, a cloister arcade in front
    const wing = lam("pdWing", () => ({ map: sandstoneTex("pdWingTex", 26, 12, 9, 2) })), side = lam("pdSide", () => ({ color: "#d6a66c" }));
    const tower = lam("pdTower", () => ({ map: sandstoneTex("pdTowerTex", 10, 24, 2, 4) }));
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -31 : 5, x1 = sx < 0 ? -5 : 31;
      b.add(boxGeo(V(x0, 0, -30), V(x1, 12, -20.3)), side);
      const fq = new THREE.PlaneGeometry(26, 12); fq.translate((x0 + x1) / 2, 6, -20.29); b.add(fq, wing);
      const rf = new THREE.CylinderGeometry(0.01, 6.5, 3.6, 4, 1); rf.rotateY(Math.PI / 4); rf.scale(26 / 9.2, 1, 9.7 / 9.2); rf.translate((x0 + x1) / 2, 13.8, -25.15);
      b.add(rf, lam("pdRoof", () => ({ map: roofHD("#b65a3a") })));
    }
    b.add(boxGeo(V(-5, 0, -31), V(5, 24, -19.6)), side);
    const tq = new THREE.PlaneGeometry(10, 24); tq.translate(0, 12, -19.59); b.add(tq, tower);
    const tr = new THREE.ConeGeometry(7.6, 5, 4, 1); tr.rotateY(Math.PI / 4); tr.translate(0, 26.5, -25.3); b.add(tr, lam("pdRoof", () => ({ map: roofHD("#b65a3a") })));
    b.add(boxGeo(V(-5.4, 23.6, -31.4), V(5.4, 24.2, -19.2)), lam("pdCornice", () => ({ color: "#f0dcb4" })));
    for (const sx of [-1, 1]) b.add(boxGeo(V(sx < 0 ? -31.4 : 4.6, 11.6, -30.4), V(sx < 0 ? -4.6 : 31.4, 12.2, -19.9)), lam("pdCornice", () => ({ color: "#f0dcb4" })));
    const col = lam("pdCol", () => ({ color: "#ecd2a4" }));
    for (let x = -28.5; x <= 28.5; x += 3) {
      if (Math.abs(x) < 4.6) continue;
      const c = new THREE.CylinderGeometry(0.28, 0.32, 4.2, 14); c.translate(x, 2.1, -16.6); b.add(c, col);
    }
    b.add(boxGeo(V(-29.2, 4.2, -17.1), V(-4.6, 5.0, -16.1)), col); b.add(boxGeo(V(4.6, 4.2, -17.1), V(29.2, 5.0, -16.1)), col);
    b.add(boxGeo(V(-29.2, 5.0, -20.3), V(-4.6, 5.25, -16.0)), side); b.add(boxGeo(V(4.6, 5.0, -20.3), V(29.2, 5.25, -16.0)), side);
    // jacarandas and shade trees around the lawn
    for (const [x, z, h] of [[-14, -6, 9], [14, -7, 10], [-24, 2, 9.5], [23, 3, 9], [-9, 16, 8.5], [11, 18, 9]] as const) prop(b, kit, "jacaranda", x + r(), 0, z + r(), h, r() * 6);
    for (const [x, z, h] of [[-36, -8, 11], [36, -9, 12], [-42, 14, 10], [40, 16, 11]] as const) prop(b, kit, "tree_oak", x, 0, z, h, r() * 6);
    b.build(R);
    setSight([]);

    // ---- the lab (walls cast no shadow: lit as if by its tall windows) ----
    const L = (x: number, y: number, z: number) => V(LAB[0] + x, LAB[1] + y, LAB[2] + z);
    const lb = new Batch();
    lb.add(boxGeo(L(-6, -0.1, -4), L(6, 0.02, 6)), lam("pdLabFloor", () => ({ map: planksHD(), color: "#b8865a" })));
    const wallM = lam("pdLabWallM", () => ({ map: labWallTex() }));
    lb.add(boxGeo(L(-6, 0, -4.2), L(6, 4.2, -4)), wallM); lb.add(boxGeo(L(-6.2, 0, -4), L(-6, 4.2, 6)), wallM);
    lb.add(boxGeo(L(6, 0, -4), L(6.2, 4.2, 6)), wallM); lb.add(boxGeo(L(-6, 0, 6), L(6, 4.2, 6.2)), wallM);
    lb.add(boxGeo(L(-6.2, 4.2, -4.2), L(6.2, 4.4, 6.2)), lam("pdCeil", () => ({ color: "#f2ead8" })));
    lb.add(boxGeo(L(-6, 3.95, -4.02), L(6, 4.2, -3.9)), lam("pdCove", () => ({ color: "#d9cdb0" })));
    // blackboard, bookcase, the bench, the chair, the door
    lb.add(boxGeo(L(-5.3, 1.25, -4.0), L(-2.9, 2.65, -3.94)), MAT.woodD());
    lb.add(boxGeo(L(-5.3, 1.18, -3.98), L(-2.9, 1.25, -3.86)), MAT.wood());
    lb.add(boxGeo(L(3.6, 0, -3.95), L(5.6, 2.6, -3.5)), MAT.woodD());
    for (let k = 0; k < 4; k++) lb.add(boxGeo(L(3.65, 0.25 + 0.6 * k, -3.9), L(5.55, 0.29 + 0.6 * k, -3.52)), MAT.wood());
    const bookC = ["#8e2f3a", "#2f5f6a", "#c99a3a", "#3f6fb5", "#5d7a3a", "#6a4a32"];
    for (let k = 0; k < 4; k++) for (let x = 3.7; x < 5.5;) { const w = 0.05 + r() * 0.05, h = 0.3 + r() * 0.18; lb.add(boxGeo(L(x, 0.29 + 0.6 * k, -3.88), L(x + w, 0.29 + 0.6 * k + h, -3.6)), lam("pdBook" + (k * 7 + Math.floor(x * 10)) % 6, () => ({ color: bookC[(k * 7 + Math.floor(x * 10)) % 6] }))); x += w + 0.01; }
    const BX = BENCH[0] - LAB[0], BZ = BENCH[2] - LAB[2];
    lb.add(boxGeo(L(BX - 1.1, 0.84, BZ - 0.4), L(BX + 1.1, 0.9, BZ + 0.4)), MAT.wood());
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lb.add(boxGeo(L(BX + sx * 1.02 - 0.04, 0, BZ + sz * 0.33 - 0.04), L(BX + sx * 1.02 + 0.04, 0.84, BZ + sz * 0.33 + 0.04)), MAT.woodD());
    lb.add(boxGeo(L(BX - 1.0, 0.18, BZ - 0.32), L(BX + 1.0, 0.22, BZ + 0.32)), MAT.woodD());
    for (const [x, h, c] of [[-0.75, 0.22, "#5bab6a"], [-0.6, 0.3, "#d9536f"], [0.75, 0.18, "#4a8fd0"]] as const) {
      const fl = new THREE.CylinderGeometry(0.05, 0.07, h, 14); fl.translate(BENCH[0] + x, 0.9 + h / 2, BENCH[2] - 0.15); lb.add(fl, lam("pdFlask" + c, () => ({ color: c })));
    }
    const burner = new THREE.CylinderGeometry(0.03, 0.06, 0.2, 12); burner.translate(BENCH[0] - 0.35, 1.0, BENCH[2] + 0.05); lb.add(burner, MAT.brass());
    const CX = CHAIR[0] - LAB[0], CZ = CHAIR[2] - LAB[2];
    lb.add(boxGeo(L(CX - 0.24, 0.42, CZ - 0.22), L(CX + 0.24, 0.47, CZ + 0.22)), MAT.wood());
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lb.add(boxGeo(L(CX + sx * 0.2 - 0.025, 0, CZ + sz * 0.18 - 0.025), L(CX + sx * 0.2 + 0.025, 0.42, CZ + sz * 0.18 + 0.025)), MAT.woodD());
    lb.add(boxGeo(L(CX - 0.24, 0.47, CZ - 0.24), L(CX + 0.24, 1.0, CZ - 0.19)), MAT.wood());
    const DX = DOOR[0] - LAB[0];
    lb.add(boxGeo(L(DX - 0.52, 0, -3.96), L(DX - 0.42, 2.3, -3.86)), MAT.woodD()); lb.add(boxGeo(L(DX + 0.42, 0, -3.96), L(DX + 0.52, 2.3, -3.86)), MAT.woodD());
    lb.add(boxGeo(L(DX - 0.52, 2.2, -3.96), L(DX + 0.52, 2.36, -3.86)), MAT.woodD());
    lb.add(boxGeo(L(DX - 0.42, 0, -3.97), L(DX + 0.42, 2.2, -3.95)), lam("pdCorridor", () => ({ color: "#3a3040" })));
    lb.build(R, false);
    const leaf = new THREE.Mesh(boxGeo(V(0, 0, 0), V(0.82, 2.18, 0.05)), lam("pdDoor", () => ({ color: "#8a5a34" })));
    leaf.position.copy(L(DX + 0.41, 0, -3.93)); leaf.rotation.y = -2.0; R.add(leaf);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), lam("pdBoardM", () => ({ map: boardTex() }))); board.position.copy(L(-4.1, 1.95, -3.935)); board.receiveShadow = true; R.add(board);
    // windows (emissive, driven by the time of day) with mullions
    this.windows = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6) });
    for (const x of [-1.7, 1.9]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), this.windows); w.position.copy(L(x, 2.45, -3.94)); R.add(w);
      const wb = new Batch(), fr = MAT.cream();
      wb.add(boxGeo(L(x - 0.68, 1.22, -3.98), L(x + 0.68, 1.3, -3.84)), fr); wb.add(boxGeo(L(x - 0.68, 3.6, -3.98), L(x + 0.68, 3.68, -3.86)), fr);
      wb.add(boxGeo(L(x - 0.68, 1.3, -3.98), L(x - 0.6, 3.6, -3.86)), fr); wb.add(boxGeo(L(x + 0.6, 1.3, -3.98), L(x + 0.68, 3.6, -3.86)), fr);
      wb.add(boxGeo(L(x - 0.025, 1.3, -3.95), L(x + 0.025, 3.6, -3.9)), fr);
      for (let yy = 2.05; yy < 3.6; yy += 0.75) wb.add(boxGeo(L(x - 0.6, yy, -3.95), L(x + 0.6, yy + 0.04, -3.9)), fr);
      wb.build(R, false);
    }
    // two hanging lamps (bright at night until the power cut)
    this.lamps = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });
    for (const [x, z] of [[-1.5, 0.2], [1.8, 0.4]]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 6), MAT.iron()); cord.position.copy(L(x, 3.7, z)); R.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 20, 1, true), lam("pdLampShade", () => ({ color: "#3f6a4a", side: THREE.DoubleSide }))); shade.position.copy(L(x, 3.12, z)); R.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), this.lamps); bulb.position.copy(L(x, 3.02, z)); bulb.layers.set(NOINK); R.add(bulb);
    }
    // wall clock and calendar on the back wall
    const clock = new THREE.Group(); clock.position.copy(L(0.95, 3.05, -3.93)); R.add(clock);
    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 32), MAT.woodD()); cb.rotation.x = Math.PI / 2; clock.add(cb);
    const cf = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), lam("pdDialM", () => ({ map: dialTex() }))); cf.position.z = 0.03; clock.add(cf);
    const hand = (g: THREE.Group, len: number, w: number) => { const m = new THREE.Mesh(boxGeo(V(-w / 2, -0.02, 0), V(w / 2, len, 0.006)), lam("pdHand", () => ({ color: "#241726" }))); g.add(m); g.position.z = 0.035; clock.add(g); };
    hand(this.clockMin, 0.18, 0.018); hand(this.clockHr, 0.12, 0.026);
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), lam("pdCalM", () => ({ map: calTex() }))); cal.position.copy(L(-1.05 + 0.0, 2.95, -3.935)); cal.position.x = LAB[0] + 0.0 - 0.15; cal.position.y = 2.35; R.add(cal);
    cal.position.set(APP[0] - 0.62, 2.25, LAB[2] - 3.935);

    // ---- the experiment ----
    this.rig = apparatus(); this.rig.root.position.set(...APP); R.add(this.rig.root);
    // the lump of pitch on the bench, its broken pieces, the pouring pot, the 2000 camera, the water funnel, the honey
    const blk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), MAT.pitch()); blk.scale.set(1.2, 0.75, 1); blk.position.set(...BLOCK); blk.position.y += 0.07; blk.castShadow = true; R.add(blk); this.block = blk;
    const pieces = new THREE.Group();
    for (let k = 0; k < 7; k++) { const pz = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03 + 0.02 * ((k * 7) % 3) / 2, 0), MAT.pitch()); pz.position.set(BLOCK[0] + 0.22 * Math.cos(k * 2.1), BLOCK[1] + 0.02, BLOCK[2] + 0.14 * Math.sin(k * 2.1)); pz.rotation.set(k, k * 2, k * 3); pz.castShadow = true; pieces.add(pz); }
    R.add(pieces); this.pieces = pieces;
    const potB = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.16, 20), MAT.iron()); this.pot.add(potB);
    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 10), MAT.iron()); spout.rotation.z = -Math.PI / 2; spout.position.set(0.13, 0.05, 0); this.pot.add(spout);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), MAT.woodD()); handle.rotation.z = Math.PI / 2; handle.position.set(-0.27, 0.03, 0); this.pot.add(handle);
    shadowAll(this.pot); R.add(this.pot);
    const cam3 = new THREE.Group(); cam3.position.set(...TRIPOD); cam3.rotation.y = Math.atan2(-(APP[0] - TRIPOD[0]), -(APP[2] - TRIPOD[2])); R.add(cam3);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), MAT.iron()); lg.position.set(0.16 * Math.cos(a), 0.62, 0.16 * Math.sin(a)); lg.rotation.set(0.12 * Math.sin(a), 0, -0.12 * Math.cos(a)); cam3.add(lg); }
    const body = new THREE.Mesh(boxGeo(V(-0.11, 1.26, -0.08), V(0.11, 1.42, 0.12)), lam("pdCamBody", () => ({ color: "#3a3e48" }))); cam3.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 16), lam("pdCamLens", () => ({ color: "#1a1c22" }))); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.34, -0.12); cam3.add(lens);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.06, 16, 1, true), lam("pdCamLens", () => ({ color: "#1a1c22" }))); hood.rotation.x = Math.PI / 2; hood.position.set(0, 1.34, -0.19); cam3.add(hood);
    const vf = new THREE.Mesh(boxGeo(V(-0.04, 1.42, -0.02), V(0.04, 1.47, 0.14)), lam("pdCamBody", () => ({ color: "#3a3e48" }))); cam3.add(vf);
    this.rec = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.15) });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), this.rec); led.position.set(0.112, 1.39, -0.02); led.layers.set(NOINK); cam3.add(led);
    shadowAll(cam3);
    const wat = new THREE.Group(); wat.position.set(...WATER); R.add(wat);
    const ws = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), MAT.brass()); ws.position.set(-0.12, 0.3, 0); wat.add(ws);
    const wa = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6), MAT.brass()); wa.rotation.z = Math.PI / 2; wa.position.set(-0.05, 0.56, 0); wat.add(wa);
    const wf = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.01, 0.36), new THREE.Vector2(0.01, 0.46), new THREE.Vector2(0.022, 0.48), new THREE.Vector2(0.1, 0.6), new THREE.Vector2(0.104, 0.61)], 24), glassMat(1.0)); wf.layers.set(NOINK); wat.add(wf);
    const wrim = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.005, 6, 28), lam("pdGlassRim", () => ({ color: "#d8e4ea" }))); wrim.rotation.x = Math.PI / 2; wrim.position.y = 0.61; wat.add(wrim);
    const grim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.004, 6, 28), lam("pdGlassRim", () => ({ color: "#d8e4ea" }))); grim.rotation.x = Math.PI / 2; grim.position.y = 0.2; wat.add(grim);
    const wtop = new THREE.Mesh(new THREE.CircleGeometry(0.092, 24), new THREE.MeshBasicMaterial({ color: "#7cc8f0" })); wtop.rotation.x = -Math.PI / 2; wtop.position.y = 0.59; wat.add(wtop);
    const wglass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 24, 1, true), glassMat(1.0)); wglass.position.y = 0.1; wglass.layers.set(NOINK); wat.add(wglass);
    const wfill = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 24), new THREE.MeshBasicMaterial({ color: "#6ab8e6" })); wfill.position.y = 0.06; wat.add(wfill);
    shadowAll(wat);
    const hon = new THREE.Group(); hon.position.set(...HONEY); R.add(hon);
    const hj = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.16, 24), lam("pdHoney", () => ({ color: "#e8a030" }))); hj.position.y = 0.08; hon.add(hj);
    shadowAll(hon);
    // Mainstone's cardigan over the chair back, his glasses on the seat (2013)
    const cardi = new THREE.Group(); R.add(cardi);
    const gl1 = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 18), lam("pdSpecs", () => ({ color: "#241726" }))); gl1.rotation.x = -Math.PI / 2; gl1.position.set(-0.055, 0.48, 0.05); cardi.add(gl1);
    const gl2 = gl1.clone(); gl2.position.x = 0.055; cardi.add(gl2);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), lam("pdSpecs", () => ({ color: "#241726" }))); br.rotation.z = Math.PI / 2; br.position.set(0, 0.48, 0.05); cardi.add(br);
    cardi.position.set(...CHAIR); shadowAll(cardi);
    this.only = { cam: cam3, water: wat, honey: hon, cardigan: cardi, pot: this.pot };

    // ---- the prize stage ----
    const S = (x: number, y: number, z: number) => V(STAGE[0] + x, STAGE[1] + y, STAGE[2] + z);
    const sb = new Batch();
    sb.add(boxGeo(S(-12, -0.1, -8), S(12, 0.02, 12)), lam("pdHallFloor", () => ({ color: "#3a2430" })));
    sb.add(boxGeo(S(-6, 0, -3), S(6, STAGE_H, 2)), lam("pdStage", () => ({ map: planksHD(), color: "#a0704a" })));
    sb.add(boxGeo(S(-6, STAGE_H - 0.06, 1.95), S(6, STAGE_H, 2.05)), MAT.woodD());
    const curt = lam("pdCurtainM", () => ({ map: curtainTex() }));
    const cq = new THREE.PlaneGeometry(12, 6); cq.translate(STAGE[0], STAGE_H + 3, STAGE[2] - 2.9); sb.add(cq, curt);
    for (const sx of [-1, 1]) { const sq = new THREE.PlaneGeometry(2.2, 6); sq.translate(STAGE[0] + sx * 4.6, STAGE_H + 3, STAGE[2] + 0.6); sb.add(sq, curt); }
    sb.add(boxGeo(S(-6, STAGE_H + 5.2, -3), S(6, STAGE_H + 6, 2)), lam("pdValance", () => ({ color: "#7a1a2a" })));
    sb.add(boxGeo(S(1.0, STAGE_H, -0.3), S(1.5, STAGE_H + 1.1, 0.1)), MAT.wood());
    sb.add(boxGeo(S(0.95, STAGE_H + 1.1, -0.35), S(1.55, STAGE_H + 1.18, 0.15)), MAT.woodD());
    sb.build(R);
    this.spot = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.0, 0.6), transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), this.spot); pool.rotation.x = -Math.PI / 2; pool.position.copy(S(0, STAGE_H + 0.01, 0)); pool.layers.set(NOINK); R.add(pool);
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
    cam.fov = c.fov; cam.near = s.place === "lab" ? 0.05 : 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + (s.place === "campus" ? 7 : 2.5), s.place === "campus" ? 10 : 3, 95);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    let lit: [number, number, number] = [...L.lit], shade: [number, number, number] = [...L.shade], tint: [number, number, number] = [...L.charTint];
    const wl = windowLight(id, f);
    if (s.place === "lab" && s.light === "lab") { // time-lapse: the room dims with the window light
      const k = 0.35 + 0.65 * wl; lit = lit.map((v, i) => v * k + (1 - k) * [0.25, 0.3, 0.55][i]) as typeof lit; this.sun.intensity = L.sunI * (0.3 + 0.7 * wl);
    }
    const flash = lightningAt(f);
    if (s.light === "night" && f >= POWER_OFF) { // the power cut: only storm light through the windows
      lit = [0.3 + 1.3 * flash, 0.34 + 1.3 * flash, 0.6 + 1.4 * flash]; shade = [0.07, 0.08, 0.16]; tint = [0.55 + 0.4 * flash, 0.6 + 0.4 * flash, 0.85 + 0.15 * flash];
      this.sun.intensity = 0.6 + 2 * flash;
    }
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
      m.lookAt(cam.position.x, m.position.y, cam.position.z); m.visible = s.place === "campus";
    }
    // ---- the lab ----
    const night = s.light === "night", dusk = s.light === "dusk";
    if (night) { const k = flash; this.windows.color.setRGB(0.12 + 2.4 * k, 0.14 + 2.4 * k, 0.3 + 2.6 * k); }
    else if (dusk) this.windows.color.setRGB(2.4, 1.5, 0.8);
    else this.windows.color.setRGB(0.25 + 1.95 * wl, 0.3 + 1.7 * wl, 0.5 + 1.1 * wl);
    const lampOn = night && f < POWER_OFF;
    this.lamps.color.setRGB(lampOn ? 3.2 : 0.35, lampOn ? 2.8 : 0.33, lampOn ? 2.0 : 0.3);
    this.rec.color.setRGB(night && f < POWER_OFF ? 3 : 0.12, night && f < POWER_OFF ? 0.2 : 0.05, night && f < POWER_OFF ? 0.15 : 0.05);
    const mins = clockMin(f);
    this.clockMin.rotation.z = -(mins / 60) * Math.PI * 2; this.clockHr.rotation.z = -((mins / 60 + 3) / 12) * Math.PI * 2;
    // apparatus
    const R = this.rig, fill = fillAt(f), d = dropAt(f), n = pileAt(f), top = pileTop(n) - CAB_H, tipL = TIP_Y - CAB_H;
    R.pitchCone.visible = fill > 0.01; R.pitchCone.scale.set(Math.max(0.3, fill ** 0.5), Math.max(0.02, fill), Math.max(0.3, fill ** 0.5));
    R.neck.visible = R.bulb.visible = d.len > 0.004;
    const br = 0.014 + Math.min(0.016, d.len * 0.12);
    R.neck.scale.set(1, Math.max(0.001, d.len - br * 0.8), 1);
    R.bulb.scale.set(br, br * 1.12, br); R.bulb.position.set(0, tipL - d.len + br * 0.85, 0);
    R.falling.visible = d.fall !== null;
    if (d.fall !== null) R.falling.position.set(0, Math.max(top + 0.02, tipL - 0.05 - d.fall), 0);
    R.pile.visible = n > 0; R.pile.scale.set(0.088, Math.max(0.01, top - (BEAKER_Y - CAB_H)), 0.088);
    R.jar.visible = jarOn(f) && s.place === "lab"; R.jar.position.y = jarLift(f);
    R.base.rotation.z = wobbleAt(f);
    // props by shot
    this.block.visible = id <= 3 && f < SHATTER; this.pieces.visible = id === 3 && f >= SHATTER;
    this.only.pot.visible = id === 4 && f < 474 || id <= 3;
    if (id === 4) { const k = THREE.MathUtils.clamp((f - POUR[0] + 8) / 12, 0, 1); this.pot.position.set(APP[0] - 0.22, 1.86 - 0.04 * k, APP[2]); this.pot.rotation.set(0, 0, -0.95 * k); }
    else { this.pot.position.set(BENCH[0] - 0.35, 1.18, BENCH[2] + 0.05); this.pot.rotation.set(0, 0.4, 0); }
    this.only.cam.visible = id === 12; this.only.water.visible = id === 13; this.only.honey.visible = id === 14; this.only.cardigan.visible = id === 16;
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
