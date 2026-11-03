// The five sets of "The Ship Made of Ice", each at its own world origin (story.ts SETS): the open Atlantic with the
// ice carrier, the convoy and icebergs; Pyke's study + lab; the Quebec meeting room; the crack-demo workbench; and
// Patricia Lake with the prototype hull. Static pieces are merged per material (Batch); the few moving or switching
// pieces are kept as objects and posed by update(id, f). All materials are two-tone Lambert via lam() (shade.ts).
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { ctex, rep, planksHD, beamHD, grassHD } from "./paint";
import { twoTone } from "./shade";
import { SETS, SetId, V3, W, clamp01, smooth, lin, meltLeft, winterU, FPS } from "./story";

const T = (set: SetId, x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(SETS[set][0] + x, SETS[set][1] + y, SETS[set][2] + z);
const at = (set: SetId, x: number, y: number, z: number) => V(SETS[set][0] + x, SETS[set][1] + y, SETS[set][2] + z);
const box = (b: Batch, set: SetId, min: V3, max: V3, m: THREE.Material, tile = 0) =>
  b.add(boxGeo(at(set, ...min), at(set, ...max), tile, true), m);
const flat = (col: string) => lam("c" + col, () => ({ color: col }));

// ---------------- painted textures (our own, simple storybook paint) ----------------
const iceTex = () => ctex("iceHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#e8f3f7"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) { // soft blue streaks + sawdust specks: pykrete reads as speckled ice
    g.strokeStyle = `rgba(150,195,220,${0.15 + 0.2 * r()})`; g.lineWidth = 6 + 18 * r();
    const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 140 * (r() - 0.5), y + 60 * r()); g.stroke();
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(176,140,96,${0.25 + 0.3 * r()})`; g.fillRect(r() * 1024, r() * 1024, 3 + 4 * r(), 2 + 2 * r()); }
});
const clearIceTex = () => ctex("clearIce", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, "#d9f1fb"); gr.addColorStop(1, "#9fd2ea");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 14;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(60 + i * 40, 420 - i * 30); g.lineTo(200 + i * 40, 90 - i * 10); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + 6 * r(), 0, 7); g.fill(); }
});
const pykTex = () => ctex("pykrete", 512, 512, (g, r) => {
  g.fillStyle = "#d8d6cc"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.6 ? "#b38e5e" : "#8f6c45"; g.fillRect(r() * 512, r() * 512, 3 + 5 * r(), 2 + 2 * r()); }
});
const mudTex = () => ctex("mudbrick", 512, 512, (g, r) => {
  g.fillStyle = "#9a6a42"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(120,80,50,${0.3 * r()})`; g.beginPath(); g.arc(r() * 512, r() * 512, 6 + 20 * r(), 0, 7); g.fill(); }
  g.lineCap = "round";
  for (let i = 0; i < 120; i++) { // straw
    const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 30 + 50 * r();
    g.strokeStyle = r() < 0.5 ? "#e8c766" : "#d4ad4a"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke();
  }
});
const hullGreyTex = () => ctex("hullGrey", 512, 256, (g, r) => {
  g.fillStyle = "#7c838d"; g.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(40,45,55,0.25)"; g.fillRect(x, 0, 3, 256); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(120,70,50,${0.2 * r()})`; g.fillRect(r() * 512, 150 + r() * 100, 8, 30 * r()); }
});
const wallpaperTex = () => ctex("wallpaper", 512, 512, (g) => {
  g.fillStyle = "#e3d6b8"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "#d6c6a2"; g.fillRect(x, 0, 22, 512); }
});
const panelTex = () => ctex("panel", 512, 512, (g) => {
  g.fillStyle = "#7a4e32"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#4e2f1d"; g.lineWidth = 10;
  for (const [x, y] of [[24, 24], [272, 24], [24, 272], [272, 272]]) g.strokeRect(x, y, 216, 216);
});
const blueprintTex = () => ctex("blueprint", 512, 360, (g) => {
  g.fillStyle = "#2f5f9e"; g.fillRect(0, 0, 512, 360);
  g.strokeStyle = "#dbe9fb"; g.lineWidth = 5;
  g.beginPath(); g.moveTo(40, 220); g.lineTo(420, 220); g.lineTo(470, 180); g.lineTo(440, 140); g.lineTo(60, 140); g.lineTo(40, 180); g.closePath(); g.stroke();
  g.strokeRect(300, 90, 50, 50);
  g.lineWidth = 2; for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 360); g.stroke(); }
});
/** the study window: open sea, sky and an iceberg (unlit painted view) */
const viewTex = () => ctex("windowView", 1024, 768, (g) => {
  const sky = g.createLinearGradient(0, 0, 0, 430); sky.addColorStop(0, "#5e93d9"); sky.addColorStop(1, "#c4d9f0");
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 430);
  const sea = g.createLinearGradient(0, 430, 0, 768); sea.addColorStop(0, "#1f5d9c"); sea.addColorStop(1, "#22a7b6");
  g.fillStyle = sea; g.fillRect(0, 430, 1024, 338);
  g.fillStyle = "#f4fbff"; g.strokeStyle = "#0b0a0c"; g.lineWidth = 8;
  g.beginPath(); g.moveTo(560, 432); g.lineTo(640, 300); g.lineTo(700, 340); g.lineTo(760, 250); g.lineTo(860, 432); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#b9dcf0"; g.beginPath(); g.moveTo(700, 340); g.lineTo(760, 250); g.lineTo(780, 432); g.lineTo(720, 432); g.closePath(); g.fill();
});
const snowTex = () => ctex("snow", 512, 512, (g, r) => {
  g.fillStyle = "#eef3f8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(190,205,230,0.4)"; g.beginPath(); g.arc(r() * 512, r() * 512, 4 + 14 * r(), 0, 7); g.fill(); }
});

// ---------------- small builders ----------------
/** a ship hull along +z: box body with a pointed bow, deck at y = h above the water, draft d below */
const hullGeo = (len: number, w: number, h: number, d: number, bow = 0.12) => {
  const s = new THREE.Shape();
  const L = len / 2, B = len * bow;
  s.moveTo(-w / 2, -L); s.lineTo(w / 2, -L); s.lineTo(w / 2, L - B); s.quadraticCurveTo(w / 2, L - B * 0.2, 0, L); s.quadraticCurveTo(-w / 2, L - B * 0.2, -w / 2, L - B); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h + d, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(Math.PI / 2); g.translate(0, h, 0); // shape xy -> xz, extrude downward from the deck
  g.computeVertexNormals();
  return g;
};
const plane = (b: Batch, m4: THREE.Matrix4, s: number, body: THREE.Material, glass: THREE.Material) => {
  const k = new THREE.Matrix4().makeScale(s, s, s), M = (x: number, y: number, z: number) => m4.clone().multiply(k).multiply(new THREE.Matrix4().makeTranslation(x, y, z));
  b.add(boxGeo(V(-0.5, 0, -4), V(0.5, 1.1, 4.5), 0, true), body, M(0, 0, 0));
  b.add(boxGeo(V(-6, 0.3, -0.6), V(6, 0.55, 1.2), 0, true), body, M(0, 0, 0));
  b.add(boxGeo(V(-2.2, 0.6, -4.2), V(2.2, 0.8, -3.2), 0, true), body, M(0, 0, 0));
  b.add(boxGeo(V(-0.12, 0.8, -4.2), V(0.12, 2.2, -3.2), 0, true), body, M(0, 0, 0));
  b.add(boxGeo(V(-0.4, 1.1, 0.4), V(0.4, 1.6, 2.0), 0, true), glass, M(0, 0, 0));
};
const tree = (b: Batch, set: SetId, x: number, z: number, h: number, mat: THREE.Material, trunk: THREE.Material, y = 0.5) => {
  const c = new THREE.ConeGeometry(h * 0.28, h * 0.8, 7); b.add(c, mat, T(set, x, y + h * 0.2 + h * 0.4, z));
  const c2 = new THREE.ConeGeometry(h * 0.2, h * 0.5, 7); b.add(c2, mat, T(set, x, y + h * 0.65 + h * 0.25, z));
  b.add(new THREE.CylinderGeometry(h * 0.04, h * 0.05, h * 0.25, 6), trunk, T(set, x, y + h * 0.12, z));
};

export class Sets {
  carrier = new THREE.Group(); convoy = new THREE.Group(); sinker = new THREE.Group(); bergs = new THREE.Group();
  steel = new THREE.Group(); deskIce = new THREE.Group(); freezerDoor = new THREE.Group(); tub = new THREE.Group();
  roomIce: THREE.Mesh; roomPyk: THREE.Mesh;
  demo: Record<"ice" | "mud" | "pyk", THREE.Mesh>;
  hull = new THREE.Group(); rowboat = new THREE.Group(); flyers = new THREE.Group();
  private girders: THREE.Mesh[] = [];
  private landMat: THREE.MeshLambertMaterial; private snowMat: THREE.MeshLambertMaterial; private land: THREE.Mesh;

  constructor(R: THREE.Object3D) {
    const b = new Batch(), walls = new Batch();
    const ice = lam("iceHD", () => ({ map: iceTex() })), clear = lam("clearIce", () => ({ map: clearIceTex() }));
    const pyk = lam("pykrete", () => ({ map: pykTex() })), mud = lam("mudbrick", () => ({ map: mudTex() }));
    const greyHull = lam("hullGrey", () => ({ map: hullGreyTex() })), dark = flat("#3a3f4a"), red = flat("#8e3b33");
    const planeM = flat("#4b5a6e"), glass = flat("#9cc6e0"), deckM = flat("#dfe9ee");
    const wood = lam("planksHD", () => ({ map: rep(planksHD(), 1, 1) })), beamM = lam("beamHD", () => ({ map: beamHD() }));
    const wallM = lam("wallpaper", () => ({ map: rep(wallpaperTex(), 1, 1) })), panel = lam("panel", () => ({ map: panelTex() }));
    const steelM = twoTone(new THREE.MeshPhongMaterial({ color: "#6d7480", specular: "#9aa0a8", shininess: 40 }), 0.15);
    const white = flat("#f2f2ee"), cream = flat("#efe6cf"), green = flat("#3f7a4a"), pine = flat("#2f6b45"), bark = flat("#6b4a33"), rock = flat("#8d8b93");
    const brass = flat("#c9a24a");

    // ======== SEA ========
    // ice carrier: 300 m speckled-ice hull, flat light deck, a small island, rows of planes (scale reads by the planes)
    const cb = new Batch();
    cb.add(hullGeo(300, 50, 16, 10, 0.1), ice);
    cb.add(boxGeo(V(-24, 16, -148), V(24, 16.4, 135), 0, false), deckM);
    cb.add(boxGeo(V(18, 16.4, -20), V(24, 30, 15), 0, true), ice);
    cb.add(boxGeo(V(19, 30, -10), V(23, 33, 6), 0, true), dark);
    for (let i = 0; i < 14; i++) plane(cb, new THREE.Matrix4().makeTranslation(-12 + (i % 2) * 14, 16.4, -120 + Math.floor(i / 2) * 22), 0.9, planeM, glass);
    for (let i = 0; i < 6; i++) cb.add(boxGeo(V(-25.5, 3 + i * 0, -140 + i * 50), V(-24.8, 6, -120 + i * 50), 0, true), flat("#c9e3ee")); // refrigeration ports
    cb.build(this.carrier); R.add(this.carrier);
    // convoy: grey freighters with a dark band, superstructure and a red-banded funnel, heading +z
    const freighter = (bb: Batch, m4: THREE.Matrix4) => {
      bb.add(hullGeo(60, 10, 5, 4, 0.18), greyHull, m4);
      bb.add(boxGeo(V(-5.05, 0.2, -30), V(5.05, 1.0, 22), 0, true), dark, m4);
      bb.add(boxGeo(V(-3.5, 5, -16), V(3.5, 10, -4), 0, true), white, m4);
      bb.add(new THREE.CylinderGeometry(1.4, 1.6, 6, 10), dark, m4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 12.5, -10)));
      bb.add(new THREE.CylinderGeometry(1.45, 1.45, 1.2, 10), red, m4.clone().multiply(new THREE.Matrix4().makeTranslation(0, 13.5, -10)));
      for (const z of [8, 18]) bb.add(boxGeo(V(-0.2, 5, z), V(0.2, 14, z + 0.4), 0, true), dark, m4);
    };
    const vb = new Batch();
    for (const [x, z] of [[-70, -170], [-40, -215], [35, -150], [70, -200], [10, -250], [-100, -230]] as const)
      freighter(vb, new THREE.Matrix4().makeTranslation(x, 0, z));
    vb.build(this.convoy); R.add(this.convoy);
    const sb = new Batch(); freighter(sb, new THREE.Matrix4()); sb.build(this.sinker);
    this.sinker.position.set(-8, 0, -150); R.add(this.sinker);
    // icebergs: faceted white lumps with blue shade faces
    const bb2 = new Batch();
    for (let i = 0; i < 7; i++) {
      const g = new THREE.DodecahedronGeometry(1, 0), r = 8 + 9 * ((i * 37) % 10) / 10;
      const m4 = new THREE.Matrix4().compose(V(80 + ((i * 53) % 90), r * 0.25, -60 - ((i * 71) % 110)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 1.7, 0)), V(r * 1.4, r, r * 1.1));
      bb2.add(g, i % 2 ? white : flat("#e4f2fa"), m4);
    }
    bb2.build(this.bergs); R.add(this.bergs);

    // ======== STUDY / LAB (origin SETS.study) ========
    const S: SetId = "study";
    box(b, S, [-3.2, -0.05, -4.5], [5.6, 0, 4.6], wood);
    // walls (no ceiling, they do not cast: the high sun lights the floor through the open top)
    box(walls, S, [-3.3, 0, 4.5], [-1.6, 3.2, 4.7], wallM, 2); box(walls, S, [0.6, 0, 4.5], [5.7, 3.2, 4.7], wallM, 2);
    box(walls, S, [-1.6, 0, 4.5], [0.6, 0.95, 4.7], wallM, 2); box(walls, S, [-1.6, 2.45, 4.5], [0.6, 3.2, 4.7], wallM, 2);
    box(walls, S, [-3.4, 0, -4.6], [-3.2, 3.2, 4.7], wallM, 2); box(walls, S, [5.6, 0, -4.6], [5.8, 3.2, 4.7], wallM, 2);
    box(b, S, [-1.7, 0.9, 4.42], [0.7, 0.98, 4.5], beamM); box(b, S, [-0.6, 0.95, 4.55], [-0.5, 2.45, 4.6], beamM);
    const view = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.3), new THREE.MeshBasicMaterial({ map: viewTex(), fog: false }));
    view.position.copy(at(S, -0.5, 1.7, 5.4)); view.rotation.y = Math.PI; R.add(view);
    // desk (Pyke stands behind it at z 0.4), books, lamp base
    box(b, S, [-0.75, 0.72, -0.8], [0.75, 0.8, -0.05], beamM); for (const x of [-0.7, 0.62]) box(b, S, [x, 0, -0.75], [x + 0.08, 0.72, -0.1], beamM);
    box(b, S, [-0.6, 0.8, -0.6], [-0.3, 0.95, -0.35], red); box(b, S, [-0.55, 0.95, -0.58], [-0.32, 1.05, -0.38], green);
    box(b, S, [0.2, 0.8, -0.5], [0.6, 0.81, -0.2], flat("#f3eedf"));
    // bookshelf on the left wall, blackboard-ish map board on the back wall
    box(b, S, [-3.2, 0, 1.2], [-2.8, 2.2, 3.2], beamM);
    for (let i = 0; i < 5; i++) box(b, S, [-3.15, 0.3 + i * 0.4, 1.3], [-2.85, 0.6 + i * 0.4, 3.1], [red, green, flat("#3f5f8a"), flat("#c99b4a")][i % 4]);
    // side table with the test ice block (shot 6)
    box(b, S, [0.75, 0.78, 0.25], [1.25, 0.82, 0.75], beamM); box(b, S, [0.95, 0, 0.45], [1.05, 0.78, 0.55], beamM);
    const ib = new THREE.Mesh(boxGeo(V(-0.15, 0, -0.13), V(0.15, 0.24, 0.13), 0, true), clear);
    ib.castShadow = true; this.deskIce.add(ib); this.deskIce.position.copy(at(S, 1.0, 0.82, 0.5)); R.add(this.deskIce);
    // lab: bench with the pykrete block, sawdust tub, freezer cabinet
    box(b, S, [2.4, 0.86, 0.45], [3.4, 0.92, 0.95], beamM); for (const x of [2.45, 3.3]) box(b, S, [x, 0, 0.5], [x + 0.06, 0.86, 0.9], beamM);
    box(b, S, [2.55, 0.92, 0.55], [2.85, 1.17, 0.85], pyk);
    const tubG = new THREE.CylinderGeometry(0.38, 0.32, 0.5, 18); const tm = new THREE.Mesh(tubG, flat("#8a8f98")); tm.position.y = 0.25; tm.castShadow = true;
    const dust = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18).rotateX(-Math.PI / 2), flat("#cfa56a")); dust.position.y = 0.42;
    this.tub.add(tm, dust); this.tub.position.copy(at(S, 1.8, 0, 1.05)); R.add(this.tub);
    box(b, S, [4.3, 0, 1.0], [5.3, 1.9, 1.8], white); box(b, S, [4.35, 1.6, 0.99], [5.25, 1.62, 1.0], dark);
    const door = new THREE.Mesh(boxGeo(V(0, 0, -0.06), V(0.98, 1.5, 0)), white); door.castShadow = true;
    this.freezerDoor.add(door); this.freezerDoor.position.copy(at(S, 4.31, 0.05, 0.99)); R.add(this.freezerDoor);
    const coldBox = new THREE.Mesh(boxGeo(V(4.4, 0.1, 1.05), V(5.2, 1.5, 1.08)), flat("#bfe6f5")); coldBox.position.copy(at(S, 0, 0, 0)); R.add(coldBox);
    // steel heap (shot 3): girders that vanish one by one on "running out"
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3), g = new THREE.Mesh(boxGeo(V(-0.9, 0, -0.07), V(0.9, 0.12, 0.07), 0, true), steelM);
      g.position.set((i % 3) * 0.2 - 0.2 + row * 0.05, row * 0.12, (i % 3) * 0.18 - 0.18); g.rotation.y = 0.2 * (i % 2 ? 1 : -1); g.castShadow = true;
      this.girders.push(g); this.steel.add(g);
    }
    this.steel.position.copy(at(S, 0.6, 0, 0.5)); R.add(this.steel);

    // ======== MEETING ROOM (origin SETS.room) ========
    const M: SetId = "room";
    box(b, M, [-3.6, -0.05, -8.6], [3.6, 0, 6.6], wood);
    box(walls, M, [-3.7, 0, -8.6], [-3.5, 3.6, 6.6], panel, 2); box(walls, M, [3.5, 0, -8.6], [3.7, 3.6, 6.6], panel, 2);
    box(walls, M, [-3.7, 0, 6.5], [3.7, 3.6, 6.7], panel, 2);
    box(walls, M, [-3.7, 0, -8.7], [-0.7, 3.6, -8.5], panel, 2); box(walls, M, [0.7, 0, -8.7], [3.7, 3.6, -8.5], panel, 2); box(walls, M, [-0.7, 2.3, -8.7], [0.7, 3.6, -8.5], panel, 2);
    box(b, M, [-0.75, 0.72, -3.2], [0.75, 0.78, 3.2], beamM); for (const z of [-3.0, 2.9]) for (const x of [-0.65, 0.57]) box(b, M, [x, 0, z], [x + 0.08, 0.72, z + 0.08], beamM);
    box(b, M, [-0.7, 0.78, -3.1], [0.7, 0.785, 3.1], green); // baize
    for (const z of [-2.2, -0.8, 0.6, 2.0]) for (const s of [-1, 1]) { // chair backs behind each seat
      box(b, M, [s * 1.45 - 0.22, 0, z - 0.22], [s * 1.45 + 0.22, 0.45, z + 0.22], beamM);
      box(b, M, [s * 1.62 - 0.04, 0.45, z - 0.22], [s * 1.62 + 0.04, 1.05, z + 0.22], beamM);
    }
    box(b, M, [-0.1, 0.9, 3.9], [0.8, 0.96, 4.5], beamM); for (const x of [-0.05, 0.7]) box(b, M, [x, 0, 3.95], [x + 0.06, 0.9, 4.45], beamM);
    this.roomIce = new THREE.Mesh(boxGeo(V(-0.13, 0, -0.12), V(0.13, 0.26, 0.12), 0, true), clear); this.roomIce.position.copy(at(M, 0.12, 0.96, 4.2));
    this.roomPyk = new THREE.Mesh(boxGeo(V(-0.13, 0, -0.12), V(0.13, 0.26, 0.12), 0, true), pyk); this.roomPyk.position.copy(at(M, 0.55, 0.96, 4.2));
    for (const m of [this.roomIce, this.roomPyk]) { m.castShadow = true; R.add(m); }
    box(b, M, [-1.6, 1.4, 6.45], [1.6, 2.9, 6.5], flat("#d8cfb4")); // map board
    box(b, M, [-1.3, 1.6, 6.44], [-0.2, 2.6, 6.45], flat("#6c95bf")); box(b, M, [0.2, 1.7, 6.44], [1.3, 2.5, 6.45], flat("#9bb67a"));
    box(b, M, [-0.55, 0, -8.6], [0.55, 2.25, -8.55], beamM); box(b, M, [0.35, 1.0, -8.55], [0.45, 1.08, -8.5], brass); // door

    // ======== DEMO WORKBENCH (origin SETS.insert) ========
    const I: SetId = "insert";
    box(b, I, [-6, -0.05, -6], [6, 0, 6], wood);
    box(b, I, [-1.6, 0.84, -0.8], [1.6, 0.9, 0.8], beamM); box(b, I, [-1.5, 0, -0.7], [1.5, 0.84, 0.7], beamM);
    box(walls, I, [-6, 0, 1.6], [6, 3.4, 1.8], wallM, 2);
    box(b, I, [-1.4, 0.9, 0.3], [-0.9, 1.05, 0.6], flat("#c99b4a")); box(b, I, [0.9, 0.9, 0.35], [1.3, 1.35, 0.55], flat("#8a8f98")); // props behind
    this.demo = {
      ice: new THREE.Mesh(boxGeo(V(-0.2, 0, -0.15), V(0.2, 0.3, 0.15), 0, true), clear),
      mud: new THREE.Mesh(boxGeo(V(-0.24, 0, -0.12), V(0.24, 0.22, 0.12), 0, true), mud),
      pyk: new THREE.Mesh(boxGeo(V(-0.2, 0, -0.15), V(0.2, 0.3, 0.15), 0, true), pyk),
    };
    for (const m of Object.values(this.demo)) { m.position.copy(at(I, 0, 0.9, 0)); m.castShadow = true; R.add(m); }

    // ======== PATRICIA LAKE (origin SETS.lake) ========
    const L: SetId = "lake";
    const ring = new THREE.Shape(); ring.moveTo(-400, -400); ring.lineTo(400, -400); ring.lineTo(400, 400); ring.lineTo(-400, 400); ring.closePath();
    const hole = new THREE.Path(); hole.absellipse(0, 10, 48, 62, 0, Math.PI * 2, true, 0); ring.holes.push(hole);
    const landG = new THREE.ShapeGeometry(ring, 48); landG.rotateX(-Math.PI / 2);
    // uv = world xz / 8 m
    const pos = landG.attributes.position as THREE.BufferAttribute, uv: number[] = [];
    for (let i = 0; i < pos.count; i++) uv.push(pos.getX(i) / 8, pos.getZ(i) / 8);
    landG.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    this.landMat = lam("lakeGrass", () => ({ map: rep(grassHD(), 1, 1) })) as THREE.MeshLambertMaterial;
    this.snowMat = lam("snow", () => ({ map: rep(snowTex(), 1, 1) })) as THREE.MeshLambertMaterial;
    this.land = new THREE.Mesh(landG, this.landMat); this.land.position.copy(at(L, 0, 0.5, 0)); this.land.receiveShadow = true; R.add(this.land);
    const bank = new THREE.CylinderGeometry(48, 49, 1.2, 64, 1, true); bank.scale(1, 1, 62 / 48); b.add(bank, rock, T(L, 0, -0.05, 10));
    // mountains behind the lake (+z), snow caps
    for (const [x, z, r, h] of [[-160, 300, 140, 190], [20, 360, 170, 240], [190, 290, 130, 170], [-300, 180, 110, 130], [320, 160, 120, 150]] as const) {
      b.add(new THREE.ConeGeometry(r, h, 9), rock, T(L, x, h / 2 + 0.4, z));
      b.add(new THREE.ConeGeometry(r * 0.32, h * 0.32, 9), white, T(L, x, h * 0.84 + 0.4, z));
    }
    // pines around the shore, kept off the camera side (z < -40 near the jetty) except a few framing ones
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + 0.07 * Math.sin(i * 3), rr = 56 + ((i * 29) % 60);
      const x = Math.cos(a) * rr * 0.95, z = 10 + Math.sin(a) * rr * 1.2;
      if (z < -20 && Math.abs(x) < 50) continue;
      tree(b, L, x, z, 9 + ((i * 13) % 8), pine, bark);
    }
    // jetty from the south shore toward the hull, a table with the blueprint at its end
    box(b, L, [-7.2, 0.25, -52], [-5.6, 0.35, -7.0], wood);
    for (let z = -50; z < -7; z += 4) for (const x of [-7.1, -5.75]) box(b, L, [x, -1.5, z], [x + 0.15, 0.25, z + 0.15], beamM);
    box(b, L, [-6.9, 0.98, -8.6], [-5.9, 1.04, -7.8], beamM); for (const x of [-6.85, -5.98]) box(b, L, [x, 0.35, -8.5], [x + 0.06, 0.98, -7.9], beamM);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44).rotateX(-Math.PI / 2), lam("blueprint", () => ({ map: blueprintTex() })));
    bp.position.copy(at(L, -6.4, 1.045, -8.2)); R.add(bp);
    // the prototype: a pykrete block hull with a wooden boathouse on top and a cooling pipe; shrinks as it melts
    const hb = new Batch();
    hb.add(boxGeo(V(-9, -1.6, -4.5), V(9, 2.6, 4.5), 0, true), ice);
    hb.add(boxGeo(V(-3, 2.6, -2), V(3, 4.6, 2), 0, true), beamM);
    const roof = new THREE.ConeGeometry(4.6, 1.6, 4); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.68); hb.add(roof, red, new THREE.Matrix4().makeTranslation(0, 5.4, 0));
    hb.add(new THREE.CylinderGeometry(0.25, 0.25, 3, 8), steelM, new THREE.Matrix4().makeTranslation(5, 4.1, 0));
    hb.build(this.hull); this.hull.position.copy(at(L, 0, 0, 0)); R.add(this.hull);
    // rowboat
    const rb = new Batch(); rb.add(hullGeo(4, 1.5, 0.45, 0.25, 0.3), flat("#a8724a")); rb.build(this.rowboat); R.add(this.rowboat);
    // planes flying over the lake (shot 18): three in a vee, a fourth trailing
    const fb = new Batch();
    for (const [x, z] of [[0, 0], [-14, -10], [14, -10], [0, -24]] as const) plane(fb, new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)), 1.0, planeM, glass);
    fb.build(this.flyers); R.add(this.flyers);

    b.build(R); walls.build(R, false);
  }

  /** pose the moving pieces for shot `id` (set) at frame f */
  update(id: number, f: number, set: SetId) {
    const t = f / FPS;
    this.carrier.visible = set === "sea" && (id === 1 || id === 16);
    this.carrier.position.set(0, -0.3 * Math.sin(t * 0.8), id === 1 ? 6 * t : 0); // ploughing forward in the hook
    this.carrier.rotation.z = 0.004 * Math.sin(t * 0.9);
    this.convoy.visible = this.sinker.visible = id === 2;
    const sink = smooth((f - (W.sinking - 3)) / 60);
    this.sinker.position.y = -6 * sink; this.sinker.rotation.x = -0.35 * sink; this.sinker.rotation.z = 0.12 * sink;
    this.bergs.visible = id === 5;
    // study
    this.steel.visible = id === 3;
    const left = lin([[W.steel - 4, 9], [W.steel + 40, 1]], f);
    this.girders.forEach((g, i) => (g.visible = i < Math.round(left)));
    this.deskIce.visible = id === 6;
    const doorOpen = smooth((f - (W.freezes - 6)) / 12);
    this.freezerDoor.rotation.y = -1.6 * doorOpen;
    // room: the ice block bursts (shot 9 on), the pykrete stays
    this.roomIce.visible = f < (W.shatters - 2);
    // demo: one block per insert shot
    this.demo.ice.visible = id === 13; this.demo.mud.visible = id === 14; this.demo.pyk.visible = id === 15;
    // lake: melt + seasons, crew rows away in 18, planes cross in 18
    const m = meltLeft(f), k = Math.max(0.001, m);
    this.hull.visible = set === "lake" && m > 0.01;
    this.hull.scale.set(0.55 + 0.45 * k, k, 0.55 + 0.45 * k); this.hull.position.y = SETS.lake[1] - 1.2 * (1 - k);
    const w = winterU(f);
    this.land.material = w > 0.5 ? this.snowMat : this.landMat;
    this.rowboat.visible = id === 18;
    const row = smooth((f - 1755) / 80);
    this.rowboat.position.copy(at("lake", -2 - 22 * row, 0.05, -6 - 18 * row)); this.rowboat.rotation.y = 0.9;
    this.flyers.visible = id === 18 && f < 1752;
    const fl = clamp01((f - 1708) / 44);
    this.flyers.position.copy(at("lake", -90 + 180 * fl, 42, 40)); this.flyers.rotation.z = 0.05;
  }
}
/** where people stand, per set (set-local) */
export const SPOTS = {
  pykeDesk: [0, 0, 0.4] as V3, admirals: [[-1.6, 0, 0.6], [-2.35, 0, 1.05]] as V3[], pykeTub: [1.95, 0, 1.55] as V3, pykeProud: [2.15, 0, 0.75] as V3,
  seats: [-2.2, -0.8, 0.6, 2.0].flatMap((z) => [[-1.2, 0, z], [1.2, 0, z]]) as V3[], mbEnter: [0.2, 0, -8.2] as V3, mbStand: [0.2, 0, -5.6] as V3,
};
