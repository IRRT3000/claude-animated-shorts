// 2D effect drawings for the teaspoon short (our own designs), drawn with the toon Pen on small canvases.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const OIL = "#f2c64a", OIL_D = "#c9952a";

/** a thinking question mark on a 300 x 420 canvas (pop 0..1 scales it in) */
export const fxQuestion = (p: Pen, wob: number) => {
  const g = p.g;
  g.save(); g.translate(150, 230); g.rotate(rad(8 * wob)); g.translate(-150, -230);
  const pts: P2[] = [];
  for (let i = 0; i <= 30; i++) { const a = rad(200 + i * 9.5); pts.push([150 + 70 * Math.cos(a), 140 + 62 * Math.sin(a)]); }
  pts.push([150, 245], [150, 285]);
  p.line(pts, "#ffd35a", 34);
  p.ell(150, 350, 24, 24, "#ffd35a", 9);
  g.restore();
};

/** wind gust: two curly swoosh strokes on a 600 x 300 canvas; t (0..1) slides the dash along */
export const fxWind = (p: Pen, t: number) => {
  for (const [y0, amp, w] of [[110, 26, 16], [190, 20, 12]] as const) {
    const pts: P2[] = [];
    const a = Math.max(0, t - 0.55) * 1.6, b = Math.min(1, t * 1.6);
    for (let i = 0; i <= 40; i++) {
      const u = a + (b - a) * (i / 40), x = 30 + 520 * u;
      const curl = u > 0.82 ? (u - 0.82) / 0.18 : 0;
      pts.push([x - 40 * Math.sin(curl * Math.PI) * curl, y0 + amp * Math.sin(u * 7) - 60 * curl * curl]);
    }
    if (b - a > 0.02) p.line(pts, "#ffffff", w);
  }
};

/** one falling golden oil drop on a 120 x 160 canvas */
export const fxDrop = (p: Pen) => {
  p.poly([[60, 18], [92, 92], [88, 120], [60, 140], [32, 120], [28, 92]], OIL, 8);
  p.ell(48, 98, 9, 14, "#fff1b8", 0);
};

/** thin stream of oil pouring (a wavy ribbon of drops) on a 120 x 600 canvas; t animates the wobble */
export const fxStream = (p: Pen, t: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 24; i++) pts.push([60 + 8 * Math.sin(i * 0.7 + t * 12), 20 + i * 22]);
  p.line(pts, OIL, 18);
  p.dot(60 + 8 * Math.sin(25 * 0.7 + t * 12), 570, 15, OIL);
};

/** greasy dishwater pouring out of a bucket, a brown-grey splash ribbon on a 300 x 600 canvas */
export const fxSlop = (p: Pen, t: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 20; i++) pts.push([60 + i * 6 + 14 * Math.sin(i * 0.8 + t * 10), 20 + i * 27]);
  p.line(pts, "#b6ad8e", 40);
  for (let k = 0; k < 4; k++) p.ell(90 + k * 40 + 10 * Math.sin(t * 9 + k), 560 - 20 * ((t * 3 + k * 0.3) % 1), 14, 11, "#d8cfae", 6);
};

/** picnic blanket, lying flat, on a 600 x 400 canvas */
export const fxBlanket = (p: Pen) => {
  p.poly([[30, 40], [570, 20], [585, 370], [15, 385]], "#c84a4a", 10);
  const g = p.g;
  g.save(); p.path([[30, 40], [570, 20], [585, 370], [15, 385]], true); g.clip();
  g.fillStyle = "#f3ead7";
  for (let i = 0; i < 6; i++) { g.fillRect(40 + i * 95, 0, 40, 400); }
  for (let j = 0; j < 4; j++) { g.globalAlpha = 0.55; g.fillRect(0, 40 + j * 95, 600, 40); g.globalAlpha = 1; }
  g.restore();
  p.ell(430, 150, 60, 34, "#b07a3e", 8); // basket
  p.ell(430, 130, 54, 16, "#8a5a2c", 6);
};

/** a sparkle star (mirror glint) on a 200 x 200 canvas */
export const fxSparkle = (p: Pen, t: number) => {
  const s = Math.sin(Math.PI * t), r = 20 + 75 * s, w = 10 + 10 * s;
  p.poly([[100, 100 - r], [100 + w, 100 - w], [100 + r, 100], [100 + w, 100 + w], [100, 100 + r], [100 - w, 100 + w], [100 - r, 100], [100 - w, 100 - w]], "#ffffff", 6);
};

/** the oil "skin": a row of little round molecules holding hands, on a 1600 x 260 canvas.
 *  n of them visible (they march in from the left as the film spreads); faces calm. */
export const fxMolecules = (p: Pen, n: number, t: number) => {
  const N = 14;
  for (let i = 0; i < Math.min(N, Math.ceil(n)); i++) {
    const x = 70 + i * 112, y = 150 + 6 * Math.sin(t * 5 + i * 0.9), s = Math.min(1, n - i);
    if (s <= 0) continue;
    if (i > 0) p.stroke([[x - 80, y + 6], [x - 34, y + 6]], 9, INK);
    p.dot(x - 64, y + 70, 0);
    // tail (the water-loving end dips into the water, below the line)
    p.line([[x, y + 30], [x + 6 * Math.sin(t * 6 + i), y + 95]], OIL_D, 10 * s);
    p.ell(x, y, 36 * s, 34 * s, OIL, 7);
    p.dot(x - 11 * s, y - 4, 4.5 * s, INK); p.dot(x + 11 * s, y - 4, 4.5 * s, INK);
    p.arc(x, y + 6, 9 * s, 5 * s, 20, 160, 4 * s);
  }
};

/** a big shiny teaspoon icon (bowl up) on a 600 x 220 canvas, with a golden pool of oil */
export const fxSpoon = (p: Pen) => {
  p.band([[30, 120], [330, 108]], "#c9ccd2", 26, 8, "round");
  p.ell(440, 104, 130, 74, "#dfe2e7", 10);
  p.ell(440, 100, 100, 50, OIL, 0);
  p.ell(400, 84, 34, 12, "#fff1b8", 0);
};

/** a puff of wind hitting the oiled water and sliding off (little "bonk" arcs), 300 x 300 */
export const fxBonk = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) p.arc(150, 170, 60 + 30 * k + 40 * t, 40 + 20 * k + 25 * t, 200, 340, Math.max(2, 9 * (1 - t)), "#ffffff");
};

// ---------------- cox-clock effects (our own designs) ----------------
/** a sitting ginger cat, seen from the front, on a 400 x 500 canvas; blink 0..1 shuts its eyes, tail wag -1..1 */
export const fxCat = (p: Pen, blink: number, wag: number) => {
  const fur = "#e89a4a", furD = "#c57630", belly = "#fbe2c0";
  const tail: P2[] = []; for (let i = 0; i <= 14; i++) { const u = i / 14; tail.push([290 + 70 * u + 20 * wag * u * u, 470 - 160 * u * u + 30 * Math.sin(u * 3)]); }
  p.line(tail, fur, 34);
  p.ell(200, 380, 120, 115, fur, 12);                    // body
  p.ell(200, 400, 62, 80, belly, 0);                     // belly
  p.ell(140, 478, 40, 20, fur, 10); p.ell(260, 478, 40, 20, fur, 10); // paws
  p.poly([[112, 150], [128, 60], [182, 120]], fur, 12); p.poly([[288, 150], [272, 60], [218, 120]], fur, 12); // ears
  p.poly([[128, 136], [134, 88], [166, 124]], "#f2b7a2", 0); p.poly([[272, 136], [266, 88], [234, 124]], "#f2b7a2", 0);
  p.ell(200, 190, 100, 82, fur, 12);                     // head
  for (const dy of [-18, 0, 18]) { p.stroke([[110, 172 + dy * 0.6], [128, 176 + dy * 0.4]], 9, furD); p.stroke([[290, 172 + dy * 0.6], [272, 176 + dy * 0.4]], 9, furD); }
  const ey = 182;
  if (blink > 0.5) { p.stroke([[150, ey], [178, ey]], 9); p.stroke([[222, ey], [250, ey]], 9); }
  else { p.ell(164, ey, 13, 17, "#2b3a24", 0); p.ell(236, ey, 13, 17, "#2b3a24", 0); p.dot(168, ey - 6, 5, "#ffffff"); p.dot(240, ey - 6, 5, "#ffffff"); }
  p.poly([[190, 210], [210, 210], [200, 222]], "#d9707a", 5);
  p.line([[180, 236], [200, 226], [220, 236]], INK, 5, false);
  for (const s of [-1, 1]) for (const k of [0, 1]) p.stroke([[200 + s * 40, 222 + k * 10], [200 + s * 120, 212 + k * 22]], 4);
};
/** magic wand sparkle burst: little four-point stars around a point, on a 400 x 400 canvas; t 0..1 animates */
export const fxMagic = (p: Pen, t: number) => {
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + t * 2, r = 60 + 110 * ((t + k * 0.37) % 1), s = 26 * (1 - ((t + k * 0.37) % 1)) + 8;
    const x = 200 + r * Math.cos(a), y = 200 + r * Math.sin(a);
    p.poly([[x, y - s], [x + s * 0.3, y - s * 0.3], [x + s, y], [x + s * 0.3, y + s * 0.3], [x, y + s], [x - s * 0.3, y + s * 0.3], [x - s, y], [x - s * 0.3, y - s * 0.3]], k % 2 ? "#fff3a0" : "#ffd35a", 5);
  }
};
/** a gold coin, slightly turned (turn 0..1 squashes it), on a 200 x 200 canvas */
export const fxCoin = (p: Pen, turn: number) => {
  const w = 80 * Math.max(0.15, Math.abs(Math.cos(turn * Math.PI)));
  p.ell(100, 100, w, 80, "#f2c64a", 10);
  if (w > 30) p.ell(100, 100, w * 0.62, 50, null, 6);
};
/** breathing arrows: two curved arrows pointing in (k = 1) or out (k = -1), 600 x 300 canvas; t 0..1 slides them */
export const fxBreath = (p: Pen, k: number, t: number) => {
  for (const s of [-1, 1]) {
    const x0 = 300 + s * (230 - 60 * (k > 0 ? t : 1 - t)), pts: P2[] = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([x0 - s * k * 90 * u, 150 + 30 * Math.sin(u * Math.PI)]); }
    p.line(pts, "#ffffff", 22);
    const [ex, ey] = pts[10], d = -s * k;
    p.poly([[ex + d * 34, ey], [ex - d * 6, ey - 30], [ex - d * 6, ey + 30]], "#ffffff", 8);
  }
};
/** a slanting rain streak field on a 400 x 800 canvas; t 0..1 scrolls it */
export const fxRain = (p: Pen, t: number) => {
  for (let k = 0; k < 26; k++) {
    const x = (k * 97) % 400, y = ((k * 211 + t * 800) % 900) - 100;
    p.line([[x, y], [x - 26, y + 90]], "#dfe8f6", 7, false);
  }
};
/** lightning bolt on a 300 x 600 canvas */
export const fxBolt = (p: Pen) => {
  p.poly([[170, 10], [90, 280], [160, 280], [110, 590], [240, 230], [170, 230], [230, 10]], "#fff6a8", 10);
};
/** tick marks: two little motion arcs beside the second hand, on a 300 x 300 canvas; t 0..1 fades */
export const fxTick = (p: Pen, t: number) => {
  if (t > 0.6) return;
  for (const r of [90, 130]) p.arc(150, 150, r, r, -60, -20, 10, "#ffffff");
};

// ---------------- the pitch-drop effects (our own designs) ----------------
const PITCH = "#1d1a20", PITCH_HI = "#5a5866";
/** black glassy shards flying out from the hammer blow, on a 600 x 400 canvas; t 0..1 spreads them */
export const fxShards = (p: Pen, t: number) => {
  for (let k = 0; k < 11; k++) {
    const a = rad(200 + k * 14 + (k % 3) * 5), d = 40 + 230 * t * (0.6 + 0.4 * ((k * 37) % 10) / 10), cx = 300 + d * Math.cos(a), cy = 330 + d * Math.sin(a) + 260 * t * t;
    const s = 18 + ((k * 13) % 3) * 9, r0 = rad(k * 47 + t * 400);
    const pts: P2[] = [0, 1, 2].map((i) => [cx + s * Math.cos(r0 + i * 2.2), cy + s * 0.8 * Math.sin(r0 + i * 2.2)] as P2);
    p.poly(pts, PITCH, 6);
    p.stroke([pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]], 4, PITCH_HI);
  }
};
/** one wall-calendar page tearing off and flying (cream sheet, red top band, an empty day grid: no numerals), 300 x 300 */
export const fxCalPage = (p: Pen, t: number) => {
  const g = p.g; g.save(); g.translate(150 + 60 * t, 150 - 40 * t); g.rotate(rad(-25 * t)); g.translate(-150, -150);
  p.poly([[60, 50], [240, 50], [240, 250], [60, 250]], "#f6efdc", 8);
  p.poly([[60, 50], [240, 50], [240, 92], [60, 92]], "#c0353a", 8);
  for (let i = 1; i < 5; i++) p.stroke([[60 + 36 * i, 100], [60 + 36 * i, 242]], 3, "#b8ab90");
  for (let j = 1; j < 4; j++) p.stroke([[66, 92 + 39 * j], [234, 92 + 39 * j]], 3, "#b8ab90");
  g.restore();
};
/** tin snips at the stem, on a 400 x 300 canvas; k 0 open .. 1 shut */
export const fxSnips = (p: Pen, k: number) => {
  for (const s of [-1, 1]) {
    const a = rad(s * (16 - 14 * k));
    const g = p.g; g.save(); g.translate(200, 150); g.rotate(a); g.translate(-200, -150);
    p.poly([[200, 150], [370, 150 + s * 6], [380, 150 + s * 14], [200, 150 + s * 18]], "#c9ced6", 7);
    p.line([[200, 150 + s * 10], [60, 150 + s * 50]], s < 0 ? "#c0353a" : "#c0353a", 22);
    g.restore();
  }
  p.dot(200, 150, 9, INK);
};
/** the hot pitch running from the pot: a thick black ribbon on a 160 x 600 canvas; t wobbles it, len 0..1 */
export const fxPour = (p: Pen, t: number, len: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 20; i++) pts.push([80 + 6 * Math.sin(i * 0.6 + t * 10), 10 + i * 28 * len]);
  p.line(pts, PITCH, 30);
  p.stroke(pts.map(([x, y]) => [x - 7, y] as P2), 5, PITCH_HI);
};
/** water running through the second funnel: a quick blue string of drops on a 120 x 600 canvas; t scrolls */
export const fxWater = (p: Pen, t: number) => {
  p.line([[60, 0], [60, 150]], "#7cc8f0", 14);
  for (let k = 0; k < 7; k++) { const y = 170 + ((k * 70 + t * 600) % 430); p.poly([[60, y - 22], [72, y], [60, y + 12], [48, y]], "#7cc8f0", 6); }
};
/** a spoon of cold honey with its slow golden thread, on a 400 x 700 canvas; s 0..1 stretches the thread */
export const fxHoney = (p: Pen, s: number) => {
  p.line([[20, 60], [200, 120]], "#c9ced6", 22);
  p.ell(250, 135, 72, 34, "#c9ced6", 9, 0, 360, rad(14));
  p.ell(252, 128, 56, 22, "#f2b43a", 0, 0, 360, rad(14));
  const y1 = 170 + 470 * s;
  p.line([[262, 150], [258, (150 + y1) / 2], [260, y1]], "#f2b43a", 14);
  p.ell(260, y1 + 10, 20, 26, "#f2b43a", 7);
  p.ell(253, y1 + 2, 6, 9, "#fff1b8", 0);
};
/** confetti on a 600 x 800 canvas; t 0..1 drifts it down */
export const fxConfetti = (p: Pen, t: number) => {
  const cols = ["#f2c64a", "#d9536f", "#4a8fd0", "#5bab6a", "#ffffff"];
  for (let k = 0; k < 34; k++) {
    const x = ((k * 173) % 560) + 20 + 18 * Math.sin(t * 7 + k), y = ((k * 97 + t * 700) % 820) - 20, r = rad(k * 40 + t * 600);
    p.poly([[x + 14 * Math.cos(r), y + 6 * Math.sin(r)], [x - 14 * Math.cos(r), y - 6 * Math.sin(r)], [x - 14 * Math.cos(r) + 6, y - 6 * Math.sin(r) + 12], [x + 14 * Math.cos(r) + 6, y + 6 * Math.sin(r) + 12]], cols[k % 5], 4);
  }
};
/** a small prize on a 300 x 400 canvas: a gilt cup on a black base */
export const fxPrize = (p: Pen) => {
  p.poly([[100, 330], [200, 330], [215, 380], [85, 380]], "#2f2a3a", 9);
  p.poly([[135, 260], [165, 260], [175, 330], [125, 330]], "#d6a842", 9);
  p.poly([[70, 70], [230, 70], [215, 190], [150, 265], [85, 190]], "#e8bc4a", 10);
  p.arc(70, 120, 40, 46, 90, 270, 14, "#d6a842"); p.arc(230, 120, 40, 46, -90, 90, 14, "#d6a842");
  p.stroke([[110, 95], [120, 180]], 10, "#fff1b8");
};
/** a mug of tea with steam, on a 300 x 300 canvas */
export const fxMug = (p: Pen, t: number) => {
  p.poly([[80, 120], [200, 120], [195, 260], [85, 260]], "#e9e2d2", 10);
  p.arc(205, 185, 35, 40, -90, 90, 14, "#e9e2d2");
  p.poly([[80, 120], [200, 120], [200, 140], [80, 140]], "#8a5a34", 8);
  for (const k of [0, 1]) { const ph = t * 6 + k * 2; p.stroke([[120 + 40 * k, 105], [110 + 40 * k + 10 * Math.sin(ph), 70], [125 + 40 * k, 30 + 6 * Math.sin(ph)]], 8, "#ffffff"); }
};
/** a leather briefcase, on a 300 x 260 canvas */
export const fxCase = (p: Pen) => {
  p.poly([[110, 60], [190, 60], [190, 90], [110, 90]], null, 12);
  p.poly([[40, 85], [260, 85], [260, 230], [40, 230]], "#7a4a2a", 10);
  p.stroke([[40, 125], [260, 125]], 6, INK);
  p.poly([[138, 115], [162, 115], [162, 138], [138, 138]], "#d6a842", 6);
};
/** the plip: a small black splash crown and two motion arcs, on a 300 x 200 canvas; t 0..1 */
export const fxPlip = (p: Pen, t: number) => {
  const s = Math.sin(Math.PI * Math.min(1, t * 1.3));
  for (const d of [-1, 1]) { p.dot(150 + d * (30 + 50 * t), 120 - 60 * s, 9 * (1 - t) + 3, PITCH); p.dot(150 + d * (60 + 70 * t), 140 - 30 * s, 6 * (1 - t) + 2, PITCH); }
  if (t < 0.7) for (const r of [60, 95]) p.arc(150, 170, r * (0.8 + 0.4 * t), r * 0.35, 200, 340, 8, "#ffffff");
};
/** the long thin neck of the ninth drop as it touches (just the white glint line), 60 x 400 */
export const fxGlint = (p: Pen) => { p.stroke([[30, 20], [26, 200], [30, 380]], 7, "#c8c6d2"); };
