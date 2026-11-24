// Nerves stackup hero: the Trellis Core 4-layer board as a WebGPU-rendered,
// explodable stack. Each copper layer stands for one layer of Nerves.
//
// Usage:
//   import { mountPcbHero } from './pcb-hero.js';
//   mountPcbHero(document.querySelector('#hero-stack'), { dataUrl: '/hero-pcb/pcb.json' });

import { buildLayerCanvases, LAYER_SOURCES } from './textures.js';
import { drawLogo } from './logos.js';

export const DEFAULT_LAYERS = [
  // bottom -> top
  { name: 'Tooling', cu: 'B.Cu', text: 'Builds systems, assembles firmware, updates devices', accent: '#4fd18b' },
  { name: 'System', cu: 'In2.Cu', text: 'OS, drivers, minimal userspace, partition scheme', accent: '#f0a03c' },
  { name: 'BEAM', cu: 'In1.Cu', text: 'Init to Erlang VM, runtime robustness, runtime APIs', accent: '#a46fe0' },
  { name: 'Application', cu: 'F.Cu', text: 'Your Elixir application, unlimited possibilities', accent: '#42c6e8' },
];

// Things that sit on top of the stack. `part` anchors to a board reference, `at` to board mm.
export const DEFAULT_EXTRAS = {
  // projects on the Application layer, each a sticker floating over its part: `logo` names a
  // mark in logos.js (drawn in the accent), `image` a logo file; `float` overrides how high the
  // sticker floats (mm). Accents are the brand colours.
  apps: [
    { name: 'Phoenix', text: 'Web services', part: 'J1', logo: 'phoenix', accent: '#f05423' },
    { name: 'Membrane', text: 'Media processing and streaming', at: [37, 33], size: [7, 7], logo: 'membrane', accent: '#87cce8', float: 6 },
    { name: 'Nx', text: 'Inference at the edge', part: 'U3', logo: 'nx', accent: '#b58491' },
    { name: 'BEAM Bots', text: 'Declarative robotics', at: [8.5, 24], size: [6, 7], image: 'logos/beam-bots.svg', accent: '#af4bf9' },
    { name: 'Elixir Circuits', text: 'GPIO, SPI, I2C, UART, the usual suspects', at: [46.5, 9], size: [5.5, 5.5], image: 'logos/elixir-circuits.png', accent: '#6b5487' },
  ],
  // technology slots, on the layer named by its copper (board mm; size is x by y)
  slots: [
    { layer: 'In1.Cu', name: 'VintageNet', text: 'Networking APIs from Elixir', at: [9, 44], size: [9, 4.2] },
    { layer: 'In1.Cu', name: 'RingLogger', text: 'Flash-safe, memory-resilient logging', at: [20, 44], size: [9, 4.2] },
    { layer: 'In1.Cu', name: 'fwup', text: 'A/B updates and recovery', at: [31, 44], size: [9, 4.2] },
    { layer: 'In1.Cu', name: 'Nerves Heart', text: 'Watchdog for Erlang itself', at: [44.5, 40], size: [4.2, 9] },
    { layer: 'In1.Cu', name: 'Watchdog', text: 'Integrate heart with your hardware watchdog', at: [44.5, 29.5], size: [4.2, 9] },
    { layer: 'In1.Cu', name: 'KV store', text: 'Critical information, kept sanely', at: [44.5, 19], size: [4.2, 9] },
    { layer: 'In1.Cu', name: 'PubSub', text: 'Convenience without infrastructure', at: [44.5, 9.5], size: [4.2, 9] },
    { layer: 'In2.Cu', name: 'SquashFS/EroFS', text: 'Read-only root filesystem', at: [8, 43], size: [9.5, 4.2] },
    { layer: 'In2.Cu', name: 'Data partition', text: 'Separate data and system', at: [18.5, 43], size: [9.5, 4.2] },
    { layer: 'In2.Cu', name: 'A/B partitions', text: 'Safe updates', at: [29, 43], size: [9.5, 4.2] },
    { layer: 'In2.Cu', name: 'Minimal OS', text: 'Small attack surface, low complexity', at: [39.5, 43], size: [9.5, 4.2] },
    { layer: 'B.Cu', name: 'Mix tooling', text: 'Integrates with standard Elixir tooling', at: [44.5, 29], size: [4.2, 10] },
    { layer: 'B.Cu', name: 'fwup', text: 'Builds firmware and updates devices', at: [44.5, 40.5], size: [4.2, 10] },
  ],
  uplink: { name: 'NervesHub', text: 'Over-the-air updates and fleet management', part: 'U5', accent: '#2f9fc4', down: '#3aa86b' },
  cluster: {
    name: 'Erlang distribution',
    text: 'Processes message each other across devices',
    nodes: ['nerves@nerves-4f2a.local', 'nerves@nerves-91c3.local', 'nerves@nerves-0b7e.local'],
  },
};

const INK_HEX = '#26221f';
const PAINT_PEN = '#fbfaf2';

const CFG = {
  slab: 0.6,          // visual thickness of each layer plate (mm)
  gapIdle: 2.6,       // gap between plates at rest
  gapOpen: 8,         // gap when the pointer is over the hero
  lift: 14,           // extra lift for plates above the focused one
  azimuth: 38,        // degrees, camera swung toward the right
  elevation: 27,      // degrees above the board plane (isometric is ~35)
  fov: 20,
  labelColumn: 300,   // css px reserved to the right for callouts
  pulsePeriod: 14,    // mm between pulses along a trace
  pulseSpeed: 16,     // mm/s
  paper: '#f4efe4',   // the page colour; distant boards and unfocused plates fade into it
  ink: 1.6,           // fine ink line width in css px
  brush: 3.2,         // half-width of the brush line round the front board, css px
  highlighter: '#d9ff3a',
  boil: 8,            // hand-drawn marks are re-drawn this many times a second (PAINT_WGSL matches)
  stickerHeight: 8.5, // project stickers float this far above the top plate (mm)
  stickerSize: 6.2,
  // shadow nodes of the cluster: x, y = where the node's centre lands in the hero (0..1),
  // depth = distance from the camera in multiples of the hero board's distance, yaw in degrees
  nodes: [
    { x: 0.13, y: 0.22, depth: 2.8, yaw: 18 },
    { x: 0.86, y: 0.2, depth: 3.0, yaw: -22 },
    { x: 0.33, y: 0.09, depth: 3.7, yaw: 36 },
  ],
  shadowFade: 0.62,   // how far the boards in the distance fade into the paper
  shadowAlpha: 0.78,  // and how much of the page behind them shows through
  ports: [[22, 34], [31, 31], [36, 22]], // where cluster links land on the runtime plate (board mm)
};

// ---------------------------------------------------------------------------
// small math helpers (column-major mat4, WebGPU clip space z in [0,1])

const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; },
};

function perspective(fovy, aspect, near, far, shiftX = 0) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  // shiftX moves the image horizontally in NDC (lens shift) without rotating the camera
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    -shiftX, 0, far * nf, -1,
    0, 0, far * near * nf, 0,
  ]);
}

function lookAt(eye, target, up) {
  const z = v3.norm(v3.sub(eye, target));
  const x = v3.norm(v3.cross(up, z));
  const y = v3.cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1,
  ]);
}

function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

function invert(m) {
  const inv = new Float32Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  inv[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  inv[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  inv[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  inv[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  inv[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  inv[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  inv[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  inv[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  inv[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  inv[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  inv[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  inv[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  inv[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  inv[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  inv[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  inv[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return inv;
}

function xform(m, p) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [x / w, y / w, z / w];
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function hexLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => srgbToLinear(v / 255));
}

// ---------------------------------------------------------------------------
// WGSL

const SCENE_WGSL = /* wgsl */ `
struct Scene {
  viewProj: mat4x4f,
  camPos: vec4f,
  lightDir: vec4f,
  layerY: vec4f,
  focus: vec4f,
  dim: vec4f,
  params: vec4f,   // time, explode 0..1, slab thickness, pulse period
  params2: vec4f,  // pulse speed, top-layer pulse colour (rgb)
  accents: array<vec4f, 4>,
  motion: vec4f,   // x: 1 animated, 0 reduced motion
  clock: vec4f,    // per-layer time: only the active layer's clock runs
};
@group(0) @binding(0) var<uniform> S: Scene;

// one board of the cluster: the hero board or a shadow node in the distance
struct Node {
  xf: vec4f,    // offset xyz, yaw (radians)
  look: vec4f,  // -, alpha, -, how far it fades into the paper
  haze: vec4f,  // paper rgb, time offset (also seeds surface ids)
};
@group(1) @binding(0) var<uniform> NODE: Node;

const INK = vec3f(0.016, 0.014, 0.013);

fn rotY(p: vec3f) -> vec3f {
  let c = cos(NODE.xf.w); let s = sin(NODE.xf.w);
  return vec3f(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
}
fn toWorld(p: vec3f) -> vec3f { return rotY(p) + NODE.xf.xyz; }
fn paper() -> vec3f { return NODE.haze.rgb; }
// distant boards fade toward the paper, as if only sketched in
fn finish(col: vec3f) -> vec4f {
  let L = NODE.look;
  return vec4f(mix(col, paper(), L.w) * L.y, L.y);
}

// nearly cel-shaded: three flat tones, the shade side leaning cool, and a hard glint on metal
fn toon(base: vec3f, n: vec3f, v: vec3f, metal: f32, rough: f32) -> vec3f {
  let l = normalize(S.lightDir.xyz);
  let ndl = dot(n, l);
  let lit = smoothstep(0.48, 0.52, ndl);
  let mid = smoothstep(0.06, 0.1, ndl);
  let shade = base * vec3f(0.58, 0.6, 0.74);
  let half = base * vec3f(0.8, 0.82, 0.9);
  let c = mix(shade, mix(half, base, lit), mid);
  let h = normalize(l + v);
  let shin = mix(10.0, 48.0, 1.0 - rough);
  let glint = smoothstep(0.5, 0.56, pow(max(dot(n, h), 0.0), shin)) * metal;
  return mix(c, mix(base, vec3f(1.0), 0.65), glint);
}

// g-buffer for the ink pass: octahedral normal, distance from the camera, surface id
fn oct(n: vec3f) -> vec2f {
  var p = n.xy / (abs(n.x) + abs(n.y) + abs(n.z));
  if (n.z < 0.0) { p = (1.0 - abs(p.yx)) * select(vec2f(-1.0), vec2f(1.0), p >= vec2f(0.0)); }
  return p;
}
// front-board ids are positive, the boards in the distance negative, so even where
// multisampling blends an edge with the empty background the ink pass can tell them apart
fn gbuf(n: vec3f, wp: vec3f, id: f32) -> vec4f {
  let i = 0.05 + 0.95 * fract(id + NODE.haze.w);
  return vec4f(oct(normalize(n)), length(S.camPos.xyz - wp), select(i, -1.0 - i, NODE.look.w > 0.0));
}

struct FragOut { @location(0) color: vec4f, @location(1) g: vec4f };
`;

const SLAB_WGSL = SCENE_WGSL + /* wgsl */ `
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var albedoTex: texture_2d_array<f32>;
@group(0) @binding(3) var matTex: texture_2d_array<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) n: vec3f,
  @location(2) wp: vec3f,
  @location(3) @interpolate(flat) layer: u32,
  @location(4) @interpolate(flat) face: u32,
  @location(5) depth01: f32,
  @location(6) lp: vec3f,
};

@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f,
              @location(3) face: f32, @builtin(instance_index) li: u32) -> VOut {
  var o: VOut;
  let lp = vec3f(p.x, S.layerY[li] + p.y * S.params.z, p.z);
  let wp = toWorld(lp);
  o.pos = S.viewProj * vec4f(wp, 1.0);
  o.uv = uv; o.n = rotY(n); o.wp = wp; o.lp = lp; o.layer = li; o.face = u32(face + 0.5);
  o.depth01 = -p.y;
  return o;
}

@fragment fn fs(in: VOut) -> FragOut {
  let li = in.layer;
  let texel = 1.0 / f32(textureDimensions(matTex).x);
  let a = textureSample(albedoTex, samp, in.uv, li);
  let m = textureSample(matTex, samp, in.uv, li);
  let mx = textureSample(matTex, samp, in.uv + vec2f(texel * 1.5, 0.0), li);
  let mz = textureSample(matTex, samp, in.uv + vec2f(0.0, texel * 1.5), li);
  if (in.face != 1u && a.a < 0.5) { discard; }

  let v = normalize(S.camPos.xyz - in.wp);
  let focus = S.focus[li];
  let inner = li == 1u || li == 2u;

  var col = vec3f(0.0);
  if (in.face == 0u) {
    // a faint height field so pads and copper catch the glint; ink edges use the flat normal
    let hgt = vec3f(0.6, 0.35, 0.5);
    let h0 = dot(m.rgb, hgt); let hx = dot(mx.rgb, hgt); let hz = dot(mz.rgb, hgt);
    let n = rotY(normalize(vec3f(-(hx - h0) * 0.5, 1.0, -(hz - h0) * 0.5)));
    var metal = m.g;
    var rough = mix(0.5, 0.25, m.g);
    if (inner) { metal = max(metal, m.r * 0.6); }
    col = toon(a.rgb, n, v, metal, rough);
  } else if (in.face == 1u) {
    // plate edge: FR4 with a copper (inner) or soldermask (outer) skin; the focused layer
    // gets its edge painted in its colour
    let skin = select(vec3f(0.11, 0.26, 0.11), vec3f(0.78, 0.33, 0.13), inner);
    let edge = mix(vec3f(0.62, 0.47, 0.2), skin, select(0.0, 1.0, in.depth01 < 0.2));
    col = toon(mix(edge, S.accents[li].rgb, focus * 0.85), normalize(in.n), v, 0.0, 0.8);
  } else {
    col = vec3f(0.3, 0.24, 0.12);
  }
  var o: FragOut;
  o.color = finish(mix(paper(), col, S.dim[li]));
  o.g = gbuf(select(in.n, vec3f(0.0, 1.0, 0.0), in.face == 0u), in.wp, f32(li) * 0.211 + 0.07);
  return o;
}
`;

const BOX_WGSL = SCENE_WGSL + /* wgsl */ `
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) n: vec3f,
  @location(1) wp: vec3f,
  @location(2) col: vec4f,
  @location(3) mat: vec4f,
  @location(4) @interpolate(flat) layer: u32,
  @location(5) @interpolate(flat) id: f32,
};

@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f,
              @location(2) ipos: vec4f, @location(3) isize: vec4f,
              @location(4) icol: vec4f, @location(5) imat: vec4f,
              @builtin(instance_index) ii: u32) -> VOut {
  var o: VOut;
  let lp = p * isize.xyz;
  let c = cos(ipos.w); let s = sin(ipos.w);
  let rp = vec3f(lp.x * c + lp.z * s, lp.y, -lp.x * s + lp.z * c);
  let li = u32(isize.w + 0.5);
  let wp = toWorld(vec3f(ipos.x, S.layerY[li] + ipos.y, ipos.z) + rp);
  o.pos = S.viewProj * vec4f(wp, 1.0);
  o.n = rotY(vec3f(n.x * c + n.z * s, n.y, -n.x * s + n.z * c));
  o.wp = wp; o.col = icol; o.mat = imat; o.layer = li;
  o.id = fract(f32(ii) * 0.6180339 + 0.31);
  return o;
}

@fragment fn fs(in: VOut) -> FragOut {
  let v = normalize(S.camPos.xyz - in.wp);
  let li = in.layer;
  var base = in.col.rgb;
  if (in.mat.z > 0.5) {
    // status LED: a slow heartbeat between off and lit, in flat colour
    let t = fract(S.clock[3] * 0.6);
    let still = S.motion.x < 0.5 || NODE.look.w > 0.0;
    let beat = select(exp(-t * 18.0) + 0.6 * exp(-max(t - 0.18, 0.0) * 18.0) * step(0.18, t), 1.0, still);
    base = mix(base, S.accents[3].rgb * 1.2 + vec3f(0.15), clamp(beat, 0.0, 1.0));
  }
  let col = toon(base, normalize(in.n), v, in.mat.y, in.mat.x);
  var o: FragOut;
  o.color = finish(mix(paper(), col, S.dim[li]));
  o.g = gbuf(in.n, in.wp, in.id);
  return o;
}
`;

const PULSE_WGSL = SCENE_WGSL + /* wgsl */ `
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) seg: vec4f,   // length, half width, d0, d1
  @location(2) @interpolate(flat) layer: u32,
};

@vertex fn vs(@builtin(vertex_index) vi: u32, @location(0) ab: vec4f, @location(1) prm: vec4f) -> VOut {
  var corners = array<vec2f, 6>(vec2f(0.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
                                vec2f(0.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let a = ab.xy; let b = ab.zw;
  let d = b - a; let L = length(d);
  let dir = select(vec2f(1.0, 0.0), d / max(L, 1e-6), L > 1e-6);
  let nrm = vec2f(-dir.y, dir.x);
  let r = prm.x * 0.5 + 0.05;
  let c = corners[vi];
  let along = mix(-r, L + r, c.x);
  let across = c.y * r;
  let p = a + dir * along + nrm * across;
  let li = u32(prm.w + 0.5);
  var o: VOut;
  o.pos = S.viewProj * vec4f(toWorld(vec3f(p.x, S.layerY[li] + 0.015, p.y)), 1.0);
  o.local = vec2f(along, across);
  o.seg = vec4f(L, prm.x * 0.5, prm.y, prm.z);
  o.layer = li;
  return o;
}

@fragment fn fs(in: VOut) -> FragOut {
  let L = in.seg.x; let hw = in.seg.y;
  let t = clamp(in.local.x, 0.0, L);
  let dist = length(vec2f(in.local.x - t, in.local.y));
  let core = 1.0 - smoothstep(hw * 0.55, hw * 0.75, dist);
  if (core <= 0.001) { discard; }
  let dd = mix(in.seg.z, in.seg.w, t / max(L, 1e-4));
  let period = S.params.w;
  let u = fract(dd / period - S.clock[in.layer] * S.params2.x / period);
  let dash = smoothstep(0.76, 0.78, u) * smoothstep(1.0, 0.98, u);
  // the focused layer shows its signals; the top layer keeps a few going at rest
  let focus = S.focus[in.layer];
  let rest = select(0.0, 0.55, in.layer == 3u) * clamp((S.dim[in.layer] - 0.5) * 2.0, 0.0, 1.0);
  let a = dash * core * max(focus, rest) * NODE.look.y * (1.0 - NODE.look.w);
  // the top layer's signals take the colour of the hovered project
  let col = select(S.accents[in.layer].rgb, S.params2.yzw, in.layer == 3u);
  var o: FragOut;
  o.color = vec4f(col * a, a);
  o.g = vec4f(0.0);
  return o;
}
`;

// exploded-view guide lines: dashed ink through the mounting holes, from the bottom plate up
const GUIDE_WGSL = SCENE_WGSL + /* wgsl */ `
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) q: vec2f,
  @location(1) y: f32,
};

@vertex fn vs(@builtin(vertex_index) vi: u32, @location(0) hole: vec4f) -> VOut {
  var corners = array<vec2f, 6>(vec2f(-1.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
                                vec2f(-1.0, 0.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let c = corners[vi];
  let y = mix(S.layerY[0] - S.params.z, S.layerY[3], c.y);
  let base = toWorld(vec3f(hole.x, 0.0, hole.y));
  let toCam = S.camPos.xyz - base;
  let right = normalize(vec3f(toCam.z, 0.0, -toCam.x));
  var o: VOut;
  o.pos = S.viewProj * vec4f(base + right * c.x * 0.13 + vec3f(0.0, y, 0.0), 1.0);
  o.q = c;
  o.y = y;
  return o;
}

@fragment fn fs(in: VOut) -> FragOut {
  let dash = step(0.42, fract(in.y / 1.3));
  let a = dash * 0.5 * smoothstep(0.35, 0.8, S.params.y) * (1.0 - smoothstep(0.6, 1.0, abs(in.q.x)));
  var o: FragOut;
  o.color = vec4f(INK * a, a);
  o.g = vec4f(0.0);
  return o;
}
`;

// Hand-drawn marks in the scene: marker, crayon and highlighter strokes and crayon dots.
// Quads arrive with world-space corners built on the CPU; marks drawn on a plate lie flat on
// it, the rest turn to face the camera. They are depth-tested, so plates in front hide them.
const PAINT = { marker: 0, crayon: 1, highlighter: 2, dot: 3 };
const PAINT_WGSL = SCENE_WGSL + /* wgsl */ `
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) prm: vec4f,   // mode, alpha, d0, d1 (mm along the stroke)
  @location(2) @interpolate(flat) col: vec4f,   // rgb, seed
  @location(3) @interpolate(flat) ext: vec4f,   // width (mm), stroke length (mm), x-ray flag, layer clock
};

@vertex fn vs(@builtin(vertex_index) vi: u32,
              @location(0) c0: vec4f, @location(1) c1: vec4f, @location(2) c2: vec4f, @location(3) c3: vec4f,
              @location(4) col: vec4f, @location(5) ext: vec4f) -> VOut {
  var uvs = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
                            vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  var p = c3.xyz;
  if (vi == 0u || vi == 3u) { p = c0.xyz; } else if (vi == 1u) { p = c1.xyz; } else if (vi == 2u || vi == 4u) { p = c2.xyz; }
  var o: VOut;
  o.pos = S.viewProj * vec4f(p, 1.0);
  o.uv = uvs[vi];
  o.prm = vec4f(c0.w, c1.w, c2.w, c3.w);
  o.col = col; o.ext = ext;
  return o;
}

fn pcg(x: u32) -> u32 {
  let v = x * 747796405u + 2891336453u;
  let w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return (w >> 22u) ^ w;
}
fn hash(p: vec2f) -> f32 {
  let q = vec2i(floor(p));
  return f32(pcg(bitcast<u32>(q.x) ^ pcg(bitcast<u32>(q.y)))) / 4294967295.0;
}
fn vnoise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x), mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x), u.y);
}

fn paint(in: VOut) -> vec4f {
  let mode = u32(in.prm.x + 0.5);
  let x = in.uv.y * 2.0 - 1.0;                    // across the stroke
  let along = mix(in.prm.z, in.prm.w, in.uv.x);
  let w = in.ext.x;
  let len = in.ext.y;
  let seed = in.col.w;
  let boil = floor(in.ext.w * 8.0);               // its layer's clock: redrawn 8 times a second while active
  // the ends narrow like a pen landing on and leaving the page
  let ends = max(smoothstep(0.0, w * 0.8, along) * smoothstep(0.0, w * 0.8, len - along), 0.3);
  var rgb = in.col.rgb;
  var a = 0.0;
  if (mode == 0u) {
    // marker: solid, a little streaky, ink pooling at the edges
    let edge = 1.0 - smoothstep(0.72, 1.0, abs(x) / ends);
    a = edge * (0.84 + 0.16 * vnoise(vec2f(along * 2.4, x * 2.0 + seed * 7.0)));
    rgb *= mix(1.0, 0.8, smoothstep(0.4, 0.9, abs(x)));
  } else if (mode == 1u) {
    // crayon: wax catches the tooth of the paper and skips
    let rag = 0.7 + 0.3 * vnoise(vec2f(along * 2.5, seed * 13.0 + boil));
    let body = 1.0 - smoothstep(rag - 0.15, rag, abs(x) / ends);
    let tooth = vnoise(vec2f(along / w * 7.0, x * 2.2) + vec2f(seed * 31.0 + boil * 3.7, boil))
              * 0.65 + hash(vec2f(along / w * 20.0, x * 6.0) + vec2f(boil * 17.0, seed * 5.0)) * 0.35;
    a = body * smoothstep(0.18, 0.42, tooth);
  } else if (mode == 2u) {
    // highlighter: flat, translucent, square-ish ends
    a = (1.0 - smoothstep(0.86, 1.0, abs(x))) * 0.42
      * smoothstep(0.0, w * 0.25, along) * smoothstep(0.0, w * 0.25, len - along);
  } else {
    // crayon dot
    let r = length(in.uv * 2.0 - 1.0);
    a = (1.0 - smoothstep(0.66, 1.0, r)) * smoothstep(0.18, 0.42, vnoise(in.uv * 5.0 + vec2f(seed * 17.0 + boil, boil)));
  }
  a *= in.prm.y;
  return vec4f(rgb * a, a);
}

@fragment fn fs(in: VOut) -> FragOut {
  var o: FragOut;
  o.color = paint(in);
  o.g = vec4f(0.0);
  return o;
}

// hidden lines: where a stroke flagged in ext.z passes behind a plate it shows dashed and lighter,
// as a technical drawing would
@fragment fn fsHidden(in: VOut) -> FragOut {
  if (in.ext.z < 0.5) { discard; }
  let along = mix(in.prm.z, in.prm.w, in.uv.x);
  let dash = step(0.5, fract(along / (in.ext.x * 2.4)));
  var o: FragOut;
  o.color = paint(in) * 0.45 * dash;
  o.g = vec4f(0.0);
  return o;
}
`;

const FULLSCREEN_VS = /* wgsl */ `
struct FsOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> FsOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: FsOut;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  o.uv = vec2f(p.x, 1.0 - p.y);
  return o;
}
`;

const MIP_WGSL = FULLSCREEN_VS + /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
@fragment fn fs(in: FsOut) -> @location(0) vec4f { return textureSample(src, smp, in.uv); }
`;

// Ink pass over the flat-shaded scene, front board only: fine lines where depth folds, normals
// turn or one surface meets another, and a heavy brush line round the board's whole silhouette.
// The boards in the distance get no ink. The canvas is transparent, so the page shows through.
const COMPOSITE_WGSL = FULLSCREEN_VS + /* wgsl */ `
@group(0) @binding(0) var sceneTex: texture_2d<f32>;
@group(0) @binding(1) var gTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> P: vec4f; // fine ink radius (px), brush half-width (px), -, -

const INK = vec3f(0.016, 0.014, 0.013);

fn unoct(e: vec2f) -> vec3f {
  var n = vec3f(e, 1.0 - abs(e.x) - abs(e.y));
  let t = max(-n.z, 0.0);
  n.x += select(t, -t, n.x >= 0.0);
  n.y += select(t, -t, n.y >= 0.0);
  return normalize(n);
}
fn G(p: vec2i) -> vec4f {
  return textureLoad(gTex, clamp(p, vec2i(0), vec2i(textureDimensions(gTex)) - 1), 0);
}
fn front(g: vec4f) -> bool { return g.z > 0.0 && g.w > 0.0; }
fn frontAt(p: vec2i) -> bool { return front(G(p)); }
fn encode(c: f32) -> f32 {
  return select(1.055 * pow(c, 1.0 / 2.4) - 0.055, c * 12.92, c <= 0.0031308);
}
fn pcg(x: u32) -> u32 {
  let v = x * 747796405u + 2891336453u;
  let w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return (w >> 22u) ^ w;
}
fn hash(p: vec2f) -> f32 {
  let q = vec2i(floor(p));
  return f32(pcg(bitcast<u32>(q.x) ^ pcg(bitcast<u32>(q.y)))) / 4294967295.0;
}
fn vnoise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x), mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x), u.y);
}

const DIRS = array<vec2f, 16>(
  vec2f(1.0, 0.0), vec2f(0.924, 0.383), vec2f(0.707, 0.707), vec2f(0.383, 0.924),
  vec2f(0.0, 1.0), vec2f(-0.383, 0.924), vec2f(-0.707, 0.707), vec2f(-0.924, 0.383),
  vec2f(-1.0, 0.0), vec2f(-0.924, -0.383), vec2f(-0.707, -0.707), vec2f(-0.383, -0.924),
  vec2f(0.0, -1.0), vec2f(0.383, -0.924), vec2f(0.707, -0.707), vec2f(0.924, -0.383));

@fragment fn fs(in: FsOut) -> @location(0) vec4f {
  let px = vec2i(in.pos.xy);
  let pf = in.pos.xy;
  let sc = textureLoad(sceneTex, px, 0);
  let c = G(px);
  let inside = front(c);

  // fine ink: creases and part edges inside the front board
  var e = 0.0;
  if (inside) {
    let r = i32(P.x);
    var nb = array<vec4f, 4>(G(px + vec2i(-r, 0)), G(px + vec2i(r, 0)), G(px + vec2i(0, -r)), G(px + vec2i(0, r)));
    let nc = unoct(c.xy);
    for (var k = 0; k < 2; k++) {
      let a = nb[k * 2];
      let b = nb[k * 2 + 1];
      if (front(a) && front(b)) {
        e = max(e, smoothstep(0.004, 0.012, abs(a.z + b.z - 2.0 * c.z) / min(c.z, min(a.z, b.z))));
      }
    }
    for (var k = 0; k < 4; k++) {
      let g = nb[k];
      if (front(g)) {
        e = max(e, smoothstep(0.82, 0.6, dot(nc, unoct(g.xy))));
        e = max(e, step(0.004, abs(c.w - g.w)));
      }
    }
  }

  // the brush: distance to the silhouette, a width that swells and thins along it, and dry
  // streaks running with the stroke toward its outer edge
  let W = P.y;
  let R = i32(ceil(W * 1.6));
  var near = false;
  for (var k = 0; k < 16; k += 2) {
    if (frontAt(px + vec2i(round(DIRS[k] * f32(R)))) != inside) { near = true; }
  }
  var brush = 0.0;
  if (near || inside != frontAt(px + vec2i(1, 0)) || inside != frontAt(px + vec2i(0, 1))) {
    var d = f32(R) + 1.0;
    var nrm = vec2f(0.0);
    for (var rr = 1; rr <= R; rr++) {
      var hit = false;
      for (var k = 0; k < 16; k++) {
        if (frontAt(px + vec2i(round(DIRS[k] * f32(rr)))) != inside) { hit = true; nrm += DIRS[k]; }
      }
      if (hit) { d = f32(rr) - 0.5; break; }
    }
    let wv = W * (0.5 + 0.95 * (vnoise(pf / (W * 18.0)) * 0.7 + vnoise(pf / (W * 5.0) + 11.0) * 0.3));
    let lim = select(wv, wv * 0.4, inside);   // the brush mostly rides outside the board
    brush = 1.0 - smoothstep(lim - 0.8, lim + 0.6, d);
    let n = normalize(nrm + vec2f(1e-4, 0.0));
    let t = vec2f(-n.y, n.x);
    let q = vec2f(dot(pf, t) / (W * 7.0), dot(pf, n) / (W * 0.42));
    let streak = vnoise(q) * 0.7 + vnoise(q * 2.3 + 7.0) * 0.3;
    brush *= mix(1.0, smoothstep(0.2, 0.48, streak), smoothstep(lim * 0.3, lim, d) * select(1.0, 0.0, inside));
  }

  let k = max(e, brush);
  let rgb = sc.rgb * (1.0 - k) + INK * k;
  let a = sc.a * (1.0 - k) + k;
  if (a <= 0.0) { return vec4f(0.0); }
  let u = rgb / a;
  return vec4f(vec3f(encode(u.r), encode(u.g), encode(u.b)) * a, a);
}
`;

// ---------------------------------------------------------------------------
// geometry builders

function buildSlab(board, segsPerCorner = 8) {
  const hw = board.w / 2, hh = board.h / 2, r = board.r;
  const outline = [];
  const corners = [
    [hw - r, -hh + r, -Math.PI / 2], // back-right (board top-right)
    [hw - r, hh - r, 0],
    [-hw + r, hh - r, Math.PI / 2],
    [-hw + r, -hh + r, Math.PI],
  ];
  for (const [cx, cz, a0] of corners)
    for (let i = 0; i <= segsPerCorner; i++) {
      const a = a0 + (i / segsPerCorner) * (Math.PI / 2);
      outline.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  const v = [];
  const push = (x, y, z, nx, ny, nz, u, w, f) => v.push(x, y, z, nx, ny, nz, u, w, f);
  const quad = (p) => { for (const i of [0, 1, 2, 0, 2, 3]) push(...p[i]); };
  // top (face 0) and bottom (face 2) cover the whole rectangle; the texture alpha trims them
  quad([[-hw, 0, -hh, 0, 1, 0, 0, 0, 0], [hw, 0, -hh, 0, 1, 0, 1, 0, 0], [hw, 0, hh, 0, 1, 0, 1, 1, 0], [-hw, 0, hh, 0, 1, 0, 0, 1, 0]]);
  quad([[-hw, -1, -hh, 0, -1, 0, 0, 0, 2], [hw, -1, -hh, 0, -1, 0, 1, 0, 2], [hw, -1, hh, 0, -1, 0, 1, 1, 2], [-hw, -1, hh, 0, -1, 0, 0, 1, 2]]);
  for (let i = 0; i < outline.length; i++) {
    const [x0, z0] = outline[i];
    const [x1, z1] = outline[(i + 1) % outline.length];
    const dx = x1 - x0, dz = z1 - z0;
    const l = Math.hypot(dx, dz) || 1;
    const nx = dz / l, nz = -dx / l;
    quad([[x0, 0, z0, nx, 0, nz, 0, 0, 1], [x1, 0, z1, nx, 0, nz, 0, 0, 1], [x1, -1, z1, nx, 0, nz, 0, 0, 1], [x0, -1, z0, nx, 0, nz, 0, 0, 1]]);
  }
  return new Float32Array(v);
}

function buildCube() {
  const v = [];
  const faces = [
    [[1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, 0, 1], [-1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  ];
  for (const [n, u, w] of faces) {
    const c = (su, sw) => [0, 1, 2].map((k) => n[k] * 0.5 + u[k] * su * 0.5 + w[k] * sw * 0.5);
    const p = [c(-1, -1), c(1, -1), c(1, 1), c(-1, 1)];
    for (const i of [0, 1, 2, 0, 2, 3]) v.push(p[i][0], p[i][1] + 0.5, p[i][2], ...n);
  }
  return new Float32Array(v);
}

function buildParts(data) {
  const C = (hex) => hexLinear(hex);
  const out = [];
  const half = data.board.w / 2;
  // x, z are board-space mm; y is height above the plate
  const box = (x, z, y, sx, sy, sz, rot, col, { rough = 0.5, metal = 0, emit = 0, blink = 0 } = {}) =>
    out.push(x - half, y, z - half, rot, sx, sy, sz, 3, col[0], col[1], col[2], emit, rough, metal, blink, 0);
  const local = (p, lx, ly) => {
    const a = (p.rot * Math.PI) / 180;
    return [p.x + lx * Math.cos(a) + ly * Math.sin(a), p.y - lx * Math.sin(a) + ly * Math.cos(a)];
  };
  const tin = C('#c9cbcc');
  const chip = (p, bodyCol, ht, opts = {}) => {
    const rot = (p.rot * Math.PI) / 180;
    const term = p.w * 0.22;
    box(p.x, p.y, 0, p.w - term * 2 + 0.02, ht, p.h * 0.98, rot, bodyCol, opts);
    for (const s of [-1, 1]) {
      const [x, z] = local(p, s * (p.w / 2 - term / 2), 0);
      box(x, z, 0, term, ht * 1.02, p.h, rot, tin, { rough: 0.3, metal: 1 });
    }
  };
  for (const p of data.parts) {
    const rot = (p.rot * Math.PI) / 180;
    switch (p.kind) {
      case 'cap': chip(p, C('#a88660'), Math.min(p.h * 0.95, 0.9), { rough: 0.55 }); break;
      case 'res': chip(p, C('#141414'), p.h * 0.7, { rough: 0.6 }); break;
      case 'fuse': chip(p, C('#1c1c1c'), p.h * 0.6, { rough: 0.6 }); break;
      case 'led':
        chip(p, C('#e8f4ff'), 0.6, { rough: 0.25, emit: 7, blink: 1 });
        break;
      case 'ind': box(p.x, p.y, 0, p.w, 1.0, p.h, rot, C('#4a4a4c'), { rough: 0.7 }); break;
      case 'xtal': box(p.x, p.y, 0, p.w, 0.7, p.h, rot, C('#c4c6c8'), { rough: 0.3, metal: 1 }); break;
      case 'button': {
        box(p.x, p.y, 0, p.w, 0.9, p.h, rot, C('#b8babc'), { rough: 0.35, metal: 1 });
        const s = Math.min(p.w, p.h) * 0.5;
        box(p.x, p.y, 0.9, s, 0.45, s, rot, C('#151515'), { rough: 0.4 });
        break;
      }
      case 'usbc': {
        box(p.x, p.y, 0, p.w, 3.2, p.h, rot, C('#cfd1d3'), { rough: 0.22, metal: 1 });
        const [x, z] = local(p, 0, p.h / 2);
        box(x, z, 0.6, p.w * 0.78, 2.0, 0.05, rot, C('#050505'), { rough: 0.9 });
        break;
      }
      case 'ic': {
        const big = p.w >= 10, lga = p.w >= 6 && !big;
        const ht = big ? 1.4 : lga ? 0.9 : 1.0;
        box(p.x, p.y, big ? 0.1 : 0, p.w, ht, p.h, rot, C(lga ? '#26282b' : '#1b1c1e'), { rough: 0.6 });
        for (const [lx, ly, w, h, a] of p.leads || []) {
          if (Math.abs(lx) + w / 2 <= p.w / 2 + 0.01 && Math.abs(ly) + h / 2 <= p.h / 2 + 0.01) continue;
          const [x, z] = local(p, lx, ly);
          const sx = w < h ? w * 0.6 : w * 0.95;
          const sz = h < w ? h * 0.6 : h * 0.95;
          box(x, z, 0, sx, 0.22, sz, rot + (a * Math.PI) / 180, tin, { rough: 0.3, metal: 1 });
        }
        break;
      }
    }
  }
  return new Float32Array(out);
}

function buildPulses(data, layerDefs) {
  const out = [];
  layerDefs.forEach((L, li) => {
    for (const [x1, y1, x2, y2, w, d0, d1] of data.tracks[L.cu] || []) {
      const h = data.board.w / 2;
      out.push(x1 - h, y1 - h, x2 - h, y2 - h, w, d0, d1, li);
    }
  });
  return new Float32Array(out);
}

// ---------------------------------------------------------------------------

export async function mountPcbHero(root, opts = {}) {
  const layerDefs = opts.layers || DEFAULT_LAYERS;
  const cfg = { ...CFG, ...(opts.config || {}) };
  root.classList.add('pcb-hero');

  const canvas = document.createElement('canvas');
  canvas.className = 'pcb-hero__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ink = document.createElement('canvas');
  ink.className = 'pcb-hero__ink';
  ink.setAttribute('aria-hidden', 'true');
  const ictx = ink.getContext('2d');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('pcb-hero__leaders');
  svg.setAttribute('aria-hidden', 'true');
  const list = document.createElement('ol');
  list.className = 'pcb-hero__labels';
  const labels = [];
  const leaders = [];
  for (let i = layerDefs.length - 1; i >= 0; i--) {
    const L = layerDefs[i];
    const li = document.createElement('li');
    li.className = 'pcb-hero__label';
    li.style.setProperty('--accent', L.accent);
    li.tabIndex = 0;
    li.innerHTML = `<span class="pcb-hero__cu">L${layerDefs.length - i} · ${L.cu}</span>
      <span class="pcb-hero__name">${L.name}</span>
      <span class="pcb-hero__text">${L.text}</span>`;
    list.appendChild(li);
    labels[i] = li;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.style.setProperty('--accent', L.accent);
    svg.appendChild(path);
    leaders[i] = path;
  }
  // callouts for the projects, the uplink and the cluster
  const extras = opts.extras || DEFAULT_EXTRAS;
  const tagBox = document.createElement('div');
  tagBox.className = 'pcb-hero__tags';
  tagBox.setAttribute('aria-hidden', 'true');
  const mkTag = (name, text, accent, mod = '') => {
    const el = document.createElement('div');
    el.className = `pcb-hero__tag ${mod}`;
    el.style.setProperty('--accent', accent);
    el.innerHTML = `<b class="pcb-hero__tag-name"></b>${text ? '<span class="pcb-hero__tag-text"></span>' : ''}`;
    el.firstChild.textContent = name;
    if (text) el.lastChild.textContent = text;
    tagBox.appendChild(el);
    return { el, vis: 0 };
  };
  // the top plate carries the apps, the one below it (the runtime) the cluster links
  const TOP = layerDefs.length - 1;
  const RUNTIME = Math.max(0, layerDefs.length - 2);
  const appAccent = layerDefs[TOP].accent;
  const runtimeAccent = layerDefs[RUNTIME].accent;
  const appTags = extras.apps.map((a) => mkTag(a.name, a.text, a.accent || appAccent, 'is-app'));
  const slotLayer = (sl) => { const i = layerDefs.findIndex((L) => L.cu === sl.layer); return i >= 0 ? i : RUNTIME; };
  // handwriting on the plates matches the marks: black on the middle layers, white on the outer ones
  const markClass = (li) => (LAYER_SOURCES[li]?.kind === 'outer' ? 'is-pen' : 'is-marker');
  const slotTags = (extras.slots || []).map((sl) => mkTag(sl.name, sl.text, sl.accent || layerDefs[slotLayer(sl)].accent, `is-slot ${markClass(slotLayer(sl))}`));
  // hoverable things: hovering one shows its callout and focuses its layer
  const items = [
    ...appTags.map((tag, i) => ({ tag, i, layer: TOP, sx: -1e9, sy: -1e9, r: 0 })),
    ...slotTags.map((tag, i) => ({ tag, i, layer: slotLayer(extras.slots[i]), sx: -1e9, sy: -1e9, r: 0 })),
  ];
  // logo art on the layers (LAYER_SOURCES runs bottom to top like layerDefs) with hover callouts
  const artItems = LAYER_SOURCES.flatMap((src, li) => (li < layerDefs.length ? src.art || [] : [])
    .filter((a) => a.callout)
    .map((a) => ({ ...a.callout, layer: li, tag: mkTag('', a.callout.text, layerDefs[li].accent, `is-art ${markClass(li)}`), sx: -1e9, sy: -1e9, r: 0 })));
  items.push(...artItems);
  items.forEach((it) => {
    it.tag.el.addEventListener('pointerenter', () => { state.hotTag = it; state.hover = true; });
    it.tag.el.addEventListener('pointerleave', () => { if (state.hotTag === it) state.hotTag = null; });
  });
  const uplinkTag = extras.uplink && mkTag(extras.uplink.name, extras.uplink.text, extras.uplink.accent || appAccent, 'is-uplink');
  const clusterTag = extras.cluster && mkTag(extras.cluster.name, extras.cluster.text, runtimeAccent, 'is-cluster is-marker');
  const nodeTags = (extras.cluster?.nodes || []).map((n) => mkTag(n, '', runtimeAccent, 'is-node is-marker'));
  root.append(canvas, ink, svg, list, tagBox);

  if (!navigator.gpu) return fail('WebGPU is not available in this browser.');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return fail('No WebGPU adapter.');
  const device = await adapter.requestDevice();

  const dataPromise = opts.data ? Promise.resolve(opts.data) : fetch(opts.dataUrl || new URL('./pcb.json', import.meta.url)).then((r) => r.json());
  const data = await dataPromise;

  // --- canvas: transparent, premultiplied over the page
  const ctx = canvas.getContext('webgpu');
  const outFormat = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format: outFormat, alphaMode: 'premultiplied' });

  // --- textures
  const pxPerMm = opts.pxPerMm || (devicePixelRatio > 1.5 ? 40 : 32);
  // logo files used as layer art are loaded up front; the canvases are drawn synchronously
  const artImages = new Map();
  await Promise.all(LAYER_SOURCES.flatMap((src) => src.art || []).filter((a) => a.image).map(async (a) => {
    const img = new Image();
    img.src = new URL(a.image, import.meta.url).href;
    try { await img.decode(); artImages.set(a.image, img); } catch (e) { console.warn('[pcb-hero] art failed to load', a.image); }
  }));
  // the handwriting, before the plates are drawn: some of it is written on them
  try { await document.fonts.load('700 16px Caveat'); } catch (e) { /* falls back to cursive */ }
  const { size: texSize, layers: canvases } = buildLayerCanvases(data, pxPerMm, artImages);
  const mipLevels = Math.floor(Math.log2(texSize)) + 1;
  const mkArray = (format) => device.createTexture({
    size: [texSize, texSize, 4], format, mipLevelCount: mipLevels,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const albedoTex = mkArray('rgba8unorm-srgb');
  const matTex = mkArray('rgba8unorm');
  canvases.forEach((c, i) => {
    device.queue.copyExternalImageToTexture({ source: c.albedo }, { texture: albedoTex, origin: [0, 0, i] }, [texSize, texSize]);
    device.queue.copyExternalImageToTexture({ source: c.mat }, { texture: matTex, origin: [0, 0, i] }, [texSize, texSize]);
  });
  const linearClamp = device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  generateMips(device, albedoTex, 'rgba8unorm-srgb', 4, mipLevels, linearClamp);
  generateMips(device, matTex, 'rgba8unorm', 4, mipLevels, linearClamp);
  // project stickers: the logo on a white die-cut with a hard shadow, drawn once
  const STICKER_PX = 192, STICKER_BODY = 0.84;
  const stickers = await Promise.all(extras.apps.map(async (a) => {
    const P = STICKER_PX, c = new OffscreenCanvas(P, P), g = c.getContext('2d');
    const body = P * STICKER_BODY, pad = (P - body) / 2, r = body * 0.24, off = P * 0.035;
    g.fillStyle = 'rgba(38, 34, 31, 0.3)';
    g.beginPath(); g.roundRect(pad + off, pad + off, body, body, r); g.fill();
    g.fillStyle = '#fffdf7';
    g.beginPath(); g.roundRect(pad, pad, body, body, r); g.fill();
    g.lineWidth = P * 0.02; g.strokeStyle = 'rgba(38, 34, 31, 0.6)'; g.stroke();
    const inner = body * 0.72;
    if (a.image) {
      const img = new Image();
      img.src = new URL(a.image, import.meta.url).href;
      try {
        await img.decode();
        const k = inner / Math.max(img.naturalWidth, img.naturalHeight);
        g.drawImage(img, (P - img.naturalWidth * k) / 2, (P - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
      } catch (e) { console.warn('[pcb-hero] logo failed to load', a.image); }
    } else if (a.logo) {
      // marks in the project's colour; knock-outs let the sticker show through
      const m = new OffscreenCanvas(P, P);
      drawLogo(m.getContext('2d'), a.logo, P / 2, P / 2, inner, { ink: a.accent || '#26221f', clear: null });
      g.drawImage(m, 0, 0);
    }
    return c;
  }));
  const aniso = device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 8, addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  // --- buffers
  const mkBuf = (arr, usage) => {
    const b = device.createBuffer({ size: Math.max(16, arr.byteLength), usage: usage | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(b, 0, arr);
    return b;
  };
  const slabVerts = buildSlab(data.board);
  const slabBuf = mkBuf(slabVerts, GPUBufferUsage.VERTEX);
  const cubeVerts = buildCube();
  const cubeBuf = mkBuf(cubeVerts, GPUBufferUsage.VERTEX);
  const partData = buildParts(data);
  const partBuf = mkBuf(partData, GPUBufferUsage.VERTEX);
  const pulseData = buildPulses(data, layerDefs);
  const pulseBuf = mkBuf(pulseData, GPUBufferUsage.VERTEX);
  const h = data.board.w / 2;
  // mounting holes carry the exploded-view guide lines
  const holeData = new Float32Array(data.holes.filter(([, , d]) => d >= 2).flatMap(([x, y, d, w]) => [x - h, y - h, d, w]));
  const holeBuf = mkBuf(holeData, GPUBufferUsage.VERTEX);
  const sceneUBO = device.createBuffer({ size: 272, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // the hero board is node 0; shadow nodes follow, one 256-byte slot each (dynamic offsets)
  const NODE_STRIDE = 256;
  const shadowNodes = cfg.nodes.slice(0, Math.max(0, extras.cluster?.nodes?.length ?? cfg.nodes.length));
  const nodeCount = 1 + shadowNodes.length;
  const nodeUBO = device.createBuffer({ size: NODE_STRIDE * nodeCount, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const MAX_PAINT = 4096;
  const PAINT_FLOATS = 24;
  const paintData = new Float32Array(MAX_PAINT * PAINT_FLOATS);
  const paintBuf = device.createBuffer({ size: paintData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

  // --- pipelines
  const SAMPLES = 4;
  const RT = 'rgba16float'; // scene colour and g-buffer
  // opaque surfaces write colour and the g-buffer; marks painted on top only blend colour
  const over = { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' };
  const sceneTargets = (painted) => painted
    ? [{ format: RT, blend: { color: over, alpha: over } }, { format: RT, writeMask: 0 }]
    : [{ format: RT }, { format: RT }];
  const sceneBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
    ],
  });
  const sceneBG = device.createBindGroup({
    layout: sceneBGL,
    entries: [
      { binding: 0, resource: { buffer: sceneUBO } },
      { binding: 1, resource: aniso },
      { binding: 2, resource: albedoTex.createView({ dimension: '2d-array' }) },
      { binding: 3, resource: matTex.createView({ dimension: '2d-array' }) },
    ],
  });
  const nodeBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { hasDynamicOffset: true, minBindingSize: 48 } }],
  });
  const nodeBG = device.createBindGroup({ layout: nodeBGL, entries: [{ binding: 0, resource: { buffer: nodeUBO, size: 48 } }] });
  const sceneLayout = device.createPipelineLayout({ bindGroupLayouts: [sceneBGL, nodeBGL] });
  const depthOpaque = { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' };
  const depthPaint = { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less-equal' };
  const ms = { count: SAMPLES };
  const mod = (code) => device.createShaderModule({ code });

  const slabMod = mod(SLAB_WGSL);
  const slabPipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: {
      module: slabMod, entryPoint: 'vs',
      buffers: [{ arrayStride: 36, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x2' },
        { shaderLocation: 3, offset: 32, format: 'float32' },
      ] }],
    },
    fragment: { module: slabMod, entryPoint: 'fs', targets: sceneTargets(false) },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: depthOpaque, multisample: ms,
  });
  const boxMod = mod(BOX_WGSL);
  const boxPipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: {
      module: boxMod, entryPoint: 'vs',
      buffers: [
        { arrayStride: 24, attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
        ] },
        { arrayStride: 64, stepMode: 'instance', attributes: [
          { shaderLocation: 2, offset: 0, format: 'float32x4' },
          { shaderLocation: 3, offset: 16, format: 'float32x4' },
          { shaderLocation: 4, offset: 32, format: 'float32x4' },
          { shaderLocation: 5, offset: 48, format: 'float32x4' },
        ] },
      ],
    },
    fragment: { module: boxMod, entryPoint: 'fs', targets: sceneTargets(false) },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: depthOpaque, multisample: ms,
  });
  const pulseMod = mod(PULSE_WGSL);
  const pulsePipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: {
      module: pulseMod, entryPoint: 'vs',
      buffers: [{ arrayStride: 32, stepMode: 'instance', attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x4' },
        { shaderLocation: 1, offset: 16, format: 'float32x4' },
      ] }],
    },
    fragment: { module: pulseMod, entryPoint: 'fs', targets: sceneTargets(true) },
    primitive: { topology: 'triangle-list' },
    depthStencil: depthPaint, multisample: ms,
  });
  const guideMod = mod(GUIDE_WGSL);
  const guidePipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: {
      module: guideMod, entryPoint: 'vs',
      buffers: [{ arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }],
    },
    fragment: { module: guideMod, entryPoint: 'fs', targets: sceneTargets(true) },
    primitive: { topology: 'triangle-list' },
    depthStencil: depthPaint, multisample: ms,
  });
  const paintMod = mod(PAINT_WGSL);
  const paintVertex = {
    module: paintMod, entryPoint: 'vs',
    buffers: [{ arrayStride: PAINT_FLOATS * 4, stepMode: 'instance', attributes: [0, 1, 2, 3, 4, 5].map((i) => (
      { shaderLocation: i, offset: i * 16, format: 'float32x4' })) }],
  };
  const paintPipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: paintVertex,
    fragment: { module: paintMod, entryPoint: 'fs', targets: sceneTargets(true) },
    primitive: { topology: 'triangle-list' },
    depthStencil: depthPaint, multisample: ms,
  });
  const paintHiddenPipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: paintVertex,
    fragment: { module: paintMod, entryPoint: 'fsHidden', targets: sceneTargets(true) },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'greater' }, multisample: ms,
  });
  const compMod = mod(COMPOSITE_WGSL);
  const compPipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: compMod, entryPoint: 'vs' },
    fragment: { module: compMod, entryPoint: 'fs', targets: [{ format: outFormat }] },
  });
  const compUBO = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // --- size-dependent targets
  let T = null;
  function makeTargets(w, hgt) {
    T?.destroy();
    const tex = (format, sampleCount = 1, extra = 0) => device.createTexture({
      size: [w, hgt], format, sampleCount, usage: GPUTextureUsage.RENDER_ATTACHMENT | extra,
    });
    const TB = GPUTextureUsage.TEXTURE_BINDING;
    const t = {
      msColor: tex(RT, SAMPLES), msG: tex(RT, SAMPLES), depth: tex('depth24plus', SAMPLES),
      color: tex(RT, 1, TB), g: tex(RT, 1, TB),
    };
    t.compBG = device.createBindGroup({ layout: compPipe.getBindGroupLayout(0), entries: [
      { binding: 0, resource: t.color.createView() },
      { binding: 1, resource: t.g.createView() },
      { binding: 2, resource: { buffer: compUBO } },
    ] });
    t.destroy = () => { for (const k of ['msColor', 'msG', 'depth', 'color', 'g']) t[k].destroy(); };
    return t;
  }

  // --- interaction state
  const N = layerDefs.length;
  const state = {
    hover: false, pointerFocus: -1, labelFocus: -1, candidate: -1, candidateSince: 0, hot: null, hotTag: null,
    y: [...Array(N)].map((_, i) => i * (cfg.slab + cfg.gapIdle)),
    focusW: new Array(N).fill(0), dim: new Array(N).fill(1), explode: 0,
    viewProj: null, invViewProj: null, cssW: 1, cssH: 1,
  };
  // reduced motion: time stops and transitions are instant
  // and frames are only drawn when something changes
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => { reduceMotion = e.matches; root.classList.toggle('is-still', reduceMotion); });
  root.classList.toggle('is-still', reduceMotion);
  const hotItem = () => state.hotTag || state.hot;
  const focusTarget = () => (state.labelFocus >= 0 ? state.labelFocus : hotItem() ? hotItem().layer : state.pointerFocus);
  const targetY = (i, focus, open) => i * (cfg.slab + (open ? cfg.gapOpen : cfg.gapIdle)) + (focus >= 0 && i > focus ? cfg.lift : 0);

  function pick(clientX, clientY) {
    if (!state.invViewProj) return -1;
    const r = canvas.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((clientY - r.top) / r.height) * 2;
    const o = xform(state.invViewProj, [nx, ny, 0]);
    const f = xform(state.invViewProj, [nx, ny, 1]);
    const d = v3.sub(f, o);
    const focus = focusTarget();
    for (let i = N - 1; i >= 0; i--) {
      const Y = targetY(i, focus, true);
      // test top face and the plate edge band so thin plates are still easy to hit
      for (const yy of [Y, Y - cfg.slab]) {
        const t = (yy - o[1]) / d[1];
        const x = o[0] + d[0] * t, z = o[2] + d[2] * t;
        if (Math.abs(x) <= h && Math.abs(z) <= h) return i;
      }
    }
    return -1;
  }

  root.addEventListener('pointerenter', () => { state.hover = true; });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return; // touch keeps its tapped focus
    state.hover = false; state.candidate = -1; state.pointerFocus = -1; state.hot = null;
  });
  function hitItem(clientX, clientY) {
    const r = root.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let best = null, bd = Infinity;
    for (const it of items) {
      if (!it.live) continue;
      const d = Math.hypot(x - it.sx, y - it.sy);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  canvas.addEventListener('pointermove', (e) => {
    state.hot = hitItem(e.clientX, e.clientY);
    const c = state.hot ? state.hot.layer : pick(e.clientX, e.clientY);
    if (c !== state.candidate) { state.candidate = c; state.candidateSince = performance.now(); }
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    state.hover = true;
    const hit = hitItem(e.clientX, e.clientY);
    state.hot = hit && hit !== state.hot ? hit : null;
    const c = state.hot ? state.hot.layer : pick(e.clientX, e.clientY);
    state.pointerFocus = state.hot ? c : c === state.pointerFocus ? -1 : c;
    state.candidate = state.pointerFocus; state.candidateSince = -1e9;
  });
  labels.forEach((el, i) => {
    el.addEventListener('pointerenter', () => { state.labelFocus = i; });
    el.addEventListener('pointerleave', () => { state.labelFocus = -1; });
    el.addEventListener('focus', () => { state.hover = true; state.labelFocus = i; });
    el.addEventListener('blur', () => { state.labelFocus = -1; state.hover = root.matches(':hover'); });
  });

  // --- resize
  let dpr = 1;
  const ro = new ResizeObserver(() => resize());
  ro.observe(root);
  function resize() {
    const r = root.getBoundingClientRect();
    state.cssW = Math.max(1, r.width); state.cssH = Math.max(1, r.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(state.cssW * dpr)), hh = Math.max(1, Math.round(state.cssH * dpr));
    if (canvas.width !== w || canvas.height !== hh || !T) {
      canvas.width = w; canvas.height = hh;
      ink.width = w; ink.height = hh;
      T = makeTargets(w, hh);
    }
  }
  resize();

  // --- camera
  function camera() {
    const W = state.cssW, H = state.cssH;
    const narrow = W < 720;
    const labelCol = narrow ? Math.min(W * 0.36, 200) : Math.min(cfg.labelColumn, W * 0.4);
    const aspect = W / H;
    const az = (cfg.azimuth * Math.PI) / 180, el = (cfg.elevation * Math.PI) / 180;
    const fov = (cfg.fov * Math.PI) / 180;
    const stackH = (N - 1) * (cfg.slab + cfg.gapOpen) + cfg.lift;
    const target = [0, stackH * 0.42, 0];
    // rough projected extents of the exploded stack
    const diag = data.board.w * (Math.cos(az) + Math.sin(az)) + 4;
    const vExt = data.board.w * (Math.cos(az) + Math.sin(az)) * Math.sin(el) + stackH * Math.cos(el) + 6;
    const tanV = Math.tan(fov / 2);
    const availAspect = (W - labelCol) / H;
    const dist = Math.max((vExt / 2) / tanV, (diag / 2) / (tanV * availAspect)) * (narrow ? 1.18 : 1.04);
    root.classList.toggle('is-narrow', narrow);
    const eye = [target[0] + Math.sin(az) * Math.cos(el) * dist, target[1] + Math.sin(el) * dist, target[2] + Math.cos(az) * Math.cos(el) * dist];
    const shift = -labelCol / W;
    const proj = perspective(fov, aspect, dist * 0.5, dist * 6, shift);
    const view = lookAt(eye, target, [0, 1, 0]);
    state.viewProj = mul(proj, view);
    state.invViewProj = invert(state.viewProj);
    state.eye = eye;
    state.camRight = [view[0], view[4], view[8]];
    state.camUp = [view[1], view[5], view[9]];
    state.labelCol = labelCol;
    state.dist = dist;
    const key = `${W}x${H}`;
    if (key !== state.nodesFor) { state.nodesFor = key; placeNodes(dist); }
  }

  // the hero board is node 0; shadow nodes are placed along the view rays through their
  // configured spots, so they stay in frame whatever the hero's aspect ratio
  const nodes = [{ x: 0, y: 0, z: 0, yaw: 0, look: [1, 1, 0, 0], t0: 0 }].concat(shadowNodes.map((n, i) => ({
    spec: n, x: 0, y: 0, z: 0, yaw: ((n.yaw || 0) * Math.PI) / 180, look: [1, cfg.shadowAlpha, 0, cfg.shadowFade], t0: 0.37 + i * 0.61,
  })));
  const haze = hexLinear(cfg.paper);
  function placeNodes(dist) {
    const stackMid = 1.5 * (cfg.slab + cfg.gapIdle);
    for (const n of nodes) {
      if (!n.spec) continue;
      const nx = n.spec.x * 2 - 1, ny = 1 - n.spec.y * 2;
      const dir = v3.norm(v3.sub(xform(state.invViewProj, [nx, ny, 1]), xform(state.invViewProj, [nx, ny, 0])));
      const p = add(state.eye, dir, n.spec.depth * dist);
      n.x = p[0]; n.y = p[1] - stackMid; n.z = p[2];
    }
    const buf = new Float32Array((NODE_STRIDE / 4) * nodeCount);
    nodes.forEach((n, i) => buf.set([n.x, n.y, n.z, n.yaw, ...n.look, ...haze, n.t0], i * (NODE_STRIDE / 4)));
    device.queue.writeBuffer(nodeUBO, 0, buf);
  }
  const nodeToWorld = (n, x, y, z) => {
    const c = Math.cos(n.yaw), s = Math.sin(n.yaw);
    return [x * c + z * s + n.x, y + n.y, -x * s + z * c + n.z];
  };
  // where a link leaves node n toward a world point: on the plate edge that faces it, slid
  // along that edge toward the target but kept clear of the corners. Returns point + normal.
  function edgeAnchor(n, toward, y) {
    const dx = toward[0] - n.x, dz = toward[2] - n.z;
    const c = Math.cos(n.yaw), s = Math.sin(n.yaw);
    const lx = dx * c - dz * s, lz = dx * s + dz * c; // inverse yaw
    const e = h - 0.3, maxSlide = e * 0.55;
    let px, pz, nx, nz;
    if (Math.abs(lx) >= Math.abs(lz)) {
      nx = Math.sign(lx); nz = 0; px = nx * e;
      pz = Math.max(-maxSlide, Math.min(maxSlide, (lz / Math.abs(lx)) * e * 0.6));
    } else {
      nz = Math.sign(lz); nx = 0; pz = nz * e;
      px = Math.max(-maxSlide, Math.min(maxSlide, (lx / Math.abs(lz)) * e * 0.6));
    }
    return { p: nodeToWorld(n, px, y, pz), n: [nx * c + nz * s, 0, -nx * s + nz * c] };
  }

  // --- where the annotations attach: apps, slots, the uplink and the cluster links
  const partTop = (p) => ({ usbc: 3.2, button: 1.35, ind: 1.0, xtal: 0.7 })[p.kind] ?? (p.kind === 'ic' ? (p.w >= 10 ? 1.5 : p.w >= 6 ? 0.9 : 1.0) : 0.6);
  const anchorOf = (spec) => {
    const p = spec.part && data.parts.find((q) => q.ref === spec.part);
    if (p) {
      const swap = Math.abs(Math.sin((p.rot * Math.PI) / 180)) > 0.5;
      return { x: p.x - h, z: p.y - h, w: swap ? p.h : p.w, d: swap ? p.w : p.h, top: partTop(p) };
    }
    const [x, y] = spec.at || [h, h];
    const [w, d] = spec.size || [6, 6];
    return { x: x - h, z: y - h, w, d, top: 0 };
  };
  // marks are drawn in the brand and layer colours taken a little toward the ink, to read on the board
  const inkLin = hexLinear(INK_HEX);
  const inkOf = (hex, k = 0.22) => hexLinear(hex).map((c, i) => c + (inkLin[i] - c) * k);
  const apps = extras.apps.map((a, i) => ({
    ...a, anchor: anchorOf(a), rgb: hexLinear(a.accent || appAccent), ink: inkOf(a.accent || appAccent, 0.12),
    tilt: (((i * 0.618) % 1) - 0.5) * 0.24,
  }));
  const uplink = extras.uplink && {
    ...extras.uplink, anchor: anchorOf(extras.uplink),
    up: inkOf(extras.uplink.accent || appAccent, 0.3), down: inkOf(extras.uplink.down || '#3aa86b', 0.3),
  };
  // marks on the middle layers are black marker and crayon; the bottom layer gets a white paint pen
  const isOuter = (i) => LAYER_SOURCES[i]?.kind === 'outer';
  const layerInk = layerDefs.map((L, i) => (isOuter(i) ? hexLinear(PAINT_PEN) : inkLin));
  const highlight = hexLinear(cfg.highlighter);
  const runtimeInk = inkLin;
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const hotW = items.map(() => 0);
  const vis = { apps: 0, uplink: 0, links: 0 };
  // world anchors for the callouts and the 2D ink layer
  const geo = { stickers: [], stickerScreen: [], beam: null, cloud: null, links: [], slots: [] };
  const slots = (extras.slots || []).map((sl) => ({ ...sl, layer: slotLayer(sl), anchor: anchorOf(sl), w: 0 }));
  function cubic(p0, p1, p2, p3, segs) {
    const out = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, u = 1 - t;
      out.push([0, 1, 2].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
    }
    return out;
  }
  const along = (pts, u) => {
    const x = Math.min(Math.max(u, 0), 1) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x));
    return add(pts[i], v3.sub(pts[i + 1], pts[i]), x - i);
  };

  // --- paint: hand-drawn marks, rebuilt every frame; their wobble is re-drawn cfg.boil times a second
  let paintN = 0;
  function paintQuad(c0, c1, c2, c3, mode, alpha, d0, d1, rgb, seed, ext) {
    if (paintN >= MAX_PAINT) return;
    const o = paintN++ * PAINT_FLOATS;
    paintData.set(c0, o); paintData[o + 3] = mode;
    paintData.set(c1, o + 4); paintData[o + 7] = alpha;
    paintData.set(c2, o + 8); paintData[o + 11] = d0;
    paintData.set(c3, o + 12); paintData[o + 15] = d1;
    paintData.set(rgb, o + 16); paintData[o + 19] = seed;
    paintData.set(ext, o + 20);
  }
  // a stroke through world points: `flat` strokes lie on a plate, the rest turn to the camera;
  // `even` keeps the width the same on screen however far away it runs; `xray` strokes show
  // dashed where something hides them
  function stroke(pts, rgb, { w = 0.42, mode = PAINT.marker, alpha = 1, flat = false, even = false, xray = false, seed = 0, layer = TOP } = {}) {
    if (alpha <= 0.004 || pts.length < 2) return;
    const n = pts.length;
    const ds = [0];
    for (let i = 1; i < n; i++) ds.push(ds[i - 1] + Math.hypot(...v3.sub(pts[i], pts[i - 1])));
    const sides = pts.map((p, i) => {
      const d = v3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]);
      const sd = flat ? [-d[2], 0, d[0]] : v3.cross(d, v3.sub(state.eye, p));
      const k = even ? Math.hypot(...v3.sub(p, state.eye)) / state.dist : 1;
      const l = (Math.hypot(...sd) || 1) / (w * k / 2);
      return [sd[0] / l, sd[1] / l, sd[2] / l];
    });
    for (let i = 0; i < n - 1; i++) {
      paintQuad(add(pts[i], sides[i], -1), add(pts[i + 1], sides[i + 1], -1), add(pts[i + 1], sides[i + 1]), add(pts[i], sides[i]),
        mode, alpha, ds[i], ds[i + 1], rgb, seed, [w, ds[n - 1], xray ? 1 : 0, clocks[layer]]);
    }
  }
  function dot(p, r, rgb, alpha, seed, layer) {
    if (alpha <= 0.004) return;
    const R = state.camRight, U = state.camUp;
    paintQuad(add(add(p, R, -r), U, -r), add(add(p, R, r), U, -r), add(add(p, R, r), U, r), add(add(p, R, -r), U, r),
      PAINT.dot, alpha, 0, 0, rgb, seed, [r * 2, r * 2, 0, clocks[layer]]);
  }
  // seeded randomness: the same marks for one boil frame of their layer, fresh ones on the next
  const rand = (key, layer = TOP) => {
    let t = (key * 7919 + Math.floor(clocks[layer] * cfg.boil) * 104729) | 0;
    return () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };
  // a quick loop around something on a plate; it runs on past where it started, as quick circles do
  function loop(cx, y, cz, rx, rz, rnd, turns = 1.12) {
    const a0 = rnd() * Math.PI * 2, p1 = rnd() * 6.3, p2 = rnd() * 6.3, tilt = (rnd() - 0.5) * 0.35;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const pts = [];
    for (let i = 0; i <= 44; i++) {
      const t = i / 44, a = a0 + t * turns * Math.PI * 2;
      const k = 1 + 0.045 * Math.sin(2 * a + p1) + 0.03 * Math.sin(3 * a + p2) + 0.08 * (t - 0.5);
      const x = Math.cos(a) * rx * k, z = Math.sin(a) * rz * k;
      pts.push([cx + x * ct - z * st, y, cz + x * st + z * ct]);
    }
    return pts;
  }
  // a sketched box on a plate: four strokes that each run a little past the corners
  function box(cx, y, cz, w, d, rnd) {
    const j = () => (rnd() - 0.5) * 0.35;
    const c = [[cx - w / 2 + j(), cz - d / 2 + j()], [cx + w / 2 + j(), cz - d / 2 + j()], [cx + w / 2 + j(), cz + d / 2 + j()], [cx - w / 2 + j(), cz + d / 2 + j()]];
    return c.map(([ax, az], i) => {
      const [bx, bz] = c[(i + 1) % 4];
      const L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L;
      const o0 = 0.3 + rnd() * 0.8, o1 = 0.3 + rnd() * 0.8, bow = (rnd() - 0.5) * 0.3;
      return [...Array(7)].map((_, k) => {
        const t = k / 6, s = -o0 + t * (L + o0 + o1), b = Math.sin(t * Math.PI) * bow;
        return [ax + ux * s - uz * b, y, az + uz * s + ux * b];
      });
    });
  }
  // a hand's tremor along a path (world mm), strongest mid-stroke
  function shake(pts, amp, rnd) {
    const p1 = rnd() * 6.3, p2 = rnd() * 6.3, p3 = rnd() * 6.3, f = 2 + rnd() * 2, n = pts.length - 1 || 1;
    return pts.map((p, i) => {
      const t = i / n, e = Math.sin(t * Math.PI) * amp;
      return [p[0] + Math.sin(t * f * 6.3 + p1) * e, p[1] + Math.sin(t * f * 5.1 + p2) * e, p[2] + Math.sin(t * f * 4.3 + p3) * e];
    });
  }
  function buildPaint(focus, k) {
    paintN = 0;
    const hot = hotItem();
    items.forEach((it, j) => { hotW[j] += ((hot === it ? 1 : 0) - hotW[j]) * k; });
    const ease = (key, target) => { vis[key] += (target - vis[key]) * k; return vis[key]; };
    const appI = ease('apps', focus === TOP ? 1 : focus < 0 ? 0.8 : 0.12);
    ease('uplink', focus === TOP ? 1 : focus < 0 ? 0.9 : 0.25);
    const linkI = ease('links', focus === RUNTIME ? 1 : focus < 0 ? 0.16 : 0.06);
    const R = state.camRight, U = state.camUp;
    const topY = state.y[TOP];
    const tTop = clocks[TOP], tRun = clocks[RUNTIME];

    // a couple of highlighter swipes through a footprint on a plate
    const swipe = (cx, y, cz, w, d, alpha, rnd, layer, seed) => {
      const long = w >= d, L = (long ? w : d) - 0.6, wd = long ? d : w;
      for (let q = 0; q < 2; q++) {
        const off = (q - 0.5) * wd * 0.42, wob = (rnd() - 0.5) * 0.5;
        const ends = long
          ? [[cx - L / 2, y, cz + off], [cx + L / 2, y, cz + off + wob]]
          : [[cx + off, y, cz - L / 2], [cx + off + wob, y, cz + L / 2]];
        stroke(ends, highlight, { w: wd * 0.5, mode: PAINT.highlighter, flat: true, alpha, seed, layer });
      }
    };

    // technology slots: a sketched box on their layer while it is in focus; hovering one
    // swipes a highlighter through it
    geo.slots = slots.map((sl, j) => {
      sl.w += ((focus === sl.layer ? 1 : 0) - sl.w) * k;
      const A = sl.anchor, hw = hotW[apps.length + j], rnd = rand(100 + j, sl.layer);
      const y = state.y[sl.layer] + 0.04;
      if (hw > 0.02) swipe(A.x, y, A.z, A.w, A.d, sl.w * hw, rnd, sl.layer, j);
      for (const side of box(A.x, y, A.z, A.w, A.d, rnd)) {
        stroke(side, layerInk[sl.layer], { w: 0.4, flat: true, alpha: sl.w, seed: j + 0.3, layer: sl.layer });
      }
      return [A.x, y, A.z];
    });
    // the layer art (Linux, U-Boot, Buildroot) is written on the plate; hovering highlights it
    artItems.forEach((it, j) => {
      const hw = hotW[apps.length + slots.length + j];
      if (hw > 0.02) {
        const s = it.size * 0.8;
        swipe(it.at[0] - h, state.y[it.layer] + 0.05, it.at[1] - h, s, s * 0.45, hw, rand(200 + j, it.layer), it.layer, j);
      }
    });

    // projects on the Application layer: a loop round the part, a sticker floating above it and
    // a marker line between them
    apps.forEach((app, i) => {
      const A = app.anchor, hw = hotW[i], rnd = rand(1 + i);
      const yb = topY + 0.05, rx = A.w / 2 + 1.1, rz = A.d / 2 + 1.1;
      stroke(loop(A.x, yb, A.z, rx, rz, rnd), app.ink, { w: 0.62 + hw * 0.2, flat: true, alpha: appI, seed: i });
      if (hw > 0.02) stroke(loop(A.x, yb, A.z, rx * 1.15, rz * 1.15, rnd, 1.04), app.ink, { w: 0.45, flat: true, alpha: appI * hw, seed: i + 0.5 });
      const C = [A.x, topY + (app.float ?? cfg.stickerHeight) + Math.sin(tTop * 1.1 + i * 2.1) * 0.3, A.z];
      geo.stickers[i] = C;
      const from = [A.x, topY + A.top + 0.3, A.z];
      const to = add(C, U, -cfg.stickerSize * 0.48);
      const mid = add(add(from, v3.sub(to, from), 0.5), R, (rnd() - 0.5) * 1.4);
      stroke(shake(cubic(from, mid, mid, to, 12), 0.1, rnd), app.ink, { w: 0.34, alpha: appI * 0.9, seed: i + 0.2 });
    });

    // NervesHub: the module gets a loop; the cloud and its puffs are drawn in 2D
    if (uplink) {
      const A = uplink.anchor;
      geo.beam = [A.x, topY + A.top + 0.05, A.z];
      stroke(loop(A.x, topY + 0.05, A.z, A.w / 2 + 1, A.d / 2 + 1, rand(300)), uplink.up, { w: 0.42, flat: true, alpha: vis.uplink, seed: 3 });
    }

    // Erlang distribution: black crayon from pads on the runtime plate out to the other boards,
    // rising through the gap under the plate above, with messages going both ways
    geo.links = [];
    const yMid = state.y[RUNTIME] - cfg.slab * 0.5;
    const yTop = state.y[RUNTIME] + 0.04;
    const rise = Math.min(6, Math.max(1, (state.y[TOP] - state.y[RUNTIME] - cfg.slab) * 0.55));
    const across = (p) => p[0] * R[0] + p[2] * R[2];
    const ports = cfg.ports.map(([x, z]) => [x - h, yTop, z - h]).sort((a, b) => across(a) - across(b));
    const byScreen = nodes.slice(1).map((n, i) => i + 1).sort((a, b) => across([nodes[a].x, 0, nodes[a].z]) - across([nodes[b].x, 0, nodes[b].z]));
    const run = { layer: RUNTIME };
    byScreen.forEach((ni, kk) => {
      const P = ports[Math.min(kk, ports.length - 1)], rnd = rand(400 + ni, RUNTIME);
      const Bq = edgeAnchor(nodes[ni], [0, 0, 0], yMid);
      const len = Math.hypot(Bq.p[0] - P[0], Bq.p[2] - P[2]);
      const pts = shake(cubic(P, add(P, [0, rise, 0]), add(add(Bq.p, Bq.n, len * 0.3), [0, len * 0.04, 0]), Bq.p, 40), 0.5, rnd);
      geo.links[ni - 1] = pts;
      stroke(pts, runtimeInk, { ...run, w: 0.4 + 0.4 * linkI, mode: PAINT.crayon, alpha: linkI, even: true, xray: true, seed: ni });
      stroke(loop(P[0], yTop, P[2], 1.3, 1.3, rnd), runtimeInk, { ...run, w: 0.4, flat: true, alpha: linkI, seed: ni + 0.4 });
      if (!reduceMotion && focus === RUNTIME) for (const [sp, off, dir] of [[0.16, 0, 1], [0.11, 0.5, -1]]) {
        const t = (tRun * sp + off + ni * 0.21) % 1, u = dir > 0 ? t : 1 - t;
        const p = along(pts, u);
        dot(p, 0.75 * Math.hypot(...v3.sub(p, state.eye)) / state.dist, runtimeInk, linkI * Math.min(1, Math.sin(u * Math.PI) * 3), 20 + ni, RUNTIME);
      }
    });
    for (let a = 1; a < nodes.length; a++)
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a], nb = nodes[b];
        const A = edgeAnchor(na, [nb.x, nb.y, nb.z], yMid), Bq = edgeAnchor(nb, [na.x, na.y, na.z], yMid);
        const len = Math.hypot(Bq.p[0] - A.p[0], Bq.p[2] - A.p[2]), lift = [0, len * 0.05, 0];
        const pts = cubic(A.p, add(add(A.p, A.n, len * 0.22), lift), add(add(Bq.p, Bq.n, len * 0.22), lift), Bq.p, 32);
        stroke(shake(pts, 0.8, rand(500 + a * 7 + b, RUNTIME)), runtimeInk, { ...run, w: 0.3 + 0.25 * linkI, mode: PAINT.crayon, alpha: linkI * 0.55, even: true, xray: true, seed: a * 3 + b });
      }
    device.queue.writeBuffer(paintBuf, 0, paintData, 0, paintN * PAINT_FLOATS);
  }

  function layoutTags(focus, k) {
    const W = state.cssW, H = state.cssH;
    // mode 'above': centred above the anchor; 'right' / 'left': beside it, vertically centred;
    // 'center': centred on it
    const place = (tag, target, x, y, mode, active = false) => {
      tag.vis += (target - tag.vis) * k;
      const s = tag.el.style;
      s.opacity = tag.vis.toFixed(3);
      s.visibility = tag.vis < 0.01 ? 'hidden' : 'visible';
      tag.el.classList.toggle('is-active', active);
      if (tag.vis < 0.01) return;
      const w = tag.el.offsetWidth, hh = tag.el.offsetHeight;
      let left = mode === 'above' || mode === 'center' ? x - w / 2 : mode === 'left' ? x - w : x;
      let top = mode === 'above' ? y - hh : y - hh / 2;
      left = Math.min(Math.max(6, left), W - w - 6);
      top = Math.min(Math.max(6, top), H - hh - 6);
      s.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    };
    const appVis = focus === TOP ? 1 : focus < 0 ? 0.85 : 0;
    const hot = hotItem();
    // project names sit on top of their stickers; the sticker is what you point at
    appTags.forEach((tag, i) => {
      const C = geo.stickers[i];
      const [x, y] = project(C);
      const [ex] = project(add(C, state.camRight, cfg.stickerSize / 2));
      const size = Math.abs(ex - x) * 2 * (1 + hotW[i] * 0.12);
      geo.stickerScreen[i] = { x, y, size };
      place(tag, appVis, x, y - size * 0.55, 'above', hot === items[i]);
      Object.assign(items[i], { sx: x, sy: y, r: size * 0.65, live: vis.apps > 0.3 });
    });
    slotTags.forEach((tag, j) => {
      const it = items[appTags.length + j];
      const [x, y] = project(geo.slots[j]);
      place(tag, focus === it.layer ? 1 : 0, x, y - 12, 'above', hot === it);
      Object.assign(it, { sx: x, sy: y, r: 26, live: focus === it.layer });
    });
    for (const it of artItems) {
      const p = [it.at[0] - h, state.y[it.layer] + 0.05, it.at[1] - h];
      const [x, y] = project(p);
      const [ex] = project(add(p, state.camRight, it.size / 2));
      const r = Math.abs(ex - x);
      place(it.tag, hot === it ? 1 : 0, x, y - r * 0.45, 'above', true);
      Object.assign(it, { sx: x, sy: y, r, live: focus === it.layer });
    }
    if (uplinkTag && geo.beam) {
      // NervesHub is a cloud near the top of the hero, straight above the module
      const by = project(geo.beam)[1];
      const w = uplinkTag.el.offsetWidth, hh = uplinkTag.el.offsetHeight;
      const cw = w + 40, ch = hh + 26;
      const cy = Math.max(ch / 2 + 16, Math.min(by - 120, 30 + ch / 2));
      const px = project(add(geo.beam, [0, heightAt(geo.beam, cy), 0]))[0];
      const cx = Math.min(Math.max(px, cw / 2 + 14), W - cw / 2 - 14);
      place(uplinkTag, focus === TOP ? 1 : focus < 0 ? 0.9 : 0.35, cx, cy, 'center', focus === TOP);
      // the puffs travel between the top of the module and the bottom of the cloud
      const [mx, my] = project(geo.beam);
      geo.cloud = { x: cx, y: cy, w: cw, h: ch, from: [mx, my - 8], to: [px, cy + ch * 0.45] };
    }
    const clusterVis = focus === RUNTIME ? 1 : 0;
    if (clusterTag && geo.links.length) {
      // on the link to the right-most node, where the mesh is most visible
      let best = null, bx = -Infinity;
      for (const pts of geo.links) {
        const end = project(pts[pts.length - 1]);
        if (pts && end[0] > bx) { bx = end[0]; best = pts; }
      }
      const [x, y] = project(best[best.length - 1]);
      place(clusterTag, clusterVis, x - 16, y - 24, 'left', true);
    }
    nodeTags.forEach((tag, i) => {
      const n = nodes[i + 1];
      if (!n) return;
      const [x, y] = project([n.x, n.y + state.y[TOP] + 4, n.z]);
      place(tag, clusterVis, x, y, 'above');
    });
  }

  // --- the 2D ink layer: stickers, the NervesHub cloud and a few scribbled words
  const css = (rgb) => `rgb(${rgb.map((c) => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055))).join(',')})`;
  function drawInk() {
    const W = state.cssW, H = state.cssH;
    ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ictx.clearRect(0, 0, W, H);
    if (uplink && geo.cloud && vis.uplink > 0.01) drawNervesHub(geo.cloud, vis.uplink, W);
    if (vis.apps > 0.01) apps.forEach((app, i) => {
      const sc = geo.stickerScreen[i];
      if (!sc || !stickers[i]) return;
      ictx.save();
      ictx.globalAlpha = Math.min(1, vis.apps * 1.2);
      ictx.translate(sc.x, sc.y);
      ictx.rotate(app.tilt * (1 - hotW[i] * 0.7));
      const s = sc.size / STICKER_BODY;
      ictx.drawImage(stickers[i], -s / 2, -s / 2, s, s);
      ictx.restore();
    });
  }

  // cel-shaded clouds: white orbs with a cool shade along their undersides, no outline
  const CLOUD_SHADE = '#d6e1e8';
  function cloudPath(orbs) {
    const p = new Path2D();
    for (const [x, y, r] of orbs) { p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2); }
    return p;
  }
  function fillCloud(orbs, lift) {
    const p = cloudPath(orbs);
    ictx.fillStyle = CLOUD_SHADE;
    ictx.fill(p);
    ictx.save();
    ictx.clip(p);
    ictx.translate(0, -lift);
    ictx.fillStyle = '#ffffff';
    ictx.fill(p);
    ictx.restore();
  }
  // NervesHub: a cloud whose orbs drift slowly, and small puffs going up (health) and down
  // (firmware) between it and the module. All of it moves on the top layer's clock.
  const MAIN_ORBS = [
    [-0.78, 0.32, 0.5], [-0.28, 0.42, 0.55], [0.28, 0.42, 0.55], [0.78, 0.32, 0.5],
    [-0.62, -0.12, 0.62], [-0.08, -0.3, 0.78], [0.5, -0.18, 0.66], [0.0, 0.08, 0.7],
  ];
  function drawNervesHub(c, alpha, W) {
    const t = clocks[TOP];
    ictx.save();
    ictx.globalAlpha = alpha;
    const hw = c.w / 2, hh = c.h / 2, unit = Math.min(hh * 1.25, hw * 0.55);
    const orbs = MAIN_ORBS.map(([x, y, r], i) => [
      c.x + x * hw + Math.sin(t * 0.33 + i * 1.7) * unit * 0.07,
      c.y + y * hh + Math.cos(t * 0.27 + i * 2.3) * unit * 0.06,
      r * unit * (1 + 0.04 * Math.sin(t * 0.41 + i)),
    ]);
    fillCloud(orbs, unit * 0.16);

    // puffs: three going up, two coming down, at their own pace
    const [x0, y0] = c.from, [x1, y1] = c.to;
    const lane = Math.max(10, unit * 0.32);
    const fontPx = W < 720 ? 13 : 16;
    ictx.font = `700 ${fontPx}px Caveat, cursive`;
    ictx.textBaseline = 'middle';
    const puff = (u, side, seed, label, rgb) => {
      const fade = Math.min(1, Math.sin(u * Math.PI) * 2.2);
      if (fade <= 0.02) return;
      const x = x0 + (x1 - x0) * u + side * lane + Math.sin(u * 7 + seed) * 3;
      const y = y0 + (y1 - y0) * u;
      const r = unit * (0.25 + 0.05 * Math.sin(seed * 3.1)) * (0.6 + 0.4 * fade);
      ictx.globalAlpha = alpha * fade;
      fillCloud([[x - r * 0.9, y + r * 0.2, r * 0.7], [x + r * 0.85, y + r * 0.25, r * 0.65], [x, y - r * 0.15, r]], r * 0.22);
      if (label) {
        ictx.fillStyle = css(rgb);
        ictx.textAlign = side < 0 ? 'right' : 'left';
        ictx.fillText(label, x + side * (r * 1.9 + 3), y);
      }
    };
    for (let q = 0; q < 3; q++) puff((t * 0.07 + q / 3) % 1, -1, q, q % 2 === 0 ? 'health' : '', uplink.up);
    for (let q = 0; q < 2; q++) puff(1 - ((t * 0.05 + q / 2 + 0.25) % 1), 1, q + 5, q === 0 ? 'firmware' : '', uplink.down);
    ictx.restore();
  }

  // --- frame
  const accents = layerDefs.map((L) => hexLinear(L.accent));
  const sceneData = new Float32Array(68);
  // one clock per layer; only the active layer's runs, so only it animates
  const clocks = new Array(N).fill(0);
  let last = performance.now();
  let time = 0;
  let running = true;
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(root);

  let lastSig = '', settle = 0;
  function frame(now) {
    if (!running || !visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduceMotion) time += dt;
    if (reduceMotion) {
      // nothing moves on its own, so redraw only after input, resizes or hover changes
      const hot = hotItem();
      const sig = [focusTarget(), state.hover, state.candidate, hot ? items.indexOf(hot) : -1, state.cssW, state.cssH].join();
      if (sig !== lastSig) { lastSig = sig; settle = 3; }
      if (settle-- <= 0) { requestAnimationFrame(frame); return; }
    }

    if (state.candidate !== state.pointerFocus) {
      const wait = state.candidate === -1 ? 260 : 90;
      if (now - state.candidateSince > wait) state.pointerFocus = state.candidate;
    }
    const focus = focusTarget();
    const open = state.hover || focus >= 0;
    if (!reduceMotion) clocks[focus >= 0 ? focus : TOP] += dt;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
    for (let i = 0; i < N; i++) {
      state.y[i] += (targetY(i, focus, open) - state.y[i]) * k;
      state.focusW[i] += ((focus === i ? 1 : 0) - state.focusW[i]) * k;
      state.dim[i] += ((focus < 0 || focus === i ? 1 : 0.42) - state.dim[i]) * k;
    }
    state.explode += ((open ? 1 : 0.25) - state.explode) * k;
    camera();
    buildPaint(focus, k);

    sceneData.set(state.viewProj, 0);
    sceneData.set([...state.eye, 1], 16);
    sceneData.set(v3.norm([-0.45, 1.0, -0.25]).concat(0), 20);
    sceneData.set(state.y, 24);
    sceneData.set(state.focusW, 28);
    sceneData.set(state.dim, 32);
    sceneData.set([time, state.explode, cfg.slab, cfg.pulsePeriod], 36);
    let tint = accents[TOP];
    apps.forEach((app, j) => { if (hotW[j] > 0.001) tint = tint.map((c, k) => c + (app.rgb[k] - c) * hotW[j]); });
    sceneData.set([cfg.pulseSpeed, ...tint], 40);
    accents.forEach((a, i) => sceneData.set([...a, 1], 44 + i * 4));
    sceneData[60] = reduceMotion ? 0 : 1; // Scene.motion follows the four accents
    sceneData.set(clocks, 64);           // then Scene.clock
    device.queue.writeBuffer(sceneUBO, 0, sceneData);
    // the brush line narrows a little on small heroes, where the board is small too
    const brush = cfg.brush * dpr * Math.min(1, Math.max(0.6, state.cssW / 1100));
    device.queue.writeBuffer(compUBO, 0, new Float32Array([Math.max(1, Math.round(cfg.ink * dpr * 0.5)), brush, 0, 0]));

    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: T.msColor.createView(), resolveTarget: T.color.createView(), clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'discard' },
        { view: T.msG.createView(), resolveTarget: T.g.createView(), clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'discard' },
      ],
      depthStencilAttachment: { view: T.depth.createView(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    pass.setBindGroup(0, sceneBG);
    // hero board first so the shadow nodes behind it fail the depth test early
    for (let n = 0; n < nodeCount; n++) {
      pass.setBindGroup(1, nodeBG, [n * NODE_STRIDE]);
      pass.setPipeline(slabPipe);
      pass.setVertexBuffer(0, slabBuf);
      pass.draw(slabVerts.length / 9, N);
      pass.setPipeline(boxPipe);
      pass.setVertexBuffer(0, cubeBuf);
      pass.setVertexBuffer(1, partBuf);
      pass.draw(36, partData.length / 16);
    }
    pass.setBindGroup(1, nodeBG, [0]);
    pass.setPipeline(pulsePipe);
    pass.setVertexBuffer(0, pulseBuf);
    pass.draw(6, pulseData.length / 8);
    pass.setPipeline(guidePipe);
    pass.setVertexBuffer(0, holeBuf);
    pass.draw(6, holeData.length / 4);
    if (paintN) {
      pass.setVertexBuffer(0, paintBuf);
      pass.setPipeline(paintHiddenPipe);
      pass.draw(6, paintN);
      pass.setPipeline(paintPipe);
      pass.draw(6, paintN);
    }
    pass.end();

    const cp = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
    cp.setPipeline(compPipe);
    cp.setBindGroup(0, T.compBG);
    cp.draw(3);
    cp.end();
    device.queue.submit([enc.finish()]);

    layoutLabels(focus);
    layoutTags(focus, k);
    drawInk();
    requestAnimationFrame(frame);
  }

  // how far above a point you have to go for it to land at screen height sy
  function heightAt(p, sy) {
    let lo = 0, hi = 600;
    for (let i = 0; i < 26; i++) {
      const m = (lo + hi) / 2;
      if (project(add(p, [0, m, 0]))[1] > sy) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }

  function project(p) {
    const c = xform(state.viewProj, p);
    return [(c[0] * 0.5 + 0.5) * state.cssW, (0.5 - c[1] * 0.5) * state.cssH];
  }

  function layoutLabels(focus) {
    const W = state.cssW, H = state.cssH;
    // the plate corner that sits furthest right on screen
    const inset = data.board.r * 0.3;
    const corners = [[h - inset, -h + inset], [h - inset, h - inset], [-h + inset, h - inset], [-h + inset, -h + inset]];
    let best = corners[0], bx = -Infinity;
    for (const c of corners) { const [sx] = project([c[0], state.y[0], c[1]]); if (sx > bx) { bx = sx; best = c; } }
    const anchors = state.y.map((y) => project([best[0], y - cfg.slab * 0.5, best[1]]));
    const colX = Math.max(...anchors.map((a) => a[0])) + 28;
    const labelW = Math.min(state.labelCol - 36, 280);
    // stack labels top-to-bottom at their anchors, then push apart to avoid overlaps
    const heights = labels.map((el) => el.offsetHeight || 60);
    const ys = anchors.map((a, i) => a[1] - heights[i] * 0.3);
    const order = [...Array(N).keys()].sort((a, b) => ys[a] - ys[b]);
    const gap = 10;
    for (let pass = 0; pass < 4; pass++) {
      for (let j = 1; j < order.length; j++) {
        const a = order[j - 1], b = order[j];
        const minY = ys[a] + heights[a] + gap;
        if (ys[b] < minY) { const push = (minY - ys[b]) / 2; ys[a] -= push; ys[b] += push; }
      }
      ys[order[0]] = Math.max(8, ys[order[0]]);
      const lastI = order[order.length - 1];
      ys[lastI] = Math.min(H - heights[lastI] - 8, ys[lastI]);
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    for (let i = 0; i < N; i++) {
      const el = labels[i];
      el.style.width = `${labelW}px`;
      el.style.transform = `translate(${colX.toFixed(1)}px, ${ys[i].toFixed(1)}px)`;
      el.classList.toggle('is-active', focus === i);
      el.classList.toggle('is-dim', focus >= 0 && focus !== i);
      const [ax, ay] = anchors[i];
      const ly = ys[i] + 14;
      leaders[i].setAttribute('d', `M${ax.toFixed(1)},${ay.toFixed(1)} L${(ax + 10).toFixed(1)},${ay.toFixed(1)} L${(colX - 8).toFixed(1)},${ly.toFixed(1)} L${(colX - 2).toFixed(1)},${ly.toFixed(1)}`);
      leaders[i].classList.toggle('is-active', focus === i);
      leaders[i].classList.toggle('is-dim', focus >= 0 && focus !== i);
    }
  }

  requestAnimationFrame(frame);
  root.classList.add('is-ready');

  device.lost.then((info) => { running = false; if (info.reason !== 'destroyed') fail('GPU device lost.'); });

  function fail(msg) {
    root.classList.add('is-fallback');
    root.dataset.reason = msg;
    console.warn('[pcb-hero]', msg);
    return null;
  }

  return {
    destroy() { running = false; ro.disconnect(); T?.destroy(); device.destroy(); },
    setFocus(i) { state.labelFocus = i; },
  };
}

function generateMips(device, texture, format, layers, levels, sampler) {
  const module = device.createShaderModule({ code: MIP_WGSL });
  const pipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
  });
  const enc = device.createCommandEncoder();
  for (let layer = 0; layer < layers; layer++)
    for (let lvl = 1; lvl < levels; lvl++) {
      const src = texture.createView({ dimension: '2d', baseMipLevel: lvl - 1, mipLevelCount: 1, baseArrayLayer: layer, arrayLayerCount: 1 });
      const dst = texture.createView({ dimension: '2d', baseMipLevel: lvl, mipLevelCount: 1, baseArrayLayer: layer, arrayLayerCount: 1 });
      const bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: src }, { binding: 1, resource: sampler }] });
      const p = enc.beginRenderPass({ colorAttachments: [{ view: dst, loadOp: 'clear', storeOp: 'store' }] });
      p.setPipeline(pipe);
      p.setBindGroup(0, bg);
      p.draw(3);
      p.end();
    }
  device.queue.submit([enc.finish()]);
}
