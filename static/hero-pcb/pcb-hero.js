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
  // holograms over the Application layer: `logo` names a mark in logos.js drawn in the accent
  // colour, `image` a full-colour logo file. Accents are the projects' brand colours (Nx uses
  // the lighter tone of its logo to read on dark).
  apps: [
    { name: 'Phoenix', text: 'Web services', part: 'J1', logo: 'phoenix', accent: '#f05423' },
    { name: 'Membrane', text: 'Media processing and streaming', at: [37, 33], size: [7, 7], logo: 'membrane', accent: '#87cce8' },
    { name: 'Nx', text: 'Inference at the edge', part: 'U3', logo: 'nx', accent: '#b58491' },
    { name: 'BEAM Bots', text: 'Declarative robotics', at: [8.5, 24], size: [6, 7], image: 'logos/beam-bots.svg', accent: '#af4bf9' },
  ],
  // technology slots, on the layer named by its copper (board mm; size is x by y)
  slots: [
    { layer: 'In1.Cu', name: 'VintageNet', text: 'Networking APIs from Elixir', at: [9, 44], size: [9, 4.2] },
    { layer: 'In1.Cu', name: 'RingLogger', text: 'Flash-safe, memory-resilient logging', at: [20, 44], size: [9, 4.2] },
    { layer: 'In1.Cu', name: 'fwup', text: 'A/B updates and recovery', at: [31, 44], size: [9, 4.2] },
    { layer: 'In1.Cu', name: 'Nerves Heart', at: [44.5, 40], size: [4.2, 9] },
    { layer: 'In1.Cu', name: 'Watchdog', at: [44.5, 29.5], size: [4.2, 9] },
    { layer: 'In1.Cu', name: 'KV store', at: [44.5, 19], size: [4.2, 9] },
    { layer: 'In1.Cu', name: 'PubSub', at: [44.5, 9.5], size: [4.2, 9] },
    { layer: 'In2.Cu', name: 'SquashFS/EroFS', text: 'Read-only root filesystem', at: [8, 43], size: [9.5, 4.2] },
    { layer: 'In2.Cu', name: 'Data partition', text: 'Separate data and system', at: [18.5, 43], size: [9.5, 4.2] },
    { layer: 'In2.Cu', name: 'A/B partitions', text: 'Safe updates', at: [29, 43], size: [9.5, 4.2] },
    { layer: 'In2.Cu', name: 'Minimal OS', text: 'Small attack surface, low complexity', at: [39.5, 43], size: [9.5, 4.2] },
    { layer: 'B.Cu', name: 'Mix tooling', text: 'Integrates with standard Elixir tooling', at: [44.5, 29], size: [4.2, 10] },
    { layer: 'B.Cu', name: 'fwup', text: 'Builds firmware and updates devices', at: [44.5, 40.5], size: [4.2, 10] },
  ],
  uplink: { name: 'NervesHub', text: 'Over-the-air updates and fleet management', part: 'U5', accent: '#9fe8ff', down: '#4fd18b' },
  cluster: {
    name: 'Erlang distribution',
    text: 'Processes message each other across devices',
    nodes: ['nerves@nerves-4f2a.local', 'nerves@nerves-91c3.local', 'nerves@nerves-0b7e.local'],
  },
};

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
  bloom: 0.9,
  exposure: 1.0,
  holoHeight: 9,      // hologram tiles float this far above the top plate (mm)
  holoSize: 6.4,
  // shadow nodes of the cluster: x, y = where the node's centre lands in the hero (0..1),
  // depth = distance from the camera in multiples of the hero board's distance, yaw in degrees
  nodes: [
    { x: 0.13, y: 0.22, depth: 2.8, yaw: 18 },
    { x: 0.86, y: 0.2, depth: 3.0, yaw: -22 },
    { x: 0.33, y: 0.09, depth: 3.7, yaw: 36 },
  ],
  shadow: { light: 0.14, alpha: 0.8, emit: 0.45, haze: 0.55 },
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
};
@group(0) @binding(0) var<uniform> S: Scene;

// one board of the cluster: the hero board or a shadow node in the distance
struct Node {
  xf: vec4f,    // offset xyz, yaw (radians)
  look: vec4f,  // light, alpha, emission, haze amount
  haze: vec4f,  // haze rgb, time offset
};
@group(1) @binding(0) var<uniform> NODE: Node;

fn rotY(p: vec3f) -> vec3f {
  let c = cos(NODE.xf.w); let s = sin(NODE.xf.w);
  return vec3f(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
}
fn toWorld(p: vec3f) -> vec3f { return rotY(p) + NODE.xf.xyz; }
fn finish(col: vec3f, emit: vec3f) -> vec4f {
  let L = NODE.look;
  let c = mix(col * L.x + emit * L.z, NODE.haze.rgb, L.w);
  return vec4f(c * L.y, L.y);
}

fn env(r: vec3f) -> vec3f {
  let t = clamp(r.y * 0.5 + 0.5, 0.0, 1.0);
  var c = mix(vec3f(0.015, 0.02, 0.03), vec3f(0.30, 0.38, 0.48), smoothstep(0.3, 1.0, t));
  let sb = normalize(vec3f(-0.5, 0.75, -0.45));
  c += vec3f(1.3) * pow(max(dot(r, sb), 0.0), 60.0);
  return c;
}

fn shade(base: vec3f, n: vec3f, v: vec3f, metal: f32, rough: f32) -> vec3f {
  let l = normalize(S.lightDir.xyz);
  let h = normalize(l + v);
  let ndl = max(dot(n, l), 0.0);
  let ndv = max(dot(n, v), 1e-3);
  let f0 = mix(vec3f(0.04), base, metal);
  let fres = f0 + (vec3f(1.0) - f0) * pow(1.0 - ndv, 5.0);
  let shin = exp2(11.0 * (1.0 - rough) + 1.0);
  let lightCol = vec3f(1.7, 1.6, 1.5);
  let spec = fres * pow(max(dot(n, h), 0.0), shin) * (shin + 2.0) / 8.0 * ndl;
  let hemi = mix(vec3f(0.035, 0.04, 0.05), vec3f(0.22, 0.26, 0.32), n.y * 0.5 + 0.5);
  let diff = base * (1.0 - metal) * (ndl * lightCol + hemi);
  let refl = env(reflect(-v, n)) * fres * (1.0 - rough * 0.85);
  return diff + spec * lightCol + refl;
}

struct FragOut { @location(0) color: vec4f, @location(1) glow: vec4f };
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
  let dim = S.dim[li];
  let accent = S.accents[li].rgb;
  let inner = li == 1u || li == 2u;
  let t = S.params.x + NODE.haze.w;

  var col = vec3f(0.0);
  var emit = vec3f(0.0);
  if (in.face == 0u) {
    // height field: copper under mask, pads and silk are slightly raised
    let hgt = vec3f(0.6, 0.35, 0.5);
    let h0 = dot(m.rgb, hgt); let hx = dot(mx.rgb, hgt); let hz = dot(mz.rgb, hgt);
    let bump = select(1.4, 0.6, inner);
    let n = rotY(normalize(vec3f(-(hx - h0) * bump, 1.0, -(hz - h0) * bump)));
    var metal = m.g;
    var rough = mix(0.32, 0.2, m.g);
    if (inner) {
      metal = max(metal, m.r);
      rough = mix(0.7, 0.28, m.r);
    } else {
      rough = mix(rough, 0.85, m.b);
    }
    col = shade(a.rgb, n, v, metal, rough);
    if (inner) {
      emit = accent * (m.r * 0.06 + (1.0 - m.r) * (1.0 - m.g) * 0.015) * focus;
    } else {
      emit = accent * m.r * 0.05 * focus;
    }
    // logo art on the inner and bottom layers (B channel; on the top layer it is silkscreen)
    if (li != 3u) { emit += accent * m.b * 0.55 * focus; }
  } else if (in.face == 1u) {
    let base = select(vec3f(0.03, 0.07, 0.045), vec3f(0.16, 0.14, 0.07), inner);
    let cu = select(0.0, 1.0, in.depth01 < 0.14);
    col = shade(mix(base, vec3f(0.8, 0.45, 0.25), cu), normalize(in.n), v, cu, 0.5);
    emit = accent * (0.05 + focus * 2.2) * (0.35 + 0.65 * cu);
  } else {
    col = vec3f(0.01);
  }
  var o: FragOut;
  o.color = finish(col * dim, emit);
  o.glow = vec4f(0.0);
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
};

@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f,
              @location(2) ipos: vec4f, @location(3) isize: vec4f,
              @location(4) icol: vec4f, @location(5) imat: vec4f) -> VOut {
  var o: VOut;
  let lp = p * isize.xyz;
  let c = cos(ipos.w); let s = sin(ipos.w);
  let rp = vec3f(lp.x * c + lp.z * s, lp.y, -lp.x * s + lp.z * c);
  let li = u32(isize.w + 0.5);
  let wp = toWorld(vec3f(ipos.x, S.layerY[li] + ipos.y, ipos.z) + rp);
  o.pos = S.viewProj * vec4f(wp, 1.0);
  o.n = rotY(vec3f(n.x * c + n.z * s, n.y, -n.x * s + n.z * c));
  o.wp = wp; o.col = icol; o.mat = imat; o.layer = li;
  return o;
}

@fragment fn fs(in: VOut) -> FragOut {
  let v = normalize(S.camPos.xyz - in.wp);
  let li = in.layer;
  var col = shade(in.col.rgb, normalize(in.n), v, in.mat.y, in.mat.x) * S.dim[li];
  var e = in.col.a;
  if (in.mat.z > 0.5) {
    // status LED: slow heartbeat
    let t = fract((S.params.x + NODE.haze.w) * 0.6);
    e *= 0.25 + 0.75 * (exp(-t * 18.0) + 0.6 * exp(-max(t - 0.18, 0.0) * 18.0) * step(0.18, t));
  }
  var o: FragOut;
  o.color = finish(col, S.accents[3].rgb * e);
  o.glow = vec4f(0.0);
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
  let core = 1.0 - smoothstep(hw * 0.45, hw, dist);
  if (core <= 0.001) { discard; }
  let dd = mix(in.seg.z, in.seg.w, t / max(L, 1e-4));
  let period = S.params.w;
  let u = fract(dd / period - S.params.x * S.params2.x / period);
  let comet = pow(u, 9.0) * smoothstep(1.0, 0.985, u);
  let focus = S.focus[in.layer];
  let level = mix(0.12, 1.0, focus) * S.dim[in.layer];
  let I = (0.06 + comet * 7.0) * level * core * NODE.look.z;
  // the top layer's pulses take the colour of the hovered project
  let col = select(S.accents[in.layer].rgb, S.params2.yzw, in.layer == 3u);
  var o: FragOut;
  o.color = vec4f(0.0);
  o.glow = vec4f(col * I, 1.0);
  return o;
}
`;

const BEAM_WGSL = SCENE_WGSL + /* wgsl */ `
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) q: vec2f,          // across -1..1, height 0..1
  @location(1) @interpolate(flat) seed: f32,
};

@vertex fn vs(@builtin(vertex_index) vi: u32, @location(0) via: vec4f) -> VOut {
  var corners = array<vec2f, 6>(vec2f(-1.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
                                vec2f(-1.0, 0.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let c = corners[vi];
  let y0 = S.layerY[0] - S.params.z;
  let y1 = S.layerY[3];
  let base = toWorld(vec3f(via.x, 0.0, via.y));
  let toCam = S.camPos.xyz - base;
  let right = normalize(vec3f(toCam.z, 0.0, -toCam.x));
  let w = 0.32;
  let wp = base + right * c.x * w + vec3f(0.0, mix(y0, y1, c.y), 0.0);
  var o: VOut;
  o.pos = S.viewProj * vec4f(wp, 1.0);
  o.q = c;
  o.seed = fract(sin(via.x * 12.9898 + via.y * 78.233) * 43758.5453);
  return o;
}

@fragment fn fs(in: VOut) -> FragOut {
  let across = exp(-in.q.x * in.q.x * 9.0);
  let h = in.q.y;
  let span = S.layerY[3] - S.layerY[0] + S.params.z;
  let u = fract(h * span / 9.0 - S.params.x * 0.9 + in.seed);
  let pulse = pow(u, 14.0);
  // colour climbs the stack: tooling -> system -> beam -> application
  let k = h * 3.0;
  let i0 = u32(clamp(floor(k), 0.0, 2.0));
  let col = mix(S.accents[i0].rgb, S.accents[i0 + 1u].rgb, clamp(k - f32(i0), 0.0, 1.0));
  let I = S.params.y * across * (0.05 + pulse * 2.2);
  var o: FragOut;
  o.color = vec4f(0.0);
  o.glow = vec4f(col * I, 1.0);
  return o;
}
`;

// Emissive quads whose world-space corners are built on the CPU each frame:
// holograms over the top layer, the NervesHub uplink and the distribution links.
const FX = { link: 0, uplink: 1, footprint: 2, cone: 3, tile: 4, flare: 5 };
const FX_WGSL = SCENE_WGSL + /* wgsl */ `
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(4) var logoTex: texture_2d_array<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) @interpolate(flat) prm: vec4f,   // mode, intensity, d0, d1
  @location(2) @interpolate(flat) col: vec4f,   // rgb, kind / seed
  @location(3) @interpolate(flat) ext: vec4f,   // mode specific
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

fn sdBox(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + vec2f(r);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}
fn line(d: f32, w: f32, aa: f32) -> f32 { return 1.0 - smoothstep(w - aa, w + aa, d); }
fn fill(d: f32, aa: f32) -> f32 { return 1.0 - smoothstep(-aa, aa, d); }
fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn comet(u: f32, k: f32) -> f32 { return pow(u, k) * smoothstep(1.0, 0.97, u); }

@fragment fn fs(in: VOut) -> FragOut {
  let aa = fwidth(in.uv);
  // tiles show a logo inset in the frame; sampled up front to keep derivatives uniform
  let luv = (in.uv - 0.5) / 0.74 + 0.5;
  let layer = min(u32(max(in.col.w, 0.0) + 0.5), textureNumLayers(logoTex) - 1u);
  let logo = textureSample(logoTex, samp, vec2f(luv.x, 1.0 - luv.y), layer);
  let mode = u32(in.prm.x + 0.5);
  let t = S.params.x;
  var rgb = in.col.rgb;
  var I = 0.0;
  var extra = vec3f(0.0);

  if (mode == 0u) {
    // distribution link: messages travel both ways
    let x = in.uv.y * 2.0 - 1.0;
    let along = mix(in.prm.z, in.prm.w, in.uv.x);
    let seed = in.col.w;
    let f = fract((along - t * 20.0) / 24.0 + seed);
    let b = fract((along + t * 15.0) / 31.0 + seed * 1.7);
    let msg = comet(f, 12.0) + comet(1.0 - b, 12.0);
    let core = exp(-x * x * 26.0);
    let haze = exp(-x * x * 3.5);
    I = core * (0.55 + msg * 3.5) + haze * (0.1 + msg * 0.5);
    rgb = mix(rgb, vec3f(1.0), clamp(msg, 0.0, 1.0) * 0.45);
  } else if (mode == 1u) {
    // uplink beam: telemetry rises, firmware comes down
    let x = in.uv.x * 2.0 - 1.0;
    let along = mix(in.prm.z, in.prm.w, in.uv.y);
    let fade = 1.0 / (1.0 + along / 70.0);
    let core = exp(-x * x * 160.0);
    let haze = exp(-x * x * 7.0);
    let up = comet(fract((along - t * 26.0) / 15.0), 10.0);
    let dn = comet(1.0 - fract((along + t * 38.0) / 120.0), 16.0);
    let base = exp(-along * 0.35);
    I = (core * (0.7 + up * 2.4) + haze * (0.07 + up * 0.25 + base * 0.6)) * fade;
    extra = in.ext.rgb * dn * (core * 4.0 + haze * 0.7) * fade;
  } else if (mode == 2u) {
    // footprint on the board: corner brackets, faint fill, sweeping scan line
    let hs = in.ext.xy * 0.5;
    let pm = (in.uv * 2.0 - 1.0) * hs;
    let am = max(aa.x * in.ext.x, aa.y * in.ext.y);
    let inset = hs - vec2f(0.3);
    let d = sdBox(pm, inset, 0.4);
    let ap = abs(pm);
    let arm = min(1.6, min(inset.x, inset.y) * 0.45);
    let corner = step(inset.x - arm, ap.x) * step(inset.y - arm, ap.y);
    I = line(abs(d), 0.11, am) * corner + line(abs(d), 0.035, am) * 0.4;
    let inside = fill(d, am);
    let sweep = mix(-inset.y, inset.y, fract(t * 0.3 + in.col.w * 0.37));
    I += inside * (0.05 + exp(-abs(pm.y - sweep) * 5.0) * 0.3);
  } else if (mode == 3u) {
    // light cone from the footprint up to the tile
    let x = in.uv.x * 2.0 - 1.0;
    let hgt = in.uv.y;
    let edge = exp(-(1.0 - abs(x)) * 12.0);
    let rays = 0.5 + 0.5 * sin(x * 21.0 + t * 1.3) * sin(x * 7.0 - t * 0.6 + in.col.w);
    let rise = comet(fract(hgt * 2.2 - t * 0.8 + in.col.w * 0.3), 10.0);
    let k = (1.0 - hgt);
    I = k * k * (0.06 + 0.1 * rays + 0.45 * edge) + rise * 0.2 * k;
  } else if (mode == 4u) {
    // floating tile with the project's logo and a light sweep across it
    let q = in.uv * 2.0 - 1.0;
    let aq = max(aa.x, aa.y) * 2.0;
    let b = sdBox(q, vec2f(0.95), 0.24);
    I = line(abs(b), 0.03, aq) + fill(b, aq) * 0.08;
    let sweep = exp(-pow(in.uv.x * 0.6 + in.uv.y - fract(t * 0.16 + in.ext.y) * 2.8 + 0.4, 2.0) * 28.0);
    let shimmer = (0.86 + 0.14 * sin(in.uv.y * 80.0 - t * 5.0)) * (0.95 + 0.05 * sin(t * 31.0 + in.col.w * 5.0));
    if (in.ext.x > 0.5) {
      extra = logo.rgb * logo.a * (1.0 + sweep * 0.7) * shimmer;   // full-colour logo
    } else {
      I += logo.a * (1.15 + sweep * 0.8);
    }
    I *= shimmer;
  } else {
    // flare where the uplink leaves the board
    let q = in.uv * 2.0 - 1.0;
    let r = length(q);
    let ring = fract(r * 1.6 - t * 0.6);
    I = (pow(ring, 6.0) * 0.35 + exp(-r * r * 30.0) * 0.5) * smoothstep(1.0, 0.55, r);
  }
  var o: FragOut;
  o.color = vec4f(0.0);
  o.glow = vec4f((rgb * I + extra) * in.prm.y, 1.0);
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

const BLOOM_WGSL = FULLSCREEN_VS + /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var src2: texture_2d<f32>;
@group(0) @binding(3) var<uniform> P: vec4f; // texel.xy of src, threshold, knee

fn s(uv: vec2f) -> vec3f { return textureSample(src, smp, uv).rgb; }

@fragment fn prefilter(in: FsOut) -> @location(0) vec4f {
  let t = P.xy;
  var c = vec3f(0.0);
  for (var y = -1; y <= 1; y += 2) {
    for (var x = -1; x <= 1; x += 2) {
      let uv = in.uv + vec2f(f32(x), f32(y)) * t * 0.5;
      c += textureSample(src, smp, uv).rgb + textureSample(src2, smp, uv).rgb;
    }
  }
  c *= 0.25;
  let br = max(c.r, max(c.g, c.b));
  let soft = clamp(br - P.z + P.w, 0.0, 2.0 * P.w);
  let contrib = max(soft * soft / (4.0 * P.w + 1e-4), br - P.z) / max(br, 1e-4);
  return vec4f(c * contrib, 1.0);
}

@fragment fn down(in: FsOut) -> @location(0) vec4f {
  let t = P.xy;
  let uv = in.uv;
  var c = s(uv) * 0.125;
  c += (s(uv + t * vec2f(-1.0, -1.0)) + s(uv + t * vec2f(1.0, -1.0)) + s(uv + t * vec2f(-1.0, 1.0)) + s(uv + t * vec2f(1.0, 1.0))) * 0.125;
  c += (s(uv + t * vec2f(-2.0, -2.0)) + s(uv + t * vec2f(2.0, -2.0)) + s(uv + t * vec2f(-2.0, 2.0)) + s(uv + t * vec2f(2.0, 2.0))) * 0.03125;
  c += (s(uv + t * vec2f(-2.0, 0.0)) + s(uv + t * vec2f(2.0, 0.0)) + s(uv + t * vec2f(0.0, -2.0)) + s(uv + t * vec2f(0.0, 2.0))) * 0.0625;
  return vec4f(c, 1.0);
}

@fragment fn up(in: FsOut) -> @location(0) vec4f {
  let t = P.xy;
  let uv = in.uv;
  var c = s(uv) * 4.0;
  c += (s(uv + t * vec2f(-1.0, 0.0)) + s(uv + t * vec2f(1.0, 0.0)) + s(uv + t * vec2f(0.0, -1.0)) + s(uv + t * vec2f(0.0, 1.0))) * 2.0;
  c += s(uv + t * vec2f(-1.0, -1.0)) + s(uv + t * vec2f(1.0, -1.0)) + s(uv + t * vec2f(-1.0, 1.0)) + s(uv + t * vec2f(1.0, 1.0));
  return vec4f(c / 16.0, 1.0);
}
`;

const COMPOSITE_WGSL = FULLSCREEN_VS + /* wgsl */ `
@group(0) @binding(0) var sceneTex: texture_2d<f32>;
@group(0) @binding(1) var glowTex: texture_2d<f32>;
@group(0) @binding(2) var bloomTex: texture_2d<f32>;
@group(0) @binding(3) var smp: sampler;
@group(0) @binding(4) var<uniform> P: vec4f; // bloom strength, exposure, max output, encode sRGB

fn shoulder(x: f32, maxOut: f32) -> f32 {
  let k = 0.75 * min(maxOut, 1.0);
  if (x < k) { return x; }
  let r = maxOut - k;
  return k + r * (1.0 - exp(-(x - k) / r));
}

fn encode(c: f32) -> f32 {
  return select(1.055 * pow(c, 1.0 / 2.4) - 0.055, c * 12.92, c <= 0.0031308);
}

@fragment fn fs(in: FsOut) -> @location(0) vec4f {
  // output is premultiplied over a transparent canvas, so the page background shows through
  let sc = textureSample(sceneTex, smp, in.uv);
  let gl = textureSample(glowTex, smp, in.uv).rgb;
  let bl = textureSample(bloomTex, smp, in.uv).rgb;
  var c = (sc.rgb + gl + bl * P.x) * P.y;
  c = vec3f(shoulder(c.r, P.z), shoulder(c.g, P.z), shoulder(c.b, P.z));
  if (P.w > 0.5) {
    c = vec3f(encode(c.r), encode(c.g), encode(c.b));
    if (sc.a > 0.0) {
      let n = fract(sin(dot(in.pos.xy, vec2f(12.9898, 78.233))) * 43758.5453) - 0.5;
      c += n / 255.0;
    }
  }
  let a = clamp(max(sc.a, max(c.r, max(c.g, c.b))), 0.0, 1.0);
  return vec4f(c, a);
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
  // callouts for the holograms, the uplink and the cluster
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
  const slotTags = (extras.slots || []).map((sl) => mkTag(sl.name, sl.text, sl.accent || layerDefs[slotLayer(sl)].accent, 'is-slot'));
  // hoverable things: hovering one shows its callout and focuses its layer
  const items = [
    ...appTags.map((tag, i) => ({ tag, i, layer: TOP, sx: -1e9, sy: -1e9, r: 0 })),
    ...slotTags.map((tag, i) => ({ tag, i, layer: slotLayer(extras.slots[i]), sx: -1e9, sy: -1e9, r: 0 })),
  ];
  // logo art on the layers (LAYER_SOURCES runs bottom to top like layerDefs) with hover callouts
  const artItems = LAYER_SOURCES.flatMap((src, li) => (li < layerDefs.length ? src.art || [] : [])
    .filter((a) => a.callout)
    .map((a) => ({ ...a.callout, layer: li, tag: mkTag(a.callout.name, a.callout.text, layerDefs[li].accent, 'is-art'), sx: -1e9, sy: -1e9, r: 0 })));
  items.push(...artItems);
  items.forEach((it) => {
    it.tag.el.addEventListener('pointerenter', () => { state.hotTag = it; state.hover = true; });
    it.tag.el.addEventListener('pointerleave', () => { if (state.hotTag === it) state.hotTag = null; });
  });
  const uplinkTag = extras.uplink && mkTag(extras.uplink.name, extras.uplink.text, extras.uplink.accent || appAccent, 'is-uplink');
  const clusterTag = extras.cluster && mkTag(extras.cluster.name, extras.cluster.text, runtimeAccent, 'is-cluster');
  const nodeTags = (extras.cluster?.nodes || []).map((n) => mkTag(n, '', runtimeAccent, 'is-node'));
  root.append(canvas, svg, list, tagBox);

  if (!navigator.gpu) return fail('WebGPU is not available in this browser.');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return fail('No WebGPU adapter.');
  const device = await adapter.requestDevice();

  const dataPromise = opts.data ? Promise.resolve(opts.data) : fetch(opts.dataUrl || new URL('./pcb.json', import.meta.url)).then((r) => r.json());
  const data = await dataPromise;

  // --- canvas / HDR configuration
  const ctx = canvas.getContext('webgpu');
  const wantHdr = matchMedia('(dynamic-range: high)').matches;
  let outFormat = navigator.gpu.getPreferredCanvasFormat();
  let hdrOut = false;
  if (wantHdr) {
    try {
      ctx.configure({ device, format: 'rgba16float', alphaMode: 'premultiplied', toneMapping: { mode: 'extended' } });
      hdrOut = ctx.getConfiguration?.().toneMapping?.mode === 'extended';
      if (hdrOut) outFormat = 'rgba16float';
    } catch (e) { hdrOut = false; }
  }
  if (!hdrOut) ctx.configure({ device, format: outFormat, alphaMode: 'premultiplied' });
  root.dataset.hdr = hdrOut ? 'extended' : 'sdr';

  // --- textures
  const pxPerMm = opts.pxPerMm || (devicePixelRatio > 1.5 ? 40 : 32);
  // logo files used as layer art are loaded up front; the canvases are drawn synchronously
  const artImages = new Map();
  await Promise.all(LAYER_SOURCES.flatMap((src) => src.art || []).filter((a) => a.image).map(async (a) => {
    const img = new Image();
    img.src = new URL(a.image, import.meta.url).href;
    try { await img.decode(); artImages.set(a.image, img); } catch (e) { console.warn('[pcb-hero] art failed to load', a.image); }
  }));
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
  const aniso = device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 8, addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  // hologram logos: one layer per app, white masks for marks, full colour for images
  const LOGO_PX = 256, logoMips = Math.log2(LOGO_PX) + 1;
  const logoCanvases = await Promise.all(extras.apps.map(async (a) => {
    const c = new OffscreenCanvas(LOGO_PX, LOGO_PX);
    const g = c.getContext('2d');
    if (a.image) {
      const img = new Image();
      img.src = new URL(a.image, import.meta.url).href;
      try {
        await img.decode();
        const k = (LOGO_PX * 0.96) / Math.max(img.naturalWidth, img.naturalHeight);
        const w = img.naturalWidth * k, hh = img.naturalHeight * k;
        g.drawImage(img, (LOGO_PX - w) / 2, (LOGO_PX - hh) / 2, w, hh);
      } catch (e) { console.warn('[pcb-hero] logo failed to load', a.image); }
    } else if (a.logo) {
      drawLogo(g, a.logo, LOGO_PX / 2, LOGO_PX / 2, LOGO_PX * 0.92, { ink: '#fff', clear: null });
    }
    return c;
  }));
  const logoTex = device.createTexture({
    size: [LOGO_PX, LOGO_PX, Math.max(1, logoCanvases.length)], format: 'rgba8unorm', mipLevelCount: logoMips,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  logoCanvases.forEach((c, i) => device.queue.copyExternalImageToTexture({ source: c }, { texture: logoTex, origin: [0, 0, i] }, [LOGO_PX, LOGO_PX]));
  generateMips(device, logoTex, 'rgba8unorm', Math.max(1, logoCanvases.length), logoMips, linearClamp);

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
  const viaData = new Float32Array(data.vias.flatMap(([x, y, s, d]) => [x - h, y - h, s, d]));
  const viaBuf = mkBuf(viaData, GPUBufferUsage.VERTEX);
  const sceneUBO = device.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // the hero board is node 0; shadow nodes follow, one 256-byte slot each (dynamic offsets)
  const NODE_STRIDE = 256;
  const shadowNodes = cfg.nodes.slice(0, Math.max(0, extras.cluster?.nodes?.length ?? cfg.nodes.length));
  const nodeCount = 1 + shadowNodes.length;
  const nodeUBO = device.createBuffer({ size: NODE_STRIDE * nodeCount, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const MAX_FX = 512;
  const FX_FLOATS = 24;
  const fxData = new Float32Array(MAX_FX * FX_FLOATS);
  const fxBuf = device.createBuffer({ size: fxData.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

  // --- pipelines
  const SAMPLES = 4;
  const HDR = 'rgba16float';
  const sceneTargets = (blend) => [
    { format: HDR, writeMask: blend ? 0 : GPUColorWrite.ALL },
    blend
      ? { format: HDR, blend: { color: { srcFactor: 'one', dstFactor: 'one', operation: 'max' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'max' } } }
      : { format: HDR },
  ];
  const sceneBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
    ],
  });
  const sceneBG = device.createBindGroup({
    layout: sceneBGL,
    entries: [
      { binding: 0, resource: { buffer: sceneUBO } },
      { binding: 1, resource: aniso },
      { binding: 2, resource: albedoTex.createView({ dimension: '2d-array' }) },
      { binding: 3, resource: matTex.createView({ dimension: '2d-array' }) },
      { binding: 4, resource: logoTex.createView({ dimension: '2d-array' }) },
    ],
  });
  const nodeBGL = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { hasDynamicOffset: true, minBindingSize: 48 } }],
  });
  const nodeBG = device.createBindGroup({ layout: nodeBGL, entries: [{ binding: 0, resource: { buffer: nodeUBO, size: 48 } }] });
  const sceneLayout = device.createPipelineLayout({ bindGroupLayouts: [sceneBGL, nodeBGL] });
  const depthOpaque = { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' };
  const depthGlow = { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less-equal' };
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
    depthStencil: depthGlow, multisample: ms,
  });
  const beamMod = mod(BEAM_WGSL);
  const beamPipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: {
      module: beamMod, entryPoint: 'vs',
      buffers: [{ arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }],
    },
    fragment: { module: beamMod, entryPoint: 'fs', targets: sceneTargets(true) },
    primitive: { topology: 'triangle-list' },
    depthStencil: depthGlow, multisample: ms,
  });
  const fxMod = mod(FX_WGSL);
  const fxPipe = device.createRenderPipeline({
    layout: sceneLayout,
    vertex: {
      module: fxMod, entryPoint: 'vs',
      buffers: [{ arrayStride: FX_FLOATS * 4, stepMode: 'instance', attributes: [0, 1, 2, 3, 4, 5].map((i) => (
        { shaderLocation: i, offset: i * 16, format: 'float32x4' })) }],
    },
    fragment: { module: fxMod, entryPoint: 'fs', targets: sceneTargets(true) },
    primitive: { topology: 'triangle-list' },
    depthStencil: depthGlow, multisample: ms,
  });

  const bloomMod = mod(BLOOM_WGSL);
  const bloomBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: {} },
    ],
  });
  const bloomLayout = device.createPipelineLayout({ bindGroupLayouts: [bloomBGL] });
  const mkBloomPipe = (entryPoint, additive) => device.createRenderPipeline({
    layout: bloomLayout,
    vertex: { module: bloomMod, entryPoint: 'vs' },
    fragment: {
      module: bloomMod, entryPoint,
      targets: [additive
        ? { format: HDR, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }
        : { format: HDR }],
    },
  });
  const prefilterPipe = mkBloomPipe('prefilter', false);
  const downPipe = mkBloomPipe('down', false);
  const upPipe = mkBloomPipe('up', true);

  const compMod = mod(COMPOSITE_WGSL);
  const compPipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: compMod, entryPoint: 'vs' },
    fragment: { module: compMod, entryPoint: 'fs', targets: [{ format: outFormat }] },
  });
  const compUBO = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const black = device.createTexture({ size: [1, 1], format: HDR, usage: GPUTextureUsage.TEXTURE_BINDING });

  // --- size-dependent targets
  let T = null;
  function makeTargets(w, hgt) {
    T?.destroy();
    const tex = (format, sampleCount = 1, extra = 0, mips = 1, sw = w, sh = hgt) => device.createTexture({
      size: [sw, sh], format, sampleCount, mipLevelCount: mips,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | extra,
    });
    const TB = GPUTextureUsage.TEXTURE_BINDING;
    const bw = Math.max(1, w >> 1), bh = Math.max(1, hgt >> 1);
    const bloomMips = Math.max(1, Math.min(6, Math.floor(Math.log2(Math.min(bw, bh))) - 2));
    const t = {
      msColor: tex(HDR, SAMPLES), msGlow: tex(HDR, SAMPLES), depth: tex('depth24plus', SAMPLES),
      color: tex(HDR, 1, TB), glow: tex(HDR, 1, TB),
      bloom: tex(HDR, 1, TB, bloomMips, bw, bh), bloomMips, bw, bh,
    };
    t.mipViews = [...Array(bloomMips)].map((_, i) => t.bloom.createView({ baseMipLevel: i, mipLevelCount: 1 }));
    const blackView = black.createView();
    const ubos = [];
    const ubo = () => {
      const b = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      ubos.push(b);
      return b;
    };
    // pass list: prefilter -> mip0, down i-1 -> i, up i -> i-1
    t.passes = [];
    const src0 = { w, h: hgt };
    const pre = ubo();
    device.queue.writeBuffer(pre, 0, new Float32Array([1 / src0.w, 1 / src0.h, 1.5, 0.6]));
    t.passes.push({ pipe: prefilterPipe, target: t.mipViews[0], bg: device.createBindGroup({ layout: bloomBGL, entries: [
      { binding: 0, resource: t.color.createView() }, { binding: 1, resource: linearClamp },
      { binding: 2, resource: t.glow.createView() }, { binding: 3, resource: { buffer: pre } }] }), load: 'clear' });
    for (let i = 1; i < bloomMips; i++) {
      const b = ubo();
      device.queue.writeBuffer(b, 0, new Float32Array([1 / Math.max(1, bw >> (i - 1)), 1 / Math.max(1, bh >> (i - 1)), 0, 0]));
      t.passes.push({ pipe: downPipe, target: t.mipViews[i], bg: device.createBindGroup({ layout: bloomBGL, entries: [
        { binding: 0, resource: t.mipViews[i - 1] }, { binding: 1, resource: linearClamp },
        { binding: 2, resource: blackView }, { binding: 3, resource: { buffer: b } }] }), load: 'clear' });
    }
    for (let i = bloomMips - 1; i > 0; i--) {
      const b = ubo();
      device.queue.writeBuffer(b, 0, new Float32Array([1 / Math.max(1, bw >> i), 1 / Math.max(1, bh >> i), 0, 0]));
      t.passes.push({ pipe: upPipe, target: t.mipViews[i - 1], bg: device.createBindGroup({ layout: bloomBGL, entries: [
        { binding: 0, resource: t.mipViews[i] }, { binding: 1, resource: linearClamp },
        { binding: 2, resource: blackView }, { binding: 3, resource: { buffer: b } }] }), load: 'load' });
    }
    t.compBG = device.createBindGroup({ layout: compPipe.getBindGroupLayout(0), entries: [
      { binding: 0, resource: t.color.createView() },
      { binding: 1, resource: t.glow.createView() },
      { binding: 2, resource: t.mipViews[0] },
      { binding: 3, resource: linearClamp },
      { binding: 4, resource: { buffer: compUBO } },
    ] });
    t.destroy = () => {
      for (const k of ['msColor', 'msGlow', 'depth', 'color', 'glow', 'bloom']) t[k].destroy();
      for (const b of ubos) b.destroy();
    };
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
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const key = `${W}x${H}`;
    if (key !== state.nodesFor) { state.nodesFor = key; placeNodes(dist); }
  }

  // the hero board is node 0; shadow nodes are placed along the view rays through their
  // configured spots, so they stay in frame whatever the hero's aspect ratio
  const sh = cfg.shadow;
  const nodes = [{ x: 0, y: 0, z: 0, yaw: 0, look: [1, 1, 1, 0], t0: 0 }].concat(shadowNodes.map((n, i) => ({
    spec: n, x: 0, y: 0, z: 0, yaw: ((n.yaw || 0) * Math.PI) / 180, look: [sh.light, sh.alpha, sh.emit, sh.haze], t0: 0.37 + i * 0.61,
  })));
  const haze = hexLinear('#0d2230');
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

  // --- holograms, uplink and cluster links (emissive quads rebuilt every frame)
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
  const glowRgb = (hex) => { const c = hexLinear(hex); const m = Math.max(...c, 1e-3); return c.map((v) => v / m); };
  const apps = extras.apps.map((a) => ({ ...a, anchor: anchorOf(a), rgb: glowRgb(a.accent || appAccent) }));
  const uplink = extras.uplink && {
    ...extras.uplink, anchor: anchorOf(extras.uplink),
    rgb: hexLinear(extras.uplink.accent || appAccent), down: hexLinear(extras.uplink.down || '#ffffff'),
  };
  const runtimeRgb = hexLinear(runtimeAccent);
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const fxState = { holo: 0, uplink: 0, links: 0 };
  const hotW = items.map(() => 0);
  const geo = { tiles: [], tileR: [], beam: null, links: [], slots: [] }; // world anchors for the callouts
  const slots = (extras.slots || []).map((sl) => {
    const layer = slotLayer(sl);
    const rgb = glowRgb(sl.accent || layerDefs[layer].accent).map((c) => c + (1 - c) * 0.3); // a touch lighter than the layer
    return { ...sl, layer, anchor: anchorOf(sl), rgb, w: 0 };
  });
  let fxN = 0;
  function fxPush(c0, c1, c2, c3, mode, I, d0, d1, rgb, kind, ext = [0, 0, 0, 0]) {
    if (fxN >= MAX_FX || I <= 0.002) return;
    const o = fxN++ * FX_FLOATS;
    fxData.set(c0, o); fxData[o + 3] = mode;
    fxData.set(c1, o + 4); fxData[o + 7] = I;
    fxData.set(c2, o + 8); fxData[o + 11] = d0;
    fxData.set(c3, o + 12); fxData[o + 15] = d1;
    fxData.set(rgb, o + 16); fxData[o + 19] = kind;
    fxData.set(ext, o + 20);
  }
  function ribbon(pts, width, I, rgb, seed) {
    let dist = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dir = v3.sub(b, a);
      const len = Math.hypot(...dir);
      const mid = add(a, dir, 0.5);
      const side = v3.norm(v3.cross(dir, v3.sub(state.eye, mid)));
      const s = width / 2;
      fxPush(add(a, side, -s), add(b, side, -s), add(b, side, s), add(a, side, s), FX.link, I, dist, dist + len, rgb, seed);
      dist += len;
    }
  }
  function cubic(p0, p1, p2, p3, segs) {
    const out = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, u = 1 - t;
      out.push([0, 1, 2].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
    }
    return out;
  }

  function buildFx(focus, k) {
    fxN = 0;
    const ease = (key, target) => { fxState[key] += (target - fxState[key]) * k; return fxState[key]; };
    const holoI = ease('holo', focus === TOP ? 1 : focus < 0 ? 0.6 : 0.1);
    const upI = ease('uplink', focus === TOP ? 1 : focus < 0 ? 0.8 : 0.3);
    const linkI = ease('links', focus === RUNTIME ? 1 : focus < 0 ? 0.22 : 0.08);
    const hot = hotItem();
    items.forEach((it, j) => { hotW[j] += ((hot === it ? 1 : 0) - hotW[j]) * k; });
    const R = state.camRight, U = state.camUp;
    const topY = state.y[TOP];

    geo.tiles = apps.map((app, i) => {
      const I = holoI * (1 + hotW[i] * 0.7);
      const A = app.anchor;
      const fw = A.w + 1.8, fd = A.d + 1.8;
      const y0 = topY + 0.03;
      fxPush([A.x - fw / 2, y0, A.z + fd / 2], [A.x + fw / 2, y0, A.z + fd / 2], [A.x + fw / 2, y0, A.z - fd / 2], [A.x - fw / 2, y0, A.z - fd / 2],
        FX.footprint, I, 0, 0, app.rgb, i, [fw, fd, 0, 0]);
      const s = cfg.holoSize / 2;
      const C = [A.x, topY + cfg.holoHeight + Math.sin(time * 1.1 + i * 2.1) * 0.35, A.z];
      fxPush(add(add(C, R, -s), U, -s), add(add(C, R, s), U, -s), add(add(C, R, s), U, s), add(add(C, R, -s), U, s),
        FX.tile, I, 0, 0, app.rgb, i, [app.image ? 1 : 0, i * 0.37, 0, 0]);
      geo.tileR[i] = C;
      const B = [A.x, topY + A.top + 0.05, A.z];
      const Cb = add(C, U, -s);
      const bw = Math.max(fw, fd) * 0.42, tw = s * 0.92;
      fxPush(add(B, R, -bw), add(B, R, bw), add(Cb, R, tw), add(Cb, R, -tw), FX.cone, I, 0, 0, app.rgb, i);
      return add(C, U, s);
    });

    // technology slots, shown while their layer is in focus
    geo.slots = slots.map((sl, j) => {
      sl.w += ((focus === sl.layer ? 1 : 0) - sl.w) * k;
      const A = sl.anchor;
      const yS = state.y[sl.layer] + 0.04;
      const I = sl.w * (0.8 + hotW[apps.length + j] * 0.9);
      fxPush([A.x - A.w / 2, yS, A.z + A.d / 2], [A.x + A.w / 2, yS, A.z + A.d / 2], [A.x + A.w / 2, yS, A.z - A.d / 2], [A.x - A.w / 2, yS, A.z - A.d / 2],
        FX.footprint, I, 0, 0, sl.rgb, j + 5, [A.w, A.d, 0, 0]);
      return [A.x, yS, A.z];
    });

    if (uplink) {
      const A = uplink.anchor;
      const B = [A.x, topY + A.top + 0.05, A.z];
      const L = 320, w = 10;
      fxPush(add(B, R, -w / 2), add(B, R, w / 2), add(add(B, R, w / 2), [0, L, 0]), add(add(B, R, -w / 2), [0, L, 0]),
        FX.uplink, upI, 0, L, uplink.rgb, 0, [...uplink.down, 0]);
      const f = 7;
      fxPush([B[0] - f, B[1], B[2] + f], [B[0] + f, B[1], B[2] + f], [B[0] + f, B[1], B[2] - f], [B[0] - f, B[1], B[2] - f],
        FX.flare, upI, 0, 0, uplink.rgb, 0);
      geo.beam = B;
    }

    // Erlang distribution: a full mesh between the runtime plates of all nodes. On the hero
    // board each link lands on a pad on the runtime plate, rising from it and running back
    // through the gap under the plate above; between shadow nodes links leave square to an edge.
    geo.links = [];
    const y = state.y[RUNTIME] - cfg.slab * 0.5;
    const yTop = state.y[RUNTIME] + 0.04;
    const across = (p) => p[0] * R[0] + p[2] * R[2];
    const ports = cfg.ports.map(([x, z]) => [x - h, yTop, z - h]).sort((a, b) => across(a) - across(b));
    const byScreen = nodes.slice(1).map((n, i) => i + 1).sort((a, b) => across([nodes[a].x, 0, nodes[a].z]) - across([nodes[b].x, 0, nodes[b].z]));
    const portOf = new Map(byScreen.map((ni, k) => [ni, ports[Math.min(k, ports.length - 1)]]));
    for (let a = 0; a < nodes.length; a++)
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a], nb = nodes[b];
        const hero = a === 0;
        const B = edgeAnchor(nb, hero ? [0, 0, 0] : [na.x, na.y, na.z], y);
        let pts;
        if (hero) {
          const P = portOf.get(b);
          const len = Math.hypot(B.p[0] - P[0], B.p[2] - P[2]);
          pts = cubic(P, add(P, [0, 6, 0]), add(add(B.p, B.n, len * 0.3), [0, len * 0.04, 0]), B.p, 56);
          const f = 3;
          fxPush([P[0] - f, P[1], P[2] + f], [P[0] + f, P[1], P[2] + f], [P[0] + f, P[1], P[2] - f], [P[0] - f, P[1], P[2] - f],
            FX.flare, linkI * 2.4, 0, 0, runtimeRgb, 0);
        } else {
          const A = edgeAnchor(na, [nb.x, nb.y, nb.z], y);
          const len = Math.hypot(B.p[0] - A.p[0], B.p[2] - A.p[2]);
          const lift = [0, len * 0.05, 0];
          pts = cubic(A.p, add(add(A.p, A.n, len * 0.22), lift), add(add(B.p, B.n, len * 0.22), lift), B.p, 44);
        }
        ribbon(pts, hero ? 1.8 : 1.4, linkI * (hero ? 1 : 0.45), runtimeRgb, a * 0.37 + b * 0.19);
        if (hero) geo.links[b - 1] = pts;
      }
    device.queue.writeBuffer(fxBuf, 0, fxData, 0, fxN * FX_FLOATS);
  }

  function layoutTags(focus, k) {
    const W = state.cssW, H = state.cssH;
    // mode 'above': centred above the anchor; 'right' / 'left': beside it, vertically centred
    const place = (tag, target, x, y, mode, active = false) => {
      tag.vis += (target - tag.vis) * k;
      const s = tag.el.style;
      s.opacity = tag.vis.toFixed(3);
      s.visibility = tag.vis < 0.01 ? 'hidden' : 'visible';
      tag.el.classList.toggle('is-active', active);
      if (tag.vis < 0.01) return;
      const w = tag.el.offsetWidth, hh = tag.el.offsetHeight;
      let left = mode === 'above' ? x - w / 2 : mode === 'left' ? x - w : x;
      let top = mode === 'above' ? y - hh : y - hh / 2;
      left = Math.min(Math.max(6, left), W - w - 6);
      top = Math.min(Math.max(6, top), H - hh - 6);
      s.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    };
    const appVis = focus === TOP ? 1 : focus < 0 ? 0.75 : 0;
    const hot = hotItem();
    appTags.forEach((tag, i) => {
      const [x, y] = project(geo.tiles[i]);
      place(tag, appVis, x, y - 4, 'above', hot === items[i]);
      const [cx, cy] = project(geo.tileR[i]);
      Object.assign(items[i], { sx: cx, sy: cy, r: Math.max(18, (y - cy) * -1 + 6), live: tag.vis > 0.3 });
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
      // where the beam leaves the top of the hero
      const [bx, by] = project(geo.beam);
      const [tx, ty] = project(add(geo.beam, [0, 200, 0]));
      const yT = Math.min(by - 40, 64);
      const t = (yT - by) / (ty - by || 1);
      place(uplinkTag, appVis, bx + (tx - bx) * t + 14, yT, 'right', focus === TOP);
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

  // --- frame
  const accents = layerDefs.map((L) => hexLinear(L.accent));
  const sceneData = new Float32Array(64);
  let last = performance.now();
  let time = 0;
  let running = true;
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(root);

  function frame(now) {
    if (!running || !visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduceMotion) time += dt;

    if (state.candidate !== state.pointerFocus) {
      const wait = state.candidate === -1 ? 260 : 90;
      if (now - state.candidateSince > wait) state.pointerFocus = state.candidate;
    }
    const focus = focusTarget();
    const open = state.hover || focus >= 0;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
    for (let i = 0; i < N; i++) {
      state.y[i] += (targetY(i, focus, open) - state.y[i]) * k;
      state.focusW[i] += ((focus === i ? 1 : 0) - state.focusW[i]) * k;
      state.dim[i] += ((focus < 0 || focus === i ? 1 : 0.42) - state.dim[i]) * k;
    }
    state.explode += ((open ? 1 : 0.25) - state.explode) * k;
    camera();
    buildFx(focus, k);

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
    device.queue.writeBuffer(sceneUBO, 0, sceneData);
    device.queue.writeBuffer(compUBO, 0, new Float32Array([cfg.bloom, cfg.exposure, hdrOut ? 4.0 : 1.0, hdrOut ? 0 : 1]));

    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view: T.msColor.createView(), resolveTarget: T.color.createView(), clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'discard' },
        { view: T.msGlow.createView(), resolveTarget: T.glow.createView(), clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'discard' },
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
    pass.setPipeline(pulsePipe);
    pass.setVertexBuffer(0, pulseBuf);
    for (let n = 0; n < nodeCount; n++) {
      pass.setBindGroup(1, nodeBG, [n * NODE_STRIDE]);
      pass.draw(6, pulseData.length / 8);
    }
    pass.setBindGroup(1, nodeBG, [0]);
    pass.setPipeline(beamPipe);
    pass.setVertexBuffer(0, viaBuf);
    pass.draw(6, viaData.length / 4);
    if (fxN) {
      pass.setPipeline(fxPipe);
      pass.setVertexBuffer(0, fxBuf);
      pass.draw(6, fxN);
    }
    pass.end();

    for (const p of T.passes) {
      const bp = enc.beginRenderPass({ colorAttachments: [{ view: p.target, loadOp: p.load, storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
      bp.setPipeline(p.pipe);
      bp.setBindGroup(0, p.bg);
      bp.draw(3);
      bp.end();
    }
    const cp = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
    cp.setPipeline(compPipe);
    cp.setBindGroup(0, T.compBG);
    cp.draw(3);
    cp.end();
    device.queue.submit([enc.finish()]);

    layoutLabels(focus);
    layoutTags(focus, k);
    requestAnimationFrame(frame);
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
