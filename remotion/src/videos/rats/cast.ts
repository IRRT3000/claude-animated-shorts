// The rat-bounty cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, fxShadow, fxPuff, fxBurst, fxNote, Outfit, Expr, FrontOpts, SideOpts,
  ratCard, RatOpts, OFFICIAL, CLERK, HUNTER, vnFolk, LADY, GENT, FARMER, GARDENER } from "./toon";
import { fxSparkle, fxHeat, fxCat, fxCoin, fxSnips, fxSacks, fxStink, fxPlague, fxHearts, fxWeed, fxTail, fxSplashT } from "./fx";
import { FPS, SHOTS, V3, DESK, DESK_TOP, MAN, PILE, GRATE, GARDEN, CAT_Z, LOO, CAGES, CLERK_P, CUST_P, OFF_P, GENT_P, FARMER_P, OWNER_P, GARD_P,
  PAID, FARMING, SHINY, WARM, PRED, POP, JUMP, POINT, pileAt, EVERYONE, CENT, STINK, TAIL1, POURED, basketAt, ANYWHERE, NOTAIL, GRAB, SNIP, LETGO,
  MORE, MTAILS, FARMS, WEED, WEEDS, SCRAP, TAILS, ONE, fogAt, C, S, B, F, smooth, clamp01, add } from "./story";
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
const WHO = {
  clerk: { i: 1, o: CLERK, okey: "clerk" } as Who,
  off: [0, 1, 2].map((k) => ({ i: 2 + k, o: OFFICIAL(k), okey: `off${k}` }) as Who),
  hunter: [0, 1, 2, 3].map((k) => ({ i: 5 + k, o: HUNTER(k), okey: `hunt${k}` }) as Who),
  lady: { i: 9, o: LADY, okey: "lady" } as Who,
  gent: { i: 10, o: GENT, okey: "gent" } as Who,
  farmer: { i: 11, o: FARMER, okey: "farmer" } as Who,
  gardener: { i: 12, o: GARDENER, okey: "gard" } as Who,
  folk: Array.from({ length: 16 }, (_, k) => ({ i: 20 + k, o: vnFolk(k), okey: `vn${k}` }) as Who),
};
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
// ---------------- rats ----------------
/** a rat card: side views face the way it runs (dir), scale ~0.4 (a 30 cm rat) */
const rat = (out: Stage, cam: CamInfo, p: V3, o: RatOpts, s = 0.4, dir: [number, number] = [1, 0], shadow = true, seed = 0) => {
  const view = o.mode === "back" || o.mode === "hang";
  const mirror = !view && dir[0] * cam.right.x + dir[1] * cam.right.z < 0;
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 0.2, p[2])) / s;
  const [w, h, k] = tier(d * 0.6);
  const oo: RatOpts = { ...o, light: light2D(cam, mirror), ph: o.ph !== undefined ? q(o.ph, 12) : undefined, blink: o.blink ?? lidAt(0, seed) };
  out.places.push({ key: `rat|${fkey(oo)}`, x: p[0], y: p[1], z: p[2], scale: s, mirror, draw: (pp) => ratCard(pp, oo), size: [w, h, k] });
  if (shadow) blob(out, p[0], p[1], p[2], s * 0.8);
};
/** a rat running from p0 to p1 between f0 and f1 (sitting at either end, unless hide) */
const ratRun = (out: Stage, cam: CamInfo, p0: V3, p1: V3, f: number, f0: number, f1: number, o: RatOpts = {}, s = 0.4, endMode: RatOpts["mode"] = "sit", seed = 0) => {
  const u = clamp01((f - f0) / (f1 - f0)), dir: [number, number] = [p1[0] - p0[0], p1[2] - p0[2]];
  const p: V3 = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u];
  if (u <= 0 || u >= 1) rat(out, cam, p, { ...o, mode: endMode }, s, dir, true, seed);
  else rat(out, cam, p, { ...o, mode: "run", ph: ((f - f0) / FPS) * 3.2 + seed * 0.37 }, s, dir, true, seed);
};
/** spots for a crowd of sitting rats inside a box (deterministic) */
const ratSpots = (x0: number, x1: number, z0: number, z1: number, n: number, seed: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; out.length < n && i < n * 6; i++) {
    const x = x0 + (x1 - x0) * hh(i, seed), z = z0 + (z1 - z0) * hh(i, seed + 1);
    if (out.every(([a, b]) => Math.hypot(a - x, b - z) > 0.32)) out.push([x, z]);
  }
  return out;
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
/** the plague: soft green cloud banks; k 0..1 how far they have rolled from `from` toward `to` */
const plague = (out: Stage, from: V3, to: V3, k: number, n: number, size: number, f: number) => {
  for (let i = 0; i < n; i++) {
    const u = clamp01(k * 1.3 - (i % 4) * 0.08), jx = (hh(i, 41) - 0.5) * size * 1.6, jz = (hh(i, 42) - 0.5) * size * 0.8;
    if (u <= 0) continue;
    const x = from[0] + (to[0] - from[0]) * u + jx + Math.sin(f / 40 + i) * size * 0.05, z = from[2] + (to[2] - from[2]) * u + jz;
    push(out, `plague${i % 3}`, 512, 256, (pp) => fxPlague(pp, i % 3), x, from[1] + (to[1] - from[1]) * u + hh(i, 43) * size * 0.2, z, size * (0.8 + 0.4 * hh(i, 44)), size * 0.5 * (0.8 + 0.4 * hh(i, 44)), { soft: true });
  }
};
/** the sack heap card standing on the ground at p (n: 0..2, 2 = a mountain) */
const sacks = (out: Stage, p: V3, n: number, w = 2.2) => {
  const k = Math.min(1, n), big = n > 1 ? 1 + 0.9 * (n - 1) : 1, kk = q(k, 20);
  push(out, `sacks${kk}`, 800, 600, (pp) => fxSacks(pp, kk), p[0], p[1] + (w * big * 0.75) / 2, p[2], w * big, w * big * 0.75);
};
/** a basket of tails standing on the desk (k = how full) */
const basket = (out: Stage, cam: CamInfo, p: V3, k: number, size = 0.75) => {
  const kk = q(k, 10);
  out.places.push({ key: `basket${kk}`, x: p[0], y: p[1], z: p[2], scale: size, draw: (pp) => bodyFrontBasket(pp, kk), size: [480, 800, 0.8] });
  void cam;
};
/** the basket drawn as a prop card on the 600 x 1000 canvas: a wide woven basket heaped with pink tails */
const bodyFrontBasket = (p: Pen, k: number) => {
  const n = Math.round(4 + 30 * k), top = 840 - 180 * k;
  for (let i = 0; i < n; i++) {
    const x = 160 + ((i * 97) % 280), y = top + ((i * 53) % 90), dx = (i % 2 ? 1 : -1) * (60 + (i * 31) % 80), dy = -40 - ((i * 17) % 90);
    const pts: [number, number][] = [];
    for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push([x + dx * t, y + dy * t - 20 * Math.sin(Math.PI * t)]); }
    p.line(pts, "#f4a6b2", 14 - 8 * 0);
  }
  p.poly([[110, 800], [490, 800], [450, 975], [150, 975]], "#c9a25a", 10);
  for (let i = 1; i < 4; i++) p.stroke([[110 + i * 10, 800 + i * 44], [490 - i * 10, 800 + i * 44]], 6, "#9a7a3a");
  p.ell(300, 800, 190, 26, "#d6b46a", 10);
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const deskTop = (x: number, z: number): V3 => [DESK[0] + x, DESK_TOP, DESK[2] + z];
  switch (id) {
    case 1: {
      const paid = f >= PAID;
      stand(out, cam, WHO.clerk, CLERK_P, { expr: paid ? "smile" : "neutral", prop: paid && f < PAID + 26 ? ["coin", q((t * 2) % 1, 8)] : null, look: 1 }, t);
      stand(out, cam, WHO.off[0], C(-1.3, 0.04, -14.6), { expr: "stern", look: 1 }, t);
      const cust = C(1.05, 0.04, -12.2), dropped = f >= 34;
      stand(out, cam, WHO.hunter[0], cust, { expr: paid ? "grin" : "neutral", prop: dropped ? (paid ? ["coin", q((t * 3) % 1, 8)] : null) : "sack", look: -1 }, t);
      if (dropped) sacks(out, deskTop(0.35, 0.05), 0.12, 0.75);
      coin(out, deskTop(0.6, 0.4), f, PAID, 0.14);
      stand(out, cam, WHO.folk[2], C(2.3, 0.04, -10.6), { expr: "smile", prop: "sack", look: -1 }, t);
      stand(out, cam, WHO.folk[5], C(3.1, 0.04, -9.0), { expr: "neutral", prop: "sack", look: -1 }, t);
      break;
    }
    case 2: {
      const pop = f >= FARMING - 6;
      stand(out, cam, WHO.farmer, FARMER_P, { expr: pop ? "grin" : "smile", shrug: pop ? q(smooth((f - FARMING + 6) / 8), 8) : 0 }, t);
      CAGES.forEach((c, i) => {
        const f0 = FARMING - 4 + (i % 7) * 1.5 + (i >= 7 ? 3 : 0);
        if (f < f0) return;
        const up = q(smooth((f - f0) / 5), 6), base: V3 = [c[0] - 0.1, 0.7 - 0.25 * (1 - up), c[2]];
        rat(out, cam, base, { mode: i % 3 ? "beg" : "sit", expr: i % 2 ? "happy" : "smug", v: i % 4 }, 0.36, [i % 2 ? 1 : -1, 0], false, i);
        if (i % 2 === 0) rat(out, cam, [c[0] + 0.22, 0.7 - 0.25 * (1 - up), c[2] + 0.05], { mode: "sit", expr: "happy", v: (i + 1) % 4 }, 0.3, [-1, 0], false, i + 30);
        puff(out, [c[0], 1.0, c[2] + 0.35], f, f0, 0.45);
      });
      break;
    }
    case 3: {
      if (f >= 225 && f < 246) {
        stroll(out, cam, WHO.lady, C(8.2, 0.1, 22), 0, 1, 0.9, f, 225, "smile");
        stroll(out, cam, WHO.gent, C(7.6, 0.1, 21.2), 0, 1, 0.9, f, 225);
        stroll(out, cam, WHO.folk[1], C(-8.0, 0.1, 18), 0, -1, 1.0, f, 225, "smile");
        stroll(out, cam, WHO.folk[4], C(-1.5, 0.04, 26), 0, -1, 1.1, f, 225);
      }
      if (f >= 246) {
        sparkle(out, add(MAN, [-0.18, 0.12, 0.1]), f, SHINY, 0.5, 10);
        sparkle(out, add(MAN, [0.2, 0.1, -0.1]), f, 263, 0.36, 9);
        stroll(out, cam, WHO.lady, C(1.0, 0.04, 21.5), -1, 0, 0.8, f, 246, "smile");
      }
      break;
    }
    case 4: {
      if (f < 322) {
        for (let k = 0; k < 4; k++) ratRun(out, cam, S(-1.5 + (k % 2) * 0.3, 0, -12 - k * 2.2), S(-1.6 + (k % 2) * 0.35, 0, 1 - k * 1.1), f, 290 + k * 5, 318 + k * 6, { expr: "happy", v: k }, 0.4, "sit", k);
      } else if (f < 380) {
        rat(out, cam, S(-1.15, 0, 0.9), { mode: "lounge", expr: f >= WARM ? "happy" : "sleep", ph: t * 0.4, v: 0 }, 0.42, [1, 0], true, 1);
        rat(out, cam, S(-1.75, 0, 0.15), { mode: "sit", expr: "happy", v: 1 }, 0.4, [1, 0], true, 2);
        rat(out, cam, S(-1.5, 0, -0.9), { mode: "sit", expr: "smug", v: 2 }, 0.38, [1, 0], true, 3);
        rat(out, cam, S(-0.95, 0, 0.1), { mode: "beg", expr: "happy", v: 3 }, 0.36, [-1, 0], true, 4);
        if (f >= 326 && f < 357) { const u = q((t * 1.2) % 1, 12); push(out, `hearts${u}`, 300, 300, (pp) => fxHearts(pp, u), S(-1.4, 0, 0.4)[0], 0.55, S(0, 0, 0.4)[2], 0.55, 0.55); }
        if (f >= WARM) { const u = q((t * 1.5) % 1, 12); push(out, `heat${u}`, 300, 400, (pp) => fxHeat(pp, u), S(-1.3, 0, 0.6)[0], 0.5, S(0, 0, 0.6)[2], 0.4, 0.53, { soft: true }); }
      } else {
        const sad = f >= PRED + 6, paw = f >= PRED - 2 && f < PRED + 14;
        push(out, `cat${sad ? 1 : 0}`, 400, 500, (pp) => fxCat(pp, sad ? 1 : 0, 0), S(0, 0, 0)[0], 4.32, CAT_Z - 0.05, 0.9, 1.12, { down: true });
        if (paw) { const u = Math.sin(clamp01((f - PRED + 2) / 16) * Math.PI); push(out, "paw", 200, 200, (pp) => { pp.ell(100, 100, 50, 60, "#e89a4a", 10); for (const k of [-1, 0, 1]) pp.stroke([[100 + k * 22, 70], [100 + k * 22, 110]], 6); }, S(0.08, 0, 0)[0], 4.22 - 0.1 * u, CAT_Z + 0.05, 0.16, 0.16, { down: true }); }
        rat(out, cam, S(0.95, 0, CAT_Z + 0.9), { mode: "beg", expr: f >= PRED + 4 ? "smug" : "happy", v: 1 }, 0.42, [-1, 0], true, 5);
      }
      break;
    }
    case 5: {
      const jump = f >= JUMP ? Math.max(0, Math.sin(clamp01((f - JUMP) / 10) * Math.PI)) * 0.3 : 0;
      stand(out, cam, WHO.gent, add(GENT_P, [0, jump, 0]), { expr: f < JUMP - 2 ? "whistle" : "shock", look: 1, shrug: f >= JUMP ? 1 : 0 }, t, 1, jump < 0.05);
      if (f >= POP - 1) {
        const up = smooth((f - POP + 1) / 5);
        rat(out, cam, [LOO[0] + 0.02, 0.12 + 0.22 * up, LOO[2] + 0.02], { mode: "beg", expr: "happy", v: 0, ph: t }, 0.34, [-1, 0], false, 6);
        if (f < POP + 10) { const u = q((f - POP + 1) / 11, 11); push(out, `splashT${u}`, 300, 300, (pp) => fxSplashT(pp, u), LOO[0], 0.62, LOO[2] + 0.1, 0.5, 0.5); }
      }
      break;
    }
    case 6: {
      const k = fogAt(id, f);
      plague(out, C(-10, 16, -90), C(0, 12, -27), k, 16, 16, f);
      for (const [w, x] of [[WHO.off[0], -2.6], [WHO.off[1], 2.2], [WHO.off[2], 0.2]] as const) stand(out, cam, w, C(x, 0.62, -18.6 + (x > 1 ? 0.3 : 0)), { expr: k > 0.4 ? "nervous" : "neutral", look: -1 }, t);
      break;
    }
    case 7: {
      const pt = f >= POINT - 3;
      stand(out, cam, WHO.off[1], add(MAN, [1.7, 0.04, -1.0]), { expr: pt ? "stern" : "neutral", wave: pt ? 1 : undefined, look: -1 }, t);
      const props = ["lantern", ["net", 0.3], "club", "lantern"] as const;
      for (let k = 0; k < 4; k++) {
        const f0 = 566 + k * 11, start = add(MAN, [-1.1 - k * 0.75, 0.04, -0.7 - k * 0.45]);
        if (f < f0) { stand(out, cam, WHO.hunter[k], start, { expr: k % 2 ? "smile" : "grin", prop: props[k] as never, look: 1 }, t); continue; }
        if (f < f0 + 6) { walk(out, cam, WHO.hunter[k], start, add(MAN, [0, 0.04, 0]), f, f0, f0 + 6, "grin", { prop: props[k] as never }); continue; }
        const sink = smooth((f - f0 - 6) / 12) * 2.3;
        if (sink < 2.2) stand(out, cam, WHO.hunter[k], add(MAN, [0, 0.04 - sink, 0]), { expr: "grin", prop: props[k] as never }, t, 1, false);
      }
      break;
    }
    case 8: {
      const swing = (k: number) => q(0.5 + 0.5 * Math.sin(t * 7 + k * 2), 6);
      stand(out, cam, WHO.hunter[1], S(-1.5, 0.0, 1.8), { expr: "grin", prop: ["net", swing(0)] }, t);
      stand(out, cam, WHO.hunter[0], S(1.5, 0.0, -0.6), { expr: "stern", prop: "lantern" }, t);
      stand(out, cam, WHO.hunter[2], S(-1.6, 0.0, -2.2), { expr: "grin", prop: "club" }, t);
      for (let k = 0; k < 8; k++) {
        const x = k % 2 ? -1.55 : 1.55, f0 = 612 + k * 3;
        ratRun(out, cam, S(x + (hh(k, 1) - 0.5) * 0.3, 0, 0.5 - k * 0.4), S(x, 0, -9 - k), f, f0, f0 + 30, { expr: "shock", v: k }, 0.38, "run", k);
      }
      puff(out, S(-1.2, 0.6, 1.4), f, 636, 0.8);
      break;
    }
    case 9: {
      const n = pileAt(f);
      sacks(out, PILE, n, 2.2);
      if (f < 700) {
        for (let k = 0; k < 2; k++) {
          const f0 = 652 + k * 18, up = smooth((f - f0) / 10);
          if (f >= f0) stand(out, cam, WHO.hunter[k], add(MAN, [0, 0.04 - 1.6 * (1 - up), 0]), { expr: "grin", prop: "sack" }, t, 1, up > 0.9);
        }
        stand(out, cam, WHO.off[0], add(PILE, [1.8, 0.04, 0.8]), { expr: f >= 668 ? "shock" : "neutral", look: -1 }, t);
      } else {
        stand(out, cam, WHO.off[0], add(PILE, [2.4, 0.04, 1.2]), { expr: "shock", look: -1 }, t);
        stand(out, cam, WHO.off[2], add(PILE, [3.2, 0.04, 0.4]), { expr: f >= 720 ? "shock" : "nervous", look: -1 }, t);
        stand(out, cam, WHO.lady, add(PILE, [-2.6, 0.1, 2.0]), { expr: "shock", look: 1 }, t);
        stand(out, cam, WHO.folk[3], add(PILE, [-1.6, 0.04, 2.8]), { expr: "laugh", look: 1 }, t);
      }
      break;
    }
    case 10: {
      out.places.push(person(cam, WHO.hunter[1], S(-1.45, 0, 0.2)[0], 0, S(0, 0, 0.2)[2], FRONT, { mode: "sit", seat: 0, expr: "tired", blink: lidAt(t, 6), prop: null, headTilt: -8 }, {}, 1));
      blob(out, S(-1.45, 0, 0)[0], 0, S(0, 0, 0.2)[2]);
      for (let k = 0; k < 12; k++) {
        const f0 = 740 + k * 4, x = -1.95 + (k % 3) * 0.12, z0 = -1.0 - (k % 4) * 0.4;
        ratRun(out, cam, S(x, 0, z0 + 4), S(x, 0, z0 - 9), f, f0, f0 + 40, { expr: k % 3 ? "happy" : "smug", v: k }, 0.36, "run", k);
      }
      break;
    }
    case 11: {
      if (f < 846) { // the bell: everyone a rat hunter
        const ring = q(0.5 + 0.5 * Math.sin(t * 18), 6), go = f >= EVERYONE - 2;
        stand(out, cam, WHO.off[0], C(-1.0, 0.04, -12.0), { expr: go ? "stern" : "neutral", prop: ["bell", go ? ring : 0] }, t);
        stand(out, cam, WHO.clerk, CLERK_P, { expr: "smile" }, t);
        burst(out, C(-0.6, 2.4, -11.9), f, EVERYONE - 2, 1.2);
        const kit = [["club"], ["net", 0.4], "sack", ["club"], "lantern", ["net", 0.6], "club", "sack"] as const;
        for (let k = 0; k < 8; k++) {
          const sd = k % 2 ? 1 : -1, p0 = C(sd * (9 + k * 0.6), 0.04, -4 + k * 0.9), p1 = C(sd * (1.6 + (k >> 1) * 0.75), 0.04, -9.6 + (k >> 1) * 0.7);
          const who = k < 4 ? WHO.folk[6 + k] : k < 6 ? WHO.hunter[k - 2] : k === 6 ? WHO.lady : WHO.folk[12];
          const pr = (Array.isArray(kit[k]) ? (kit[k].length > 1 ? kit[k] : kit[k][0]) : kit[k]) as never;
          walk(out, cam, who, p0, p1, f, EVERYONE + k * 2, EVERYONE + 30 + k * 2, "grin", { prop: pr });
        }
      } else if (f < 886) { // one cent per rat
        stand(out, cam, WHO.clerk, CLERK_P, { expr: f >= CENT - 2 ? "grin" : "smile", prop: ["coin", q((t * 1.5) % 1, 12)] }, t);
        coin(out, deskTop(0.0, 0.3), f, CENT - 2, 0.16);
        sparkle(out, C(0.35, 1.75, -13.6), f, CENT, 0.4, 10);
      } else if (f < 1006) { // nobody wanted piles of dead rats
        const k = smooth((f - 896) / 50), smell = f >= STINK - 4;
        sacks(out, C(0.4, 0.04, -12.0), 0.15 + 0.8 * k, 2.0);
        stand(out, cam, WHO.clerk, CLERK_P, { expr: smell ? "pained" : "nervous", tilt: smell ? -4 : 0, headTilt: smell ? -8 : 0 }, t);
        stand(out, cam, WHO.off[0], OFF_P, { expr: smell ? "pained" : "neutral", look: 1 }, t);
        for (let j = 0; j < 3; j++) {
          const f0 = 892 + j * 16, who = [WHO.hunter[2], WHO.folk[7], WHO.folk[9]][j];
          walk(out, cam, who, C(2.6 + j * 0.5, 0.04, -8 + j * 0.4), C(1.6 + j * 0.3, 0.04, -11.2 + j * 0.3), f, f0, f0 + 14, "grin", { prop: f < f0 + 16 ? "sack" : null });
        }
        if (smell) { const u = q((t * 1.2) % 1, 12); push(out, `stink${u}`, 300, 400, (pp) => fxStink(pp, u), 0.4, 2.0, -12.0, 1.0, 1.33, { soft: true }); }
      } else if (f < 1050) { // just bring the tail
        stand(out, cam, WHO.clerk, CLERK_P, { expr: f >= TAIL1 ? "grin" : "smile", prop: f >= TAIL1 - 6 ? "tail" : null }, t);
        sparkle(out, C(0.42, 1.85, -13.6), f, TAIL1 + 6, 0.35, 9);
      } else if (f < 1100) { // the tails poured in
        stand(out, cam, WHO.clerk, CLERK_P, { expr: "grin", prop: ["coin", q((t * 2) % 1, 8)] }, t);
        basket(out, cam, deskTop(0.85, 0.05), basketAt(f), 0.6);
        for (let j = 0; j < 5; j++) {
          const p = C(1.9 + j * 0.6, 0.04, -11.4 + j * 1.0);
          stand(out, cam, [WHO.folk[1], WHO.hunter[3], WHO.folk[8], WHO.folk[11], WHO.folk[14]][j], p, { expr: j % 2 ? "grin" : "smile", prop: "tail", look: -1 }, t);
        }
        for (let j = 0; j < 3; j++) coin(out, deskTop(0.6, 0.4), f, POURED + j * 8, 0.12);
      } else { // the rats didn't go anywhere
        const shock = f >= ANYWHERE - 2;
        stand(out, cam, WHO.clerk, CLERK_P, { expr: shock ? "shock" : "grin", prop: shock ? null : "tail" }, t);
        basket(out, cam, deskTop(0.85, 0.05), 1, 0.6);
        ratSpots(-2.6, 2.6, -12.2, -7.0, 16, 7).forEach(([x, z], k) => {
          const f0 = 1118 + (k % 8) * 2;
          if (f < f0) return;
          rat(out, cam, C(x, 0.04, z), { mode: k % 4 === 3 ? "beg" : "sit", expr: shock ? (k % 2 ? "smug" : "happy") : "neutral", v: k }, 0.4, [x < 0 ? 1 : -1, 0], true, k);
          puff(out, C(x, 0.25, z), f, f0, 0.35, 5);
        });
        if (f >= 1124) rat(out, cam, deskTop(-0.25, 0.1), { mode: "sit", expr: "smug", v: 2 }, 0.36, [1, 0], false, 40);
      }
      break;
    }
    case 12: {
      if (f < 1270) { // no tails
        const look = f >= 1200 ? 1 : 0;
        stand(out, cam, WHO.off[0], C(1.9, 0.04, 35.0), { expr: f >= NOTAIL + 2 ? "shock" : "neutral", look: look ? -1 : 0 }, t);
        stand(out, cam, WHO.off[1], C(0.4, 0.04, 34.6), { expr: f >= NOTAIL + 4 ? "shock" : "smile", look: 1 }, t);
        if (f >= 1196) {
          if (f < NOTAIL - 4) ratRun(out, cam, C(4.5, 0.04, 38.2), C(0.2, 0.04, 37.9), f, 1198, NOTAIL - 6, { expr: "happy", tail: false, v: 1 }, 0.42, "run", 1);
          else rat(out, cam, C(0.2, 0.04, 37.9), { mode: "back", tail: false, v: 1 }, 0.42, [1, 0], true, 1);
        }
        sparkle(out, C(0.2, 0.3, 38.05), f, NOTAIL + 2, 0.25, 8);
      } else if (f < 1318) { // a hunter grabs a rat by the gutter
        const got = f >= GRAB;
        stand(out, cam, WHO.hunter[2], C(-23.5, 0.04, 50.3), { expr: got ? "grin" : "stern", prop: got ? ["ratHeld", q((t * 2) % 1, 6)] : null, look: -1 }, t);
        if (!got) ratRun(out, cam, C(-21.0, 0.12, 51.0), C(-23.2, 0.12, 50.8), f, 1272, GRAB - 2, { expr: "happy", v: 2 }, 0.4, "run", 2);
        puff(out, C(-23.1, 1.3, 50.5), f, GRAB, 0.6);
        stroll(out, cam, WHO.folk[10], C(-28, 0.04, 46.5), 1, 0, 0.8, f, 1270);
      } else if (f < 1348) { // snip
        const cut = f >= SNIP;
        stand(out, cam, WHO.hunter[2], C(-23.5, 0.04, 50.3), { expr: cut ? "grin" : "stern", prop: [cut ? "ratHeldNo" : "ratHeld", q((t * 2) % 1, 6)] as never, look: -1 }, t);
        const k = f < SNIP - 4 ? 0 : clamp01((f - SNIP + 4) / 4);
        if (f < SNIP + 6) push(out, `snips${q(k, 4)}`, 400, 300, (pp) => fxSnips(pp, q(k, 4)), -23.3, 1.42, 50.45, 0.32, 0.24);
        puff(out, C(-23.3, 1.38, 50.5), f, SNIP, 0.45);
        if (cut) { const u = clamp01((f - SNIP) / 10); push(out, "tailfx", 300, 120, fxTail, -23.25, 1.36 - 1.2 * u * u, 50.5, 0.28, 0.11, { rot: u * 2 }); }
      } else { // let go: the rat runs into the grate, waving
        const g: V3 = [GRATE[0], 0.07, GRATE[2]];
        if (f < LETGO + 4) ratRun(out, cam, C(-23.4, 0.06, 50.2), g, f, 1350, LETGO + 2, { expr: "happy", tail: false, v: 2 }, 0.4, "run", 2);
        else if (f < 1372) rat(out, cam, g, { mode: "beg", expr: "happy", tail: false, v: 2 }, 0.4, [-1, 0], true, 2);
        else { const sink = smooth((f - 1372) / 8) * 0.5; if (sink < 0.45) rat(out, cam, add(g, [0, -sink, 0]), { mode: "beg", expr: "happy", tail: false, v: 2 }, 0.4, [-1, 0], false, 2); }
      }
      break;
    }
    case 13: {
      rat(out, cam, S(-1.3, 0, 0.35), { mode: "beg", expr: f >= MTAILS ? "happy" : "smug", tail: false, v: 2 }, 0.44, [1, 0], true, 2);
      ratSpots(-2.05, -0.85, -0.8, 1.2, 9, 11).forEach(([x, z], k) => {
        const f0 = MORE + k * 3;
        if (f < f0 || Math.hypot(x + 1.3, z - 0.35) < 0.3) return;
        rat(out, cam, S(x, 0, z), { mode: k % 3 ? "sit" : "beg", expr: "happy", v: k }, 0.22, [k % 2 ? 1 : -1, 0], true, k + 10);
        puff(out, S(x, 0.15, z), f, f0, 0.25, 5);
        sparkle(out, S(x - 0.1, 0.12, z + 0.05), f, MTAILS + (k % 3) * 2, 0.18, 8);
      });
      break;
    }
    case 14: {
      stand(out, cam, WHO.farmer, F(-1.4, 0.04, -2.0), { expr: "grin", prop: "bowl" }, t);
      stand(out, cam, WHO.folk[13], F(2.6, 0.04, -1.6), { expr: "smile", prop: "cage" }, t);
      CAGES.forEach((c, i) => {
        rat(out, cam, [c[0] - 0.12, 0.7, c[2]], { mode: i % 3 ? "beg" : "sit", expr: i % 2 ? "happy" : "smug", v: i % 4 }, 0.34, [i % 2 ? 1 : -1, 0], false, i);
        rat(out, cam, [c[0] + 0.2, 0.7, c[2] + 0.04], { mode: "sit", expr: "happy", v: (i + 1) % 4 }, 0.28, [-1, 0], false, i + 30);
      });
      ratSpots(-3, 3, -2.6, 0.5, 8, 21).forEach(([x, z], k) => rat(out, cam, F(x, 0.02, z), { mode: k % 2 ? "sit" : "beg", expr: "happy", v: k }, 0.36, [x < 0 ? 1 : -1, 0], true, k + 50));
      burst(out, F(0.5, 2.2, -4.5), f, FARMS - 2, 1.6);
      break;
    }
    case 15: {
      if (f < 1618) { // a weed, a coin
        const pulled = f >= 1584;
        stand(out, cam, WHO.gent, OWNER_P, { expr: "smile", prop: f >= WEED - 2 && f < WEED + 14 ? ["coin", q((t * 2) % 1, 8)] : null, look: 1 }, t);
        stand(out, cam, WHO.gardener, GARD_P, { expr: pulled ? "grin" : "neutral", prop: pulled ? "weed" : null, look: -1 }, t);
        coin(out, add(OWNER_P, [0.7, 1.3, 0.1]), f, WEED, 0.14);
        for (let k = 0; k < 3; k++) push(out, `weed${k}10`, 200, 300, (pp) => fxWeed(pp, 1, k), GARDEN[0] - 0.4 + k * 0.9, 0.06 + 0.2, GARDEN[2] + 0.9 - k * 0.6, 0.27, 0.4);
      } else if (f < 1690) { // full of weeds
        ratSpots(-4.6, 4.6, -3.0, 3.6, 46, 31).forEach(([x, z], k) => {
          const g = q(smooth((f - 1622 - (k % 12) * 3) / 10), 8);
          if (g <= 0) return;
          const s2 = 0.35 + 0.35 * hh(k, 32);
          push(out, `weed${k % 3}${g}`, 200, 300, (pp) => fxWeed(pp, g, k % 3), GARDEN[0] + x, 0.06 + s2 * 0.5, GARDEN[2] + z, s2 * 0.67, s2);
        });
        stand(out, cam, WHO.gardener, add(GARDEN, [-0.4, 0.04, 1.6]), { expr: "laugh", prop: ["can", q(0.6 + 0.4 * Math.sin(t * 4), 6)] }, t);
        stand(out, cam, WHO.gent, add(GARDEN, [-3.6, 0.04, 2.6]), { expr: f >= WEEDS ? "shock" : "nervous", look: 1 }, t);
      } else { // the bounty is scrapped
        stand(out, cam, WHO.clerk, CLERK_P, { expr: f >= SCRAP ? "stern" : "neutral", look: 1 }, t);
        stand(out, cam, WHO.off[0], C(-1.25, 0.04, -14.3), { expr: "stern", shrug: 0, look: 1 }, t);
        basket(out, cam, deskTop(0.9, 0.05), 1, 0.6);
        burst(out, deskTop(-0.7, -0.15), f, SCRAP, 0.7, "#ffffff");
      }
      break;
    }
    case 16: {
      if (f < 1792) { // plague anyway
        plague(out, C(0, 1.5, -10), C(0, 1.2, 36), fogAt(id, f), 16, 7, f);
        stroll(out, cam, WHO.lady, C(-3.0, 0.04, 30), 0, -1, 1.3, f, 1735, "nervous");
        stroll(out, cam, WHO.folk[2], C(3.5, 0.04, 28), 0, -1, 1.5, f, 1735, "shock");
        rat(out, cam, add(MAN, [0, 0.07, 0]), { mode: "sit", expr: "smug", tail: false, v: 1 }, 0.42, [-1, 0], true, 1);
      } else if (f < 1890) { // it paid for tails
        const p = add(CLERK_P, [0, 0, 0.1]);
        out.places.push(person(cam, WHO.clerk, p[0], p[1], p[2], FRONT, { mode: "sit", seat: Math.round(0.47 / SU), expr: f >= TAILS ? "sad" : "tired", blink: lidAt(t, 1), headTilt: -6 }, {}, 1));
        blob(out, p[0], p[1], p[2]);
        basket(out, cam, deskTop(0.85, 0.05), 1, 0.8);
        sparkle(out, deskTop(0.85, 0.4), f, TAILS, 0.3, 8);
      } else { // a rat can live without one
        const wink = f >= ONE - 2 && f < ONE + 20, off = f >= 1966;
        if (!off) rat(out, cam, add(MAN, [0, 0.07, 0]), { mode: "beg", expr: wink ? "wink" : "smug", tail: false, v: 1, ph: t }, 0.42, [-1, 0], true, 1);
        else ratRun(out, cam, add(MAN, [0, 0.07, 0]), add(MAN, [-1.2, 0.04, 0.4]), f, 1966, 1984, { expr: "happy", tail: false, v: 1 }, 0.42, "run", 1);
        sparkle(out, add(MAN, [0.1, 0.32, 0.05]), f, ONE + 2, 0.22, 9);
      }
      break;
    }
  }
  void bodySide; void bodyFront; void fxShadow; void notes; void dance; void sitAt; void Outfit0; void GARD_P; void CUST_P; void POURED;
  return out;
};
type Outfit0 = Outfit; const Outfit0 = 0;
