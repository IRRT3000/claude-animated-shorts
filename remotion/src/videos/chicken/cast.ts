// The headless-chicken cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, fxShadow, fxPuff, fxBurst, fxNote, Outfit, Expr, FrontOpts, SideOpts, INK,
  chickenCard, ChickOpts, fxXray, fxAim, fxFeathers, fxFeather, fxCorn, fxDial, fxNeon, fxBunting, fxBalloon,
  LLOYD, CLARA, MA, PROMOTER, SCIENTIST, PHOTOG, FARMHAND, FOLK45 } from "./toon";
import { fxSparkle, fxCoin, fxZzz, fxCough, fxDrop } from "./fx";
import { FPS, SHOTS, V3, STUMP, STUMP_TOP, COOP, LIGHTBOX, SCALE, TABLE_TOP, LLOYD_STUMP, MA_P, LLOYD_K, CLARA_K, MIKE_K,
  DINNER, JAW, MIKE, AXE, NECK, HIGH, TOOHIGH, WHOOSH, HEAD, VEIN, EAR, STEM, SHOOK, CORN, TUCK, HABIT, KEEP, DROP, MILK, WATER, THROAT,
  EXAM, CLOT, STEM2, REST, PROMO, CENTS, SNAP, TRIED, NONE, NOHEAD, CHOKE, SYR, LEFT, AXE2, FORGOT, PARTY, WANTED, lbsAt, popAt,
  FA, K, L, SH, M, R, T, smooth, clamp01, add } from "./story";
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
  /** horizontal squash (a spin on the spot: cos of the turn, negative = seen from behind / mirrored) */
  sx?: number;
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; down?: boolean; rot?: number; soft?: boolean };
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
const CONTACT: Record<LightName, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], lab: [0.26, 0.2, 0.26], night: [0.18, 0.18, 0.28], stage: [0.2, 0.14, 0.22], dusk: [0.24, 0.2, 0.33], moon: [0.16, 0.17, 0.3] };
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
const FRONT = { side: false, mirror: false };
const SEAT = Math.round(0.47 / SU); // bench seat height in design units
const push = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const stand = (out: Stage, cam: CamInfo, who: Who, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale);
};
const sitAt = (out: Stage, cam: CamInfo, who: Who, p0: V3, fo: FrontOpts, t: number, dz = 0.12, seat = SEAT) => {
  const p = add(p0, [dz, 0, 0]);
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "sit", seat, blink: lidAt(t, who.i), ...fo }, {}, 1));
  blob(out, p[0], p[1], p[2], 1);
};
/** a dancer: phase from the clock (one step cycle 0.72 s), energy 0 limp .. 1 wild; n = phase steps (crowds share canvases) */
const dance = (out: Stage, cam: CamInfo, who: Who, p: V3, t: number, o: { off?: number; energy?: number; expr?: Expr; sore?: boolean; n?: number; scale?: number; blink?: boolean; fo?: FrontOpts; shadow?: boolean } = {}) => {
  const n = o.n ?? 24, ph = q(((t / 0.72) + (o.off ?? who.i * 0.137)) % 1, n), e = q(o.energy ?? 1, 10);
  const fo: FrontOpts = { mode: "dance", phase: ph, energy: e, expr: o.expr ?? "dazed", sore: o.sore, blink: o.blink === false ? 0 : lidAt(t, who.i), ...(o.fo ?? {}) };
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, fo, {}, o.scale ?? 1));
  if (o.shadow !== false) blob(out, p[0], p[1], p[2], o.scale ?? 1);
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
const stroll = (out: Stage, cam: CamInfo, who: Who, p0: V3, dx: number, dz: number, v: number, f: number, f0: number, expr: Expr = "neutral") => {
  const s = ((f - f0) / FPS) * v, x = p0[0] + dx * s, z = p0[2] + dz * s;
  const view = viewOf(cam, x, z, dx, dz), ph = q((((f - f0) / FPS) * 0.7 + who.i * 0.13) % 1, 60), t = f / FPS;
  out.places.push(person(cam, who, x, p0[1], z, view, { mode: "stroll", phase: ph, expr, blink: lidAt(t, who.i) },
    { mode: "march", phase: ph, expr, stomp: 0.5, stride: 0.8 * view.fs, blink: lidAt(t, who.i) }));
  blob(out, x, p0[1], z);
};
/** music notes rising from points: each note drifts up 0.7 m over 1.6 s and fades by size */
const notes = (out: Stage, f: number, from: V3[], col = "#1f2a44", size = 0.2, seed = 0) => {
  from.forEach((p, k) => {
    for (let n = 0; n < 2; n++) {
      const u = q(((f / FPS) / 1.6 + k * 0.29 + n * 0.5 + seed) % 1, 24), s = size * (u < 0.15 ? u / 0.15 : u > 0.8 ? (1 - u) / 0.2 : 1);
      if (s < 0.02) continue;
      push(out, `note${(k + n) % 2}${col}`, 240, 260, (pp) => fxNote(pp, (k + n) % 2, col), p[0] + 0.15 * Math.sin(u * 6 + k), p[1] + 0.1 + 0.8 * u, p[2] + 0.02, s * 0.92, s);
    }
  });
};
// ---------------- chickens ----------------
/** a chicken card: side view facing the way it walks (dir); scale ~0.6 = a 45 cm rooster */
const chick = (out: Stage, cam: CamInfo, p: V3, o: ChickOpts, s = 0.6, dir: [number, number] = [1, 0], shadow = true, seed = 0) => {
  const mirror = dir[0] * cam.right.x + dir[1] * cam.right.z < 0;
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 0.3, p[2])) / s;
  const [w, h, k] = tier(d * 0.6);
  const oo: ChickOpts = { ...o, light: light2D(cam, mirror), ph: o.ph !== undefined ? q(o.ph % 1, 16) : undefined, puff: o.puff !== undefined ? q(o.puff, 20) : undefined, blink: o.blink ?? lidAt(0, seed) };
  out.places.push({ key: `chick|${fkey(oo)}`, x: p[0], y: p[1], z: p[2], scale: s, mirror, draw: (pp) => chickenCard(pp, oo), size: [w, h, k] });
  if (shadow) blob(out, p[0], p[1], p[2], s * 0.9);
};
const walkChick = (out: Stage, cam: CamInfo, p0: V3, p1: V3, f: number, f0: number, f1: number, o: ChickOpts = {}, s = 0.6, seed = 0, rate = 2.2) => {
  const u = clamp01((f - f0) / (f1 - f0)), dir: [number, number] = [p1[0] - p0[0], p1[2] - p0[2]];
  const p: V3 = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u];
  chick(out, cam, p, u <= 0 || u >= 1 ? { ...o, mode: o.mode === "flee" ? "stand" : "stand" } : { mode: "walk", ...o, ph: ((f - f0) / FPS) * rate + seed * 0.31 }, s, dir, true, seed);
};
const coin = (out: Stage, p: V3, f: number, f0: number, size = 0.12) => {
  if (f < f0 || f > f0 + 16) return;
  const u = (f - f0) / 16, turn = q((u * 3) % 1, 12);
  push(out, `coin${turn}`, 200, 200, (pp) => fxCoin(pp, turn), p[0], p[1] + 0.35 * Math.sin(Math.PI * u), p[2], size, size);
  if (f - f0 < 6) { const s2 = q((f - f0) / 6, 6); push(out, `spark${s2}`, 200, 200, (pp) => fxSparkle(pp, s2), p[0] + 0.06, p[1] + 0.12, p[2] + 0.02, size * 1.6, size * 1.6); }
};
const sparkle = (out: Stage, p: V3, f: number, f0: number, size = 0.4, n = 8) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, n); push(out, `spark${u}`, 200, 200, (pp) => fxSparkle(pp, u), p[0], p[1], p[2], size, size);
};
const puff = (out: Stage, p: V3, f: number, f0: number, size = 0.6, n = 6) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, n); push(out, `puff${u}`, 300, 300, (pp) => fxPuff(pp, u), p[0], p[1], p[2], size, size, { soft: true });
};
const burst = (out: Stage, p: V3, f: number, f0: number, size = 1.0, col = "#fff3b0") => {
  if (f < f0 || f >= f0 + 14) return;
  const u = q((f - f0) / 14, 14); push(out, `burst${u}${col}`, 400, 400, (pp) => fxBurst(pp, u, col, 10, 30, 160), p[0], p[1], p[2], size, size);
};
const feathers = (out: Stage, p: V3, f: number, f0: number, size = 0.9, n = 16) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, n); push(out, `feath${u}`, 400, 400, (pp) => fxFeathers(pp, u), p[0], p[1], p[2], size, size);
};
/** one feather drifting down from p0 to p1 between f0 and f1 */
const drift = (out: Stage, p0: V3, p1: V3, f: number, f0: number, f1: number, size = 0.16) => {
  if (f < f0) return;
  const u = smooth((f - f0) / (f1 - f0)), sw = q(Math.sin(((f - f0) / FPS) * 3.2), 10);
  const x = p0[0] + (p1[0] - p0[0]) * u + 0.12 * Math.sin(((f - f0) / FPS) * 3.2) * (1 - u), y = p0[1] + (p1[1] - p0[1]) * u, z = p0[2] + (p1[2] - p0[2]) * u;
  push(out, `feather${sw}`, 120, 200, (pp) => fxFeather(pp, sw), x, y, z, size * 0.6, size);
};
const zzz = (out: Stage, p: V3, f: number, size = 0.35) => { const u = q(((f / FPS) * 0.6) % 1, 16); push(out, `zzz${u}`, 300, 300, (pp) => fxZzz(pp, u), p[0], p[1], p[2], size, size); };
/** a small flat prop drawn on the ground / a table top (flat card) */
const plate = (out: Stage, p: V3, w = 0.3) => push(out, "plate", 200, 140, (pp) => { pp.ell(100, 70, 92, 62, "#f7f4ec", 8); pp.ell(100, 70, 58, 38, null, 4); }, p[0], p[1] + 0.003, p[2], w, w * 0.7, { flat: true });
const syringeCard = (pp: Pen) => {
  pp.poly([[40, 30], [200, 30], [200, 70], [40, 70]], "#dff2f7", 6); pp.poly([[40, 34], [120, 34], [120, 66], [40, 66]], "#f2c4bc", 0);
  pp.stroke([[200, 50], [250, 50]], 5, "#8a8f98"); pp.stroke([[40, 50], [8, 50]], 8); pp.stroke([[8, 26], [8, 74]], 10);
  for (const x of [70, 100, 130, 160]) pp.stroke([[x, 30], [x, 44]], 3);
};
/** an axe leaning against something (upright card 200 x 500) */
const axeCard = (pp: Pen) => {
  pp.band([[100, 480], [100, 80]], "#b07a48", 22, 6, "round");
  pp.poly([[100, 60], [180, 40], [190, 150], [100, 130]], "#9aa2ae", 7); pp.stroke([[182, 46], [190, 146]], 6, "#e6eaf0");
};
const beam = (pp: Pen) => {
  const g = pp.g, gr = g.createLinearGradient(0, 0, 0, 600); gr.addColorStop(0, "rgba(190,210,255,0.0)"); gr.addColorStop(0.3, "rgba(190,210,255,0.12)"); gr.addColorStop(1, "rgba(190,210,255,0.22)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(130, 0); g.lineTo(170, 0); g.lineTo(290, 600); g.lineTo(10, 600); g.closePath(); g.fill();
};
const moonPool = (pp: Pen) => {
  const g = pp.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(200,215,255,0.32)"); gr.addColorStop(0.6, "rgba(190,210,255,0.14)"); gr.addColorStop(1, "rgba(190,210,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
void beam;
const dropperFx = (pp: Pen) => {
  pp.poly([[88, 120], [112, 120], [104, 420], [96, 420]], "#dff2f7", 6); pp.ell(100, 300, 6, 60, "#f4efe6", 0);
  pp.ell(100, 80, 34, 54, "#c0353a", 7);
};
const hand = (pp: Pen, col: string) => { pp.ell(100, 100, 46, 34, col, 8); pp.stroke([[70, 120], [40, 200]], 46, INK); pp.stroke([[70, 120], [40, 200]], 32, "#5a8ac0"); };
void hand;
/** Clara's hand pinching the dropper bulb, her sleeve coming in from the top right (card 200 x 200, fingers at 60,140) */
const dropHand = (pp: Pen) => {
  pp.stroke([[78, 118], [200, -10]], 50, INK); pp.stroke([[78, 118], [200, -10]], 36, "#c25a7a");
  pp.ell(60, 136, 30, 24, "#f0d2ae", 7); pp.ell(36, 150, 12, 9, "#f0d2ae", 5);
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const W = {
    lloyd: { i: 1, o: LLOYD, okey: "lloyd" } as Who, clara: { i: 2, o: CLARA, okey: "clara" } as Who, ma: { i: 3, o: MA, okey: "ma" } as Who,
    promo: { i: 4, o: PROMOTER, okey: "promo" } as Who, photo: { i: 5, o: PHOTOG, okey: "photo" } as Who,
    sci: [0, 1, 2].map((k) => ({ i: 6 + k, o: SCIENTIST(k), okey: `sci${k}` }) as Who),
    hand: [0, 1, 2, 3].map((k) => ({ i: 10 + k, o: FARMHAND(k), okey: `fh${k}` }) as Who),
    folk: Array.from({ length: 14 }, (_, k) => ({ i: 20 + k, o: FOLK45(k), okey: `f45${k}` }) as Who),
  };
  const onStump: V3 = [STUMP[0], STUMP_TOP, STUMP[2]];
  const MS = 0.6; // Mike's card scale
  switch (id) {
    case 1: {
      walk(out, cam, W.lloyd, FA(0.3, 0.04, -12.4), FA(2.4, 0.04, -6.6), f, 4, 104, "whistle", { prop: ["axe", 0] });
      const look = f >= DINNER - 2;
      chick(out, cam, FA(3.4, 0, -8.4), { mode: look ? "stand" : "peck", ph: t * 1.4, v: 1, expr: look ? "shock" : "neutral" }, 0.55, [-1, 0], true, 1);
      chick(out, cam, FA(4.3, 0, -9.6), { mode: look ? "stand" : "peck", ph: t * 1.4 + 0.4, v: 2, expr: look ? "shock" : "neutral" }, 0.55, [-1, 0], true, 2);
      chick(out, cam, FA(0.2, 0, -8.0), { mode: look ? "stand" : "peck", ph: t * 1.4 + 0.7, v: 3, expr: look ? "shock" : "neutral" }, 0.55, [1, 0], true, 3);
      break;
    }
    case 2: {
      stand(out, cam, W.lloyd, FA(2.0, 0.04, -4.4), { expr: f >= JAW - 2 ? "shock" : "neutral", prop: ["axe", 0], look: -1 }, t);
      walkChick(out, cam, FA(1.3, 0, -2.5), FA(3.4, 0, -2.3), f, 108, 156, { head: false }, MS, 4, 2.6);
      break;
    }
    case 3: {
      if (f < 222) {
        stand(out, cam, W.lloyd, FA(4.0, 0.04, -6.5), { expr: "smile", prop: "axeDown" }, t);
        for (let k = 0; k < 6; k++) chick(out, cam, FA(5 + (k % 3) * 1.2, 0, -3.2 + Math.floor(k / 3) * 1.1), { mode: "peck", ph: t * 1.2 + k * 0.3, v: k % 4 }, 0.6, [k % 2 ? 1 : -1, 0], true, k);
      } else if (f < 274) {
        stand(out, cam, W.lloyd, FA(7.0, 0.04, -4.0), { expr: f >= MIKE - 4 ? "grin" : "smile", prop: "chickenHeld" }, t);
        chick(out, cam, FA(6.1, 0.06, -4.7), { mode: "stand", v: 1 }, 0.55, [1, 0], true, 5);
        chick(out, cam, FA(8.0, 0.06, -4.9), { mode: "peck", ph: t, v: 2 }, 0.55, [-1, 0], true, 6);
        sparkle(out, FA(7.25, 1.55, -3.8), f, MIKE - 2, 0.3, 10);
      } else {
        const up = f >= 279;
        stand(out, cam, W.lloyd, LLOYD_STUMP, { expr: up ? "stern" : "neutral", prop: up ? ["axe", 0] : "axeDown", look: 1 }, t);
        chick(out, cam, onStump, { mode: "stand", expr: f >= AXE ? "shock" : "neutral" }, 0.55, [1, 0], false, 7);
      }
      break;
    }
    case 4: {
      sitAt(out, cam, W.ma, MA_P, { expr: f >= NECK - 3 ? "lick" : "smile", prop: "fork", look: 0 }, t, 0, Math.round(0.5 / SU));
      plate(out, K(0, TABLE_TOP, -0.25), 0.34);
      break;
    }
    case 5: {
      const k = f < HIGH - 6 ? 0 : f < TOOHIGH - 6 ? 0.5 * smooth((f - HIGH + 6) / 8) : 0.5 + 0.5 * smooth((f - TOOHIGH + 6) / 8);
      stand(out, cam, W.lloyd, LLOYD_STUMP, { expr: f < 382 ? "stern" : "nervous", prop: ["axe", k], look: 1 }, t);
      chick(out, cam, onStump, { mode: "stand", expr: f >= TOOHIGH ? "shock" : "neutral" }, 0.55, [1, 0], false, 7);
      if (f >= 378) {
        const y = 0.28 + 0.1 * smooth((f - HIGH + 6) / 8) + 0.09 * smooth((f - TOOHIGH + 6) / 8);
        const kk = q(clamp01((f - 378) / 10), 6);
        push(out, `aim${kk}`, 200, 200, (pp) => fxAim(pp, kk), STUMP[0] + 0.12, STUMP_TOP + y, STUMP[2] + 0.06, 0.16, 0.16);
      }
      break;
    }
    case 6: {
      stand(out, cam, W.lloyd, LLOYD_STUMP, { expr: f >= HEAD - 2 ? "shock" : "stern", prop: f >= WHOOSH ? "axeDown" : ["axe", 1], look: 1 }, t);
      if (f < WHOOSH) chick(out, cam, onStump, { mode: "stand", expr: "shock" }, 0.55, [1, 0], false, 7);
      feathers(out, add(onStump, [0.35, 1.25, 0.05]), f, WHOOSH, 1.8, 18);
      puff(out, add(onStump, [0.4, 1.05, 0.1]), f, WHOOSH, 1.2, 8);
      break;
    }
    case 7: {
      const k = (f0: number) => (f < f0 - 2 ? 0 : f < f0 + 10 ? q(smooth((f - f0 + 2) / 6), 8) : 0.75);
      const v = k(VEIN), e = k(EAR), st = k(STEM);
      push(out, `xray${v}${e}${st}`, 640, 500, (pp) => fxXray(pp, v, e, st, 0), LIGHTBOX[0], LIGHTBOX[1], LIGHTBOX[2] + 0.07, 1.3, 1.0);
      break;
    }
    case 8: {
      const shake = f >= SHOOK - 8 && f < SHOOK + 16;
      const pecking = f >= 636;
      stand(out, cam, W.lloyd, FA(1.0, 0.04, 1.2), { expr: f >= CORN ? "dazed" : "shock", prop: "axeDown" }, t);
      chick(out, cam, FA(2.4, 0, 2.6), shake ? { mode: "shake", head: false, ph: ((f - SHOOK) / FPS) * 1.2 } : pecking ? { mode: "peck", head: false, ph: ((f - 636) / FPS) * 2.2 } : { mode: "stand", head: false }, MS, [1, 0], true, 8);
      feathers(out, FA(2.45, 0.35, 2.65), f, SHOOK - 2, 0.9, 16);
      push(out, "corn", 300, 300, (pp) => fxCorn(pp, 12), FA(2.75, 0.012, 2.75)[0], 0.012, FA(0, 0, 2.75)[2], 0.5, 0.5, { flat: true });
      break;
    }
    case 9: {
      const py = 0.92, pz = COOP[2] - 0.9;
      chick(out, cam, [COOP[0] - 0.65, py, pz], { mode: "tuck", v: 1 }, 0.5, [1, 0], false, 9);
      chick(out, cam, [COOP[0] - 0.25, py, pz], { mode: "tuck", v: 2 }, 0.5, [1, 0], false, 10);
      chick(out, cam, [COOP[0] + 0.6, py, pz], { mode: "tuck", v: 3 }, 0.5, [-1, 0], false, 11);
      chick(out, cam, [COOP[0] + 0.17, py, pz + 0.02], f >= TUCK ? { mode: "tuck", head: false } : { mode: "stand", head: false }, 0.52, [1, 0], false, 12);
      if (f >= HABIT) zzz(out, [COOP[0] + 0.27, py + 0.5, pz + 0.05], f, 0.3);
      zzz(out, [COOP[0] - 0.8, py + 0.45, pz + 0.05], f + 20, 0.25);
      break;
    }
    case 10: {
      chick(out, cam, MIKE_K, { mode: "crate", head: false }, 0.5, [1, 0], false, 13);
      if (f < 846) {
        stand(out, cam, W.lloyd, LLOYD_K, { expr: f >= KEEP - 4 ? "grin" : "neutral", look: 1 }, t);
        stand(out, cam, W.clara, CLARA_K, { expr: "smile", look: -1 }, t);
      } else {
        const neck: V3 = add(MIKE_K, [0.146, 0.31, 0.03]);
        const dy = f < DROP - 6 ? 0.18 : 0.05;
        push(out, "dropper", 200, 480, dropperFx, neck[0], neck[1] + dy + 0.09, neck[2], 0.075, 0.18);
        const bulbY = neck[1] + dy + 0.09 + 0.06;
        push(out, "dropHand", 200, 200, dropHand, neck[0] + 0.028, bulbY + 0.03, neck[2] + 0.01, 0.12, 0.12);
        for (const f0 of [DROP, 875, 905, THROAT]) if (f >= f0 && f < f0 + 8) push(out, "drop", 120, 160, (pp) => fxDrop(pp), neck[0], neck[1] + dy - 0.005 * (f - f0), neck[2], 0.025, 0.033);
        if (f >= MILK - 2 && f < WATER - 2) { stand(out, cam, W.clara, add(MIKE_K, [0.32, -TABLE_TOP + 0.04, -0.45]), { expr: "smile", prop: "milk", look: -1 }, t); sparkle(out, add(MIKE_K, [0.44, 0.65, -0.35]), f, MILK, 0.15, 8); }
        if (f >= WATER - 2) { stand(out, cam, W.clara, add(MIKE_K, [0.32, -TABLE_TOP + 0.04, -0.45]), { expr: "smile", prop: "glass", look: -1 }, t); sparkle(out, add(MIKE_K, [0.44, 0.62, -0.35]), f, WATER, 0.15, 8); }
      }
      break;
    }
    case 11: {
      const mike: V3 = L(0.0, 0.92, -1.6);
      if (f < 1030 || f >= 1116) {
        chick(out, cam, mike, { mode: "stand", head: false }, 0.5, [1, 0], false, 14);
        stand(out, cam, W.sci[0], L(-0.85, 0.04, -0.75), { expr: f >= REST ? "grin" : "neutral", look: 1 }, t);
        stand(out, cam, W.sci[1], L(0.85, 0.04, -0.75), { expr: f >= REST - 2 ? "relief" : "shock", shrug: f >= REST - 2 ? q(smooth((f - REST + 2) / 6), 6) : 0, look: -1 }, t);
        push(out, `xray2${f >= 1116 ? 0.6 : 0}${f >= 1116 ? 1 : 0.25}`, 640, 500, (pp) => fxXray(pp, 0.35, 0.25, f >= 1116 ? 1 : 0.25, f >= 1116 ? 0.6 : 0), LIGHTBOX[0], LIGHTBOX[1], LIGHTBOX[2] + 0.07, 1.3, 1.0);
        stand(out, cam, W.sci[2], L(-0.45, 0.04, -2.25), { expr: "nervous", prop: f >= EXAM - 6 && f < 1030 ? "stetho" : null, look: 1 }, t);
      } else {
        const c = f < CLOT - 2 ? 0 : q(0.6 + 0.4 * Math.abs(Math.sin(((f - CLOT) / FPS) * 5)), 8);
        const st = f < STEM2 - 2 ? 0.25 : q(smooth((f - STEM2 + 2) / 6), 8);
        push(out, `xray2${c}${st}`, 640, 500, (pp) => fxXray(pp, 0.35, 0.25, st, c), LIGHTBOX[0], LIGHTBOX[1], LIGHTBOX[2] + 0.07, 1.3, 1.0);
      }
      break;
    }
    case 12: {
      if (f < 1188) {
        stand(out, cam, W.lloyd, SH(-2.0, 0.04, 4.6), { expr: f >= PROMO ? "shock" : "neutral", look: -1 }, t);
        chick(out, cam, SH(-2.45, 0.06, 5.7), { mode: "stand", head: false }, 0.5, [-1, 0], true, 15);
        if (f >= PROMO - 2) stand(out, cam, W.promo, SH(-2.9, 0.04, 5.0), { expr: "grin", prop: f < PROMO + 30 ? "hatoff" : "cane2", look: 1 }, t);
        puff(out, SH(-2.9, 1.0, 5.1), f, PROMO - 3, 1.4, 8);
      } else if (f >= 1220) {
        const booth: V3 = SH(1.6, 1.25, 5.4);
        stand(out, cam, W.promo, SH(1.6, 0.04, 4.1), { expr: "grin", look: 1, prop: "cane2" }, t);
        for (let k = 0; k < 4; k++) {
          const z0 = 6.0 + k * 0.3, x0 = 1.0 - k * 0.7;
          stand(out, cam, W.folk[k], SH(x0, 0.04, z0), { expr: k % 2 ? "smile" : "grin", look: -1, prop: k === 0 && f >= 1225 && f < 1243 ? ["coin", q((t * 2) % 1, 8)] : null }, t);
        }
        for (const f0 of [1226, 1236, CENTS, 1252]) coin(out, booth, f, f0, 0.1);
      }
      break;
    }
    case 13: {
      const ped: V3 = SH(-1.2, 0.95, -1.0);
      chick(out, cam, ped, { mode: f >= SNAP - 10 ? "flex" : "stand", head: false }, 0.55, [1, 0], false, 16);
      stand(out, cam, W.photo, SH(0.15, 0.04, -0.3), { expr: f >= SNAP ? "grin" : "neutral", prop: ["camera", f >= SNAP && f < SNAP + 4 ? 1 : 0], look: -1 }, t);
      stand(out, cam, W.promo, SH(-2.3, 0.04, -0.4), { expr: "grin", prop: "cane2", look: 1 }, t);
      stand(out, cam, W.lloyd, SH(-0.3, 0.04, -2.2), { expr: "smile", look: -1 }, t);
      burst(out, SH(0.35, 1.75, -0.25), f, SNAP, 0.9, "#fffbe0");
      break;
    }
    case 14: {
      const fled = f >= NONE - 6;
      W.hand.slice(0, 3).forEach((w, k) => stand(out, cam, w, FA(-10.3 + k * 1.3, 0.04, -3.2 - (k % 2) * 0.3),
        { expr: fled ? "sad" : f >= TRIED ? "grin" : "smile", prop: fled ? "hatHeart" : ["axe", 0], look: k === 1 ? 0 : k ? -1 : 1 }, t));
      for (let k = 0; k < 3; k++) {
        const p0 = FA(-10.1 + k * 1.3, 0, -2.0);
        if (!fled) chick(out, cam, p0, { mode: "stand", v: k + 1, expr: f >= 1380 ? "shock" : "neutral" }, 0.55, [k === 2 ? -1 : 1, 0], true, 20 + k);
        else if (f < NONE + 20) walkChick(out, cam, p0, add(p0, [k === 0 ? -3 : 3, 0, 0.6]), f, NONE - 6, NONE + 14, { mode: "flee", v: k + 1, expr: "shock" }, 0.55, 20 + k, 3.4);
      }
      drift(out, FA(-9.65, 2.4, -2.4), FA(-9.7, 0.05, -2.2), f, 1402, 1432);
      break;
    }
    case 15: {
      const lb = lbsAt(f), pf = 1 + 0.5 * clamp01((lb - 2.5) / 5.3);
      const on: V3 = [SCALE[0], 0.15, SCALE[2]];
      chick(out, cam, on, { mode: f >= NOHEAD - 4 ? "flex" : "stand", head: false, puff: pf }, 0.5, [-1, 0], false, 17);
      const lq = q(lb, 20);
      push(out, `dial${lq}`, 400, 400, (pp) => fxDial(pp, lq), SCALE[0], 1.4, SCALE[2] - 0.12, 0.55, 0.55);
      stand(out, cam, W.lloyd, SH(-0.4, 0.04, -1.6), { expr: f >= 1530 ? "grin" : "smile", look: 1 }, t);
      stand(out, cam, W.promo, SH(2.1, 0.04, -1.4), { expr: "grin", prop: "cane2", look: -1 }, t);
      sparkle(out, [SCALE[0] - 0.2, 0.75, SCALE[2] + 0.1], f, NOHEAD, 0.3, 9);
      break;
    }
    case 16: {
      const on = (f < 1590 || f > 1596) && (f < 1612 || f > 1615) ? 1 : 0;
      push(out, `neon${on}`, 300, 500, (pp) => fxNeon(pp, on), M(6, 5.6, 2)[0], 5.6, M(0, 0, 2)[2], 2.2, 3.6);
      break;
    }
    case 17: {
      const crate: V3 = R(0.35, 0.44, 0.2);
      if (f < 1684) {
        sitAt(out, cam, W.lloyd, R(-0.75, 0.04, -1.1), { expr: f >= CHOKE ? "shock" : "tired", look: 1 }, t, 0, Math.round(0.56 / SU));
        chick(out, cam, crate, { mode: f >= CHOKE - 4 ? "cough" : "crate", head: false }, 0.5, [-1, 0], false, 18);
        if (f >= CHOKE - 2) { const u = q(((f - CHOKE) / FPS) % 0.7 / 0.7, 10); push(out, `cough${u}`, 400, 300, (pp) => fxCough(pp, u), crate[0] - 0.2, crate[1] + 0.45, crate[2], 0.4, 0.3, { soft: true }); }
      } else {
        chick(out, cam, crate, { mode: "cough", head: false }, 0.5, [-1, 0], false, 18);
        stand(out, cam, W.clara, R(0.95, 0.04, -0.3), { expr: "shock", prop: "suitcase", look: -1 }, t);
        stand(out, cam, W.lloyd, R(0.15, 0.04, -0.5), { expr: "nervous", look: 1 }, t);
        for (const f0 of [1692, 1702, 1714, 1726]) puff(out, R(0.75, 1.45, -0.05), f, f0, 0.5, 8);
      }
      break;
    }
    case 18: case 20: {
      const tab: V3 = SH(-0.45, 0.885, -0.45);
      push(out, "syringe", 260, 100, syringeCard, tab[0], tab[1] + 0.003, tab[2], 0.3, 0.115, { flat: true, rot: 0.4 });
      if (id === 18) sparkle(out, add(tab, [0.04, 0.06, 0.05]), f, LEFT - 2, 0.16, 10);
      else { sparkle(out, add(tab, [0.04, 0.06, 0.05]), f, FORGOT + 8, 0.12, 10); push(out, "moonpool", 256, 256, moonPool, tab[0], tab[1] + 0.004, tab[2], 0.5, 0.36, { flat: true, soft: true }); }
      break;
    }
    case 19: {
      push(out, "axeLean", 200, 500, axeCard, STUMP[0] - 0.4, 0.42, STUMP[2] + 0.1, 0.34, 0.85, { rot: -0.3 });
      drift(out, add(STUMP, [0.2, 2.4, 0.1]), add(STUMP, [0.05, STUMP_TOP + 0.09, 0.05]), f, 1798, AXE2 + 22);
      break;
    }
    case 21: {
      chick(out, cam, T(2.9, 1.2, -5.9), { mode: "flex", head: false, v: 3 }, 3.0, [-1, 0], false, 30);
      const ppl: [number, number][] = [[-2.5, 3], [-1.2, 4.5], [0.4, 2.2], [1.6, 5.0], [-3.4, 6.5], [3.4, 1.0], [-0.4, 7.5], [2.6, 8.0], [-2.0, -1.0], [1.0, -2.5]];
      ppl.forEach(([x, z], k) => stand(out, cam, W.folk[k], T(x, 0.04, z), { expr: k % 3 ? "laugh" : "grin", look: x > 0 ? -1 : 1, shrug: f >= PARTY - 2 && k % 2 ? 1 : 0 }, t));
      for (const z of [-12, -2, 9]) push(out, "bunt", 1000, 160, fxBunting, T(0, 5.2, z)[0], 5.2, T(0, 0, z)[2], 10, 1.6);
      const cols = ["#d8323a", "#f2c64a", "#3f7ab5", "#5bab6a", "#e86a9a"];
      for (let k = 0; k < 7; k++) { const sw = q(Math.sin(t * 1.5 + k), 6), c = cols[k % 5]; push(out, `ball${c}${sw}`, 160, 400, (pp) => fxBalloon(pp, c, sw), T(-4 + k * 1.4, 0, 0)[0], 2.4 + (k % 3) * 0.4 + 0.05 * Math.sin(t * 2 + k), T(0, 0, (k % 2 ? 3 : 6))[2], 0.35, 0.9); }
      break;
    }
    case 22: {
      sitAt(out, cam, W.lloyd, K(-0.45, 0.04, -0.75), { expr: f >= WANTED - 3 ? "tired" : "sad", prop: "fork", look: 0 }, t, 0, Math.round(0.5 / SU));
      plate(out, K(-0.45, TABLE_TOP, -0.25), 0.34);
      break;
    }
  }
  void popAt; void sparkle; void walk; void bodySide; void HEAD;
  return out;
};
