// The slow-organ cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, CAGE, PIANIST, MAYOR, MONK, WORKER, KID, visitor, audience, pigCard, fxContact, fxShadow, fxNote, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxCalPage, fxBottle, fxAir, fxHandBag, fxZzz, fxCobweb, fxHandSwitch, fxClapMarks, fxSparkle } from "./fx";
import { FPS, SHOTS, V3, CH, ORG, PIPES, PIPE_Y, KEY_Y, BLOWER, CA, DESK, PIANO, SEATS, VISITOR, TOWN, CHURCH_Z, WEIGHT, SWITCH, ADD_PIPE, FIRST_NOTE,
  calendarAt, visitorAge, bellowsAt, sounding, pipeCount, smooth, clamp01, add } from "./story";
import type { LightName } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: LightName = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<LightName, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], lab: [0.26, 0.2, 0.26], night: [0.18, 0.18, 0.28], stage: [0.2, 0.14, 0.22], dusk: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- staging ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const WHO = {
  cage: { i: 1, o: CAGE, okey: "cage" } as Who,
  pianist: { i: 2, o: PIANIST, okey: "pianist" } as Who,
  mayor: { i: 3, o: MAYOR, okey: "mayor" } as Who,
  monk: [0, 1].map((k) => ({ i: 4 + k, o: MONK(k), okey: `monk${k}` }) as Who),
  worker: [0, 1].map((k) => ({ i: 6 + k, o: WORKER(k), okey: `worker${k}` }) as Who),
  kid: { i: 8, o: KID, okey: "kid" } as Who,
  vis: [0, 1, 2].map((k) => ({ i: 9, o: visitor(k), okey: `vis${k}` }) as Who),
  folk: Array.from({ length: 30 }, (_, k) => ({ i: 10 + k, o: audience(k), okey: `a${k}` }) as Who),
};
const FRONT = { side: false, mirror: false };
const SEAT = Math.round(0.47 / SU); // chair seat height in design units
const push = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const stand = (out: Stage, cam: CamInfo, who: Who, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale);
};
/** seated on a chair at p (card just in front of the seat so the seat does not cut the hips) */
const sitAt = (out: Stage, cam: CamInfo, who: Who, p0: V3, fo: FrontOpts, t: number, dz = 0.14) => {
  const p = add(p0, [0, 0, dz]);
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "sit", seat: SEAT, blink: lidAt(t, who.i), ...fo }, {}, 1));
  blob(out, p[0], p[1], p[2], 1);
};
/** someone walking from p0 to p1 between frames f0 and f1 (then standing at p1) */
const walk = (out: Stage, cam: CamInfo, who: Who, p0: V3, p1: V3, f: number, f0: number, f1: number, expr: Expr = "neutral", fo: FrontOpts = {}) => {
  const u = clamp01((f - f0) / (f1 - f0)), x = p0[0] + (p1[0] - p0[0]) * u, z = p0[2] + (p1[2] - p0[2]) * u, t = f / FPS;
  if (u >= 1 || u <= 0) { stand(out, cam, who, u <= 0 ? p0 : p1, { expr, ...fo }, t); return; }
  const dx = p1[0] - p0[0], dz = p1[2] - p0[2], dl = Math.hypot(dx, dz) || 1;
  const view = viewOf(cam, x, z, dx / dl, dz / dl), ph = q((((f - f0) / FPS) * 0.9 + who.i * 0.13) % 1, 60);
  out.places.push(person(cam, who, x, p0[1], z, view, { mode: "stroll", phase: ph, expr, blink: lidAt(t, who.i), ...fo },
    { mode: "march", phase: ph, expr, stomp: 0.5, stride: 0.8 * view.fs, blink: lidAt(t, who.i) }));
  blob(out, x, p0[1], z);
};
/** someone strolling from p0 along (dx, dz) at speed v (m/s) since frame f0 */
const stroll = (out: Stage, cam: CamInfo, who: Who, p0: V3, dx: number, dz: number, v: number, f: number, f0: number, expr: Expr = "neutral") => {
  const s = ((f - f0) / FPS) * v, x = p0[0] + dx * s, z = p0[2] + dz * s;
  const view = viewOf(cam, x, z, dx, dz), ph = q((((f - f0) / FPS) * 0.7 + who.i * 0.13) % 1, 60), t = f / FPS;
  out.places.push(person(cam, who, x, p0[1], z, view, { mode: "stroll", phase: ph, expr, blink: lidAt(t, who.i) },
    { mode: "march", phase: ph, expr, stomp: 0.5, stride: 0.8 * view.fs, blink: lidAt(t, who.i) }));
  blob(out, x, p0[1], z);
};
/** music notes rising from points (organ pipe tops etc.): each note drifts up 0.7 m over 1.6 s and fades by size */
const notes = (out: Stage, f: number, from: V3[], col = "#1f2a44", size = 0.16, seed = 0) => {
  from.forEach((p, k) => {
    for (let n = 0; n < 2; n++) {
      const u = q(((f / FPS) / 1.6 + k * 0.29 + n * 0.5 + seed) % 1, 24), s = size * (u < 0.15 ? u / 0.15 : u > 0.8 ? (1 - u) / 0.2 : 1);
      if (s < 0.02) continue;
      push(out, `note${(k + n) % 2}${col}`, 240, 260, (pp) => fxNote(pp, (k + n) % 2, col), p[0] + 0.12 * Math.sin(u * 6 + k), p[1] + 0.08 + 0.7 * u, p[2] + 0.02, s * 0.92, s);
    }
  });
};
const pipeTops = (n: number, k = 3): V3[] => PIPES.slice(0, n).filter((_, i) => i % k === 1).map(([x, h]) => add(ORG, [x, PIPE_Y + 0.12 + h, -0.05]));
const organNotes = (out: Stage, id: number, f: number) => { if (sounding(id, f)) notes(out, f, pipeTops(pipeCount(id, f), 2), "#1f2a44", 0.15); };
/** a calendar page tearing off whenever the page index steps (8 f flight), on the church's right wall */
const calendar = (out: Stage, id: number, f: number) => {
  for (let k = 1; k <= 12; k++) if (calendarAt(id, f - k) < calendarAt(id, f - k + 1)) {
    const u = q(k / 12, 12), s2 = (k * 7) % 3 - 1;
    push(out, `cal${u}`, 300, 300, (p) => fxCalPage(p, u), CH[0] + 4.85 - 0.35 * u, 2.3 + 0.25 * u - 0.2 * u * u, CH[2] - 7.6 + 0.55 * u + 0.12 * s2, 0.75, 0.75);
  }
};
const pig = (out: Stage, cam: CamInfo, i: number, p: V3, dx: number, f: number, f0: number) => {
  const s = Math.max(0, (f - f0) / FPS) * 0.25, x = p[0] + dx * s, ph = q(((f - f0) / FPS * 1.6 + i * 0.3) % 1, 12);
  const mirror = dx * cam.right.x < 0 === false ? false : true;
  const sn = q(0.5 + 0.5 * Math.sin(f / 5 + i), 4);
  out.places.push({ key: `pig|${ph}|${sn}`, x, y: p[1], z: p[2], mirror, scale: 0.7, draw: (pp) => pigCard(pp, ph, sn), size: [480, 800, 0.8] });
  blob(out, x, p[1], p[2], 0.7);
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const T = (x: number, y: number, z: number): V3 => add(TOWN, [x, y, z]);
  const Ch = (x: number, y: number, z: number): V3 => add(CH, [x, y, z]);
  const O = (x: number, y: number, z: number): V3 => add(ORG, [x, y, z]);
  const council = (react: boolean, clap: boolean) => {
    const g: [Who, V3][] = [[WHO.folk[0], T(-1.5, 0.04, -18.6)], [WHO.folk[1], T(1.4, 0.04, -18.8)], [WHO.folk[2], T(0.7, 0.04, -19.8)], [WHO.folk[3], T(-0.6, 0.04, -20.0)]];
    for (const [w, p] of g) stand(out, cam, w, p, { expr: react ? "grin" : "smile", clap: clap ? q(0.5 + 0.5 * Math.sin(t * 14), 6) : undefined, look: p[0] < 0 ? 1 : -1 }, t);
    stand(out, cam, WHO.mayor, T(0, 0.04, -18.0), { expr: react ? "laugh" : "stern", wave: react ? q(0.6 + 0.3 * smooth((f - 431) / 6), 10) : undefined, headTilt: clap ? q(6 * Math.sin(t * 9), 3) : 0 }, t);
    const hp = add(T(0, 0.04, -18.0), [cam.right.x * 0.62, 1.15, cam.right.z * 0.62 + 0.05]);
    push(out, "scoreCard", 300, 400, (p) => { p.poly([[30, 30], [270, 40], [262, 370], [24, 360]], "#f6efdc", 9); for (let r2 = 0; r2 < 3; r2++) for (let l = 0; l < 5; l++) p.stroke([[48, 80 + r2 * 100 + l * 12], [252, 84 + r2 * 100 + l * 12]], 3, "#5a5060"); }, hp[0], hp[1], hp[2], 0.34, 0.45);
  };
  switch (id) {
    case 1: {
      stroll(out, cam, WHO.folk[4], T(-8, 0.04, -4), 1, 0, 1.0, f, 0);
      stroll(out, cam, WHO.folk[5], T(5, 0.04, -12), -1, 0, 0.9, f, 0, "smile");
      stroll(out, cam, WHO.folk[6], T(1.5, 0.04, 4), 0, -1, 0.9, f, 0);
      stroll(out, cam, WHO.folk[7], T(-3, 0.04, -16), 0, 1, 0.8, f, 0, "smile");
      break;
    }
    case 2: {
      organNotes(out, id, f);
      for (const k of [2, 9, 15]) sitAt(out, cam, WHO.folk[k], SEATS[k], { expr: "smile_closed" }, t);
      break;
    }
    case 3: {
      const big = f >= 231, shrug = f >= 284 ? q(smooth((f - 284) / 10), 10) : 0;
      sitAt(out, cam, WHO.cage, add(DESK, [0, 0, -0.42]), { expr: f >= 284 ? "grin" : big ? "smile_closed" : "smile", shrug, look: f < 231 ? 0 : 1 }, t, 0.1);
      break;
    }
    case 4: {
      sitAt(out, cam, WHO.pianist, add(PIANO, [-0.68, 0, 0]), { expr: f < 352 ? "smile_closed" : "neutral", headTilt: q(4 * Math.sin(t * 2), 4), look: f >= 352 ? 1 : 0 }, t, 0.05);
      notes(out, f, [add(PIANO, [0.9, 1.25, 0])], "#1f2a44", 0.15);
      break;
    }
    case 5: council(f >= 431, false); break;
    case 7: council(false, f >= 683); break;
    case 6: {
      for (let k = 0; k < 2; k++) {
        const bp = add(CA, [-2.4 - k * 1.25, 0, -4.3]), top = 0.25 + 0.3 * bellowsAt(f, k);
        out.places.push(person(cam, WHO.monk[k], bp[0], top, bp[2] + 0.1, FRONT, { mode: "stand", expr: k ? "whistle" : "neutral", blink: lidAt(t, WHO.monk[k].i), tilt: q(4 * (bellowsAt(f, k) - 0.5), 4) }, {}, 1));
      }
      notes(out, f, [add(CA, [-1.8, 7.5, -5.8]), add(CA, [0, 8.4, -5.6]), add(CA, [1.9, 7.5, -5.8])], "#f0d890", 0.45);
      break;
    }
    case 8: {
      if (f >= 828) for (let k = 0; k < 3; k++) pig(out, cam, k, Ch(-0.55 + k * 0.75, 0.03, -2.6 - (k % 2) * 0.8), k % 2 ? -1 : 1, f, 826 - k * 6);
      if (f >= 828 && f < 836) { const u = q((f - 828) / 8, 8); push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), CH[0] - 0.2, 1.2, CH[2] - 2.6, 0.4, 0.4); }
      break;
    }
    case 9: {
      if (f < 958) {
        stand(out, cam, WHO.worker[0], O(0.78, 0, 0.8), { expr: f >= 884 ? "grin" : "smile", look: -1 }, t);
        stand(out, cam, WHO.worker[1], add(BLOWER, [0.12, 0, 0.75]), { expr: f >= SWITCH ? "relief_open" : "neutral", look: 1 }, t);
        if (f >= 910 && f < 936) { const k = q(smooth((f - 912) / 12), 8); push(out, `switch${k}`, 300, 400, (p) => fxHandSwitch(p, k), BLOWER[0] - 0.12, 0.92 - 0.0, BLOWER[2] + 0.3, 0.3, 0.4); }
        if (f >= SWITCH && f < SWITCH + 6) { const u = q((f - SWITCH) / 6, 6); push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), BLOWER[0] + 0.18, 0.56, BLOWER[2] + 0.3, 0.22, 0.22); }
        if (f >= 940) notes(out, f, pipeTops(7, 3), "#1f2a44", 0.15);
      } else {
        if (f < WEIGHT + 8) { const k = q(smooth((f - 966) / (WEIGHT - 966)), 12); push(out, `bag${k}|${f >= WEIGHT ? 1 : 0}`, 300, 700, (p) => fxHandBag(p, f >= WEIGHT ? 1 : k), ORG[0] + 0.22, KEY_Y + 0.27 + 0.0, ORG[2] + 0.46, 0.2, 0.47); }
        organNotes(out, id, f);
      }
      break;
    }
    case 10: {
      if (f < 1078) {
        const kp = O(-1.9, 0, 1.6);
        stand(out, cam, WHO.worker[1], kp, { expr: "whistle", look: 1 }, t);
        const u = q((t * 1.4) % 1, 12), hp = add(kp, [cam.right.x * 0.04, 1.41, cam.right.z * 0.04 + 0.06]);
        push(out, `bottle${u}`, 500, 600, (p) => fxBottle(p, u), hp[0], hp[1] - 0.12, hp[2], 0.2, 0.24);
        if (f >= 1040) notes(out, f, [add(hp, [0.06, 0.1, 0])], "#1f2a44", 0.09);
      } else {
        const p3 = PIPES[3], base = O(p3[0], PIPE_Y + 0.12, 0.0);
        const u = q((t * 1.2) % 1, 16);
        push(out, `air${u}`, 200, 700, (p) => fxAir(p, u), base[0], base[1] + 0.55, base[2] + 0.06, 0.12, 0.42, { soft: true });
        organNotes(out, id, f);
      }
      break;
    }
    case 11: {
      calendar(out, id, f); organNotes(out, id, f);
      if (f >= 1200) push(out, "web", 400, 400, fxCobweb, ORG[0] - 0.72, PIPE_Y + 0.0, ORG[2] + 0.31, 0.35 * clamp01((f - 1200) / 40) + 0.05, 0.35 * clamp01((f - 1200) / 40) + 0.05, { soft: true });
      break;
    }
    case 12: {
      organNotes(out, id, f);
      for (let k = 0; k < 16; k++) {
        const f0 = 1272 + k * 3.2, seat = SEATS[(k * 7) % SEATS.length];
        walk(out, cam, WHO.folk[k], Ch(-0.6 + (k % 3) * 0.6, 0.02, 7.6), add(seat, [0, 0, 0.55]), f, f0, f0 + 50, "smile");
      }
      break;
    }
    case 13: {
      const clap = f >= 1454;
      for (let k = 0; k < SEATS.length; k++) if (k % 5 !== 4) sitAt(out, cam, WHO.folk[k], SEATS[k], { expr: clap ? (k % 2 ? "laugh" : "grin") : k % 3 ? "smile" : "smile_closed", clap: clap ? q(0.5 + 0.5 * Math.sin(t * 16 + k), 6) : undefined }, t);
      for (const [k, p] of [[20, Ch(-4.3, 0.02, -2)], [21, Ch(-4.3, 0.02, 0.5)], [22, Ch(4.3, 0.02, -1)], [23, Ch(4.2, 0.02, 1.8)], [24, Ch(-4.2, 0.02, 3)]] as const)
        stand(out, cam, WHO.folk[k], p, { expr: clap ? "grin" : "smile", clap: clap ? q(0.5 + 0.5 * Math.sin(t * 15 + k), 6) : undefined }, t);
      stand(out, cam, WHO.worker[0], O(0.95, 0, 0.6), { expr: f >= ADD_PIPE ? "grin" : "smile", look: -1, wave: f >= 1426 && f < ADD_PIPE ? 0.9 : undefined }, t);
      if (clap) push(out, `claps${q((t * 2) % 1, 8)}`, 400, 300, (p) => fxClapMarks(p, (t * 2) % 1), CH[0] - 0.5, 1.9, CH[2] - 3.0, 2.2, 1.6);
      organNotes(out, id, f);
      break;
    }
    case 15: {
      const age = visitorAge(f);
      sitAt(out, cam, WHO.vis[age], VISITOR, { expr: f >= 1690 ? "smile" : "smile_closed", headTilt: q(5 * Math.sin(t * 1.5), 5) }, t);
      organNotes(out, id, f);
      break;
    }
    case 17: {
      const sleep = f >= 1944 && f < FIRST_NOTE, woke = f >= FIRST_NOTE;
      for (let k = 0; k < SEATS.length; k++) if (k % 4 !== 3) {
        const e: Expr = woke ? "shock" : sleep ? "neutral" : f >= 1886 ? (k % 2 ? "nervous" : "neutral") : "smile";
        sitAt(out, cam, WHO.folk[k], SEATS[k], { expr: e, blink: sleep ? 1 : undefined, headTilt: sleep ? (k % 2 ? 12 : -12) : 0, look: f >= 1886 && f < 1944 ? (k % 2 ? 1 : -1) : 0 }, t);
      }
      if (sleep) for (const k of [0, 8, 13]) { const sp = SEATS[k]; push(out, `zzz${q((t * 0.8 + k * 0.3) % 1, 12)}`, 300, 300, (p) => fxZzz(p, (t * 0.8 + k * 0.3) % 1), sp[0] + 0.25, 1.95, sp[2] + 0.2, 0.45, 0.45); }
      if (f >= 1940) push(out, "web", 400, 400, fxCobweb, ORG[0] - 0.72, PIPE_Y, ORG[2] + 0.31, 0.4, 0.4, { soft: true });
      calendar(out, id, f);
      if (woke) notes(out, f, pipeTops(2, 1), "#1f2a44", 0.2, 0.7);
      break;
    }
  }
  void bodySide; void bodyFront; void fxShadow; void stroll; void CHURCH_Z; void WEIGHT; void FIRST_NOTE; void fxAir; void KID;
  return out;
};
type Outfit0 = Outfit; const Outfit0 = 0; void Outfit0;
