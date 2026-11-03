// The teaspoon cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, townsfolk, FRANKLIN, CAPTAIN, COOK, SAILOR, fxContact, fxShadow, fxRing, fxPuff, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { fxQuestion, fxWind, fxDrop, fxStream, fxSlop, fxBlanket, fxSparkle, fxMolecules, fxSpoon, fxBonk } from "./fx";
import { FPS, SHOTS, V3, FR, DROP, FRIENDS, BED, PATH_Z, SEA, SHIP_DECK, POND, MACRO, TIP_HOOK, TIP, franklinAt, calmR, calmC, smooth, clamp01 } from "./story";
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
let LNAME: "day" | "golden" = "day";
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
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
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
  ben: { i: 1, o: FRANKLIN, okey: "ben" } as Who,
  cap: { i: 2, o: CAPTAIN, okey: "cap" } as Who,
  cook: { i: 3, o: COOK, okey: "cook" } as Who,
  sail: { i: 4, o: SAILOR, okey: "sail" } as Who,
  friends: [0, 1, 2].map((k) => ({ i: 10 + k, o: townsfolk([1, 2, 5][k]), okey: `f${k}` }) as Who),
};
const sea = (x: number, y: number, z: number): V3 => [SEA[0] + x, SEA[1] + y, SEA[2] + z];
const FRONT = { side: false, mirror: false };
/** where a front-view card's spoon / cane tip is: (right, up) metres from the feet in the card plane */
const HAND_R = 0.66, HAND_UP = 1.12;
const at = (cam: CamInfo, p: V3, r: number, up: number): V3 => [p[0] + cam.right.x * r, p[1] + up, p[2] + cam.right.z * r];
const push = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });

/** a falling drop from the spoon bowl and its ring on the water (tip frame f0) */
const dropFx = (out: Stage, f: number, f0: number, from: V3) => {
  const n = f - f0;
  if (n >= 0 && n < 16) {
    const u = n / 16, y = from[1] - (from[1] - POND.y) * u * u;
    push(out, "drop", 120, 160, fxDrop, DROP[0], y, DROP[2], 0.07, 0.093);
  }
  if (n >= 16 && n < 56) {
    const u = q((n - 16) / 40, 30);
    push(out, `ring${u}`, 600, 600, (p) => fxRing(p, u), DROP[0], POND.y + 0.02, DROP[2], 1.6 + 2.5 * u, 1.6 + 2.5 * u, { flat: true });
  }
};
/** wind gusts sliding along the surface (cards a little above the water) */
const gusts = (out: Stage, t: number, cx: number, cz: number, n: number, spread: number, y: number, size = 1) => {
  for (let k = 0; k < n; k++) {
    const u = q(((t * 0.45 + hh(k, 31)) % 1), 30);
    const x = cx - spread / 2 + spread * ((hh(k, 32) + t * 0.08) % 1), z = cz + (hh(k, 33) - 0.5) * spread * 0.6;
    push(out, `wind${u}`, 600, 300, (p) => fxWind(p, u), x, y + hh(k, 34) * 1.5 * size, z, 2.6 * size, 1.3 * size, { soft: true });
  }
};
/** mirror glints on the oiled patch */
const sparkles = (out: Stage, t: number, R: number, n: number, y = POND.y + 0.25, s = 0.9) => {
  const [cx, cz] = calmC(R);
  for (let k = 0; k < n; k++) {
    const u = q(((t * 0.8 + hh(k, 41)) % 1), 20), a = hh(k, 42) * Math.PI * 2, d = Math.sqrt(hh(k, 43)) * R * 0.85;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.9;
    if (Math.abs(x) > POND.rx - 3) continue;
    push(out, `spark${u}`, 200, 200, (p) => fxSparkle(p, u), x, y, z, s, s);
  }
};
const stand = (out: Stage, cam: CamInfo, who: Who, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale);
};
const friendsAt = (out: Stage, cam: CamInfo, t: number, fo: (k: number) => FrontOpts) =>
  FRIENDS.forEach((p, k) => stand(out, cam, WHO.friends[k], p, fo(k), t, 1, fo(k).mode !== "sit"));

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const ben = franklinAt(id, f);
  const spoonK = (f0: number) => q(smooth((f - (f0 - 10)) / 10), 20);
  switch (id) {
    case 1: {
      stand(out, cam, WHO.ben, ben, { expr: f < 70 ? "smile_closed" : "neutral", prop: ["spoon", spoonK(TIP_HOOK)] }, t);
      dropFx(out, f, TIP_HOOK, at(cam, ben, HAND_R + 0.12, HAND_UP));
      gusts(out, t, -40, 0, 3, 30, 0.6, 1.2);
      break;
    }
    case 2: {
      if (f < 228) stand(out, cam, WHO.ben, sea(0.5, SHIP_DECK, -2.4), { expr: f < 211 ? "neutral" : "smile", look: 1, facing: 1 }, t);
      break;
    }
    case 3: {
      if (f < 359) {
        const k = q(smooth((f - 326) / 8) * (1 - smooth((f - 352) / 7)), 20);
        stand(out, cam, WHO.cap, sea(-1.2, SHIP_DECK, -0.6), { expr: k > 0.3 ? "smile_closed" : "neutral", shrug: k, headTilt: 6 * k }, t);
        stand(out, cam, WHO.sail, sea(1.6, SHIP_DECK, -2.6), { expr: "neutral" }, t);
      } else {
        const k = q(smooth((f - 378) / 10), 20), deck = SHIP_DECK * 0.95;
        stand(out, cam, WHO.cook, sea(91.4, deck, -14.6), { expr: k > 0.5 ? "smile_closed" : "neutral", prop: ["bucket", k] }, t);
        if (f >= 386 && f < 436) {
          const u = q(((f - 386) % 12) / 12, 12);
          push(out, `slop${u}`, 300, 600, (p) => fxSlop(p, u), SEA[0] + 92.2, deck * 0.55, SEA[2] - 13.6, 0.9, 1.8 * (deck + 0.6) / 1.8);
        }
        if (f >= 392) {
          const u = q(clamp01((f - 392) / 50), 30);
          push(out, `ring${u}`, 600, 600, (p) => fxRing(p, u), SEA[0] + 92.4, 0.03, SEA[2] - 12.8, 2 + 4 * u, 2 + 4 * u, { flat: true });
        }
      }
      break;
    }
    case 4: {
      const view = viewOf(cam, ben[0], ben[2], 1, 0), ph = q(((f - 444) / FPS) * 0.62 % 1, 60);
      out.places.push(person(cam, WHO.ben, ben[0], 0, ben[2], view, { mode: "stroll", phase: ph, expr: "neutral", look: 0, prop: "cane", blink: lidAt(t, 1) },
        { mode: "march", phase: ph, expr: "neutral", stomp: 0.5, stride: 0.75 * view.fs, blink: lidAt(t, 1) }));
      blob(out, ben[0], 0, ben[2]);
      const pop = q(smooth((f - 505) / 8), 10), wob = q(Math.sin(t * 3), 20);
      if (pop > 0) push(out, `q${wob}`, 300, 420, (p) => fxQuestion(p, wob), ben[0] + 0.05, 2.75 + 0.05 * Math.sin(t * 2), ben[2], 0.42 * pop, 0.59 * pop);
      break;
    }
    case 5: {
      const walking = f < 680;
      if (walking) {
        const view = viewOf(cam, ben[0], ben[2], 1, -0.5), ph = q(((f - 574) / FPS) * 0.7 % 1, 60);
        out.places.push(person(cam, WHO.ben, ben[0], 0, ben[2], view, { mode: "stroll", phase: ph, expr: "neutral", prop: "cane", blink: lidAt(t, 1) },
          { mode: "march", phase: ph, expr: "neutral", stomp: 0.5, stride: 0.8 * view.fs, blink: lidAt(t, 1) }));
        blob(out, ben[0], 0, ben[2]);
      } else stand(out, cam, WHO.ben, ben, { expr: f < 700 ? "smile_closed" : "neutral", prop: f < 690 ? "cane" : ["spoon", spoonK(TIP)] }, t);
      dropFx(out, f, TIP, at(cam, ben, HAND_R + 0.12, HAND_UP));
      if (f < 628) gusts(out, t, -25, 5, 6, 60, 1.5, 3);
      else gusts(out, t, -50, 2, 3, 20, 0.6, 1.2);
      break;
    }
    case 6: case 7: {
      stand(out, cam, WHO.ben, ben, { expr: "smile_closed", prop: "cane" }, t);
      const R = calmR(id, f);
      if (id === 7 || f > 900) sparkles(out, t, R, id === 7 ? 9 : 6, POND.y + 0.3, id === 7 ? 1.1 : 2.4);
      break;
    }
    case 8: {
      stand(out, cam, WHO.ben, ben, { expr: "smile_closed", prop: "cane", headTilt: 9 * smooth((f - 992) / 8), facing: -1 }, t);
      friendsAt(out, cam, t, (k) => ({ expr: k === 1 ? "laugh" : "grin", clap: q(0.5 + 0.5 * Math.sin(t * 16 + k * 2), 10) }));
      push(out, "blanket", 600, 400, fxBlanket, FRIENDS[1][0] - 0.4, 0.02, FRIENDS[1][2] + 1.6, 3.4, 2.3, { flat: true, rot: 0.2 });
      break;
    }
    case 9: {
      const sit = (k: number): FrontOpts => ({ mode: "sit", expr: (["stern", "neutral", "stern"] as Expr[])[k], look: f > 1120 ? 1 : 0 });
      FRIENDS.forEach((p, k) => out.places.push(person(cam, WHO.friends[k], p[0], 0, p[2] + 0.6, FRONT, { blink: lidAt(t, 10 + k), ...sit(k) }, {})));
      push(out, "blanket", 600, 400, fxBlanket, FRIENDS[1][0] - 0.4, 0.02, FRIENDS[1][2] + 1.6, 3.4, 2.3, { flat: true, rot: 0.2 });
      const k = q(smooth((f - 1128) / 10), 20);
      stand(out, cam, WHO.ben, ben, { expr: k > 0.5 ? "smile" : "neutral", prop: f < 1118 ? "cane" : ["caneOil", k], facing: 1 }, t);
      if (f >= 1140) {
        const tip = at(cam, ben, HAND_R + 0.42, HAND_UP + 0.05), u = q((t * 2) % 1, 12);
        push(out, `stream${u}`, 120, 600, (p) => fxStream(p, u), tip[0], (tip[1] + POND.y) / 2 - 0.1, tip[2], 0.07, tip[1] - POND.y);
      }
      break;
    }
    case 10: {
      // gusts slide across the oiled water (screen left) and bounce off; then grab the ripples (screen right)
      for (let k = 0; k < 3; k++) {
        const u = q(((f - 1190 + k * 22) % 66) / 66, 30), x = MACRO[0] - 2.4 + 2.2 * u, y = POND.y + 0.28 + 0.06 * k;
        push(out, `wind${u}`, 600, 300, (p) => fxWind(p, u), x, y, MACRO[2] - 0.9 - 0.4 * k, 0.9, 0.45, { soft: true });
        if (f < 1255 && u > 0.7) { const b = q((u - 0.7) / 0.3, 10); push(out, `bonk${b}`, 300, 300, (p) => fxBonk(p, b), x + 0.2, POND.y + 0.12, MACRO[2] - 0.9 - 0.4 * k, 0.5, 0.5, { soft: true }); }
      }
      break;
    }
    case 11: {
      const shr = q(smooth((f - 1418) / 8), 20), lean = f < 1418 ? -14 + 3 * Math.sin(t * 6) : 0;
      stand(out, cam, WHO.friends[0], [BED[0] + 0.25, 0, BED[2] + 1.25], { expr: f < 1418 ? "nervous" : "neutral", tilt: q(lean, 2), clap: f < 1418 ? 0 : undefined, shrug: shr }, t);
      stand(out, cam, WHO.ben, [BED[0] - 1.9, 0, BED[2] + 1.7], { expr: "smile", prop: "cane", facing: 1 }, t);
      break;
    }
    case 12: {
      // the oil skin: little molecules arriving with the spreading edge, holding hands on the surface
      const R = calmR(12, f), [cx, cz] = calmC(R), edge = cx + R, x0 = MACRO[0] - 2.2;
      const n = q(clamp01((edge - x0) / 4.4) * 14, 4), u = q(t % 1, 20);
      if (n > 0) push(out, `mol${n}|${u}`, 1600, 260, (p) => fxMolecules(p, n, u), x0 + 2.2, POND.y + 0.11, MACRO[2] - 0.8, 4.4, 0.72);
      if (f > 1600) { const b = q(clamp01((f - 1606) / 14), 10); push(out, `bonk${b}`, 300, 300, (p) => fxBonk(p, b), MACRO[0] - 0.4, POND.y + 0.3, MACRO[2] - 0.9, 0.7, 0.7, { soft: true }); }
      void cz;
      break;
    }
    case 13: {
      if (f < 1707) stand(out, cam, WHO.ben, ben, { expr: f < 1680 ? "smile" : "smile_closed", prop: ["spoon", 0] }, t);
      else if (f < 1786) { stand(out, cam, WHO.ben, ben, { expr: "smile_closed", prop: "cane" }, t); sparkles(out, t, 27, 7, POND.y + 0.3, 2.6); }
      else {
        const u = q(t % 1, 20);
        push(out, `mol14|${u}`, 1600, 260, (p) => fxMolecules(p, 14, u), MACRO[0] - 1.4, POND.y + 0.05, MACRO[2] - 1.2, 2.2, 0.36);
      }
      break;
    }
    case 14: {
      stand(out, cam, WHO.ben, ben, { expr: "smile_closed", prop: "cane", facing: 1 }, t);
      FRIENDS.forEach((p, k) => out.places.push(person(cam, WHO.friends[k], p[0], 0, p[2] + 0.6, FRONT, { mode: "sit", expr: "smile", blink: lidAt(t, 10 + k) }, {})));
      sparkles(out, t, 27, 5, POND.y + 0.3, 1.2);
      break;
    }
    case 15: {
      if (f < 2000) {
        const k = q(smooth((f - 1968) / 7) * (1 - smooth((f - 1992) / 6)), 20);
        stand(out, cam, WHO.ben, ben, { expr: k > 0.3 ? "smile_closed" : "neutral", shrug: k, headTilt: -5 * k }, t);
      } else {
        const view = viewOf(cam, ben[0], ben[2], -1, 0.55), ph = q(((f - 2000) / FPS) * 0.7 % 1, 60);
        out.places.push(person(cam, WHO.ben, ben[0], 0, ben[2], view, { mode: "stroll", phase: ph, expr: "smile_closed", prop: "cane", blink: lidAt(t, 1) },
          { mode: "march", phase: ph, expr: "smile_closed", stomp: 0.5, stride: 0.8 * view.fs, blink: lidAt(t, 1) }));
        blob(out, ben[0], 0, ben[2]);
      }
      break;
    }
  }
  void fxSpoon; void fxPuff; void fxShadow; void fxContact; void bodySide; void bodyFront; void BED; void PATH_Z; void TIP; void DROP;
  return out;
};
