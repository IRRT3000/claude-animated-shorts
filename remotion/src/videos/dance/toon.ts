// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build; specs?: boolean; apron?: string;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
// teaspoon short: our own Franklin-era cast
export const FRANKLIN: Outfit = { jacket: "#8a5a34", pants: "#4a3a30", boots: "#2b211c", hat: "longhair", hair: "#e4e0da", buttons: "#d9b45a", specs: true, build: "stout" };
export const CAPTAIN: Outfit = { jacket: "#24406e", pants: "#efe8d8", boots: INK, hat: "tricorn", buttons: "#e8c45a", moustache: "#4a3020" };
export const COOK: Outfit = { jacket: "#e9e2d2", pants: "#5a4a40", boots: "#3a2a20", hat: "cap", cap: "#f4f1ea", apron: "#f7f4ec", build: "stout", skin: "#f5c9a0" };
export const SAILOR: Outfit = { jacket: "#3b5b9a", pants: "#efe8d8", boots: INK, hat: "cap", cap: "#c0353a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "yawn" | "sad" | "tired";
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE: Record<Expr, { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK }> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  yawn: { eye: ["squeeze", "squeeze"], brow: [-3, 1], mouth: "O" },
  sad: { eye: ["small", "small"], brow: [-4, 3], mouth: "frown" },
  tired: { eye: ["slit", "slit"], brow: [-2, 2], mouth: "wave" },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  if (SPECS) {
    for (const side of [-1, 1]) p.ell(fx + side * ex, ey, 10.5 * u, 9.5 * u, null, 2.6 * u);
    p.arc(fx, ey - 2 * u, ex - 10.5 * u, 3 * u, 200, 340, 2.4 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  if (SPECS) { p.ell(ex, ey, 10 * u, 9.5 * u, null, 2.6 * u); p.stroke([[ex - 10 * u, ey - 2 * u], [hx + 2 * u, ey - 6 * u]], 2.2 * u); }
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

let SPECS = false;
// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  if (o.hat === "longhair") { // shoulder-length hair hanging behind the head (bald crown drawn by the head itself)
    const hb = blobPts(cx - (side ? 16 : 0) * (H.a / 50), hc + 0.22 * H.b, { ...H, a: H.a * (side ? 1.0 : 1.16), b: H.b * 0.95, nTop: 2.4, nBot: 2.0, asym: 0, egg: 0.0, seed: H.seed + 5 });
    p.shadedFill(hb, o.hair!, mul(o.hair!, SH_FELT), light, H.a);
    p.inkRing(hb, ow * 0.85, thick);
    return;
  }
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03] as P2);
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "longhair") {
    // fluffy grey tufts at the temples, bald shiny crown (the head skin)
    for (const sd of side ? [-1] : [-1, 1]) {
      const [tx, ty] = R([[cx + sd * 0.86 * H.a, hc - 0.12 * H.b]])[0];
      p.ell(tx, ty, 16 * u, 24 * u, o.hair!, ow * 0.8, 0, 360, (a * 180) / Math.PI);
    }
  } else if (o.hat === "tricorn") {
    const yb = crown + 0.2 * HH, col = "#24212b";
    const body = R([[cx - 0.62 * W, yb + 2 * u], [cx - 0.3 * W, yb - 0.3 * HH], [cx, yb - 0.24 * HH], [cx + 0.3 * W, yb - 0.3 * HH], [cx + 0.62 * W, yb + 2 * u], [cx, yb + 8 * u]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, 0.5 * W, 0.4);
    p.poly(body, null, ow);
    p.stroke(R([[cx - 0.55 * W, yb + 1 * u], [cx, yb + 6 * u], [cx + 0.55 * W, yb + 1 * u]]), 2.4 * u, "#e8c45a");
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "coif") { // a white linen coif: covers the crown and the ears, ties under the chin
    const cut = crown + 0.5 * HH;
    const arc = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.06, hc + (y - hc) * 1.05] as P2);
    if (arc.length > 3) {
      const col = o.cap ?? "#f4efe2";
      p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35); p.poly(arc, null, ow);
      for (const sd of side ? [-1] : [-1, 1]) {
        const [tx, ty] = R([[cx + sd * 0.9 * H.a, hc + 0.25 * H.b]])[0];
        p.ell(tx, ty, 13 * u, 28 * u, col, ow * 0.8, 0, 360, (a * 180) / Math.PI);
      }
    }
  } else if (o.hat === "beret") { // a flat Renaissance cap worn tilted
    const col = o.cap ?? "#2a2430", [bx, by] = R([[cx + (side ? 8 * u : 6 * u), crown + 0.1 * HH]])[0];
    const deg = (a * 180) / Math.PI - 8;
    p.ell(bx, by, 0.6 * W, 0.17 * HH, col, ow, 0, 360, deg);
    p.ell(bx - 4 * u, by - 4 * u, 0.42 * W, 0.09 * HH, mul(col, [1.25, 1.25, 1.25]), 0, 0, 360, deg);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | "cane" | ["hammer", number] | ["spoon", number] | ["caneOil", number] | ["bucket", number]
  | ["drum", number] | ["pipe", number] | ["fiddle", number] | ["flask", number] | "shoes" | "bowl" | ["bell", number];

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

export type FrontOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall" | "dance"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number; shrug?: number; clap?: number;
  /** dance mode: 0 limp .. 1 wild; sore = red scuffs on the feet; lift2 = both arms raised high (held up by strong men) */
  energy?: number; sore?: boolean; armsUp?: number;
  /** sit mode on a chair: seat height in design units above the sole (0 = sitting on the ground) */
  seat?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave, shrug = 0, clap,
    light = DEF_LIGHT, facing = 0, seed = 1, seat = 0, energy = 1, sore = false, armsUp = 0 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  SPECS = !!o.specs;
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const hop = mode === "dance" ? energy * 0.045 * tall * Math.abs(Math.sin(two * phase)) : 0;
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : -hop;
  const dsole = sole - hop * 0.6; // the skirt hops with the body
  const torsoBot = mode === "sit" ? sole - (seat > 0 ? seat : 0.2 * HH) : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = seat > 0 ? [300 + side * 28 * u, hipY + 0.16 * HH] : [300 + side * 36 * u, hipY + 0.2 * HH],
        f: P2 = seat > 0 ? [300 + side * 30 * u, sole - 8 * u] : [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (mode === "dance") {
    // one foot planted, the other kicks up and out; they swap every half beat. Dress: the legs come out under the skirt
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const k = Math.max(0, Math.sin(two * (phase + ph))) * energy;
      const hy = o.dress ? dsole - 0.4 * HH : hipY, hx = 300 + side * (o.dress ? 12 : 15) * u;
      const fx = 300 + side * (22 * u + 26 * u * k), fy = sole - 4 * u - k * 0.42 * HH;
      const kn: P2 = [(hx + fx) / 2 + side * (4 * u + 26 * u * k), (hy + fy) / 2 - k * 0.12 * HH];
      p.stroke(curve([hx, hy], kn, [fx, fy]), legW, legCol);
      const toe = k > 0.3 ? -6 * u * k : 0.5 * u;
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + toe], footW, footCol);
      if (sore) { p.dot(fx + side * 5 * u, fy - 2 * u, 3.4 * u, "#d0343a"); p.dot(fx + side * 11 * u, fy + 1 * u, 2.4 * u, "#e0505a"); }
    }
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : mode === "dance" ? 7 * energy * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const soleD = mode === "dance" ? dsole : sole;
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean };
  const arms: Arm[] = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else if (mode === "dance" || armsUp > 0) {
    // both arms up and waving (energy), or held straight up by the wrists (armsUp, the strong men's grip)
    for (const side of [-1, 1]) {
      const S = sh(side), hg = hang(side, 0), ph = side > 0 ? 0 : 0.5;
      const e = mode === "dance" ? energy : 0, w = Math.sin(two * (phase + ph));
      const upE: P2 = [tcx + side * (1.2 * T.a + 16 * u), S[1] - 0.1 * HH], upH: P2 = [tcx + side * (1.25 * T.a + 22 * u + 14 * u * Math.cos(two * (phase + ph))), S[1] - (0.62 + 0.2 * w) * HH];
      const hiE: P2 = [tcx + side * (0.95 * T.a + 8 * u), S[1] - 0.45 * HH], hiH: P2 = [tcx + side * (1.05 * T.a + 12 * u), S[1] - 0.95 * HH];
      const k = Math.max(e, armsUp), up = armsUp > e;
      const E = lerp2(hg[1], up ? hiE : upE, k), Hd = lerp2(hg[2], up ? hiH : upH, k);
      arms.push({ pts: [S, E, Hd], front: false });
    }
  }
  else {
    const SL = sh(-1), SR = sh(1);
    if (shrug > 0) { // both forearms up, palms out
      for (const side of [-1, 1]) { const S = side < 0 ? SL : SR, k = shrug;
        arms.push({ pts: [S, [tcx + side * (1.15 * T.a + 8 * u), S[1] + 0.4 * HH * (1 - 0.3 * k)], [tcx + side * (1.3 * T.a + 22 * u * k), S[1] + 0.35 * HH - 0.55 * HH * k]], front: false }); }
    } else if (clap !== undefined) { // hands meet in front of the chest
      for (const side of [-1, 1]) { const S = side < 0 ? SL : SR, gap = 4 * u + 18 * u * clap;
        arms.push({ pts: [S, [tcx + side * (1.05 * T.a + 6 * u), S[1] + 0.4 * HH], [tcx + side * gap, S[1] + 0.22 * HH]], front: true }); }
    } else if (Array.isArray(prop) && prop[0] === "bucket") { // both hands on a bucket, tipping it over the rail to screen right
      const k = clamp(prop[1], 0, 1), B: P2 = [tcx + 0.9 * T.a + 18 * u * k, SL[1] + 0.45 * HH - 0.35 * HH * k];
      arms.push({ pts: [SL, [tcx - 0.3 * T.a, SL[1] + 0.5 * HH], [B[0] - 14 * u, B[1] + 8 * u]], front: true });
      arms.push({ pts: [SR, [tcx + 1.1 * T.a, SR[1] + 0.3 * HH], [B[0] + 10 * u, B[1] - 8 * u]], front: true });
    } else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (Array.isArray(prop) && prop[0] === "spoon") { // arm out, spoon held over the water
      arms.push({ pts: [SR, [tcx + 1.15 * T.a + 12 * u, SR[1] + 0.12 * HH], [tcx + 1.3 * T.a + 34 * u, SR[1] + 0.02 * HH]], front: true });
    } else if (Array.isArray(prop) && prop[0] === "caneOil") { // cane held up and tipped, oil runs out of the hollow top
      const k = clamp(prop[1], 0, 1);
      arms.push({ pts: [SR, [tcx + 1.15 * T.a + 10 * u, SR[1] + 0.1 * HH], [tcx + 1.25 * T.a + 26 * u, SR[1] - 0.08 * HH - 0.1 * HH * k]], front: true });
    } else if (prop === "cane") {
      arms.push({ pts: hang(1, 0.6), front: true });
    } else if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop) && (prop[0] === "drum" || prop[0] === "pipe" || prop[0] === "fiddle" || prop[0] === "flask" || prop[0] === "bell") || prop === "shoes" || prop === "bowl") {
      const S = sh(1), k = Array.isArray(prop) ? clamp(prop[1] as number, 0, 1) : 0, kind = Array.isArray(prop) ? prop[0] : prop;
      if (kind === "drum") { // left hand on the drum rim, right hand beats with a stick
        arms[0] = { pts: [SL, [tcx - 1.1 * T.a - 4 * u, SL[1] + 0.35 * HH], [tcx - 0.55 * T.a, torsoBot - 0.18 * HH]], front: true };
        arms.push({ pts: [S, [tcx + 1.15 * T.a + 8 * u, S[1] + 0.25 * HH], [tcx + 0.9 * T.a + 6 * u, S[1] + (0.05 + 0.3 * k) * HH]], front: true });
      } else if (kind === "pipe") { // both hands on a long pipe held down from the mouth
        arms[0] = { pts: [SL, [tcx - 1.0 * T.a, SL[1] + 0.32 * HH], [tcx - 6 * u, chin + 0.05 * HH + 2 * u * k]], front: true };
        arms.push({ pts: [S, [tcx + 1.0 * T.a, S[1] + 0.4 * HH], [tcx + 8 * u, chin + 0.33 * HH - 2 * u * k]], front: true });
      } else if (kind === "fiddle") { // fiddle under the chin on the left shoulder, bow across with the right hand
        arms[0] = { pts: [SL, [tcx - 1.2 * T.a - 10 * u, SL[1] + 0.12 * HH], [tcx - 1.25 * T.a - 22 * u, SL[1] - 0.12 * HH]], front: true };
        arms.push({ pts: [S, [tcx + 1.1 * T.a + 8 * u, S[1] + 0.32 * HH], [tcx + (0.1 + 0.6 * k) * T.a, S[1] + 0.1 * HH]], front: true });
      } else if (kind === "flask" || kind === "bell") { // right hand up holding a flask to the light / ringing a bell
        arms.push({ pts: [S, [tcx + 1.15 * T.a + 12 * u, S[1] + 0.05 * HH], [tcx + 1.2 * T.a + 18 * u + 4 * u * k, S[1] - 0.42 * HH]], front: true });
      } else { // shoes / bowl: both hands held out in front
        arms[0] = { pts: [SL, [tcx - 1.05 * T.a - 4 * u, SL[1] + 0.4 * HH], [tcx - 0.35 * T.a, SL[1] + 0.42 * HH]], front: true };
        arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.4 * HH], [tcx + 0.35 * T.a, S[1] + 0.42 * HH]], front: true });
      }
    } else if (Array.isArray(prop) && prop[0] === "hammer") {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
    }
  }
  const drawArm = (a: Arm) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((soleD - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, soleD - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.apron) p.poly([[tcx - 0.55 * T.a, chin + 0.35 * HH], [tcx + 0.55 * T.a, chin + 0.35 * HH], [tcx + 0.7 * T.a, torsoBot + 0.1 * HH], [tcx - 0.7 * T.a, torsoBot + 0.1 * HH]], o.apron, 2 * u);
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "spoon") {
      const k = clamp(prop[1], 0, 1), ang = rad(-8 + 75 * k); // 0 level .. 1 tipped (bowl pours to screen right)
      const Rs = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rs([[hx - 4 * u, hy], [hx + 30 * u, hy - 3 * u]]), "#c9ccd2", 3 * u, 1.3 * u, "round");
      const [bx, by] = Rs([[hx + 38 * u, hy - 4 * u]])[0];
      p.ell(bx, by, 9 * u, 5.5 * u, "#dfe2e7", 1.8 * u, 0, 360, (ang * 180) / Math.PI);
      if (k < 0.5) p.ell(bx, by - 1 * u, 6 * u, 2.5 * u, "#f2c64a", 0, 0, 360, (ang * 180) / Math.PI);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "caneOil") {
      const k = clamp(prop[1], 0, 1), ang = rad(-40 + 60 * k);
      const Rc = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rc([[hx - 60 * u, hy], [hx + 34 * u, hy]]), "#a8723f", 6 * u, 1.6 * u, "round");
      p.band(Rc([[hx + 22 * u, hy], [hx + 26 * u, hy]]), "#e8c45a", 7 * u, 1.2 * u, "butt");
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "bucket" && a === arms[arms.length - 1]) {
      const k = clamp(prop[1], 0, 1), [bx, by] = a.pts[2], ang = rad(70 * k);
      const Rb = (pts: P2[]) => rotPts(pts, ang, bx + 10 * u, by);
      p.poly(Rb([[bx - 4 * u, by - 18 * u], [bx + 30 * u, by - 18 * u], [bx + 26 * u, by + 14 * u], [bx, by + 14 * u]]), "#9a6a3e", 2.4 * u);
      p.stroke(Rb([[bx - 4 * u, by - 8 * u], [bx + 30 * u, by - 8 * u]]), 1.6 * u);
    } else if (prop === "cane") {
      p.band([[hx + 2 * u, hy - 10 * u], [hx + 10 * u, sole - 6 * u]], "#a8723f", 5 * u, 1.5 * u, "round");
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop) && prop[0] === "hammer") {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (Array.isArray(prop) || prop === "shoes" || prop === "bowl") {
    const kind = Array.isArray(prop) ? prop[0] : prop, k = Array.isArray(prop) ? clamp(prop[1] as number, 0, 1) : 0;
    const last = arms[arms.length - 1].pts[2], first = arms[0].pts[2];
    if (kind === "drum") {
      const cx = tcx - 0.05 * T.a, cy = torsoBot - 0.05 * HH, rw = 0.95 * T.a, rh = 0.16 * HH;
      p.poly([[cx - rw, cy - 0.32 * HH], [cx + rw, cy - 0.32 * HH], [cx + rw, cy + 0.12 * HH], [cx - rw, cy + 0.12 * HH]], "#c0353a", 2.4 * u);
      for (let i = 0; i < 5; i++) { const x0 = cx - rw + (i * 2 * rw) / 4; p.stroke([[x0, cy - 0.32 * HH], [x0 + rw / 2, cy + 0.12 * HH]], 1.6 * u, "#f0e2b0"); }
      p.ell(cx, cy - 0.32 * HH, rw, rh * 0.5, "#f3e7cc", 2.4 * u);
      p.ell(cx, cy + 0.12 * HH, rw, rh * 0.5, null, 2.4 * u, 0, 180);
      p.dot(first[0], first[1], 5.5 * u);
      const [hx, hy] = last, ang = rad(-60 + 50 * k);
      p.band(rotPts([[hx, hy], [hx - 44 * u, hy]], ang, hx, hy), "#e8d8b0", 3 * u, 1.2 * u, "round");
      p.dot(hx, hy, 5.5 * u);
    } else if (kind === "pipe") {
      const top: P2 = [300, chin - 0.1 * HH], bot: P2 = [300 + 14 * u, chin + 0.55 * HH];
      p.band([top, bot], "#8a5a34", 5.5 * u, 1.5 * u, "round");
      p.poly([[bot[0] - 10 * u, bot[1]], [bot[0] + 10 * u, bot[1]], [bot[0] + 16 * u, bot[1] + 16 * u], [bot[0] - 16 * u, bot[1] + 16 * u]], "#a8723f", 1.8 * u);
      p.dot(first[0], first[1], 5.5 * u); p.dot(last[0], last[1], 5.5 * u);
    } else if (kind === "fiddle") {
      const [fx, fy] = first, body: P2 = [fx + 30 * u, fy + 8 * u];
      const fp = rotPts(ellPts(body[0], body[1], 26 * u, 16 * u), rad(-18), body[0], body[1]);
      p.poly(fp, "#b8682e", 2.2 * u);
      p.band([[fx - 4 * u, fy + 14 * u], [fx + 4 * u, fy + 10 * u]], "#3a2a20", 3 * u, 1 * u);
      p.dot(fx, fy, 5.5 * u);
      const [hx, hy] = last;
      p.band([[hx - 40 * u, hy - 30 * u], [hx + 36 * u, hy + 26 * u]], "#e8d8b0", 2 * u, 1 * u, "round");
      p.dot(hx, hy, 5.5 * u);
    } else if (kind === "flask") { // a round-bottomed glass flask of yellow liquid, bubbling with k
      const [hx, hy] = last, bx = hx + 2 * u, by = hy - 26 * u;
      p.band([[bx, hy - 4 * u], [bx, by + 4 * u]], "#d8ecf2", 7 * u, 1.6 * u);
      const fp = ellPts(bx, by - 18 * u, 20 * u, 20 * u);
      p.poly(fp, "#e9f4f6", 2.2 * u);
      p.clip(fp, () => p.poly([[bx - 24 * u, by - 18 * u + 6 * u * Math.sin(k * 9)], [bx + 24 * u, by - 18 * u - 4 * u * Math.sin(k * 9)], [bx + 24 * u, by + 10 * u], [bx - 24 * u, by + 10 * u]], k > 0.5 ? "#e05a3a" : "#e8c040", 0));
      p.poly(fp, null, 2.2 * u);
      if (k > 0.05) for (let i = 0; i < 3; i++) p.ell(bx - 8 * u + i * 8 * u, by - 46 * u - ((k * 40 + i * 13) % 26) * u, 3.5 * u, 3.5 * u, "#f7f2e8", 1.4 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (kind === "bell") {
      const [hx, hy] = last, ang = rad(-25 + 50 * k), Rb = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rb([[hx, hy], [hx, hy - 16 * u]]), "#6a4430", 4 * u, 1.2 * u);
      p.poly(Rb([[hx - 7 * u, hy - 16 * u], [hx + 7 * u, hy - 16 * u], [hx + 15 * u, hy - 40 * u], [hx - 15 * u, hy - 40 * u]]), "#d9a842", 2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (kind === "shoes") { // a pair of red shoes held out
      for (const [x, s] of [[300 - 14 * u, -1], [300 + 14 * u, 1]] as const) {
        const y = first[1] + 4 * u;
        p.poly([[x - 12 * u, y - 6 * u], [x + 12 * u, y - 6 * u], [x + 14 * u + s * 4 * u, y + 8 * u], [x - 14 * u + s * 4 * u, y + 8 * u]], "#d42a2a", 2.2 * u);
        p.stroke([[x - 6 * u, y - 4 * u], [x + 6 * u, y - 4 * u]], 1.4 * u, "#f4e2c8");
      }
      p.dot(first[0], first[1], 5.5 * u); p.dot(last[0], last[1], 5.5 * u);
    } else if (kind === "bowl") { // an empty wooden bowl
      const y = first[1] + 2 * u;
      p.poly([[300 - 30 * u, y - 4 * u], [300 + 30 * u, y - 4 * u], [300 + 20 * u, y + 14 * u], [300 - 20 * u, y + 14 * u]], "#a8723f", 2.2 * u);
      p.ell(300, y - 4 * u, 30 * u, 5 * u, "#6a4430", 2 * u);
      p.dot(first[0], first[1], 5.5 * u); p.dot(last[0], last[1], 5.5 * u);
    }
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "longhair" && o.hat !== "coif" && o.hat !== "beret";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  SPECS = !!o.specs;
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap" && o.hat !== "longhair" && o.hat !== "coif" && o.hat !== "beret";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
// cox-clock short: our own 1760s London cast (and today's gallery)
// ---- the pitch-drop cast (our own designs) ----
export const PARNELL_O: Outfit = { jacket: "#8a6a3e", pants: "#4a3a30", boots: "#2b211c", hat: "hair", hair: "#3a2a20", moustache: "#3a2a20", buttons: "#d9b45a", build: "stout", skin: "#f5d2b0" };
/** John Mainstone, by age: 0 dark hair (1961), 1 grey, 2 white (2000s) */
export const mainstone = (age = 2): Outfit => ({ jacket: "#5d7a3a", pants: "#3b3f52", boots: "#3a2a20", hat: "hair", hair: ["#4a3426", "#9a948c", "#ece8e2"][age], specs: true, buttons: "#d9b45a", skin: "#f5c9a0" });
export const STAFF = (v = 0): Outfit => ({ jacket: "#f4f2ec", pants: ["#3b4a6a", "#4a4038"][v % 2], boots: ["#3a2a20", "#2f3542"][v % 2], hat: "hair", hair: ["#2a201a", "#c99a4a"][v % 2], skin: SKINS[(v + 1) % 4], specs: v % 2 === 1 });
export const audience = (v = 0): Outfit => {
  const tops = ["#e07a3a", "#4a8fd0", "#5bab6a", "#d9536f", "#f0c64a", "#7b5ac9"];
  return { jacket: tops[v % 6], pants: ["#3b4a6a", "#4a4038", "#2f3542"][v % 3], boots: ["#f4f1ea", "#3a2a20"][v % 2], skin: SKINS[(v + 1) % 4], hat: "hair", hair: ["#5a3b2a", "#2a201a", "#c99a4a"][v % 3] };
};

// ---------------- the slow-organ cast (our own designs) ----------------
/** John Cage (our cartoon): lean, short grey hair, denim shirt and jeans, a big grin */
export const CAGE: Outfit = { jacket: "#5b82b8", pants: "#34496e", boots: "#3a2a20", hat: "hair", hair: "#a8a29a", buttons: "#e8e4dc", skin: "#f5d2b0" };
export const PIANIST: Outfit = { jacket: "#c0353a", pants: "#c0353a", boots: INK, hat: "hair", hair: "#3a2a20", dress: "#c0353a", skin: "#f5c9a0" };
export const MAYOR: Outfit = { jacket: "#3b3f52", pants: "#2f3542", boots: INK, hat: "hair", hair: "#2a201a", moustache: "#2a201a", sash: "#e8bc4a", buttons: "#d6a842", build: "stout", skin: "#f5d2b0" };
/** monks of 1361: brown habit, tonsure (the longhair crown) */
export const MONK = (v = 0): Outfit => ({ jacket: "#6a4a32", pants: "#6a4a32", boots: "#3a2a20", hat: "hair", hair: "#5a3b2a", dress: "#6a4a32", build: v % 2 ? "stout" : "adult", skin: SKINS[v % 3] });
export const WORKER = (v = 0): Outfit => ({ jacket: ["#e07a3a", "#5bab6a"][v % 2], pants: "#3b5b9a", boots: "#3a2a20", hat: "cap", cap: ["#3b5b9a", "#c0353a"][v % 2], apron: v % 2 ? undefined : "#3b5b9a", skin: SKINS[(v + 2) % 4] });
/** the visitor by age: 0 dark hair, 1 grey, 2 white */
export const visitor = (age = 0): Outfit => ({ jacket: "#c25a3a", pants: "#3b3f52", boots: "#3a2a20", hat: "hair", hair: ["#4a3426", "#9a948c", "#ece8e2"][age], specs: age > 0, buttons: "#f0c64a", skin: "#f5c9a0" });

/** a cartoon pig on the 600 x 1000 design canvas (soles at y = 975), side view facing +x; ph = trot phase, sniff 0..1 */
export const pigCard = (p: Pen, ph: number, sniff = 0, light = DEF_LIGHT) => {
  const PINK = "#f2a7b4", PINK_D = "#d9879a";
  const by = 760 - 8 * Math.sin(ph * Math.PI * 2);
  for (const [lx, k] of [[200, 0], [250, 0.5], [380, 0.25], [430, 0.75]] as const) {
    const sw = 18 * Math.sin((ph + k) * Math.PI * 2);
    p.line([[lx, by + 60], [lx + sw, 965]], PINK_D, 34);
    p.ell(lx + sw, 965, 22, 12, INK, 0);
  }
  const body = ellPts(320, by, 190, 125);
  p.shadedFill(body, PINK, mul(PINK, SH_SKIN), light, 190);
  p.inkRing(body, 7, 12);
  p.stroke([[132, by - 20], [100, by - 50], [118, by - 72], [96, by - 92]], 8); // curly tail
  const hx = 505, hy = by - 40 - 10 * sniff;
  const head = ellPts(hx, hy, 95, 85);
  p.shadedFill(head, PINK, mul(PINK, SH_SKIN), light, 95); p.inkRing(head, 7, 10);
  p.poly([[hx - 60, hy - 70], [hx - 20, hy - 140], [hx + 5, hy - 65]], PINK_D, 8);
  p.ell(hx + 80, hy + 15, 34, 40, PINK_D, 8);
  p.dot(hx + 72, hy + 5, 7); p.dot(hx + 90, hy + 25, 7);
  p.dot(hx + 20, hy - 20, 11);
};

// ---------------- the dancing-plague cast, Strasbourg 1518 (our own designs) ----------------
const WOOL = ["#c25a3a", "#4a7fb5", "#5b8f4a", "#d9a441", "#8e4a7a", "#3f7a7a", "#b5543f", "#6a7fb0"];
const HOSE = ["#3b3f52", "#6a4a32", "#8e2f3a", "#2f5f6a", "#4a4038"];
/** Frau Troffea: green dress, white coif */
export const TROFFEA: Outfit = { jacket: "#3f8a52", pants: "#3f8a52", boots: "#5a3b2a", hat: "coif", dress: "#3f8a52", skin: "#f5d2b0" };
/** townsfolk of 1518: women in dresses and coifs, men in tunics, hose and berets (or bare heads) */
export const folk1518 = (v = 0): Outfit => {
  const skin = SKINS[(v * 3 + 1) % 4];
  if (v % 2) return { jacket: WOOL[(v * 5) % 8], pants: WOOL[(v * 5) % 8], dress: WOOL[(v * 5) % 8], boots: "#5a3b2a", hat: "coif", cap: v % 3 ? "#f4efe2" : "#efe0b8", skin };
  return { jacket: WOOL[(v * 3 + 1) % 8], pants: HOSE[v % 5], boots: ["#3a2a20", "#5a3b2a"][v % 2], hat: v % 4 ? "beret" : "hair", cap: ["#2a2430", "#8e2f3a", "#3b4a6a"][v % 3], hair: ["#5a3b2a", "#2a201a", "#c99a4a"][v % 3], skin, build: v % 3 ? "adult" : "stout", moustache: v % 6 === 4 ? "#5a3b2a" : undefined };
};
/** the city physician: a long dark-red robe, black cap, spectacles, grey moustache */
export const DOCTOR: Outfit = { jacket: "#8e2f3a", pants: "#8e2f3a", boots: INK, dress: "#8e2f3a", hat: "beret", cap: "#1e1a24", specs: true, moustache: "#b8b2aa", skin: "#f5d2b0", build: "stout" };
export const DOCTOR2: Outfit = { jacket: "#2f4a7a", pants: "#2f4a7a", boots: INK, dress: "#2f4a7a", hat: "beret", cap: "#1e1a24", skin: "#ecd0b6" };
/** the council: black gowns, a gold chain for the master */
export const MASTER: Outfit = { jacket: "#2a2430", pants: "#2a2430", boots: INK, hat: "beret", cap: "#2a2430", sash: "#e8bc4a", buttons: "#e8bc4a", moustache: "#5a4a40", build: "stout", skin: "#f5d2b0" };
export const COUNCIL = (v = 0): Outfit => ({ jacket: ["#5a2a3a", "#2f3a5a", "#4a3a2a"][v % 3], pants: "#2a2430", boots: INK, hat: "beret", cap: "#1e1a24", buttons: "#c9a040", skin: SKINS[(v + 2) % 4], build: v % 2 ? "stout" : "adult" });
/** the band: bright parti-coloured players */
export const PLAYER = (v = 0): Outfit => ({ jacket: ["#e0a030", "#c0353a", "#3f7ab5"][v % 3], pants: ["#c0353a", "#e0a030", "#e0a030"][v % 3], boots: "#3a2a20", hat: "beret", cap: ["#3f7ab5", "#2f6a43", "#c0353a"][v % 3], skin: SKINS[(v + 1) % 4] });
/** the hired strong men: leather jerkins, big build */
export const STRONG = (v = 0): Outfit => ({ jacket: "#9a6a3e", pants: "#4a4038", boots: "#3a2a20", hat: "hair", hair: ["#2a201a", "#7a4a2a"][v % 2], moustache: ["#2a201a", "#7a4a2a"][v % 2], build: "stout", belt: "#5a3b2a", skin: SKINS[(v + 3) % 4] });
/** the shrine priests: white albs */
export const PRIEST = (v = 0): Outfit => ({ jacket: "#f1ece0", pants: "#f1ece0", boots: "#5a3b2a", dress: "#f1ece0", hat: "hair", hair: ["#7a7068", "#4a3426"][v % 2], skin: SKINS[v % 3], build: v ? "stout" : "adult" });
/** the town crier who announces the ban */
export const CRIER: Outfit = { jacket: "#c0353a", pants: "#e8c45a", boots: INK, hat: "beret", cap: "#e8c45a", skin: "#f5c9a0", build: "stout" };
/** the saint, carved in stone (a card drawn in greys) */
export const STATUE: Outfit = { jacket: "#b8b0a4", pants: "#b8b0a4", boots: "#8e877c", dress: "#aaa296", hat: "hair", hair: "#8e877c", skin: "#c9c2b6" };
/** the hungry and the sick of 1518 */
export const HUNGRY: Outfit = { jacket: "#8a7a5a", pants: "#5a4a3a", boots: "#3a2a20", hat: "hair", hair: "#5a4a3a", skin: "#ecd0b6" };
export const SICK: Outfit = { jacket: "#7a6a8a", pants: "#7a6a8a", dress: "#7a6a8a", boots: "#3a2a20", hat: "coif", skin: "#d8e0b4" };

/** a cartoon horse on the 600 x 1000 design canvas (soles at y = 975), side view facing +x; ph = walk phase */
export const horseCard = (p: Pen, ph: number, light = DEF_LIGHT) => {
  const COAT = "#a8743e", DARK = "#6a4428";
  const by = 640 - 6 * Math.sin(ph * Math.PI * 4);
  for (const [lx, k] of [[150, 0], [205, 0.5], [400, 0.25], [455, 0.75]] as const) {
    const sw = 26 * Math.sin((ph + k) * Math.PI * 2);
    p.line([[lx, by + 80], [lx + sw * 0.5, by + 210], [lx + sw, 950]], k < 0.3 || (k > 0.4 && k < 0.6) ? DARK : COAT, 30);
    p.ell(lx + sw, 958, 22, 14, INK, 0);
  }
  const body = ellPts(300, by, 210, 115);
  p.shadedFill(body, COAT, mul(COAT, SH_SKIN), light, 210);
  p.inkRing(body, 7, 12);
  p.stroke([[95, by - 40], [60, by + 30], [70, by + 120]], 22, DARK); // tail
  const neck: P2[] = [[440, by - 70], [500, by - 260], [560, by - 240], [520, by - 20]];
  p.poly(neck, COAT, 7);
  const head = rotPts(ellPts(560, by - 260, 70, 42), rad(35), 560, by - 260);
  p.shadedFill(head, COAT, mul(COAT, SH_SKIN), light, 70); p.inkRing(head, 7, 10);
  p.poly([[500, by - 300], [515, by - 350], [530, by - 296]], COAT, 6); // ear
  p.stroke([[470, by - 250], [500, by - 300], [530, by - 290]], 18, DARK); // mane
  p.stroke([[440, by - 80], [470, by - 250]], 16, DARK);
  p.dot(560, by - 275, 9);
  p.dot(600, by - 222, 6);
};
