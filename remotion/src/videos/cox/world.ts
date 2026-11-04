// "The Clock Nobody Had to Wind" as one three.js scene: a 1760s London street and town (sky shots fly over it), Cox's
// Mechanical Museum hall with the clock, its glass case, mercury jars and lottery wheel, and, far away, today's V&A gallery
// with the same clock on a plinth. update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, house, setSight, Ray, Kit } from "./build";
import { ctex, cloudHD, cobbleHD, planksHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, HALL, VA, CASE, LOTTERY, MUSEUM_DOOR, camAt, secondHand, mercuryAt, weightAt, stormAt, windowLight, lotteryAt, running, SWITCH, V3 } from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models
void LFB;

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 13: { az: 10, el: 8 }, 14: { az: -20, el: 9 } };

/** every lens position of the film looking at its subject (trees and houses there are left out) */
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
/** clock dial: cream enamel, gilt chapter ring, bold hour ticks, minute dots (no numerals: no readable text) */
const dialTex = () => ctex("coxDial", 512, 512, (g) => {
  g.fillStyle = "#c9a040"; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
  g.fillStyle = "#f6ecd2"; g.beginPath(); g.arc(256, 256, 228, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 8; g.beginPath(); g.arc(256, 256, 226, 0, 7); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.arc(256, 256, 150, 0, 7); g.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0, r0 = big ? 165 : 200, r1 = 214;
    g.lineWidth = big ? 16 : 5; g.beginPath(); g.moveTo(256 + r0 * Math.sin(a), 256 - r0 * Math.cos(a)); g.lineTo(256 + r1 * Math.sin(a), 256 - r1 * Math.cos(a)); g.stroke();
  }
  g.fillStyle = "#c9a040"; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; g.beginPath(); g.arc(256 + 100 * Math.sin(a), 256 - 100 * Math.cos(a), 14, 0, 7); g.fill(); }
});
/** liquid mercury: chrome bands (dark / bright stripes) so it reads as metal, not paint */
const mercuryTex = () => ctex("coxMercuryTex", 256, 64, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 0);
  for (const [u, c] of [[0, "#3c4452"], [0.18, "#e9eef4"], [0.3, "#8c97a6"], [0.5, "#4a5363"], [0.68, "#f7f9fc"], [0.8, "#9aa5b4"], [1, "#3c4452"]] as const) gr.addColorStop(u, c);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
});
/** lottery wheel face: coloured wedges with ink spokes */
const wheelTex = () => ctex("coxWheel", 512, 512, (g) => {
  const cols = ["#c0353a", "#f2c64a", "#3f6fb5", "#f6ecd2"];
  for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 250, (i / 12) * 6.283, ((i + 1) / 12) * 6.283); g.fill(); }
  g.strokeStyle = "#241726"; g.lineWidth = 10;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + 250 * Math.cos(a), 256 + 250 * Math.sin(a)); g.stroke(); }
  g.beginPath(); g.arc(256, 256, 246, 0, 7); g.stroke();
  g.fillStyle = "#c9a040"; g.beginPath(); g.arc(256, 256, 40, 0, 7); g.fill(); g.stroke();
});
/** a framed oil painting: simple landscape blocks, seed picks the palette */
const paintingTex = (k: number) => ctex("coxPainting" + k, 256, 192, (g) => {
  const P = [["#9cc3e0", "#6f9a4e", "#3f6a3a", "#e8d6a0"], ["#e8b07a", "#8a5a6a", "#4a3a5a", "#f2d29a"], ["#b8d0ec", "#c9c0a0", "#7a8a9a", "#f6ecd2"]][k % 3];
  g.fillStyle = P[0]; g.fillRect(0, 0, 256, 192);
  g.fillStyle = P[1]; g.beginPath(); g.moveTo(0, 120); g.quadraticCurveTo(90, 70 + 10 * k, 256, 110); g.lineTo(256, 192); g.lineTo(0, 192); g.fill();
  g.fillStyle = P[2]; g.beginPath(); g.moveTo(0, 160); g.quadraticCurveTo(140, 120, 256, 170); g.lineTo(256, 192); g.lineTo(0, 192); g.fill();
  g.fillStyle = P[3]; g.beginPath(); g.arc(70 + 40 * k, 50, 18, 0, 7); g.fill();
});
const panelTex = (key: string, wall: string, panel: string) => ctex(key, 512, 512, (g) => {
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = panel; g.lineWidth = 10; g.strokeRect(40, 40, 432, 432);
  g.strokeStyle = "rgba(36,23,38,0.35)"; g.lineWidth = 4; g.strokeRect(52, 52, 408, 408);
});

const MAT = {
  wood: () => lam("coxMahogany", () => ({ color: "#7a3a26" })), woodD: () => lam("coxMahoganyD", () => ({ color: "#5a2a1c" })),
  gilt: () => lam("coxGilt", () => ({ color: "#d6a842" })), brass: () => lam("coxBrass", () => ({ color: "#c99a3a" })),
};
type ClockRig = { root: THREE.Group; sec: THREE.Object3D; min: THREE.Object3D; hr: THREE.Object3D; merc: THREE.Mesh[]; weight: THREE.Object3D };
const glassMat = () => new THREE.MeshBasicMaterial({ color: "#cfeaff", transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
/** Cox's timepiece: mahogany base, glass-sided middle with the two mercury jars and the winding weight, hood with the dial */
const clockRig = (): ClockRig => {
  const R = new THREE.Group(), b = new Batch(), W = CASE.w / 2, D = CASE.d / 2;
  const wood = MAT.wood(), woodD = MAT.woodD(), gilt = MAT.gilt(), brass = MAT.brass();
  b.add(boxGeo(V(-W, 0, -D), V(W, 0.45, D)), wood);
  b.add(boxGeo(V(-W - 0.05, 0, -D - 0.05), V(W + 0.05, 0.12, D + 0.05)), woodD);
  b.add(boxGeo(V(-W - 0.04, 0.42, -D - 0.04), V(W + 0.04, 0.5, D + 0.04)), gilt);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(boxGeo(V(sx * W - 0.04, 0.5, sz * D - 0.04), V(sx * W + 0.04, 1.55, sz * D + 0.04)), gilt);
  b.add(boxGeo(V(-W - 0.04, 1.52, -D - 0.04), V(W + 0.04, 1.6, D + 0.04)), gilt);
  b.add(boxGeo(V(-W, 1.6, -D), V(W, 2.55, D)), wood);
  b.add(boxGeo(V(-W - 0.06, 2.55, -D - 0.06), V(W + 0.06, 2.66, D + 0.06)), woodD);
  b.add(boxGeo(V(-0.12, 2.66, -0.12), V(0.12, 2.74, 0.12)), gilt);
  const vase = new THREE.SphereGeometry(0.16, 16, 12); vase.scale(1, 1.25, 1); vase.translate(0, 2.92, 0); b.add(vase, gilt);
  const neck = new THREE.CylinderGeometry(0.05, 0.09, 0.16, 12); neck.translate(0, 3.16, 0); b.add(neck, gilt);
  // bezel + dial disc on the hood front
  const bez = new THREE.TorusGeometry(0.335, 0.03, 8, 48); bez.translate(0, 2.05, D + 0.012); b.add(bez, gilt);
  // inner frame: the barometer tube, the weight rod
  const tube = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8); tube.translate(0, 1.32, -0.05); b.add(tube, brass);
  const rod = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6); rod.translate(0, 1.05, 0.12); b.add(rod, brass);
  b.build(R);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.33, 48), lam("coxDialFace", () => ({ map: dialTex() })));
  dial.position.set(0, 2.05, D + 0.008); dial.receiveShadow = true; R.add(dial);
  const hand = (len: number, w: number, col: string, z: number) => {
    const pivot = new THREE.Group(); pivot.position.set(0, 2.05, D + z);
    const m = new THREE.Mesh(boxGeo(V(-w / 2, -0.04, 0), V(w / 2, len, 0.008)), lam("coxHand" + col, () => ({ color: col })));
    pivot.add(m); R.add(pivot); return pivot;
  };
  const hr = hand(0.17, 0.035, "#241726", 0.012), min = hand(0.25, 0.024, "#241726", 0.02), sec = hand(0.28, 0.01, "#c0353a", 0.028);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), MAT.gilt()); cap.position.set(0, 2.05, D + 0.04); R.add(cap);
  // jars: glass cylinders with gilt lids, mercury inside (scaled by level)
  const merc: THREE.Mesh[] = [];
  const mercM = new THREE.MeshBasicMaterial({ map: mercuryTex() }); // unlit chrome bands: reads as liquid metal under any light
  for (const x of [-0.27, 0.27]) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 24, 1, true), glassMat());
    g.position.set(x, 0.81, 0); g.layers.set(NOINK); R.add(g);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 24), MAT.gilt()); lid.position.set(x, 1.14, 0); lid.castShadow = true; R.add(lid);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 24), MAT.gilt()); foot.position.set(x, 0.52, 0); R.add(foot);
    const mg = new THREE.CylinderGeometry(0.155, 0.155, 1, 24); mg.translate(0, 0.5, 0);
    const m = new THREE.Mesh(mg, mercM); m.position.set(x, 0.54, 0); R.add(m); merc.push(m);
  }
  const weight = new THREE.Mesh(boxGeo(V(-0.045, -0.06, 0.08), V(0.045, 0.06, 0.16)), brass); weight.castShadow = true; R.add(weight);
  for (const [sx, rot] of [[-1, 0], [1, 0], [0, 1]] as const) { // glass panes: sides and front of the middle section
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(rot ? CASE.w : CASE.d, 1.05), glassMat());
    if (rot) pane.position.set(0, 1.02, D); else { pane.position.set(sx * W, 1.02, 0); pane.rotation.y = Math.PI / 2; }
    pane.layers.set(NOINK); R.add(pane);
  }
  R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.layers.isEnabled(NOINK)) { m.castShadow = true; m.receiveShadow = true; } });
  return { root: R, sec, min, hr, merc, weight };
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
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private clocks: ClockRig[] = [];
  private wheel = new THREE.Group();
  private lever = new THREE.Group();
  private windows: THREE.MeshBasicMaterial;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private skyTmp = new THREE.Color(); private storm = new THREE.Color();

  constructor(kit: Kit) {
    const R = this.root, M: Mats = {};
    void kit; void M;
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
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.userData.k = i;
      this.clouds.push(m); R.add(m);
    }


    setSight(sightLines());
    const r = rng(11);
    // ---- the street and the town around it (static batch) ----
    const b = new Batch();
    const cob = cobbleHD(); cob.repeat.set(160, 160);
    const ground = new THREE.PlaneGeometry(1600, 1600); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 160, uv.getY(i) * 160);
    b.add(ground, lam("coxCobble", () => ({ map: cobbleHD() })));
    const pave = lam("coxPave", () => ({ color: "#cdbfa6" }));
    b.add(boxGeo(V(-90, 0, -6), V(90, 0.14, -4.2)), pave); b.add(boxGeo(V(-90, 0, 4.2), V(90, 0.14, 6)), pave);
    for (let x = -72; x <= 72; x += 9) {
      if (Math.abs(x) < 5) continue;
      house(b, x, -10.5, 0, 9, 9, [9.8, 11.2, 12.6][Math.floor(r() * 3)], Math.floor(r() * 8));
      house(b, x + 4.5, 10.5, Math.PI, 9, 9, [9.8, 11.2, 12.6][Math.floor(r() * 3)], Math.floor(r() * 8));
    }
    house(b, 0, -11.5, 0, 11, 11, 12.6, 5); // Cox's Mechanical Museum: wider, taller, door on the street
    const sign = lam("coxSignBoard", () => ({ color: "#8e2f3a" })), gold = MAT.gilt();
    b.add(boxGeo(V(-2.2, 4.4, MUSEUM_DOOR[2] - 0.05), V(2.2, 5.2, MUSEUM_DOOR[2] + 0.12)), sign); // a plain board, no lettering
    b.add(boxGeo(V(-2.3, 4.32, MUSEUM_DOOR[2] + 0.1), V(2.3, 4.42, MUSEUM_DOOR[2] + 0.16)), gold);
    for (const z0 of [-38, -66, -94, 38, 66, 94]) for (let x = -110; x <= 110; x += 9) {
      if (r() < 0.12) continue;
      house(b, x + (z0 > 0 ? 4.5 : 0), z0, z0 > 0 ? Math.PI : 0, 9, 9, [9.8, 11.2, 12.6][Math.floor(r() * 3)], Math.floor(r() * 8));
      house(b, x + (z0 > 0 ? 0 : 4.5), z0 + (z0 > 0 ? -12 : 12), z0 > 0 ? 0 : Math.PI, 9, 9, [9.8, 11.2][Math.floor(r() * 2)], Math.floor(r() * 8));
    }
    // a domed church on the skyline (generic, our own)
    const stone = lam("coxStone", () => ({ color: "#d9cdb6" })), lead = lam("coxLead", () => ({ color: "#8f97a8" }));
    b.add(boxGeo(V(30, 0, -160), V(62, 22, -128)), stone);
    const drum = new THREE.CylinderGeometry(11, 11, 10, 32); drum.translate(46, 27, -144); b.add(drum, stone);
    const dome = new THREE.SphereGeometry(11.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.15, 1); dome.translate(46, 32, -144); b.add(dome, lead);
    const lan = new THREE.CylinderGeometry(1.6, 2, 6, 12); lan.translate(46, 48, -144); b.add(lan, stone);
    b.build(R);

    // ---- Cox's museum hall (walls cast no shadow: the room is lit as if by its tall windows) ----
    const H = (x: number, y: number, z: number) => V(HALL[0] + x, HALL[1] + y, HALL[2] + z);
    const hb = new Batch();
    const floorT = planksHD(); floorT.repeat.set(4, 4);
    hb.add(boxGeo(H(-7, -0.1, -4), H(7, 0.02, 9)), lam("coxFloor", () => ({ map: planksHD(), color: "#c79a6a" })));
    const wallM = lam("coxHallWall", () => ({ map: panelTex("coxPanel", "#7f9e94", "#e8dcc0") }));
    hb.add(boxGeo(H(-7, 0, -4.2), H(7, 6, -4)), wallM); hb.add(boxGeo(H(-7.2, 0, -4), H(-7, 6, 9)), wallM);
    hb.add(boxGeo(H(7, 0, -4), H(7.2, 6, 9)), wallM); hb.add(boxGeo(H(-7, 0, 9), H(7, 6, 9.2)), wallM);
    const dado = lam("coxDado", () => ({ color: "#e8dcc0" })), skirt = lam("coxSkirt", () => ({ color: "#4a3a30" }));
    hb.add(boxGeo(H(-7, 0.95, -4.05), H(7, 1.05, -3.95)), dado); hb.add(boxGeo(H(-7, 0, -4.05), H(7, 0.22, -3.92)), skirt);
    hb.add(boxGeo(H(-7.05, 0.95, -4), H(-6.95, 1.05, 9)), dado); hb.add(boxGeo(H(6.95, 0.95, -4), H(7.05, 1.05, 9)), dado);
    for (const [x, z, ry, k] of [[-4.5, -3.96, 0, 0], [4.2, -3.96, 0, 1], [-6.96, 2.5, Math.PI / 2, 2], [6.96, 3.0, -Math.PI / 2, 0]] as const) {
      const fr = new THREE.Mesh(boxGeo(V(-0.85, -0.65, 0), V(0.85, 0.65, 0.06)), gold);
      fr.position.copy(H(x, 2.6, z)); fr.rotation.y = ry; fr.castShadow = false; R.add(fr);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.12), lam("coxPic" + k, () => ({ map: paintingTex(k) })));
      pic.position.copy(H(x, 2.6, z)).add(V(Math.sin(ry) * 0.07, 0, Math.cos(ry) * 0.07)); pic.rotation.y = ry; R.add(pic);
    }
    hb.build(R, false);
    this.windows = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6) });
    for (const x of [-2.6, 2.6]) { // tall windows either side of the clock, on the back wall
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.0), this.windows); w.position.copy(H(x, 2.9, -3.94)); R.add(w);
      const wb = new Batch();
      wb.add(boxGeo(H(x - 0.78, 1.32, -3.98), H(x + 0.78, 1.4, -3.86)), dado); wb.add(boxGeo(H(x - 0.78, 4.4, -3.98), H(x + 0.78, 4.48, -3.86)), dado);
      wb.add(boxGeo(H(x - 0.78, 1.4, -3.98), H(x - 0.7, 4.4, -3.86)), dado); wb.add(boxGeo(H(x + 0.7, 1.4, -3.98), H(x + 0.78, 4.4, -3.86)), dado);
      wb.add(boxGeo(H(x - 0.03, 1.4, -3.95), H(x + 0.03, 4.4, -3.9)), dado);
      for (let y = 2.15; y < 4.4; y += 0.75) wb.add(boxGeo(H(x - 0.7, y, -3.95), H(x + 0.7, y + 0.05, -3.9)), dado);
      wb.build(R, false);
    }
    // a low rope rail in front of the clock, and the lottery wheel on its stand
    const ropeB = new Batch(), red = lam("coxRope", () => ({ color: "#b0303a" }));
    for (const x of [-1.4, 1.4]) { const p = new THREE.CylinderGeometry(0.04, 0.05, 0.95, 10); p.translate(HALL[0] + x, 0.48, HALL[2] + 1.9); ropeB.add(p, gold); }
    const rope = new THREE.CylinderGeometry(0.02, 0.02, 2.8, 6); rope.rotateZ(Math.PI / 2); rope.translate(HALL[0], 0.85, HALL[2] + 1.9); ropeB.add(rope, red);
    for (const sx of [-1, 1]) ropeB.add(boxGeo(V(LOTTERY[0] + sx * 0.42 - 0.05, 0, LOTTERY[2] - 0.05), V(LOTTERY[0] + sx * 0.42 + 0.05, 1.32, LOTTERY[2] + 0.05)), MAT.wood());
    ropeB.add(boxGeo(V(LOTTERY[0] - 0.6, 0, LOTTERY[2] - 0.3), V(LOTTERY[0] + 0.6, 0.1, LOTTERY[2] + 0.3)), MAT.woodD());
    ropeB.build(R);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 48), [MAT.gilt(), lam("coxWheelFace", () => ({ map: wheelTex() })), lam("coxWheelFace", () => ({}))]);
    wheel.rotation.x = Math.PI / 2; wheel.castShadow = true; this.wheel.add(wheel);
    this.wheel.position.set(LOTTERY[0], 1.36, LOTTERY[2] + 0.12); R.add(this.wheel);

    // ---- the V&A gallery today ----
    const G = (x: number, y: number, z: number) => V(VA[0] + x, VA[1] + y, VA[2] + z);
    const gb = new Batch();
    gb.add(boxGeo(G(-8, -0.1, -5), G(8, 0.02, 9)), lam("coxGalFloor", () => ({ map: planksHD(), color: "#b9aa98" })));
    const gw = lam("coxGalWall", () => ({ color: "#ecebe6" }));
    gb.add(boxGeo(G(-8, 0, -5.2), G(8, 6.5, -5)), gw); gb.add(boxGeo(G(-8.2, 0, -5), G(-8, 6.5, 9)), gw);
    gb.add(boxGeo(G(8, 0, -5), G(8.2, 6.5, 9)), gw); gb.add(boxGeo(G(-8, 0, 9), G(8, 6.5, 9.2)), gw);
    gb.add(boxGeo(G(-8, 0, -5.02), G(8, 0.15, -4.9)), lam("coxGalSkirt", () => ({ color: "#5a5a60" })));
    gb.build(R, false);
    const gp = new Batch();
    gp.add(boxGeo(G(-1.0, 0, -0.6), G(1.0, 0.12, 0.6)), lam("coxPlinth", () => ({ color: "#3e3e44" })));
    for (const x of [-1.6, 1.6]) { const p = new THREE.CylinderGeometry(0.035, 0.05, 0.9, 10); p.translate(VA[0] + x, 0.45, VA[2] + 1.5); gp.add(p, lam("coxSteel", () => ({ color: "#9aa0a8" }))); }
    const grope = new THREE.CylinderGeometry(0.018, 0.018, 3.2, 6); grope.rotateZ(Math.PI / 2); grope.translate(VA[0], 0.82, VA[2] + 1.5); gp.add(grope, red);
    gp.add(boxGeo(G(-1.74, 0, 0.32), G(-1.46, 2.3, 0.5)), gw);                                           // the column with the switch
    gp.add(boxGeo(G(-1.68, 1.12, 0.5), G(-1.52, 1.38, 0.53)), lam("coxSwitchPlate", () => ({ color: "#f6f4ee" })));
    for (const [x, k] of [[-5.5, 1], [5.2, 2]] as const) {
      gp.add(boxGeo(G(x - 0.9, 1.9, -4.98), G(x + 0.9, 3.3, -4.92)), gold);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), lam("coxPic" + k, () => ({ map: paintingTex(k) }))); pic.position.copy(G(x, 2.6, -4.9)); R.add(pic);
    }
    gp.build(R);
    const lv = new THREE.Mesh(boxGeo(V(-0.025, 0, 0), V(0.025, 0.09, 0.03)), lam("coxSwitchLever", () => ({ color: "#3a3a40" })));
    this.lever.add(lv); this.lever.position.copy(G(-1.6, 1.25, 0.53)); R.add(this.lever);
    setSight([]);

    // ---- the clock, twice: in the hall and on its plinth in the gallery ----
    for (const [p, y] of [[HALL, 0.02], [VA, 0.12]] as const) {
      const c = clockRig(); c.root.position.set(p[0], p[1] + y, p[2]); R.add(c.root); this.clocks.push(c);
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
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
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" && !(s.place === "sky" && stormAt(f) > 0.7);
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (const m of this.clouds) { // a cloud ring around wherever the camera is (pond or sea), drifting with the wind
      const i = m.userData.k as number, near = i >= 9, a = ((i % 9) / 9) * Math.PI * 2 + (near ? 0.65 : 0.3), d = near ? 330 + (i % 3) * 40 : 620 + (i % 3) * 60, w = (near ? 80 : 130) + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 4, (near ? 105 : 120) + (i % 4) * 38, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light === "golden" ? "golden" : "day"][i % 4];
    }
    // ---- storm: the sky and the clouds darken over London ----
    if (s.place === "sky" || s.place === "street") {
      const k = s.place === "sky" ? stormAt(f) : 0.15;
      this.storm.set("#7d8597");
      for (let i = 0; i < 5; i++) { const c = su["c" + i].value as THREE.Color; c.lerp(untone("#6f7789", this.skyTmp), 0.8 * k * k); }
      for (const m of this.clouds) (m.material as THREE.MeshBasicMaterial).color.setScalar(1.1 - 0.55 * k);
    }
    // ---- the clock ----
    const gal = s.place === "gallery";
    for (const [k, c] of this.clocks.entries()) {
      // the hall clock never stops; the gallery clock runs until "off."
      const a = secondHand(f); void k; // secondHand stops dead at STOP ("off."); the hall shots all come before it
      c.sec.rotation.z = a; c.min.rotation.z = a / 60 - 1.1; c.hr.rotation.z = a / 720 - 2.4;
      const lv = mercuryAt(f);
      c.merc[0].scale.y = 0.56 * lv; c.merc[1].scale.y = 0.56 * (1 - lv * 0.6);
      c.weight.position.set(0, 0.62 + 0.75 * weightAt(f), 0);
    }
    void gal; void running;
    this.wheel.rotation.z = -lotteryAt(f);
    this.lever.rotation.x = f >= SWITCH ? 0.9 : -0.9;
    const wl = id === 5 ? windowLight(f) : 1;
    this.windows.color.setRGB(0.3 + 1.9 * wl, 0.3 + 1.7 * wl, 0.4 + 1.2 * wl);
    if (s.place === "hall") this.sun.intensity = L.sunI * (0.45 + 0.55 * wl);
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
