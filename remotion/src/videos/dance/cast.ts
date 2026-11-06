// The slow-organ cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, horseCard, fxContact, fxShadow, fxNote, fxBurst, fxPuff, fxStars, Outfit, Expr, FrontOpts, SideOpts,
  TROFFEA, folk1518, DOCTOR, DOCTOR2, MASTER, COUNCIL, PLAYER, STRONG, PRIEST, CRIER, STATUE, HUNGRY, SICK } from "./toon";
import { fxSparkle, fxClapMarks, fxHeat, fxDanceMarks, fxSpin, fxCough, fxLeaf, fxSadNote, fxOuch } from "./fx";
import { FPS, SHOTS, V3, STAGE, DECK, GUILD, RAIL, STALL, COLUMN, COL_H, BENCH, DOOR, SHRINE, TROF_ST, DOC_P, STRONG_P, MASTER_P,
  STEP_OUT, FIRST_DANCE, nightAt, joinedAt, CLEAR, BUILD0, BUILD1, TEAR, BAND_ON, BAND_OFF, bandPlays, EVERYONE, spinAt, BAN,
  YAWN1, YAWN2, NDANCE, FEET, wagonPose, SHOES, STOPPED, T, H, smooth, clamp01, add } from "./story";
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
  trof: { i: 1, o: TROFFEA, okey: "trof" } as Who,
  trofRed: { i: 1, o: { ...TROFFEA, boots: "#d42a2a" }, okey: "trofRed" } as Who,
  doc: { i: 2, o: DOCTOR, okey: "doc" } as Who,
  doc2: { i: 3, o: DOCTOR2, okey: "doc2" } as Who,
  master: { i: 4, o: MASTER, okey: "master" } as Who,
  council: [0, 1].map((k) => ({ i: 5 + k, o: COUNCIL(k), okey: `council${k}` }) as Who),
  band: [0, 1, 2].map((k) => ({ i: 7 + k, o: PLAYER(k), okey: `band${k}` }) as Who),
  strong: [0, 1].map((k) => ({ i: 10 + k, o: STRONG(k), okey: `strong${k}` }) as Who),
  priest: [0, 1].map((k) => ({ i: 12 + k, o: PRIEST(k), okey: `priest${k}` }) as Who),
  crier: { i: 14, o: CRIER, okey: "crier" } as Who,
  statue: { i: 15, o: STATUE, okey: "statue" } as Who,
  hungry: { i: 16, o: HUNGRY, okey: "hungry" } as Who,
  sick: { i: 17, o: SICK, okey: "sick" } as Who,
  folk: Array.from({ length: 40 }, (_, k) => ({ i: 20 + k, o: folk1518(k), okey: `f${k}` }) as Who),
  red: Array.from({ length: 8 }, (_, k) => ({ i: 20 + k, o: { ...folk1518(k), boots: "#d42a2a" }, okey: `r${k}` }) as Who),
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
/** a deterministic crowd on the square: n dancers on a jittered grid inside the box, keeping clear of the stage,
 *  the column and the stall. Outfits cycle over 16 and phases over 8 steps so the crowd shares a few dozen canvases. */
const CROWD_EXPR: Expr[] = ["dazed", "nervous", "pained", "tired", "dazed", "shock", "nervous", "grin"];
const crowdSpots = (() => {
  const out: V3[] = [];
  for (let gz = -38; gz <= 22; gz += 1.55) for (let gx = -20; gx <= 20; gx += 1.5) {
    const j = hh(gx * 7 + gz, 3), jj = hh(gx + gz * 5, 4), x = gx + (j - 0.5) * 1.0, z = gz + (jj - 0.5) * 1.0;
    if (Math.abs(x - STAGE[0]) < 4.4 && Math.abs(z - STAGE[2]) < 4.4) continue;
    if (Math.hypot(x - COLUMN[0], z - COLUMN[2]) < 1.8 || (Math.abs(x - STALL[0]) < 2.4 && Math.abs(z - STALL[2]) < 2.0)) continue;
    if (Math.abs(x - RAIL[0]) < 5 && Math.abs(z - RAIL[2]) < 2.6) continue;
    out.push(T(x, 0.04, z));
  }
  // nearest to the square's centre first, so a small crowd gathers in the middle
  return out.map((p, i) => ({ p, d: Math.hypot(p[0] - 0, p[2] + 2) + hh(i, 8) * 6 })).sort((a, b) => a.d - b.d).map((x) => x.p);
})();
const crowd = (out: Stage, cam: CamInfo, t: number, n: number, o: { energy?: number; skip?: (p: V3) => boolean; expr?: Expr; maxD?: number } = {}) => {
  let c = 0;
  for (let i = 0; i < crowdSpots.length && c < n; i++) {
    const p = crowdSpots[i];
    if (o.skip && o.skip(p)) continue;
    if (o.maxD && cam.pos.distanceTo(tmp.set(p[0], 1, p[2])) > o.maxD) { c++; continue; }
    c++;
    const k = i % 16, who = WHO.folk[k];
    dance(out, cam, who, p, t, { off: q(hh(i, 5), 8), energy: o.energy ?? 0.85 + 0.15 * hh(i, 6), expr: o.expr ?? CROWD_EXPR[i % 8], n: 8, blink: false });
  }
};
/** horses at the hitching rail, side view, tails swishing */
const horses = (out: Stage, cam: CamInfo, f: number) => {
  for (let k = 0; k < 3; k++) {
    const x = RAIL[0] - 3 + k * 3, z = RAIL[2] - 0.7, ph = q(0.02 * Math.sin(f / 20 + k), 4);
    out.places.push({ key: `horse|${ph}|${k % 2}`, x, y: 0.04, z, mirror: k % 2 === 1, scale: 1.5, draw: (pp) => horseCard(pp, ph), size: [1080, 1800, 1.8] });
    blob(out, x, 0.04, z, 1.6);
  }
};
const band = (out: Stage, cam: CamInfo, f: number, t: number, on: boolean, expr: Expr = "grin", base: V3 = add(STAGE, [0, DECK, -0.6])) => {
  const kinds = ["drum", "pipe", "fiddle"] as const;
  kinds.forEach((kd, k) => {
    const p = add(base, [(k - 1) * 1.7, 0, k === 1 ? -0.4 : 0]);
    const beat = on ? q(0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (kd === "drum" ? 1.4 : 2.2) + k), 8) : 0;
    stand(out, cam, WHO.band[k], p, { expr: on ? expr : "sad", prop: [kd, beat], headTilt: on ? q(5 * Math.sin(t * 4.4 + k), 3) : 0, tilt: on ? q(3 * Math.sin(t * 4.4 + k * 2), 3) : 0 }, t);
    if (on) notes(out, f, [add(p, [0.3, 1.9, 0.1])], "#1f2a44", 0.24, k * 0.3);
  });
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      crowd(out, cam, t, 150);
      if (f >= 84) notes(out, f, [], "#1f2a44");
      break;
    }
    case 2: {
      const more = f >= 159;
      dance(out, cam, WHO.folk[3], add(DOC_P, [0.3, 0, 0]), t, { energy: more ? 1 : 0.55, expr: more ? "dazed" : "tired", off: 0.2 });
      stand(out, cam, WHO.doc, add(DOC_P, [-1.0, 0, -0.1]), { expr: more ? "grin" : "smile_closed", prop: more ? null : ["flask", 0], wave: more ? q(0.6 + 0.4 * Math.sin(t * 8), 6) : undefined, headTilt: more ? q(5 * Math.sin(t * 6), 3) : 0 }, t);
      crowd(out, cam, t, 60, { skip: (p) => Math.hypot(p[0] - DOC_P[0], p[2] - DOC_P[2]) < 3.2 || (p[2] > DOC_P[2] - 1 && Math.abs(p[0] - DOC_P[0]) < 4) });
      if (more) { const u = q((t * 2) % 1, 8); push(out, `dm${u}`, 600, 600, (p) => fxDanceMarks(p, u), DOC_P[0] + 0.3, 1.25, DOC_P[2] + 0.05, 1.5, 1.5); }
      break;
    }
    case 3: {
      if (f < 238) {
        stroll(out, cam, WHO.folk[6], T(-2.5, 0.04, -60), 0, 1, 1.0, f, 186);
        stroll(out, cam, WHO.folk[9], T(1.8, 0.04, -52), 0, -1, 0.9, f, 186, "smile");
        stroll(out, cam, WHO.folk[12], T(-0.5, 0.04, -70), 0, 1, 0.8, f, 186);
      } else {
        stroll(out, cam, WHO.folk[8], T(-1.5, 0.04, -58), 0, 1, 1.0, f, 238);
        if (f >= STEP_OUT - 2) {
          const pre = f < FIRST_DANCE;
          if (pre) walk(out, cam, WHO.trof, T(4.2, 0.04, -50), TROF_ST, f, STEP_OUT, STEP_OUT + 22, "smile");
          else dance(out, cam, WHO.trof, TROF_ST, t, { energy: q(smooth((f - FIRST_DANCE) / 8), 8), expr: "dazed" });
        }
      }
      break;
    }
    case 4: {
      const nt = nightAt(id, f);
      dance(out, cam, WHO.trof, TROF_ST, t, { energy: f < 398 ? 1 : 0.8, expr: f < 398 ? "dazed" : "tired", sore: f >= 410 });
      if (nt < 0.5) {
        stand(out, cam, WHO.folk[1], T(-3.9, 0.04, -47.5), { expr: f < 372 ? "nervous" : "shock", look: 1 }, t);
        stand(out, cam, WHO.folk[4], T(-3.9, 0.04, -53.5), { expr: f < 380 ? "neutral" : "nervous", look: 1 }, t);
      }
      if (f < 398) { const u = q((t * 2) % 1, 8); push(out, `dm${u}`, 600, 600, (p) => fxDanceMarks(p, u), TROF_ST[0], 1.25, TROF_ST[2] + 0.05, 1.5, 1.5); }
      break;
    }
    case 5: {
      dance(out, cam, WHO.trof, TROF_ST, t, { energy: 0.85, expr: "tired", sore: true });
      const n = joinedAt(f);
      for (let k = 0; k < n; k++) {
        const x = -3.6 + ((k * 7) % 8) * 1.0 + (hh(k, 1) - 0.5) * 0.5, z = -43 - Math.floor(k / 8) * 2.0 - (k % 2) * 0.9 - hh(k, 2) * 0.6;
        const p = T(x, 0.04, z);
        if (Math.hypot(p[0] - TROF_ST[0], p[2] - TROF_ST[2]) < 1.0) continue;
        dance(out, cam, WHO.folk[(k + 5) % 40], p, t, { off: hh(k, 3), energy: 0.9, expr: CROWD_EXPR[k % 8], n: 12 });
        const f0 = 455 + Math.round((k / 30) * 46);
        if (f - f0 < 6) { const u = q((f - f0) / 6, 6); push(out, `puff${u}`, 300, 300, (pp) => fxPuff(pp, u), p[0], 0.4, p[2] + 0.2, 0.9, 0.9, { soft: true }); }
      }
      break;
    }
    case 6: {
      if (f < 612) crowd(out, cam, t, 280);
      else {
        dance(out, cam, WHO.folk[10], T(0.1, 0.04, 3.0), t, { energy: 1, expr: "pained", sore: true, n: 24 });
        for (const [k, x, z] of [[11, -1.4, 1.2], [12, 1.5, 0.8], [13, -0.3, -0.6]] as const) dance(out, cam, WHO.folk[k], T(x, 0.04, z), t, { energy: 0.9, sore: true });
        if (f >= 630) { const u = q(clamp01((f - 630) / 8), 8); push(out, `ouch${u}`, 300, 200, (p) => fxOuch(p, u), 0.1, 0.42, 3.2, 0.5, 0.33); }
      }
      break;
    }
    case 7: {
      const hot = f >= 705, pat = add(DOC_P, [0.3, 0, 0]);
      dance(out, cam, WHO.folk[3], pat, t, { energy: f < 737 ? 0.5 : 1, expr: hot ? "pained" : "tired", off: 0.2 });
      const flask = f < 790 ? q(hot ? 0.6 + 0.4 * ((t * 3) % 1) : 0.02 * Math.sin(t), 10) : 0;
      stand(out, cam, WHO.doc, add(DOC_P, [-1.0, 0, -0.1]), { expr: f < 700 ? "stern" : hot ? "shock" : "stern", prop: f < 790 ? ["flask", flask] : null, wave: f >= 790 ? q(0.6 + 0.4 * Math.sin(t * 8), 6) : undefined }, t);
      stand(out, cam, WHO.doc2, add(DOC_P, [-1.9, 0, -0.6]), { expr: f >= 795 ? "grin" : "stern", look: 1, shrug: f >= 800 ? q(smooth((f - 800) / 8), 8) : 0 }, t);
      if (hot) { const u = q((t * 1.5) % 1, 12); push(out, `heat${u}`, 300, 400, (p) => fxHeat(p, u), pat[0], 2.3, pat[2] + 0.05, 0.42, 0.56, { soft: true }); }
      if (f >= 795) { const u = q((t * 2) % 1, 8); push(out, `dm${u}`, 600, 600, (p) => fxDanceMarks(p, u), pat[0], 1.25, pat[2] + 0.05, 1.5, 1.5); }
      crowd(out, cam, t, 40, { skip: (p) => Math.hypot(p[0] - DOC_P[0], p[2] - DOC_P[2]) < 3.4 || (p[2] > DOC_P[2] - 1 && Math.abs(p[0] - DOC_P[0]) < 4) });
      break;
    }
    case 8: {
      if (f < 887) {
        const pt = f >= CLEAR - 3;
        stand(out, cam, WHO.master, MASTER_P, { expr: pt ? "grin" : "stern", wave: pt ? 1 : undefined, look: -1 }, t);
        stand(out, cam, WHO.council[0], add(MASTER_P, [0.9, 0, 1.1]), { expr: pt ? "smile" : "neutral", look: -1 }, t);
        stand(out, cam, WHO.council[1], add(MASTER_P, [1.6, 0, -0.4]), { expr: pt ? "smile_closed" : "nervous", look: -1 }, t);
        for (const [k, x, z] of [[14, -7.8, -10.5], [15, -8.6, -15.5]] as const) dance(out, cam, WHO.folk[k], T(x, 0.04, z), t, { energy: 0.8 });
      } else if (f < 953) {
        for (const [k, x, z] of [[16, -4.2, -3.2], [17, 4.3, -3.0]] as const) {
          const hit = q(0.5 + 0.5 * Math.sin(t * 14 + k), 6);
          stand(out, cam, WHO.folk[k], T(x, 0.04, z), { expr: "grin", prop: ["hammer", hit] }, t);
        }
        for (let k = 0; k < 9; k++) if (f >= BUILD0 + k * 3.5 && f < BUILD0 + k * 3.5 + 6) {
          const u = q((f - BUILD0 - k * 3.5) / 6, 6), x = STAGE[0] - 3 + (k % 7), z = STAGE[2] + ((k * 3) % 5) - 2;
          push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), x, DECK + 0.1, z, 0.6, 0.6);
        }
        horses(out, cam, f);
        crowd(out, cam, t, 70, { skip: (p) => p[2] > -12 });
      } else if (f < 984) {
        const k = q(clamp01((f - BAND_ON) / 6), 6);
        if (f >= BAND_ON) band(out, cam, f, t, k >= 1);
        crowd(out, cam, t, 50, { skip: (p) => (Math.abs(p[0]) < 5.5 && p[2] > -9.5) || p[2] > 0 });
      } else {
        const held = f >= 1003;
        dance(out, cam, WHO.folk[18], add(STRONG_P, [0, held ? 0.16 : 0, 0]), t, { energy: held ? 0.12 : 0.15, expr: held ? "dazed" : "tired", shadow: !held, fo: { armsUp: held ? 1 : 0, tilt: held ? 0 : 9, headTilt: held ? 16 : 6 } });
        if (held) {
          const r2 = cam.right;
          stand(out, cam, WHO.strong[0], [STRONG_P[0] - r2.x * 0.78, 0.04, STRONG_P[2] - r2.z * 0.78 - 0.05], { expr: "pained", wave: 0.9, look: 1, tilt: 4 }, t, 1.06);
          out.places.push(person(cam, WHO.strong[1], STRONG_P[0] + r2.x * 0.78, 0.04, STRONG_P[2] + r2.z * 0.78 - 0.05, { side: false, mirror: true }, { mode: "stand", expr: "pained", wave: 0.9, look: -1, tilt: 4, blink: lidAt(t, 11) }, {}, 1.06));
          out.places[out.places.length - 1].mirror = true;
          blob(out, STRONG_P[0] + r2.x * 0.78, 0.04, STRONG_P[2] + r2.z * 0.78, 1.06);
        }
        crowd(out, cam, t, 40, { skip: (p) => Math.hypot(p[0] - STRONG_P[0], p[2] - STRONG_P[2]) < 3.4 });
      }
      break;
    }
    case 9: {
      band(out, cam, f, t, true);
      if (f < 1112) {
        for (let k = 0; k < 6; k++) dance(out, cam, WHO.folk[20 + k], T(-2.5 + k * 1.0, 0.04, -1.2 + (k % 2) * 1.1), t, { energy: 1, expr: k % 2 ? "grin" : "laugh" });
        crowd(out, cam, t, 40, { skip: (p) => (Math.abs(p[0]) < 5 && p[2] > -9) || p[2] > 1 });
      } else {
        const all = f >= EVERYONE - 2;
        crowd(out, cam, t, all ? 240 : 150, { skip: (p) => Math.hypot(p[0] - 9, p[2] - 4) < 5 });
        const edge: [Who, V3][] = [[WHO.master, T(8.0, 0.04, 2.5)], [WHO.council[0], T(9.2, 0.04, 3.4)], [WHO.council[1], T(10.2, 0.04, 2.2)],
          [WHO.doc, T(8.4, 0.04, 5.2)], [WHO.doc2, T(9.6, 0.04, 6.0)], [WHO.strong[0], T(10.8, 0.04, 4.6)], [WHO.strong[1], T(7.4, 0.04, 4.4)]];
        for (const [w, p] of edge) {
          if (all) dance(out, cam, w, p, t, { energy: 1, expr: w === WHO.master ? "shock" : "laugh", n: 12 });
          else stand(out, cam, w, p, { expr: "smile", look: -1, clap: q(0.5 + 0.5 * Math.sin(t * 13 + w.i), 6) }, t);
        }
        horses(out, cam, f);
      }
      break;
    }
    case 10: {
      if (f < 1226) {
        const sp = spinAt(f), turn = Math.cos(sp * Math.PI * 4);
        const expr: Expr = f < 1193 ? "laugh" : sp < 1 ? "dazed" : "stern";
        const pl = person(cam, WHO.master, MASTER_P[0], MASTER_P[1], MASTER_P[2], FRONT, f < 1193 ? { mode: "dance", phase: q((t / 0.72) % 1, 24), energy: 1, expr, blink: 0 } : { mode: "stand", expr, blink: lidAt(t, 4), wave: sp >= 1 ? 1 : undefined, look: -1 }, {}, 1);
        out.places.push({ ...pl, sx: q(turn, 12) });
        blob(out, MASTER_P[0], MASTER_P[1], MASTER_P[2]);
        if (sp > 0 && sp < 1) { const u = q(sp, 12); push(out, `spin${u}`, 600, 300, (p) => fxSpin(p, u), MASTER_P[0], 0.3, MASTER_P[2] + 0.1, 1.5, 0.6); }
        stand(out, cam, WHO.council[0], add(MASTER_P, [-1.1, 0, -0.9]), { expr: f < 1210 ? "laugh" : "nervous", look: 1 }, t);
        stand(out, cam, WHO.council[1], add(MASTER_P, [0.9, 0, -1.6]), { expr: f < 1210 ? "grin" : "shock", look: -1 }, t);
      } else if (f < 1263) {
        band(out, cam, f, t, false, "shock", T(0, 0.04, -1.2));
        crowd(out, cam, t, 60, { skip: (p) => Math.abs(p[0]) < 5 && p[2] > -9 && p[2] < 2 });
      } else if (f < 1293) {
        ([0, 1, 2] as const).forEach((k) => {
          const kd = (["drum", "pipe", "fiddle"] as const)[k];
          walk(out, cam, WHO.band[k], T(-1.0 + k * 1.2, 0.04, -1.0 + k * 0.3), T(4.0 + k * 1.1, 0.04, 6.5 + k * 0.3), f, 1265, 1345, "sad", { prop: [kd, 0] });
        });
        crowd(out, cam, t, 30, { skip: (p) => p[0] > -2 && p[2] > -4 });
      } else {
        const ring = q(0.5 + 0.5 * Math.sin(t * 18), 6);
        stand(out, cam, WHO.crier, T(-6.5, 0.04, 13.5), { expr: f >= BAN - 2 ? "stern" : "neutral", prop: ["bell", ring] }, t);
        if (f >= BAN - 2 && f < BAN + 14) { const u = q((f - BAN + 2) / 16, 16); push(out, `burst${u}`, 400, 400, (p) => fxBurst(p, u, "#fff3b0", 10, 30, 160), -6.0, 2.6, 13.6, 1.2, 1.2); }
        for (const [k, x, z] of [[21, -8.2, 16], [22, -5.4, 16.8], [23, -7.0, 18.2]] as const) dance(out, cam, WHO.folk[k], T(x, 0.04, z), t, { energy: 0.85, expr: f >= BAN + 6 ? "nervous" : "dazed" });
      }
      break;
    }
    case 11: {
      if (f < 1408) crowd(out, cam, t, 90, { energy: 0.95, expr: "pained" });
      else if (f < 1447) {
        stand(out, cam, WHO.hungry, add(STALL, [-0.9, 0.04, 1.5]), { expr: "sad", prop: "bowl" }, t);
        const cough = f >= 1426 ? ((f - 1426) % 22) / 22 : -1;
        stand(out, cam, WHO.sick, add(STALL, [0.25, 0.04, 2.2]), { expr: cough >= 0 && cough < 0.4 ? "pained" : "tired", tilt: cough >= 0 && cough < 0.4 ? -6 : 0 }, t);
        if (cough >= 0 && cough < 0.7) { const u = q(cough / 0.7, 10); push(out, `cough${u}`, 400, 300, (p) => fxCough(p, u), STALL[0] + 0.5, 1.75, STALL[2] + 2.3, 0.5, 0.38, { soft: true }); }
      } else {
        const curse = f >= 1475;
        out.places.push(person(cam, WHO.statue, COLUMN[0], COL_H, COLUMN[2], FRONT, { mode: "stand", expr: "stern", wave: curse ? 1 : undefined, blink: 0, look: -0.5 }, {}, 1.2));
        if (curse) { const u = q(((f - 1475) / 30) % 1, 15); push(out, `glow${u}`, 400, 400, (p) => fxBurst(p, u, "#b8a0ff", 12, 60, 190), COLUMN[0], COL_H + 1.4, COLUMN[2] - 0.15, 3.2, 3.2, { soft: true }); }
        for (const [k, x, z] of [[24, -7.6, 9.6], [25, -10.6, 9.8], [26, -9.2, 8.2]] as const)
          if (curse) dance(out, cam, WHO.folk[k], T(x, 0.04, z), t, { energy: 0.9, expr: "shock" });
          else stand(out, cam, WHO.folk[k], T(x, 0.04, z), { expr: "nervous", look: x < -9 ? 1 : -1 }, t);
      }
      break;
    }
    case 12: {
      const a = add(BENCH, [0, 0.04, -0.55]), b = add(BENCH, [0, 0.04, 0.55]);
      if (f < 1612) {
        const y1 = f >= YAWN1 && f < YAWN1 + 22, y2 = f >= YAWN2 && f < YAWN2 + 24;
        sitAt(out, cam, WHO.folk[27], a, { expr: y1 ? "yawn" : f > YAWN1 ? "smile_closed" : "neutral", headTilt: y1 ? -8 : 0, look: 1 }, t, 0.12);
        sitAt(out, cam, WHO.folk[28], b, { expr: y2 ? "yawn" : f > YAWN2 + 24 ? "nervous" : "neutral", headTilt: y2 ? 8 : 0, look: -1 }, t, 0.12);
      } else {
        const go = f >= NDANCE;
        if (go) dance(out, cam, WHO.folk[27], add(BENCH, [1.5, 0.04, -0.1]), t, { energy: q(smooth((f - NDANCE) / 6), 6), expr: "dazed" });
        else sitAt(out, cam, WHO.folk[27], a, { expr: "smile_closed", look: 1 }, t, 0.12);
        const feet = f >= FEET;
        if (f < 1643) stand(out, cam, WHO.folk[28], add(BENCH, [0.6, 0.04, 0.75]), { expr: go ? "shock" : "neutral", look: -1 }, t);
        else dance(out, cam, WHO.folk[28], add(BENCH, [0.6, 0.04, 0.75]), t, { energy: feet ? q(0.15 + 0.4 * smooth((f - FEET) / 14), 10) : 0, expr: "shock", n: 24 });
      }
      break;
    }
    case 13: {
      const wp = wagonPose(id, f), fw: V3 = [Math.sin(wp.yaw), 0, Math.cos(wp.yaw)], rt: V3 = [fw[2], 0, -fw[0]];
      const hp = add(wp.p, [fw[0] * 3.3, 0.04, fw[2] * 3.3]);
      const ph = q(((f - 1680) / FPS / 0.6) % 1, 12);
      const mirror = fw[0] * cam.right.x + fw[2] * cam.right.z < 0;
      out.places.push({ key: `horse|${ph}|w`, x: hp[0], y: hp[1], z: hp[2], mirror, scale: 1.5, draw: (pp) => horseCard(pp, ph), size: [480, 800, 0.8], yaw: Math.atan2(rt[0], rt[2]) * 0 + Math.atan2(cam.pos.x - hp[0], cam.pos.z - hp[2]) });
      blob(out, hp[0], hp[1], hp[2], 1.6);
      for (let k = 0; k < 4; k++) {
        const ox = (k % 2 ? 0.4 : -0.4), oz = (k < 2 ? 0.6 : -0.6);
        const p = add(wp.p, [rt[0] * ox + fw[0] * oz, 0.86, rt[2] * ox + fw[2] * oz]);
        dance(out, cam, WHO.folk[(k * 5 + 2) % 40], p, t, { energy: 0.55, expr: k % 2 ? "tired" : "dazed", shadow: false, n: 12 });
      }
      if (f >= 1745) {
        stand(out, cam, WHO.priest[0], H(1.2, 0.12, -40.2), { expr: "smile_closed" }, t);
        stand(out, cam, WHO.priest[1], H(-1.0, 0.12, -40.0), { expr: "smile" }, t);
        out.places.push(person(cam, WHO.statue, SHRINE[0] - 2.4, SHRINE[1] + 0.9, SHRINE[2] + 0.1, FRONT, { mode: "stand", expr: "smile_closed", blink: 0 }, {}, 0.85));
        for (const [k, x, z] of [[2, 2.5, -36.5], [7, -2.4, -35.6]] as const) dance(out, cam, WHO.folk[k], H(x, 0.04, z), t, { energy: 0.6, expr: "tired" });
      }
      break;
    }
    case 14: {
      if (f < 1848) {
        const given = f >= SHOES;
        stand(out, cam, WHO.priest[0], H(-0.55, 0.12, -36.6), { expr: "smile_closed", prop: given ? null : "shoes" }, t);
        dance(out, cam, given ? WHO.trofRed : WHO.trof, H(0.55, 0.12, -35.9), t, { energy: given ? 0.35 : 0.6, expr: given ? "relief" : "tired", sore: !given });
        if (given && f < SHOES + 8) { const u = q((f - SHOES) / 8, 8); push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), H(0.55, 0, -35.8)[0], H(0.55, 0.2, -35.8)[1], H(0.55, 0, -35.8)[2] + 0.1, 0.5, 0.5); }
      } else {
        const stop = f >= STOPPED;
        stand(out, cam, WHO.priest[0], H(1.4, 0.12, -40.3), { expr: stop ? "smile_closed" : "smile" }, t);
        stand(out, cam, WHO.priest[1], H(-1.2, 0.12, -40.1), { expr: stop ? "relief" : "smile" }, t);
        out.places.push(person(cam, WHO.statue, SHRINE[0] - 2.4, SHRINE[1] + 0.9, SHRINE[2] + 0.1, FRONT, { mode: "stand", expr: "smile_closed", blink: 0 }, {}, 0.85));
        const spots: [Who, number, number][] = [[WHO.trofRed, 0.4, -35.2], [WHO.red[0], -1.8, -34.2], [WHO.red[1], 1.9, -33.6], [WHO.red[2], -0.6, -32.6], [WHO.red[3], 2.6, -36.4], [WHO.red[4], -2.9, -36.8]];
        spots.forEach(([w, x, z], k) => {
          const p = H(x, 0.04, z);
          if (!stop) dance(out, cam, w, p, t, { energy: q(0.6 * (1 - clamp01((f - 1850) / (STOPPED - 1850))) + 0.05, 10), expr: "tired", off: k * 0.17 });
          else if (f < STOPPED + 6 + k * 3) stand(out, cam, w, p, { expr: "dazed" }, t);
          else sitAt(out, cam, w, p, { expr: k % 2 ? "relief" : "smile_closed" }, t, 0, 0);
        });
        for (let k = 0; k < 5; k++) {
          const u = ((t * 0.35 + k * 0.21) % 1), x = -3 + k * 1.5 + Math.sin(u * 6 + k) * 0.5, y = 4.2 - 3.8 * u;
          const lp = H(x, y, -34 + (k % 2));
          push(out, `leaf${k % 3}${q((u * 3) % 1, 12)}`, 200, 200, (p) => fxLeaf(p, k, q((u * 3) % 1, 12)), lp[0], lp[1], lp[2], 0.28, 0.28);
        }
      }
      break;
    }
    case 15: {
      const base = T(0, 0.04, -2.4);
      ([0, 1, 2] as const).forEach((k) => {
        const kd = (["drum", "pipe", "fiddle"] as const)[k], p = add(base, [(k - 1) * 1.15, 0, (k % 2) * 0.35]);
        const tap = kd === "drum" && f >= 1960 && f < 1972 ? q(Math.sin(((f - 1960) / 12) * Math.PI), 6) : 0;
        sitAt(out, cam, WHO.band[k], p, { expr: "sad", prop: [kd, tap], look: k === 0 ? 1 : 0 }, t, 0, 0);
        if (kd === "drum" && f >= 1962) { const u = clamp01((f - 1962) / 24), np = add(p, [0.35, 1.5 - 0.5 * u, 0.1]); push(out, "sadnote", 240, 260, fxSadNote, np[0], np[1], np[2], 0.26 * (1 - 0.3 * u), 0.28 * (1 - 0.3 * u)); }
      });
      break;
    }
    case 16: {
      const p = H(0.2, 0.12, -35.0), hop = f >= 2034 && f < 2052;
      if (hop) dance(out, cam, WHO.trofRed, p, t, { energy: 0.5, expr: "relief", fo: { phase: q(0.25 * Math.sin(((f - 2034) / 18) * Math.PI), 12) } });
      else stand(out, cam, WHO.trofRed, p, { expr: f >= 2034 ? "smile_closed" : "relief" }, t);
      if (f >= 2040 && f < 2050) { const u = q((f - 2040) / 10, 10); push(out, `spark${u}`, 200, 200, (pp) => fxSparkle(pp, u), p[0] + 0.25, p[1] + 0.12, p[2] + 0.1, 0.45, 0.45); }
      break;
    }
  }
  void bodySide; void bodyFront; void fxShadow; void fxStars; void fxClapMarks; void BUILD1; void TEAR; void BAND_OFF; void bandPlays; void GUILD; void DOOR; void Outfit0;
  return out;
};
type Outfit0 = Outfit; const Outfit0 = 0;
