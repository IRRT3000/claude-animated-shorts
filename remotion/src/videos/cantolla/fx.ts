// 2D drawings for "The Man Who Fell Through a Roof" (our own designs), drawn with the toon Pen on small canvases.
import { Pen, INK, bodyFront, Outfit, FrontOpts, shade } from "./toon";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;

/** a pigeon in flight on a 300 x 200 canvas; w = wing phase 0..1 (up .. down), facing screen-right */
export const fxPigeon = (p: Pen, w: number, col = "#9aa3b5") => {
  const up = Math.cos(w * Math.PI * 2); // 1 = wings up, -1 = wings down
  const wing = (dx: number, back: boolean) => {
    const tipY = 100 - 80 * up, tipX = 150 + dx * 0.9;
    p.poly([[150 + dx * 0.15, 100], [tipX - 30, tipY - 6], [tipX + 30, tipY + 4], [150 + dx * 0.35, 112]], back ? shade(col, 0.78) : shade(col, 1.05), 6);
  };
  wing(-20, true);
  p.ell(150, 112, 62, 26, col, 7);                                // body
  p.poly([[92, 104], [52, 92], [56, 124], [94, 120]], shade(col, 0.85), 6); // tail
  p.ell(206, 98, 22, 20, shade(col, 1.08), 7);                    // head
  p.ell(198, 116, 12, 7, "#7aa88a", 0);                           // green neck sheen
  p.poly([[226, 96], [244, 100], [226, 104]], "#e0a35a", 4);      // beak
  p.dot(212, 93, 4.5, INK);
  wing(30, false);
};

/** horse seen from the side (facing screen-right) with a seated rider, in the 600 x 1000 card design space.
 *  The card is drawn at ~2x scale by cast.ts, so the horse fills the lower half. ph = walk phase 0..1. */
export const fxHorseRider = (p: Pen, rider: Outfit | null, ph: number, fo: FrontOpts, coat = "#7a4a2c") => {
  const g = p.g, two = Math.PI * 2, bob = 6 * Math.sin(ph * two * 2);
  const dark = shade(coat, 0.7), mane = "#2a1c18";
  // legs: four strokes, diagonal pairs in phase
  const leg = (x: number, phase: number, front: boolean) => {
    const s = Math.sin(two * (ph + phase)), lift = Math.max(0, s) * 26;
    const hip: P2 = [x, 790 + bob], knee: P2 = [x + 14 * s, 880 - lift * 0.5], hoof: P2 = [x + 26 * s, 968 - lift];
    p.line([hip, knee, hoof], front ? coat : dark, 26);
    p.ell(hoof[0] + 6, hoof[1] + 4, 16, 9, "#2a1c18", 4);
  };
  leg(205, 0.5, false); leg(405, 0, false);
  // tail
  p.line([[140, 735 + bob], [112, 790 + bob], [118, 870 + bob]], mane, 24);
  // body
  p.ell(300, 755 + bob, 170, 82, coat, 10);
  p.ell(280, 790 + bob, 120, 30, shade(coat, 0.86), 0);
  // neck + head
  p.poly([[410, 720 + bob], [470, 600 + bob], [520, 590 + bob], [500, 690 + bob], [455, 770 + bob]], coat, 10);
  p.poly([[470, 595 + bob], [540, 610 + bob], [575, 660 + bob], [552, 678 + bob], [500, 655 + bob]], coat, 10);
  p.poly([[468, 598 + bob], [478, 560 + bob], [492, 594 + bob]], coat, 8); // ear
  p.line([[470, 600 + bob], [430, 650 + bob], [410, 710 + bob]], mane, 18);   // mane
  p.dot(515, 620 + bob, 6, INK);
  p.dot(566, 662 + bob, 4, INK);
  // saddle blanket + saddle (charro: red blanket, silver horn)
  p.poly([[230, 690 + bob], [370, 690 + bob], [380, 770 + bob], [220, 770 + bob]], "#c0353a", 7);
  p.stroke([[226, 752 + bob], [376, 752 + bob]], 6, "#e8c45a");
  p.ell(300, 690 + bob, 70, 20, "#5a3420", 7);
  p.ell(350, 670 + bob, 9, 14, "#d9dde0", 4);
  leg(225, 0, true); leg(390, 0.5, true);
  // rider, seated on the saddle (front view, scaled into the card)
  if (rider) {
    g.save(); g.translate(300, 712 + bob); g.scale(0.62, 0.62); g.translate(-300, -940);
    bodyFront(p, rider, { ...fo, mode: "sit" });
    g.restore();
  }
};

/** telegraph dots and dashes flying out of the key, 600 x 200; t slides them right */
export const fxMorse = (p: Pen, t: number) => {
  const code = [0, 1, 0, 0, 1, 1, 0, 1, 0, 0];
  let x = 30 + 520 * (t % 1) - 520;
  for (let rep = 0; rep < 2; rep++) for (const c of code) {
    if (x > 20 && x < 580) { if (c) p.band([[x, 100], [x + 34, 100]], "#ffe28a", 14, 5, "round"); else p.ell(x + 6, 100, 9, 9, "#ffe28a", 5); }
    x += c ? 52 : 30;
  }
};

/** a warm-air puff (orange, smiling, light) or cold-air puff (blue, heavy, grumpy), 260 x 260 */
export const fxAir = (p: Pen, warm: boolean, t: number) => {
  const col = warm ? "#ffb15a" : "#7fb2e8", r = 92 + 6 * Math.sin(t * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, k = 1 + 0.08 * Math.sin(a * 5 + t * 6); pts.push([130 + r * k * Math.cos(a), 130 + r * 0.9 * k * Math.sin(a)]); }
  p.poly(pts, col, 9);
  p.ell(102, 100, 18, 12, warm ? "#ffd9a6" : "#c4e0fb", 0);
  p.dot(108, 128, 7, INK); p.dot(152, 128, 7, INK);
  if (warm) p.arc(130, 146, 18, 12, 20, 160, 6); else p.arc(130, 168, 16, 9, 200, 340, 6);
};

/** a broken skylight pane shard, 120 x 120 (k = seed 0..3) */
export const fxShard = (p: Pen, k: number) => {
  const pts: P2[][] = [[[20, 30], [100, 14], [70, 104]], [[30, 20], [104, 60], [16, 96]], [[60, 10], [110, 100], [10, 70]], [[14, 14], [96, 40], [60, 110], [24, 80]]];
  p.poly(pts[k % 4], "#cfe9f7", 6);
  p.stroke([[40, 40], [64, 60]], 6, "#ffffff");
};

/** a bullet whizz streak (motion line + tiny slug), 600 x 60 */
export const fxWhizz = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(20, 0, 560, 0);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,0.95)");
  g.strokeStyle = gr; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(20, 30); g.lineTo(560, 30); g.stroke();
  p.ell(566, 30, 14, 9, "#5a5048", 4);
};

/** a sombrero flung in the air by a cheering crowd, 300 x 160 (spin = rotation deg) */
export const fxHat = (p: Pen, spin: number, col = "#d8bc7c") => {
  const g = p.g;
  g.save(); g.translate(150, 90); g.rotate(rad(spin)); g.translate(-150, -90);
  p.ell(150, 104, 128, 30, shade(col, 0.85), 7);
  p.poly([[100, 104], [112, 40], [150, 26], [188, 40], [200, 104]], col, 7);
  p.stroke([[106, 80], [194, 80]], 9, "#8a5a34");
  g.restore();
};

/** confetti-like cheer marks (three short strokes around a point), 200 x 200 */
export const fxCheer = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const a = rad(-140 + 50 * k), r0 = 40 + 30 * t, r1 = 70 + 40 * t;
    p.stroke([[100 + r0 * Math.cos(a), 120 + r0 * Math.sin(a)], [100 + r1 * Math.cos(a), 120 + r1 * Math.sin(a)]], 10 * (1 - 0.6 * t), "#ffffff");
  }
};

/** cold downdraft gust: three heavy blue swoosh arrows pointing down, 300 x 600; t slides them */
export const fxDowndraft = (p: Pen, t: number) => {
  for (const [x0, w] of [[80, 18], [160, 22], [230, 16]] as const) {
    const a = Math.max(0, t - 0.5) * 2, b = Math.min(1, t * 2), pts: P2[] = [];
    for (let i = 0; i <= 30; i++) { const u = a + (b - a) * (i / 30); pts.push([x0 + 18 * Math.sin(u * 8 + x0), 30 + 520 * u]); }
    if (b - a > 0.02) p.line(pts, "#cfe6ff", w);
  }
};

/** muzzle flash, 200 x 200 (k = frame 0..2) */
export const fxFlash = (p: Pen, k: number) => {
  const n = 8, r0 = 26, r1 = [90, 70, 45][k % 3], pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r0 : r1 * (0.8 + 0.2 * Math.sin(i * 3)); pts.push([100 + r * Math.cos(a), 100 + r * Math.sin(a)]); }
  p.poly(pts, "#ffe066", 6);
  p.ell(100, 100, 22, 22, "#ffffff", 0);
};

/** puff of gun smoke, 200 x 200 */
export const fxSmoke = (p: Pen, t: number) => {
  const r = 30 + 50 * t;
  for (const [dx, dy, k] of [[0, 0, 1], [-r * 0.6, 10, 0.75], [r * 0.6, 8, 0.8]] as const) p.ell(100 + dx, 110 + dy - 30 * t, r * k, r * 0.8 * k, "#ece6dc", 6);
};
