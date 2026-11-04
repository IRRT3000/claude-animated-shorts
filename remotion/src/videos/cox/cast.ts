// The cox-clock cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, townsfolk, modernFolk, COX_O, GUARD, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxQuestion, fxSparkle, fxCat, fxMagic, fxCoin, fxBreath, fxRain, fxBolt, fxTick } from "./fx";
import { FPS, SHOTS, V3, HALL, VA, COX, VISITORS, LOTTERY, CHEST, MUSEUM_DOOR, DIAL, THEORY, SWITCH, STOP, popAt, stormAt, mercuryAt, smooth, clamp01 } from "./story";
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
const CONTACT: Record<LightName, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], hall: [0.26, 0.2, 0.26], gallery: [0.3, 0.3, 0.36] };
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
  cox: { i: 1, o: COX_O, okey: "cox" } as Who,
  guard: { i: 2, o: GUARD, okey: "guard" } as Who,
  folk: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({ i: 10 + k, o: townsfolk(k), okey: `t${k}` }) as Who),
  modern: [0, 1, 2, 3, 4].map((k) => ({ i: 30 + k, o: modernFolk(k), okey: `m${k}` }) as Who),
};
const FRONT = { side: false, mirror: false };
const H = (x: number, y: number, z: number): V3 => [HALL[0] + x, HALL[1] + y, HALL[2] + z];
const G = (x: number, y: number, z: number): V3 => [VA[0] + x, VA[1] + y, VA[2] + z];
const HAND_R = 0.66, HAND_UP = 1.12;
const at = (cam: CamInfo, p: V3, r: number, up: number): V3 => [p[0] + cam.right.x * r, p[1] + up, p[2] + cam.right.z * r];
const push = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const stand = (out: Stage, cam: CamInfo, who: Who, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale);
};
/** someone strolling from p0 along (dx, dz) at speed v (m/s) since frame f0 */
const stroll = (out: Stage, cam: CamInfo, who: Who, p0: V3, dx: number, dz: number, v: number, f: number, f0: number, expr: Expr = "neutral") => {
  const s = ((f - f0) / FPS) * v, x = p0[0] + dx * s, z = p0[2] + dz * s;
  const view = viewOf(cam, x, z, dx, dz), ph = q((((f - f0) / FPS) * 0.7 + who.i * 0.13) % 1, 60), t = f / FPS;
  out.places.push(person(cam, who, x, p0[1], z, view, { mode: "stroll", phase: ph, expr, blink: lidAt(t, who.i) },
    { mode: "march", phase: ph, expr, stomp: 0.5, stride: 0.8 * view.fs, blink: lidAt(t, who.i) }));
  blob(out, x, p0[1], z);
};
/** the visitors in the hall; set picks which townsfolk stand where (the crowd changes over "day / week / month") */
const crowd = (out: Stage, cam: CamInfo, t: number, set: number, fo: (k: number) => FrontOpts, skip: number[] = []) =>
  VISITORS.forEach((p, k) => { if (!skip.includes(k)) stand(out, cam, WHO.folk[(k + set * 3) % 9], p, fo(k), t); });
const cox = (out: Stage, cam: CamInfo, t: number, fo: FrontOpts) => stand(out, cam, WHO.cox, COX, { facing: -1, ...fo }, t);

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const look = (k: number) => q(Math.sin(t * 0.7 + k * 1.9) * 0.6, 4);
  switch (id) {
    case 1: {
      if (f < 70) {
        stroll(out, cam, WHO.folk[0], [-14, 0.14, 4.9], 1, 0, 1.2, f, 0);
        stroll(out, cam, WHO.folk[1], [6, 0, 1.5], -1, 0, 1.0, f, 0, "smile");
        stroll(out, cam, WHO.folk[2], [-4, 0.14, -4.9], 1, 0, 0.9, f, 0);
        stroll(out, cam, WHO.folk[3], [12, 0.14, -5.0], -1, 0, 1.1, f, 0);
      } else if (f >= 105) {
        const k = q(clamp01(((f - 105) % 30) / 30), 10);
        push(out, `tick${k}`, 300, 300, (p) => fxTick(p, k), DIAL[0] + 0.12, DIAL[1] + 0.2, DIAL[2] + 0.06, 0.18, 0.18);
      }
      break;
    }
    case 2: {
      const smug = f >= 240 && f < 264, show = q(smooth((f - 262) / 8), 10);
      cox(out, cam, t, { expr: smug ? "smile_closed" : f >= 264 ? "grin" : "smile", headTilt: smug ? 9 : 0, wave: show > 0 ? show : undefined, look: f < 232 ? 0 : -1 });
      if (f >= 264) { const u = q((t * 1.4) % 1, 20); push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), HALL[0] - 0.75, 2.5, HALL[2] + 0.5, 0.5, 0.5); }
      break;
    }
    case 3: {
      if (f < 365) {
        // the queue along the north pavement, the first in line pays at the door
        for (let k = 0; k < 5; k++) stand(out, cam, WHO.folk[k + 2], [1.3 + 1.1 * k, 0.14, MUSEUM_DOOR[2] + 1.2 + 0.15 * (k % 2)], { expr: k === 0 ? "smile" : "neutral", look: k === 0 ? -1 : look(k) }, t);
        const u = clamp01((f - 318) / 14);
        if (u > 0 && u < 1) push(out, `coin${q(u, 12)}`, 200, 200, (p) => fxCoin(p, u * 3), 1.3 - 0.9 * u, 1.2 + 0.4 * Math.sin(u * Math.PI), MUSEUM_DOOR[2] + 1.0, 0.13, 0.13);
        if (f >= 340) stroll(out, cam, WHO.folk[1], [0.6, 0.14, MUSEUM_DOOR[2] + 1.0], 0, -1, 0.9, f, 340);
      } else crowd(out, cam, t, 0, (k) => ({ expr: (["shock", "neutral", "grin", "shock", "neutral", "smile"] as Expr[])[k], look: 0 }));
      break;
    }
    case 4: {
      if (f >= 477) { const k = q(clamp01(((f - 479) % 30) / 30), 10); push(out, `tick${k}`, 300, 300, (p) => fxTick(p, k), DIAL[0] + 0.12, DIAL[1] + 0.2, DIAL[2] + 0.06, 0.18, 0.18); }
      break;
    }
    case 5: {
      const set = f < 552 ? 0 : f < 586 ? 1 : 2;
      crowd(out, cam, t, set, (k) => ({ expr: (["neutral", "grin", "shock", "smile", "neutral", "grin"] as Expr[])[(k + set) % 6], look: look(k) }));
      break;
    }
    case 6: {
      if (f < 648) {
        crowd(out, cam, t, 2, (k) => ({ expr: k === 4 ? "grin" : "neutral", look: k === 4 ? 1 : look(k) }));
        const pop = popAt(f, THEORY.magic), u = q((t * 1.3) % 1, 20);
        if (pop > 0) { const near = at(cam, VISITORS[4], 0.3, 2.05); push(out, `magic${u}`, 400, 400, (p) => fxMagic(p, u), near[0], near[1], near[2] + 0.3, 0.8 * pop, 0.8 * pop); } // beside her head (her hand is out of frame)
      } else if (f < 674) {
        const lean = q(-16 * smooth((f - THEORY.servant + 4) / 6), 2);
        stand(out, cam, WHO.folk[7], H(0.95, 0, -0.75), { expr: "nervous", tilt: lean, look: -1 }, t);
      } else {
        const blink = (f - THEORY.cat) % 50 < 4 && f > THEORY.cat ? 1 : 0, wag = q(Math.sin(t * 5), 6);
        push(out, `cat${blink}|${wag}`, 400, 500, (p) => fxCat(p, blink, wag), HALL[0] + 0.95, 0.27, HALL[2] + 0.5, 0.4, 0.5);
        push(out, "blob|catShadow", 128, 128, (p) => fxContact(p, "#5a4a52"), HALL[0] + 0.95, 0.035, HALL[2] + 0.5, 0.5, 0.32, { flat: true });
        if (f >= 694) { const w = q(Math.sin(t * 2.5), 10); push(out, `q${w}`, 300, 420, (p) => fxQuestion(p, w), HALL[0] + 0.95, 0.66, HALL[2] + 0.52, 0.13 * popAt(f, 694), 0.18 * popAt(f, 694)); }
      }
      break;
    }
    case 7: {
      cox(out, cam, t, { expr: f < 728 ? "neutral" : "smile_closed", headTilt: f < 728 ? 0 : 6 });
      if (f >= 800) {
        stand(out, cam, WHO.folk[4], [LOTTERY[0] - 1.1, 0, LOTTERY[2] + 0.7], { expr: f >= 820 ? "laugh" : "grin", look: 1 }, t);
        stand(out, cam, WHO.folk[5], [LOTTERY[0] + 1.15, 0, LOTTERY[2] + 0.9], { expr: f >= 820 ? "shock" : "neutral", look: -1 }, t);
      }
      break;
    }
    case 8: {
      crowd(out, cam, t, 2, (k) => ({ expr: k % 2 ? "laugh" : "grin", clap: q(0.5 + 0.5 * Math.sin(t * 16 + k * 2), 10) }));
      cox(out, cam, t, { expr: "smile_closed", headTilt: 8 });
      break;
    }
    case 9: case 13: case 14: {
      const k = stormAt(f);
      if (k > 0.55 || id === 9) for (let n = 0; n < 24; n++) {
        const u = q((t * 1.6 + n * 0.17) % 1, 12), base = cam.pos, col = n % 6, row = Math.floor(n / 6);
        push(out, `rain${u}`, 400, 800, (p) => fxRain(p, u), base.x - 25 + 10 * col + 3 * (row % 2), base.y - 22 + 16 * row, base.z - 40 - 4 * (row % 2), 10, 20, { soft: true });
      }
      if (id === 14 && f >= 1620 && f < 1630) push(out, "bolt", 300, 600, fxBolt, cam.pos.x - 20, cam.pos.y + 38, cam.pos.z - 160, 18, 36);
      if (id === 9 && f >= 954 && f < 962) push(out, "bolt", 300, 600, fxBolt, cam.pos.x + 25, cam.pos.y + 60, cam.pos.z - 300, 28, 56);
      break;
    }
    case 10: case 11: {
      if (id === 11 && f >= 1281 && f < 1300) { const u = q((f - 1281) / 19, 10); push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), HALL[0], 0.62 + 0.75 * 0.55 + 0.1, HALL[2] + 0.2, 0.22, 0.22); }
      break;
    }
    case 12: {
      const m = mercuryAt(f), inK = f >= 1386 && f < 1412, outK = f >= 1412 && f < 1440;
      stand(out, cam, WHO.folk[6], CHEST, { expr: inK ? "relief_open" : outK ? "relief" : "smile", look: 1, shrug: q(clamp01((m - 0.5) * 6), 10) }, t, 1 + 0.03 * clamp01((m - 0.5) * 6));
      if (inK || outK) { const u = q(inK ? (f - 1386) / 26 : (f - 1412) / 28, 10); push(out, `breath${inK ? 1 : -1}|${u}`, 600, 300, (p) => fxBreath(p, inK ? 1 : -1, u), CHEST[0] + 0.25, 1.62, CHEST[2] + 0.2, 0.9, 0.45, { soft: true }); }
      break;
    }
    case 15: case 16: {
      const spots: V3[] = [G(-0.9, 0, 3.0), G(0.5, 0, 3.4), G(1.6, 0, 2.8), G(-0.2, 0, 4.4)];
      spots.forEach((p, k) => stand(out, cam, WHO.modern[k], p, { expr: id === 16 && f >= STOP ? "shock" : (["neutral", "smile", "neutral", "grin"] as Expr[])[k], look: q(Math.sin(t * 0.5 + k) * 0.5, 4) }, t));
      const flip = f >= SWITCH;
      stand(out, cam, WHO.guard, G(-2.1, 0, 0.95), { expr: flip ? "smile_closed" : "neutral", facing: 1, wave: id === 16 && f >= SWITCH - 6 && f < SWITCH + 14 ? 0.6 : undefined }, t);
      break;
    }
  }
  void bodySide; void bodyFront; void fxShadow; void Outfit0; void smooth;
  return out;
};
type Outfit0 = Outfit; const Outfit0 = 0;
