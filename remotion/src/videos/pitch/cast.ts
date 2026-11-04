// The cox-clock cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, PARNELL_O, mainstone, STAFF, audience, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxSparkle, fxRain, fxShards, fxCalPage, fxSnips, fxPour, fxWater, fxHoney, fxConfetti, fxPrize, fxMug, fxCase, fxPlip } from "./fx";
import { FPS, SHOTS, V3, APP, CHAIR, PARNELL, BLOCK, DOOR, WATER, HONEY, STAGE, STAGE_H, TIP_Y, LAB, FALLS, FALL_F, SEPARATE, SHATTER, STEM_CUT, POUR,
  POWER_OFF, calendarAt, hairAge, hammerAt, pileAt, pileTop, smooth, clamp01, add } from "./story";
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
  parnell: { i: 1, o: PARNELL_O, okey: "parnell" } as Who,
  main: [0, 1, 2].map((k) => ({ i: 2, o: mainstone(k), okey: `main${k}` }) as Who),
  staff: [0, 1].map((k) => ({ i: 20 + k, o: STAFF(k), okey: `staff${k}` }) as Who),
  folk: [0, 1, 2, 3].map((k) => ({ i: 10 + k, o: audience(k), okey: `a${k}` }) as Who),
};
const FRONT = { side: false, mirror: false };
const A = (x: number, y: number, z: number): V3 => add(APP, [x, y, z]);
const Lb = (x: number, y: number, z: number): V3 => add(LAB, [x, y, z]);
const HAND_R = 0.66, HAND_UP = 1.12;
const SEAT = Math.round(0.47 / SU); // chair seat height in design units
const at = (cam: CamInfo, p: V3, r: number, up: number): V3 => [p[0] + cam.right.x * r, p[1] + up, p[2] + cam.right.z * r];
const push = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const stand = (out: Stage, cam: CamInfo, who: Who, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale);
};
/** seated on the lab chair (card just in front of the seat so the seat does not cut the hips) */
const sit = (out: Stage, cam: CamInfo, who: Who, fo: FrontOpts, t: number) => {
  const p = add(CHAIR, [0, 0, 0.14]);
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
/** a prop card held at the near hand */
const held = (out: Stage, cam: CamInfo, p: V3, key: string, cw: number, ch: number, draw: (p: Pen) => void, w: number, h: number, up = 0) => {
  const hp = at(cam, p, HAND_R * 0.8, HAND_UP * 0.92 + up);
  push(out, key, cw, ch, draw, hp[0], hp[1], hp[2] + 0.05, w, h);
};
/** the plip as a drop lands: a little splash crown on the pile (frames f0 .. f0 + 12) */
const plip = (out: Stage, f: number, f0: number) => {
  if (f < f0 || f >= f0 + 12) return;
  const u = q((f - f0) / 12, 12), y = pileTop(pileAt(f));
  push(out, `plip${u}`, 300, 200, (p) => fxPlip(p, u), APP[0], y + 0.03, APP[2] + 0.05, 0.2, 0.13);
};
/** a calendar page tearing off whenever the page index steps (8 f flight) */
const calendar = (out: Stage, id: number, f: number) => {
  const c0 = calendarAt(id, f);
  for (let k = 1; k <= 8; k++) if (calendarAt(id, f - k) < calendarAt(id, f - k + 1) || (k === 1 && calendarAt(id, f - 1) < c0)) {
    const u = q(k / 8, 8);
    push(out, `cal${u}`, 300, 300, (p) => fxCalPage(p, u), APP[0] - 0.62 + 0.3 * u, 2.25 + 0.1 * u, LAB[2] - 3.9 + 0.2 * u, 0.5, 0.5);
    break;
  }
};
const parnell = (out: Stage, cam: CamInfo, t: number, fo: FrontOpts) => stand(out, cam, WHO.parnell, PARNELL, fo, t, 1, false);

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  for (const x of FALLS) plip(out, f, x + FALL_F);
  switch (id) {
    case 1: {
      if (f < 80) {
        stroll(out, cam, WHO.folk[0], [-9, 0.05, 7.5], 1, 0, 1.1, f, 0);
        stroll(out, cam, WHO.folk[1], [6, 0.05, -16.2], -1, 0, 1.0, f, 0, "smile");
        stroll(out, cam, WHO.folk[2], [0.8, 0.05, 2], 0, -1, 0.9, f, 0);
        stroll(out, cam, WHO.folk[3], [-1, 0.05, -5], 0, 1, 0.8, f, 0, "smile");
      }
      break;
    }
    case 2: {
      const sly = f >= 244 && f < 264;
      parnell(out, cam, t, { expr: sly ? "smile_closed" : f >= 264 ? "grin" : "neutral", headTilt: sly ? 9 : 0, look: f < 242 ? 1 : 0, wave: f >= 262 ? q(smooth((f - 262) / 8), 10) : undefined });
      break;
    }
    case 3: {
      parnell(out, cam, t, { expr: f < SHATTER ? "stern" : "shock", prop: ["hammer", q(hammerAt(f), 20)], look: 1 });
      if (f >= SHATTER && f < SHATTER + 16) {
        const u = q((f - SHATTER) / 16, 16);
        push(out, `shards${u}`, 600, 400, (p) => fxShards(p, u), BLOCK[0], BLOCK[1] + 0.16, BLOCK[2] + 0.12, 0.6, 0.4);
      }
      break;
    }
    case 4: {
      if (f >= POUR[0] && f < POUR[1]) {
        const len = q(clamp01((f - POUR[0]) / 5), 5), w = q((t * 3) % 1, 12);
        push(out, `pour${w}|${len}`, 160, 600, (p) => fxPour(p, w, len), APP[0] - 0.085, 1.67 + 0.045, APP[2] + 0.02, 0.05, 0.19);
      }
      if (f >= 474) { stand(out, cam, WHO.parnell, A(-0.95, 0, 0.55), { expr: "neutral", look: 1 }, t); calendar(out, id, f); }
      break;
    }
    case 5: {
      if (f < 572) {
        const k = q(clamp01((f - (STEM_CUT - 6)) / 6), 6);
        if (f < STEM_CUT + 14) push(out, `snips${k}`, 400, 300, (p) => fxSnips(p, k), APP[0] + 0.12, 1.35, APP[2] + 0.05, 0.22, 0.165);
        if (f >= STEM_CUT && f < STEM_CUT + 5) { const u = q((f - STEM_CUT) / 5, 5); push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), APP[0] + 0.02, 1.36, APP[2] + 0.06, 0.1, 0.1); }
      } else sit(out, cam, WHO.parnell, { expr: "neutral", look: -1, headTilt: f >= 590 ? -10 : 0 }, t);
      break;
    }
    case 6: case 7: calendar(out, id, f); break;
    case 8: {
      const age = hairAge(f), who = WHO.main[age];
      if (f < 838) walk(out, cam, WHO.main[0], add(DOOR, [0, 0, 0.35]), add(CHAIR, [0.05, 0, 0.3]), f, 776, 832, "smile");
      else sit(out, cam, who, { expr: f < 895 ? "smile" : "neutral", look: -1 }, t);
      break;
    }
    case 9: {
      if (f < 968) sit(out, cam, WHO.main[2], { expr: f < 961 ? "neutral" : "pained", look: -1 }, t);
      break;
    }
    case 10: {
      calendar(out, id, f);
      if (f >= 1032) {
        walk(out, cam, WHO.main[2], add(DOOR, [0, 0, 0.35]), add(DOOR, [-0.6, 0, 1.0]), f, 1032, 1040, f >= 1040 ? "shock" : "neutral");
        held(out, cam, f >= 1040 ? add(DOOR, [-0.6, 0, 1.0]) : add(DOOR, [-0.6 * clamp01((f - 1032) / 8), 0, 0.35 + 0.65 * clamp01((f - 1032) / 8)]), "case", 300, 260, fxCase, 0.3, 0.26, -0.45);
      }
      break;
    }
    case 11: {
      if (f < 1072) sit(out, cam, WHO.main[2], { expr: "neutral", look: -1 }, t);
      else if (f < 1102) walk(out, cam, WHO.main[2], add(CHAIR, [0.1, 0, 0.3]), add(DOOR, [0, 0, 0.2]), f, 1072, 1100);
      else if (f >= 1115) {
        const p0 = add(DOOR, [0, 0, 0.3]), p1 = add(DOOR, [-0.55, 0, 1.0]), u = clamp01((f - 1115) / 14);
        walk(out, cam, WHO.main[2], p0, p1, f, 1115, 1129, f >= 1131 ? "shock" : "smile");
        const mp = at(cam, [p0[0] + (p1[0] - p0[0]) * u, 0, p0[2] + (p1[2] - p0[2]) * u], 0.3, 0.88);
        push(out, `mug${q((t * 2) % 1, 8)}`, 300, 300, (p) => fxMug(p, (t * 2) % 1), mp[0], mp[1], mp[2] + 0.06, 0.3, 0.3);
      }
      break;
    }
    case 12: {
      for (const x of [-1.7, 1.9]) for (let n = 0; n < 3; n++) {
        const u = q((t * 2.2 + n * 0.33) % 1, 12);
        push(out, `rain${u}`, 400, 800, (p) => fxRain(p, u), LAB[0] + x + (n - 1) * 0.35, 2.45, LAB[2] - 3.9, 0.45, 0.9, { soft: true });
      }
      void POWER_OFF;
      break;
    }
    case 13: {
      const u = q((t * 2.4) % 1, 12);
      push(out, `water${u}`, 120, 600, (p) => fxWater(p, u), WATER[0], WATER[1] + 0.28, WATER[2] + 0.01, 0.035, 0.18);
      break;
    }
    case 14: {
      const s2 = q(0.15 + 0.3 * clamp01((f - 1467) / 83), 30);
      push(out, `honey${s2}`, 400, 700, (p) => fxHoney(p, s2), HONEY[0] - 0.02, HONEY[1] + 0.3, HONEY[2] + 0.02, 0.2, 0.35);
      calendar(out, id, f);
      break;
    }
    case 15: {
      const p: V3 = add(STAGE, [0, STAGE_H, 0]), big = f >= 1610;
      stand(out, cam, WHO.main[2], p, { expr: big ? "laugh" : "smile", wave: big ? q(0.5 + 0.4 * smooth((f - 1610) / 6), 10) : undefined }, t);
      const hp = big ? at(cam, p, 0.6, 1.95) : at(cam, p, 0.3, 0.95);
      push(out, "prize", 300, 400, fxPrize, hp[0], hp[1], hp[2] + 0.06, 0.32, 0.43);
      if (f >= 1612) for (const [dx, dy, ph] of [[-0.55, 0.3, 0], [0.5, 0.1, 0.37], [0.05, 0.75, 0.71]]) {
        const u = q(((f - 1612) / 45 + ph) % 1, 20);
        push(out, `conf${u}`, 600, 800, (pp) => fxConfetti(pp, u), STAGE[0] + dx, STAGE_H + 2.1 + dy, STAGE[2] + 0.6, 1.1, 1.45, { soft: true });
      }
      break;
    }
    case 17: {
      if (f >= 1880 && f < 1940) {
        const bumped = f >= SEPARATE;
        stand(out, cam, WHO.staff[0], A(-0.62, 0, 0.42), { expr: bumped ? "shock" : "neutral", wave: 0.8, look: 1 }, t);
        stand(out, cam, WHO.staff[1], A(0.62, 0, 0.42), { expr: bumped ? "nervous" : "smile", wave: 0.8, look: -1 }, t);
      }
      plip(out, f, SEPARATE);
      break;
    }
  }
  void bodySide; void bodyFront; void fxShadow; void TIP_Y; void Lb; void stroll;
  return out;
};
type Outfit0 = Outfit; const Outfit0 = 0; void Outfit0;
