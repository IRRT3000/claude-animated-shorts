// The teaspoon short as one three.js scene: sky, Clapham pond (lawn, banks, trees, Georgian houses, the bedsheet bed)
// and, far away, the 1757 fleet on the open sea. The water is one painted shader: cartoon wave marks blown along +x
// by the wind, flattened to a mirror wherever the oil film is (a growing circle on the pond, two wakes at sea).
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, prop, house, setSight, Ray, Kit } from "./build";
import { ctex, grassHD, cloudHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotDef, POND, SEA, SHIPS, SHIP_DECK, BED, PATH_Z, JETTY, camAt, calmR, calmC, chopAt, inPond, V3 } from "./story";

export const loadKit = async (): Promise<Kit> => ({}); // no external models: trees and bushes are drawn by build.ts

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** per-shot sun (camera-relative az / el overrides) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 4: { az: -60, el: 9 }, 14: { az: 8, el: 6 }, 15: { az: -55, el: 9 } };

/** every lens position of the film looking at its subject (trees and houses there are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

// ---------------- geometry helpers ----------------
const ellipse = (rx: number, rz: number, n = 96) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [rx * Math.cos(a), rz * Math.sin(a)] as [number, number]; });
/** lawn: a big square with the pond cut out (top-view shape, lifted to y = 0, uv in metres / 4) */
const lawnGeo = () => {
  const S = 1500, sh = new THREE.Shape([V(-S, -S, 0), V(S, -S, 0), V(S, S, 0), V(-S, S, 0)].map((v) => new THREE.Vector2(v.x, v.y)));
  sh.holes.push(new THREE.Path(ellipse(POND.rx + 0.3, POND.rz + 0.3).map(([x, z]) => new THREE.Vector2(x, z))));
  const g = new THREE.ShapeGeometry(sh, 4);
  g.rotateX(Math.PI / 2); // shape y -> world z (+), faces up after the flip below
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4);
  g.index && g.setIndex(Array.from({ length: g.index.count / 3 }, (_, k) => [g.index!.getX(3 * k), g.index!.getX(3 * k + 2), g.index!.getX(3 * k + 1)]).flat());
  g.computeVertexNormals();
  return g;
};
/** the sloping bank between the lawn edge and the pond bed */
const bankGeo = () => {
  const n = 120, a = ellipse(POND.rx + 0.3, POND.rz + 0.3, n), b = ellipse(POND.rx - 1.2, POND.rz - 1.2, n), pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, A = [a[i][0], 0, a[i][1]], B = [a[j][0], 0, a[j][1]], C = [b[j][0], -0.9, b[j][1]], D = [b[i][0], -0.9, b[i][1]];
    pos.push(...A, ...C, ...B, ...A, ...D, ...C);
    const u0 = i / 6, u1 = (i + 1) / 6;
    uv.push(u0, 0, u1, 1, u1, 0, u0, 0, u0, 1, u1, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};
const discGeo = (rx: number, rz: number, y: number, n = 96) => {
  const g = new THREE.CircleGeometry(1, n); g.rotateX(-Math.PI / 2); g.scale(rx, 1, rz); g.translate(0, y, 0); return g;
};
const M4 = (x: number, y: number, z: number, ry = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(s, s, s));

/** a three-masted ship, bow toward +x, waterline at y = 0; s = scale */
const shipInto = (b: Batch, x: number, z: number, s: number) => {
  const L = 26 * s, Bm = 7 * s, D = SHIP_DECK * s;
  const top = (k: number) => { // hull outline seen from above, pointed bow at +x, shrunk inward by k
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16, xx = -L / 2 + k + (L - 2 * k) * u, w = (Bm / 2 - k) * (u < 0.7 ? 1 : Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 2))); pts.push(new THREE.Vector2(xx, w)); }
    for (let i = 16; i >= 0; i--) { const u = i / 16, xx = -L / 2 + k + (L - 2 * k) * u, w = (Bm / 2 - k) * (u < 0.7 ? 1 : Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 2))); pts.push(new THREE.Vector2(xx, -w)); }
    return pts;
  };
  const slab = (pts: THREE.Vector2[], y0: number, y1: number, hole?: THREE.Vector2[]) => {
    const sh = new THREE.Shape(pts); if (hole) sh.holes.push(new THREE.Path(hole));
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    return g;
  };
  const m = M4(x, 0, z);
  const hullM = lam("hull", () => ({ color: "#6b4630" })), stripeM = lam("hullStripe", () => ({ color: "#e0b04a" }));
  const deckM = lam("shipDeck", () => ({ color: "#c99a62" })), mastM = lam("mast", () => ({ color: "#8a5a34" }));
  const sailM = lam("sail", () => ({ color: "#f3ead6", side: THREE.DoubleSide })), flagM = lam("pennantRed", () => ({ color: "#c0353a", side: THREE.DoubleSide }));
  b.add(slab(top(0.5 * s), -1.2 * s, 1.5 * s), hullM, m);
  b.add(slab(top(0.25 * s), 1.5 * s, 2.1 * s), stripeM, m);
  b.add(slab(top(0), 2.1 * s, D + 1.0 * s, top(0.35 * s)), hullM, m);
  b.add(slab(top(0.3 * s), D - 0.15 * s, D), deckM, m);
  b.add(boxGeo(V(-L / 2 + 0.2 * s, D, -Bm / 2 + 0.5 * s), V(-L / 2 + 5.5 * s, D + 2.2 * s, Bm / 2 - 0.5 * s)), hullM, m); // stern castle
  b.add(boxGeo(V(-L / 2 + 0.1 * s, D + 2.2 * s, -Bm / 2 + 0.4 * s), V(-L / 2 + 5.6 * s, D + 2.45 * s, Bm / 2 - 0.4 * s)), stripeM, m);
  const bs = new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 9 * s, 8); bs.rotateZ(-Math.PI / 2 + 0.3); // bowsprit
  b.add(bs, mastM, new THREE.Matrix4().multiplyMatrices(m, M4(L / 2 + 2.6 * s, D + 1.8 * s, 0)));
  for (const [mx, h, sw] of [[-6.5, 20, 7.5], [1.5, 24, 9], [8.5, 18, 6.5]] as const) {
    const X = mx * s, H = h * s, W = sw * s;
    b.add(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, H, 8), mastM, new THREE.Matrix4().multiplyMatrices(m, M4(X, D + H / 2, 0)));
    for (const [y0, hh, w] of [[0.32, 0.3, 1], [0.66, 0.24, 0.8]] as const) {
      const yb = D + H * y0, ht = H * hh, sail = new THREE.PlaneGeometry(W * w, ht, 6, 4);
      const p = sail.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (W * w / 2), v = p.getY(i) / (ht / 2); p.setZ(i, 0.9 * s * (1 - u * u) * (1 - 0.4 * v * v)); }
      sail.rotateY(Math.PI / 2); sail.computeVertexNormals();
      b.add(sail, sailM, new THREE.Matrix4().multiplyMatrices(m, M4(X + 0.4 * s, yb + ht / 2, 0)));
      b.add(boxGeo(V(X - 0.12 * s, yb + ht, -W * w / 2 - 0.3 * s), V(X + 0.12 * s, yb + ht + 0.22 * s, W * w / 2 + 0.3 * s)), mastM, m);
    }
    const fl = new THREE.PlaneGeometry(2.2 * s, 0.7 * s); fl.translate(-1.1 * s, 0, 0);
    b.add(fl, flagM, new THREE.Matrix4().multiplyMatrices(m, M4(X, D + H + 0.2 * s, 0, Math.PI / 2 + 0.6)));
  }
};

/** the bedsheet explainer's bed, standing on the lawn (head toward -x) */
const bedInto = (b: Batch) => {
  const [x, , z] = BED, wood = lam("bedWood", () => ({ color: "#9a6236" })), sheet = lam("sheet", () => ({ color: "#f4f6fb" }));
  const mat = lam("mattress", () => ({ color: "#b9cbe6" })), pil = lam("pillow", () => ({ color: "#fdfcf6" }));
  for (const [dx, dz] of [[-1.05, -0.72], [1.05, -0.72], [-1.05, 0.72], [1.05, 0.72]]) b.add(boxGeo(V(x + dx - 0.06, 0, z + dz - 0.06), V(x + dx + 0.06, dx < 0 ? 1.15 : 0.6, z + dz + 0.06)), wood);
  b.add(boxGeo(V(x - 1.1, 0.68, z - 0.76), V(x - 1.0, 1.1, z + 0.76)), wood);
  b.add(boxGeo(V(x - 1.0, 0.25, z - 0.7), V(x + 1.05, 0.38, z + 0.7)), wood);
  b.add(boxGeo(V(x - 0.98, 0.38, z - 0.68), V(x + 1.0, 0.56, z + 0.68)), mat);
  b.add(boxGeo(V(x - 0.98, 0.56, z - 0.69), V(x + 1.0, 0.585, z + 0.69)), sheet); // pulled perfectly tight
  b.add(boxGeo(V(x - 0.95, 0.585, z - 0.45), V(x - 0.6, 0.71, z + 0.45)), pil);
};

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root, M: Mats = {};
    // ---- sky + light (bridge recipe) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.userData.k = i;
      this.clouds.push(m); R.add(m);
    }

    // ---- pond: lawn, bank, bed, paths, trees, houses (static batch) ----
    setSight(sightLines());
    const b = new Batch(), r = rng(7);
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.bank = lam("bankMud", () => ({ color: "#5f7a3c" }));
    M.bed = lam("pondBed", () => ({ color: "#3b5a52" }));
    M.gravel = lam("gravel", () => ({ color: "#d9c69a" }));
    b.add(lawnGeo(), M.grass);
    b.add(bankGeo(), M.bank);
    b.add(discGeo(POND.rx - 2.0, POND.rz - 2.0, -0.9), M.bed);
    // gravel path along the north side (shot 4) and a little landing where Franklin stands
    b.add(boxGeo(V(-140, -0.05, PATH_Z - 1.3), V(80, 0.015, PATH_Z + 1.3)), M.gravel);
    // trees: a ring round the pond, an avenue along the path, woods beyond
    const trees = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree-high-round"];
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + r() * 0.08, k = 1.22 + r() * 0.35;
      const x = Math.cos(a) * (POND.rx * k + 6), z = Math.sin(a) * (POND.rz * k + 6);
      if (Math.abs(z - PATH_Z) < 3.5) continue;
      prop(b, kit, pick(trees), x, 0, z, 8 + r() * 4, r() * 6);
    }
    for (let x = -130; x < 70; x += 11) prop(b, kit, pick(trees), x + r() * 3, 0, PATH_Z + 6 + r() * 3, 9 + r() * 3, r() * 6);
    for (let i = 0; i < 150; i++) {
      const x = (r() - 0.5) * 520, z = (r() - 0.5) * 520;
      if (inPond(x, z, 22) || Math.abs(z - PATH_Z) < 6) continue;
      prop(b, kit, pick(trees), x, 0, z, 9 + r() * 5, r() * 6);
    }
    for (let i = 0; i < 18; i++) { // bushes on the banks
      const a = r() * Math.PI * 2;
      prop(b, kit, pick(["plant_bushLarge", "plant_bushDetailed", "plant_bush"]), Math.cos(a) * (POND.rx + 4 + r() * 4), 0, Math.sin(a) * (POND.rz + 4 + r() * 4), 1.2 + r() * 0.6, r() * 6);
    }
    // Georgian terraces round the common
    for (let x = -170; x < 170; x += 10) house(b, x, 108 + r() * 2, Math.PI, 9, 9, [9.8, 11.2, 12.6][Math.floor(r() * 3)], Math.floor(r() * 8));
    for (let z = -120; z < 100; z += 10) house(b, 138 + r() * 2, z, -Math.PI / 2, 9, 9, [9.8, 11.2][Math.floor(r() * 2)], Math.floor(r() * 8));
    for (let x = -160; x < 140; x += 10) house(b, x, -112 - r() * 2, 0, 9, 9, [8.4, 9.8, 11.2][Math.floor(r() * 3)], Math.floor(r() * 8));
    bedInto(b);
    // the little jetty Franklin stands on: plank deck on posts
    const plank = lam("jettyWood", () => ({ color: "#b98a56" })), post = lam("jettyPost", () => ({ color: "#7a5434" }));
    for (let x = JETTY.x0; x < JETTY.x1 - 0.01; x += 0.32) b.add(boxGeo(V(x + 0.015, JETTY.y - 0.08, JETTY.z - JETTY.w / 2), V(x + 0.3, JETTY.y, JETTY.z + JETTY.w / 2)), plank);
    for (let x = JETTY.x0 + 2.5; x <= JETTY.x1; x += 2.3) for (const s2 of [-1, 1]) b.add(boxGeo(V(x - 0.1, -0.9, JETTY.z + s2 * (JETTY.w / 2 + 0.02) - 0.1), V(x + 0.1, JETTY.y + 0.12, JETTY.z + s2 * (JETTY.w / 2 + 0.02) + 0.1)), post);
    // ---- the fleet ----
    for (const s of SHIPS) shipInto(b, SEA[0] + s.x, SEA[2] + s.z, s.s);
    b.build(R);
    setSight([]);

    // ---- water: one painted shader for pond and sea ----
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wMirror: { value: new THREE.Color() }, wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) },
      wTime: { value: 0 }, wChop: { value: 1 }, wScale: { value: 1 }, wCalm: { value: new THREE.Vector4(0, 0, 0, 0) },
      wWakeA: { value: new THREE.Vector4() }, wWakeB: { value: new THREE.Vector4() }, wWakeR: { value: 0 }, wSheen: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "pondWater1";
    const pond = new THREE.Mesh(discGeo(POND.rx, POND.rz, POND.y, 128), waterM);
    pond.receiveShadow = true; R.add(pond);
    const seaG = new THREE.PlaneGeometry(3000, 2500); seaG.rotateX(-Math.PI / 2); seaG.translate(SEA[0], 0, SEA[2] - 200);
    const seaM = new THREE.Mesh(seaG, waterM); seaM.receiveShadow = true; R.add(seaM);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (const m of this.clouds) { // a cloud ring around wherever the camera is (pond or sea), drifting with the wind
      const i = m.userData.k as number, a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d + t * 1.5, 120 + (i % 4) * 38, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    // ---- water ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    untone(s.light === "day" ? "#cfe2f6" : "#f6c99a", W.wMirror.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t; W.wChop.value = chopAt(id, f);
    W.wScale.value = id === 10 || id === 12 || (id === 13 && f >= 1786) ? 4.5 : s.place === "sea" ? 0.45 : 1;
    W.wSheen.value = id === 12 || (id === 13 && f >= 1786) ? 1 : id === 10 ? 0.6 : 0.25;
    const Rc = calmR(id, f), [cx, cz] = calmC(Rc);
    (W.wCalm.value as THREE.Vector4).set(cx, cz, Rc, s.place === "pond" ? 1 : 0);
    const wake = (k: number, v: THREE.Vector4) => { const sh = SHIPS[k], x0 = SEA[0] + sh.x - 12 * sh.s; v.set(x0, SEA[2] + sh.z, x0 - 260, SEA[2] + sh.z + 6); };
    wake(1, W.wWakeA.value as THREE.Vector4); wake(2, W.wWakeB.value as THREE.Vector4);
    W.wWakeR.value = s.place === "sea" ? 5.5 : 0;
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wMirror, wShade;
uniform float wTime, wChop, wScale, wWakeR, wSheen;
uniform vec4 wCalm, wWakeA, wWakeB;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float wSeg(vec2 p, vec4 s) { vec2 a = s.xy, b = s.zw, pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// one layer of cartoon wave marks: in every cell a short smile-shaped crest stroke, drifting downwind (+x)
float wMarks(vec2 p, float cell, float speed, float seed) {
  vec2 q = p / cell; q.x -= wTime * speed / cell;
  q.y += 0.5 * floor(q.x) ; // stagger rows
  vec2 id = floor(q), f = fract(q) - 0.5;
  float r = wHash(id + seed), r2 = wHash(id + seed + 7.3);
  f -= vec2(r - 0.5, r2 - 0.5) * 0.5;
  float len = 0.22 + 0.16 * r2;
  float y = f.y - 1.4 * f.x * f.x + 0.04;            // smile curve
  float w = 0.035 * (1.0 - smoothstep(len * 0.6, len, abs(f.x)));
  return (1.0 - smoothstep(w * 0.5, w, abs(y))) * step(abs(f.x), len) * step(0.25, r * r2 + 0.3);
}`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 P = vWP.xz * wScale;
  // oil film: calm circle (pond) and the two wakes (sea), soft edged
  float dC = length(vWP.xz - wCalm.xy);
  float calm = wCalm.w * (1.0 - smoothstep(wCalm.z - 0.6, wCalm.z + 0.6, dC)) * step(0.01, wCalm.z);
  float dW = min(wSeg(vWP.xz, wWakeA), wSeg(vWP.xz, wWakeB));
  calm = max(calm, (1.0 - smoothstep(wWakeR * 0.7, wWakeR * 1.15, dW)) * step(0.01, wWakeR));
  float chop = wChop * (1.0 - calm);
  // troughs: broad darker bands rolling downwind, broken up by noise
  float band = 0.5 + 0.5 * sin(P.x * 1.7 - wTime * 2.4 + 2.5 * wNoise(P * 0.35));
  wc = mix(wc, wTrough, chop * 0.38 * band * (1.0 - 0.6 * wf));
  // crests: two layers of smile strokes (big + small), fading with distance into a fine texture
  float far = smoothstep(30.0, 140.0, wd / max(wScale, 0.2));
  float mk = max(wMarks(P, 2.4, 1.2, 0.0), 0.8 * wMarks(P + 1.3, 1.1, 0.9, 3.0));
  wc = mix(wc, wCrest, chop * mk * (0.85 - 0.5 * far));
  // the oiled patch: a smooth mirror of the sky, a thin bright rim where the film ends, a faint sheen up close
  float rim = wCalm.w * (1.0 - smoothstep(0.0, 0.5, abs(dC - wCalm.z))) * step(0.5, wCalm.z);
  vec3 mir = mix(wc, wMirror, 0.62 + 0.25 * wf);
  float sh = 0.5 + 0.5 * sin(dC * 6.0 / max(wScale, 0.2) * wScale + wNoise(P * 0.5) * 4.0);
  mir = mix(mir, mix(vec3(1.0, 0.86, 0.55), vec3(0.85, 0.75, 1.0), sh), 0.22 * wSheen);
  wc = mix(wc, mir, calm);
  wc = mix(wc, wGlint, rim * 0.55);
  diffuseColor.rgb = wc;`;
