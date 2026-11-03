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
