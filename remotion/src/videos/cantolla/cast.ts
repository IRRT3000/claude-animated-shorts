// The teaspoon cast as lit flat cards in the 3D world (same machinery as the bridge short: canvas pool, yaw-only
// billboards shaded by cardShade(), contact blobs, unlit effect cards on the NOINK layer).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, fxShadow, fxRing, fxPuff, fxSplash, Outfit, Expr, FrontOpts, SideOpts,
  JOAQUIN, CLERK, OLD_JOAQUIN, BRANIFF, REBEL, ABUELA, PAPA, MAMA, NINO, mexFolk } from "./toon";
import { fxPigeon, fxHorseRider, fxMorse, fxAir, fxShard, fxWhizz, fxHat, fxCheer, fxDowndraft, fxFlash, fxSmoke } from "./fx";
import { FPS, SHOTS, V3, smooth, clamp01, lin, camAt, balloonsAt, basketAt, ROOM, ROOM_H, ON_TABLE, FAMILY, DESK, CLERK_AT, SEW_AT, BULL, ARENA_R,
  HORSE_PATH, CROWD_SEATS, KID_AT, BALL0, ballAt, REBELS, LANDING, FIESTA, SKY_HOUSE, SKYLIGHT, CATH, FOUNT_WATER, TABLE, lanternAt, CRASH_HOOK, CRASH_GUST } from "./story";
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
  joaquin: { i: 1, o: JOAQUIN, okey: "joa" } as Who,
  clerk: { i: 1, o: CLERK, okey: "clerk" } as Who,
  old: { i: 2, o: OLD_JOAQUIN, okey: "old" } as Who,
  braniff: { i: 3, o: BRANIFF, okey: "bra" } as Who,
  family: [PAPA, MAMA, NINO, ABUELA].map((o, k) => ({ i: 10 + k, o, okey: `fam${k}` }) as Who),
  rebels: [0, 1, 2, 3, 4, 5].map((k) => ({ i: 20 + k, o: { ...REBEL, cap: ["#d8bc7c", "#c9a86a", "#e2c88e"][k % 3], skin: ["#c99067", "#b57b52", "#d9a57c"][k % 3] }, okey: `reb${k}` }) as Who),
  folk: Array.from({ length: 14 }, (_, k) => ({ i: 40 + k, o: mexFolk(k), okey: `folk${k}` }) as Who),
};
const FRONT = { side: false, mirror: false };
const push = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const stand = (out: Stage, cam: CamInfo, who: Who, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1], p[2], scale);
};
/** a point offset from p along the camera's right (r) and up (u) */
const off = (cam: CamInfo, p: V3, r: number, u: number, toward = 0): V3 => {
  const dx = cam.pos.x - p[0], dz = cam.pos.z - p[2], l = Math.hypot(dx, dz) || 1;
  return [p[0] + cam.right.x * r + (dx / l) * toward, p[1] + u, p[2] + cam.right.z * r + (dz / l) * toward];
};
/** riders in every balloon basket of the shot */
const riders = (out: Stage, cam: CamInfo, id: number, f: number, t: number, fo: (who: "young" | "old" | "braniff") => FrontOpts) => {
  for (const b of balloonsAt(id, f)) {
    const n = b.riders.length;
    b.riders.forEach((r, k) => {
      const who = r === "young" ? WHO.joaquin : r === "old" ? WHO.old : WHO.braniff;
      const p = off(cam, b.pos, n === 1 ? 0 : (k - 0.5) * 0.75, 0.04);
      out.places.push(person(cam, who, p[0], p[1], p[2], FRONT, { mode: "stand", blink: lidAt(t, who.i), ...fo(r) }, {}));
    });
  }
};
/** a flock of pigeons crossing the frame: k birds launched at f0 from `from`, flying along dir with spread */
const pigeons = (out: Stage, f: number, f0: number, from: V3, dir: V3, n: number, size: number, speed: number) => {
  if (f < f0) return;
  for (let k = 0; k < n; k++) {
    const u = (f - f0 - hh(k, 61) * 8) / FPS;
    if (u < 0) continue;
    const s = speed * (0.8 + 0.4 * hh(k, 62)), sp = 2.5 * size;
    const x = from[0] + dir[0] * s * u + (hh(k, 63) - 0.5) * sp * 3, y = from[1] + dir[1] * s * u + (hh(k, 64) - 0.5) * sp + 0.6 * Math.sin(u * 3 + k);
    const z = from[2] + dir[2] * s * u + (hh(k, 65) - 0.5) * sp * 3;
    const w = q(((f + k * 3) % 8) / 8, 8);
    push(out, `pig${w}`, 300, 200, (p) => fxPigeon(p, w), x, y, z, 0.9 * size, 0.6 * size);
  }
};
/** the bullring crowd on its tiers (cheering = waving on a slow beat) */
const crowd = (out: Stage, cam: CamInfo, t: number, cheer: number) => {
  for (let k = 0; k < CROWD_SEATS; k++) {
    const tier = k % 6, a = (k / CROWD_SEATS) * Math.PI * 2 * 1.0 + tier * 0.17, r0 = ARENA_R + 1.85 + tier * 1.3, y = 1.5 + (tier + 1) * 0.85;
    const x = BULL[0] + Math.cos(a) * r0, z = BULL[2] + Math.sin(a) * r0;
    const who = WHO.folk[k % WHO.folk.length];
    const wv = cheer > 0 ? q(0.5 + 0.5 * Math.sin(t * 9 + k), 2) : undefined;
    const pl = person(cam, { ...who, i: 100 + k }, x, y, z, FRONT, { mode: "stand", expr: cheer > 0 ? "grin" : "smile_closed", blink: 0, wave: wv }, {}, 0.95);
    pl.key = pl.key.replace(/"seed":\d+/, `"seed":${(k % 3) + 1}`);
    out.places.push(pl);
  }
};
const flyingHats = (out: Stage, f: number, f0: number, c: V3, n: number) => {
  if (f < f0) return;
  for (let k = 0; k < n; k++) {
    const u = (f - f0 - hh(k, 71) * 10) / FPS;
    if (u < 0 || u > 1.6) continue;
    const a = hh(k, 72) * Math.PI * 2, d = ARENA_R + 3 + hh(k, 73) * 8;
    const x = c[0] + Math.cos(a) * d * 0.9, z = c[2] + Math.sin(a) * d * 0.9, y = 3 + 9 * u - 4.9 * u * u;
    const spin = q(((u * 500 + k * 40) % 360), 1 / 15), col = ["#d8bc7c", "#3b3138", "#a8743a"][k % 3];
    push(out, `hat${spin}|${col}`, 300, 160, (p) => fxHat(p, spin, col), x, y, z, 0.9, 0.48);
  }
};

/** everything with a face in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] }, t = f / FPS, s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const R = (x: number, y: number, z: number): V3 => [ROOM[0] + x, ROOM[1] + y, ROOM[2] + z];
  switch (id) {
    case 1: {
      riders(out, cam, id, f, t, () => ({ expr: f < 50 ? "grin" : f < 70 ? "nervous" : "shock", wave: f < 46 ? q(0.5 + 0.5 * Math.sin(t * 10), 4) : undefined, shrug: f >= 70 ? 1 : 0 }));
      // pigeons burst out of the east belfry and cross the lens
      pigeons(out, f, 18, [CATH.towerX, CATH.body + 3, CATH.z - 5], [-0.35, 0.25, 0.9], 9, 1.0, 9);
      pigeons(out, f, 30, [CATH.towerX + 2, CATH.body + 4, CATH.z - 3], [-0.6, 0.15, 0.75], 6, 1.0, 11);
      break;
    }
    case 2: {
      // he drops through the hole onto the table (feet land at 106), glass falls with him
      const yLand = ON_TABLE[1], yTop = ROOM_H + 0.4, u = clamp01((f - 99) / 7);
      const y = f < 106 ? yTop - (yTop - yLand) * u * u : yLand;
      const exprJ: Expr = f < 106 ? "shock" : f < 132 ? "dazed" : "pained";
      out.places.push(person(cam, WHO.joaquin, ON_TABLE[0], y, ON_TABLE[2], FRONT, { mode: f < 106 ? "fall" : "stand", expr: exprJ, blink: lidAt(t, 1), shrug: f >= 132 ? 1 : 0 }, {}));
      for (let k = 0; k < 10; k++) {
        const v = (f - 99 - hh(k, 81) * 4) / FPS;
        if (v < 0) continue;
        const sy = ROOM_H - 9 * v * v - 1.5 * v;
        if (sy < TABLE[1] + 0.05) continue;
        push(out, `shard${k % 4}`, 120, 120, (p) => fxShard(p, k % 4), ON_TABLE[0] + (hh(k, 82) - 0.5) * 1.6, sy, ON_TABLE[2] + (hh(k, 83) - 0.5) * 1.2, 0.16, 0.16, { rot: q(v * 8 + k, 4) });
      }
      if (f >= 106 && f < 124) { const u2 = q((f - 106) / 18, 10); push(out, `puff${u2}`, 300, 300, (p) => fxPuff(p, u2), ON_TABLE[0], ON_TABLE[1] + 0.25, ON_TABLE[2] + 0.2, 1.4, 1.4, { soft: true }); }
      const fam: Expr[] = f < 118 ? ["shock", "shock", "shock", "shock"] : ["stern", "stern", "laugh", "stern"];
      FAMILY.forEach((p, k) => {
        const fo: FrontOpts = { expr: fam[k] };
        if (k === 3) fo.prop = ["broom", f < 128 ? 0 : q(0.5 + 0.5 * Math.sin((f - 128) * 0.55), 6)];
        if (k === 0 && f >= 132) fo.shrug = 0.6;
        stand(out, cam, WHO.family[k], p, fo, t);
      });
      break;
    }
    case 3: {
      const k = q(f % 10 < 4 ? 1 : 0, 1);
      stand(out, cam, WHO.clerk, CLERK_AT, { expr: "smile_closed", prop: ["tap", k] }, t, 1, false);
      const u = q(((f - 161) / 40) % 1, 30);
      push(out, `morse${u}`, 600, 200, (p) => fxMorse(p, u), DESK[0] + 0.55, 1.15, DESK[2] + 0.1, 1.2, 0.4, { soft: true });
      break;
    }
    case 4: {
      stand(out, cam, WHO.clerk, [SEW_AT[0], 0, SEW_AT[2] - 1.25], { expr: "smile", clap: q(0.55 + 0.1 * Math.sin(t * 6), 10), look: -1 }, t, 1, false);
      break;
    }
    case 5: case 6: case 7: case 8: {
      const cheer = id === 7 && f >= 538 ? 1 : id === 8 ? 1 : id === 5 ? 0.0 : 0;
      crowd(out, cam, t, cheer);
      if (id <= 7 && !(id === 7 && f >= 538)) { // two helpers holding the tether ropes
        stand(out, cam, WHO.folk[3], [BULL[0] - 1.6, 0, BULL[2] + 1.1], { expr: "neutral", clap: 0.4 }, t);
        stand(out, cam, WHO.folk[6], [BULL[0] + 1.7, 0, BULL[2] - 0.9], { expr: "neutral", clap: 0.4 }, t);
      }
      if (id === 6) {
        const h = HORSE_PATH(f), ph = q(((f - 404) / FPS) * 1.1 % 1, 24), d = cam.pos.distanceTo(tmp.set(h[0], 1.5, h[2])) / 2;
        const [w, hgt, k] = tier(d), fo: FrontOpts = { expr: "grin", blink: lidAt(t, 1), wave: q(0.5 + 0.5 * Math.sin(t * 7), 4), light: light2D(cam, false), seed: seedOf(1) };
        out.places.push({ key: `horse|${ph}|${fkey(fo)}`, draw: (p) => fxHorseRider(p, JOAQUIN, ph, fo), x: h[0], y: 0, z: h[2], scale: 2.0, size: [w, hgt, k] });
        blob(out, h[0], 0, h[2], 2.4);
      }
      if (id === 7) {
        if (f < 500) stand(out, cam, WHO.joaquin, [BULL[0] + 1.0, 0, BULL[2] + 0.5], { expr: "grin", facing: -1, look: -1, wave: q(smooth((f - 480) / 10), 4) }, t);
        else riders(out, cam, id, f, t, () => ({ expr: f < 538 ? "grin" : "laugh", wave: q(0.5 + 0.5 * Math.sin(t * 8), 4) }));
        flyingHats(out, f, 540, BULL, 18);
      }
      if (id === 8) {
        riders(out, cam, id, f, t, () => ({ expr: "laugh", wave: q(0.5 + 0.5 * Math.sin(t * 8), 4) }));
        for (let k = 0; k < 5; k++) stand(out, cam, WHO.folk[k + 2], [BULL[0] - 4.5 + k * 1.6, 0, BULL[2] + 8.2 + (k % 2) * 0.8], { expr: k % 2 ? "laugh" : "grin", wave: q(0.5 + 0.5 * Math.sin(t * 9 + k), 4) }, t);
        flyingHats(out, f, 556, BULL, 14);
      }
      break;
    }
    case 9: case 10: case 11: case 12: case 17: case 19: case 20: {
      riders(out, cam, id, f, t, () => ({ expr: id === 17 ? "smile_closed" : "grin", wave: id === 17 ? undefined : q(0.5 + 0.5 * Math.sin(t * 7), 4) }));
      if (id === 17) { // warm air rising inside, cold air sinking around
        const b = basketAt(17, f);
        for (let k = 0; k < 5; k++) {
          const u = ((t * 0.5 + hh(k, 91)) % 1), wv = q(u, 12);
          const p = off(cam, b, (hh(k, 92) - 0.5) * 3.4, 3 + u * 9, 5.4);
          if (f >= 1085) push(out, `air1${wv}`, 260, 260, (pp) => fxAir(pp, true, wv), p[0], p[1], p[2], 1.0, 1.0);
        }
        for (let k = 0; k < 6; k++) {
          const u = ((t * 0.3 + hh(k, 93)) % 1), wv = q(u, 12), side = k % 2 ? 1 : -1;
          const p = off(cam, b, side * (6.5 + 1.5 * hh(k, 94)), 13 - u * 12, 1);
          if (f >= 1110) push(out, `air0${wv}`, 260, 260, (pp) => fxAir(pp, false, wv), p[0], p[1], p[2], 1.6, 1.6);
        }
      }
      if (id === 19) {
        stand(out, cam, WHO.family[2], [3.0, 0, 6], { expr: "laugh", wave: q(0.5 + 0.5 * Math.sin(t * 9), 4) }, t);
        stand(out, cam, WHO.folk[1], [-2.6, 0, 4.6], { expr: "grin", look: 1 }, t);
      }
      break;
    }
    case 13: {
      riders(out, cam, id, f, t, () => ({ expr: f < 786 ? "grin" : "shock", shrug: f >= 790 ? 1 : 0 }));
      if (f >= 776) { // the cold gust pressing down on the envelope
        const b = basketAt(13, f);
        for (let k = 0; k < 3; k++) {
          const u = q(((f - 776 + k * 9) % 26) / 26, 26);
          const p = off(cam, b, (k - 1) * 3.2, 10 + 1.5 * k, 3);
          push(out, `down${u}`, 300, 600, (pp) => fxDowndraft(pp, u), p[0], p[1], p[2], 2.6, 5.2, { soft: true });
        }
      }
      break;
    }
    case 14: {
      if (f < CRASH_GUST) riders(out, cam, id, f, t, () => ({ expr: "shock", shrug: 1 }));
      const nb: [Who, V3, Expr][] = [[WHO.folk[0], [SKY_HOUSE.x - 5.5, 0, SKY_HOUSE.z + 8.5], "shock"], [WHO.folk[4], [SKY_HOUSE.x - 3.8, 0, SKY_HOUSE.z + 7.6], "shock"], [WHO.folk[7], [SKY_HOUSE.x - 6.8, 0, SKY_HOUSE.z + 7.0], "nervous"]];
      for (const [w, p, e] of nb) stand(out, cam, w, p, { expr: f < 836 ? "neutral" : e, look: 1, shrug: f >= 845 ? 0.5 : 0 }, t);
      if (f >= CRASH_GUST) {
        for (let k = 0; k < 8; k++) {
          const v = (f - CRASH_GUST - hh(k, 84) * 3) / FPS; if (v < 0) continue;
          const a = hh(k, 85) * Math.PI * 2, y = SKYLIGHT[1] + 0.4 + 5 * v - 9 * v * v;
          if (y < SKYLIGHT[1]) continue;
          push(out, `shard${k % 4}`, 120, 120, (p) => fxShard(p, k % 4), SKYLIGHT[0] + Math.cos(a) * 2 * v, y, SKYLIGHT[2] + Math.sin(a) * 2 * v, 0.35, 0.35, { rot: q(v * 9 + k, 4) });
        }
        if (f < CRASH_GUST + 24) { const u2 = q((f - CRASH_GUST) / 24, 12); push(out, `puff${u2}`, 300, 300, (p) => fxPuff(p, u2), SKYLIGHT[0], SKYLIGHT[1] + 1, SKYLIGHT[2], 4, 4, { soft: true }); }
      }
      break;
    }
    case 15: {
      const k = q(smooth((f - 914) / 10), 10);
      stand(out, cam, WHO.joaquin, ON_TABLE, { expr: f < 923 ? "dazed" : "relief", shrug: k }, t, 1, false);
      break;
    }
    case 16: {
      stand(out, cam, WHO.joaquin, ON_TABLE, { expr: f < 986 ? "relief" : "nervous", shrug: f < 986 ? 1 : 0.3 }, t, 1, false);
      FAMILY.forEach((p, k) => {
        const fo: FrontOpts = { expr: f < 1000 ? "shock" : "stern" };
        if (k === 3) fo.prop = ["broom", f < 1010 ? q(1 - smooth((f - 990) / 12), 6) : 0];
        stand(out, cam, WHO.family[k], p, fo, t);
      });
      break;
    }
    case 18: {
      const held = f < 1164, b = ballAt(f);
      stand(out, cam, WHO.family[2], KID_AT, { expr: held ? "grin" : f < 1205 ? "nervous" : "laugh", clap: held ? 0.2 : undefined, shrug: !held && f >= 1205 ? 1 : 0, look: -1 }, t);
      if (f >= 1205 && f < 1230) { const u = q((f - 1205) / 25, 12); push(out, `splash${u}`, 600, 600, (p) => fxSplash(p, u), BALL0[0], FOUNT_WATER + 0.35, BALL0[2], 1.3, 1.3); }
      if (f >= 1164 && f < 1205) { const u = q(((f - 1164) % 20) / 20, 10); push(out, `ring${u}`, 600, 600, (p) => fxRing(p, u), b[0], FOUNT_WATER + 0.01, b[2], 0.5 + 0.6 * u, 0.5 + 0.6 * u, { flat: true }); }
      break;
    }
    case 21: case 22: case 23: case 24: {
      const shock = id === 24 && f >= 1626;
      riders(out, cam, id, f, t, (r) => ({ expr: shock ? "shock" : id === 23 ? "neutral" : r === "braniff" ? "grin" : "smile_closed", shrug: shock ? 1 : 0, wave: !shock && id === 22 && r === "old" ? q(0.5 + 0.5 * Math.sin(t * 6), 4) : undefined }));
      if (id >= 23) REBELS.forEach((p, k) => {
        stand(out, cam, WHO.rebels[k], p, { expr: id === 23 ? "stern" : "stern", look: k % 2 ? 1 : -1 }, t);
        if (id === 24 && f >= 1623) {
          const n = f - 1623 - (k % 3) * 3;
          const mz = off(cam, p, 0.14, 2.3);
          if (n >= 0 && n < 4) push(out, `flash${n % 3}`, 200, 200, (pp) => fxFlash(pp, n % 3), mz[0], mz[1] + 0.15, mz[2], 0.7, 0.7);
          if (n >= 2 && n < 30) { const u = q((n - 2) / 28, 14); push(out, `smoke${u}`, 200, 200, (pp) => fxSmoke(pp, u), mz[0], mz[1] + 0.4 + u, mz[2], 1.1, 1.1, { soft: true }); }
        }
      });
      if (id === 24 && f >= 1626) { // bullets whizzing past the basket
        const b = basketAt(24, f);
        for (let k = 0; k < 4; k++) {
          const u = ((f - 1626) / 8 + hh(k, 95)) % 1;
          const p = off(cam, b, -3 + 6 * u, 0.8 + 2.4 * hh(k, 96), -0.6 - hh(k, 97));
          push(out, "whizz", 600, 60, fxWhizz, p[0], p[1], p[2], 1.8, 0.18, { soft: true, rot: 0.25 + 0.3 * hh(k, 98) });
        }
      }
      break;
    }
    case 25: {
      if (f < 1690) riders(out, cam, id, f, t, () => ({ expr: f < 1676 ? "nervous" : "dazed", shrug: f < 1676 ? 1 : 0 }));
      else {
        const sit = f < 1708;
        stand(out, cam, WHO.old, [LANDING[0] + 3.0, 0, LANDING[2] + 0.7], { mode: sit ? "sit" : "stand", expr: sit ? "dazed" : "relief" }, t);
        stand(out, cam, WHO.braniff, [LANDING[0] + 4.3, 0, LANDING[2] + 0.2], { mode: sit ? "sit" : "stand", expr: sit ? "dazed" : "relief_open", shrug: sit ? 0 : 0.6 }, t);
      }
      if (f >= 1676 && f < 1704) { const u = q((f - 1676) / 28, 14); for (const dx of [-1.2, 1.4]) push(out, `puff${u}`, 300, 300, (p) => fxPuff(p, u), basketAt(25, f)[0] + dx, 0.6, basketAt(25, f)[2] + 0.8, 2.2, 2.2, { soft: true }); }
      break;
    }
    case 27: {
      // a boy lets the first lantern go; then the plaza full of people watching thousands rise
      stand(out, cam, WHO.family[2], [6.5, 0, 10.0], { expr: f < 1800 ? "grin" : "smile_closed", wave: f < 1775 ? 1 : undefined, look: 1 }, t);
      FIESTA.forEach((p, k) => stand(out, cam, WHO.folk[(k * 3 + 1) % WHO.folk.length], p, { expr: k % 2 ? "smile_closed" : "relief", look: k % 2 ? 1 : -1, wave: k === 2 && f > 1830 ? q(0.5 + 0.5 * Math.sin(t * 5), 4) : undefined }, t));
      for (let k = 0; k < 30; k++) {
        const a = hh(k, 101) * Math.PI * 2, d = 9 + hh(k, 102) * 22;
        stand(out, cam, WHO.folk[k % WHO.folk.length], [Math.cos(a) * d, 0, Math.sin(a) * d], { expr: "smile_closed", look: 0 }, 0, 1, false);
      }
      break;
    }
  }
  void bodySide; void bodyFront; void fxCheer; void lin; void camAt; void TABLE; void CRASH_HOOK; void lanternAt; void viewOf;
  return out;
};
