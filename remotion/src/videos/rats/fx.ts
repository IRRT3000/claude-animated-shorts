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
  for (let k = 0; k < 14; k++) {
    const a = rad(k * (360 / 14) + (k % 3) * 9), d = 30 + 250 * Math.sqrt(t) * (0.6 + 0.4 * ((k * 37) % 10) / 10), cx = 300 + d * Math.cos(a) * 0.95, cy = 230 + d * Math.sin(a) * 0.7 + 160 * t * t;
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
  const pts: P2[] = [];
  for (let i = 0; i <= 20; i++) pts.push([60 + 3 * Math.sin(i * 0.9 + t * 30), i * 29]);
  p.line(pts, "#7cc8f0", 16);
  p.stroke(pts.map(([x, y]) => [x - 4, y] as P2), 4, "#e8f8ff");
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
  p.poly([[80, 120], [200, 120], [195, 260], [85, 260]], "#d23a3a", 10);
  p.arc(205, 185, 35, 40, -90, 90, 14, "#d23a3a");
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
/** a lab-coat sleeve reaching down from above with a hand gripping the jar, on a 200 x 900 canvas; side -1 left / 1 right */
export const fxArm = (p: Pen, side: number) => {
  const g = p.g; g.save(); if (side < 0) { g.translate(200, 0); g.scale(-1, 1); }
  p.poly([[40, -20], [150, -20], [140, 700], [60, 720]], "#f4f2ec", 10);
  p.stroke([[95, 0], [100, 690]], 4, "#d8d4ca");
  p.poly([[55, 700], [145, 690], [150, 730], [50, 740]], "#e2ddd2", 8);
  p.ell(95, 790, 52, 62, "#f5c9a0", 10);
  for (let k = 0; k < 3; k++) p.stroke([[52 + 2 * k, 765 + 20 * k], [88, 768 + 20 * k]], 6, "#241726");
  g.restore();
};

// ---------------- the slow-organ effects (our own designs) ----------------
/** a kid's lips at a green glass bottle, air lines skimming across the mouth, on a 500 x 600 canvas; t 0..1 loops */
export const fxBottle = (p: Pen, t: number) => {
  const G = "#c98a2a", GH = "#f6d79a";
  p.poly([[205, 140], [255, 140], [255, 230], [320, 300], [320, 590], [140, 590], [140, 300], [205, 230]], G, 9);
  p.stroke([[170, 320], [170, 560]], 12, GH);
  p.poly([[198, 128], [262, 128], [262, 146], [198, 146]], "#3f7a54", 7);
  p.ell(230, 430, 105, 62, "#f5c9a0", 9);                                     // the hand holding it
  for (let k = 0; k < 3; k++) p.stroke([[150 + 4 * k, 405 + 22 * k], [222, 410 + 22 * k]], 6, "#241726");
  for (let k = 0; k < 3; k++) {                                                // a curved airstream over the mouth
    const u = (t + k / 3) % 1, x0 = 10 + 330 * u;
    p.stroke([[x0, 70 + k * 10], [x0 + 60, 95 + k * 8], [x0 + 120, 112 + k * 6]], 7, "#ffffff");
  }
};
/** air rising up an organ pipe's mouth and out of its top: white wisps on a 200 x 700 canvas; t loops */
export const fxAir = (p: Pen, t: number) => {
  for (let k = 0; k < 4; k++) {
    const u = (t + k / 4) % 1, y = 660 - 640 * u, x = 100 + 26 * Math.sin(u * 9 + k);
    p.stroke([[x - 30, y + 30], [x, y], [x + 30, y + 30]], 10, "#ffffff");
  }
};
/** a hand from screen top lowering a little sandbag onto a key, 300 x 700 canvas; k 0 high .. 1 placed (sleeve colour) */
export const fxHandBag = (p: Pen, k: number, sleeve = "#5bab6a") => {
  const y = -260 + 260 * k;
  p.poly([[110, y - 40], [200, y - 40], [195, y + 380], [115, y + 390]], sleeve, 9);
  p.ell(155, y + 430, 46, 52, "#f5c9a0", 9);
  if (k < 1) {
    p.poly([[95, y + 470], [215, y + 470], [228, y + 580], [82, y + 580]], "#d8c08a", 9);
    p.stroke([[130, y + 470], [150, y + 452], [178, y + 470]], 7);
  }
};
/** "Z z z" of a sleeper drawn as three bubbles of shrinking zig-zags (no letters read at this size), 300 x 300; t loops */
export const fxZzz = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {                       // snore bubbles drifting up and swelling
    const u = (t + k / 3) % 1, s = 12 + 34 * u, x = 90 + 120 * u, y = 250 - 200 * u;
    p.ell(x, y, s, s, null, 7);
    p.arc(x - s * 0.3, y - s * 0.3, s * 0.4, s * 0.4, 200, 280, 5, "#ffffff");
  }
};
/** a cobweb in a corner, 400 x 400 */
export const fxCobweb = (p: Pen) => {
  for (let k = 0; k < 6; k++) { const a = (k / 5) * (Math.PI / 2); p.stroke([[0, 0], [380 * Math.cos(a), 380 * Math.sin(a)]], 4, "#e8e4ee"); }
  for (const r of [90, 170, 250, 330]) { const pts: [number, number][] = []; for (let k = 0; k <= 5; k++) { const a = (k / 5) * (Math.PI / 2); pts.push([r * Math.cos(a) * 0.95, r * Math.sin(a) * 0.95]); } p.stroke(pts, 4, "#e8e4ee"); }
};
/** a hand flipping a big toggle switch on the blower, 300 x 400; k 0 off .. 1 on */
export const fxHandSwitch = (p: Pen, k: number) => {
  p.ell(150 + 40 * k, 120 + 150 * k, 46, 52, "#f5c9a0", 9);
  p.poly([[110 + 40 * k, 60 + 150 * k], [200 + 40 * k, 70 + 150 * k], [210, -40], [100, -40]], "#e07a3a", 9);
};
/** applause marks around a crowd: little arcs, 400 x 300; t loops */
export const fxClapMarks = (p: Pen, t: number) => {
  for (let k = 0; k < 5; k++) { const u = (t * 2 + k * 0.37) % 1; if (u > 0.6) continue; const x = 40 + k * 80, y = 150 - 60 * Math.sin(k * 2.1); p.arc(x, y, 22 + 20 * u, 22 + 20 * u, 200, 340, 7, "#ffffff"); }
};

// ---------------- the dancing-plague effects (our own designs) ----------------
/** heat squiggles rising (hot blood) on a 300 x 400 canvas; t 0..1 loops */
export const fxHeat = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const pts: P2[] = [], x0 = 70 + k * 80, u = (t + k * 0.33) % 1;
    for (let i = 0; i <= 16; i++) pts.push([x0 + 16 * Math.sin(i * 0.9 + t * 12 + k), 360 - i * 18 - 40 * u]);
    p.line(pts, k === 1 ? "#ff7a4a" : "#ffb04a", 12);
  }
};
/** little motion arcs either side of a dancer (600 x 600 canvas); t 0..1 flips them */
export const fxDanceMarks = (p: Pen, t: number) => {
  const s = t < 0.5 ? 1 : -1;
  for (const [cx, cy, r, a0] of [[110, 260, 70, 200], [490, 260, 70, -20], [150, 520, 50, 160], [450, 520, 50, 20]] as const) {
    const pts: P2[] = [];
    for (let i = 0; i <= 10; i++) { const a = rad(a0 + s * (i * 6)); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    p.line(pts, "#ffffff", 9);
  }
};
/** spin swirl round a turning figure (600 x 300 canvas); t 0..1 */
export const fxSpin = (p: Pen, t: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 40; i++) { const a = rad(i * 9 + t * 360); pts.push([300 + 250 * Math.cos(a), 150 + 70 * Math.sin(a)]); }
  p.line(pts.slice(0, 26), "#ffffff", 12);
};
/** a cough: three grey-green puffs drifting out to the right (400 x 300 canvas); t 0..1 */
export const fxCough = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const u = Math.min(1, t * 1.6 - k * 0.2);
    if (u <= 0) continue;
    p.ell(60 + 260 * u, 150 - 40 * u + k * 20, 26 + 30 * u, 22 + 24 * u, "#d8ddc8", 7);
  }
};
/** a falling autumn leaf (200 x 200 canvas); kind 0..2 colour, t turns it */
export const fxLeaf = (p: Pen, kind: number, t: number) => {
  const col = ["#e07a2a", "#d0482a", "#e8b030"][kind % 3], a = rad(360 * t), c = Math.cos(a), s = Math.sin(a);
  const R = (x: number, y: number): P2 => [100 + (x * c - y * s), 100 + (x * s + y * c)];
  p.poly([R(0, -70), R(40, -20), R(30, 40), R(0, 70), R(-30, 40), R(-40, -20)], col, 7);
  p.stroke([R(0, -60), R(0, 70)], 5);
};
/** a sad drooping music note (240 x 260 canvas) */
export const fxSadNote = (p: Pen) => {
  p.ell(90, 190, 36, 26, "#4a5a7a", 7, 0, 360, -20);
  p.stroke([[122, 182], [128, 50], [190, 90]], 9);
};
/** pain stars for sore feet (300 x 200 canvas); t 0..1 pops them */
export const fxOuch = (p: Pen, t: number) => {
  for (const [x, y, s] of [[60, 120, 1], [150, 60, 1.3], [240, 120, 1]] as const) {
    const r = 34 * s * Math.min(1, t * 2), pts: P2[] = [];
    if (r < 2) continue;
    for (let i = 0; i < 10; i++) { const a = rad(i * 36 - 90), rr = i % 2 ? r * 0.45 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    p.poly(pts, "#ffd35a", 6);
  }
};
