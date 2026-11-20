// Nerves stackup hero: the Trellis Core 4-layer board as a WebGPU-rendered,
// explodable stack. Each copper layer stands for one layer of Nerves.
//
// Usage:
//   import { mountPcbHero } from './pcb-hero.js';
//   mountPcbHero(document.querySelector('#hero-stack'), { dataUrl: '/hero-pcb/pcb.json' });

import { buildLayerCanvases } from './textures.js';

export const DEFAULT_LAYERS = [
  // bottom -> top
  { name: 'Tooling', cu: 'B.Cu', text: 'Builds systems, assembles firmware, updates devices', accent: '#4fd18b' },
  { name: 'System', cu: 'In2.Cu', text: 'OS, drivers, minimal userspace, partition scheme', accent: '#f0a03c' },
  { name: 'BEAM', cu: 'In1.Cu', text: 'Init to Erlang VM, runtime robustness, runtime APIs', accent: '#a46fe0' },
  { name: 'Application', cu: 'F.Cu', text: 'Your Elixir application, unlimited possibilities', accent: '#42c6e8' },
];

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
  params2: vec4f,  // pulse speed, cpu x, cpu z, unused
  accents: array<vec4f, 4>,
};
@group(0) @binding(0) var<uniform> S: Scene;

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
};

@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f,
              @location(3) face: f32, @builtin(instance_index) li: u32) -> VOut {
  var o: VOut;
  let wp = vec3f(p.x, S.layerY[li] + p.y * S.params.z, p.z);
  o.pos = S.viewProj * vec4f(wp, 1.0);
  o.uv = uv; o.n = n; o.wp = wp; o.layer = li; o.face = u32(face + 0.5);
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
  let t = S.params.x;

  var col = vec3f(0.0);
  var emit = vec3f(0.0);
  if (in.face == 0u) {
    // height field: copper under mask, pads and silk are slightly raised
    let hgt = vec3f(0.6, 0.35, 0.5);
    let h0 = dot(m.rgb, hgt); let hx = dot(mx.rgb, hgt); let hz = dot(mz.rgb, hgt);
    let bump = select(1.4, 0.6, inner);
    let n = normalize(vec3f(-(hx - h0) * bump, 1.0, -(hz - h0) * bump));
    var metal = m.g;
    var rough = mix(0.32, 0.2, m.g);
    if (inner) {
      metal = max(metal, m.r);
      rough = mix(0.7, 0.28, m.r);
    } else {
      rough = mix(rough, 0.85, m.b);
    }
    col = shade(a.rgb, n, v, metal, rough);
    let cpu = vec2f(S.params2.y, S.params2.z);
    if (inner) {
      // energy rippling out across the plane from the CPU
      let d = length(in.wp.xz - cpu);
      let wave = pow(0.5 + 0.5 * sin(d * 0.5 - t * 2.6), 28.0);
      emit = accent * m.r * (0.03 + wave * 1.1) * focus;
      emit += accent * (1.0 - m.r) * (1.0 - m.g) * 0.015 * focus;
    } else {
      emit = accent * m.r * 0.05 * focus;
    }
  } else if (in.face == 1u) {
    let base = select(vec3f(0.03, 0.07, 0.045), vec3f(0.16, 0.14, 0.07), inner);
    let cu = select(0.0, 1.0, in.depth01 < 0.14);
    col = shade(mix(base, vec3f(0.8, 0.45, 0.25), cu), normalize(in.n), v, cu, 0.5);
    emit = accent * (0.05 + focus * 2.2) * (0.35 + 0.65 * cu);
  } else {
    col = vec3f(0.01);
  }
  var o: FragOut;
  o.color = vec4f(col * dim + emit, 1.0);
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
  let wp = vec3f(ipos.x, S.layerY[li] + ipos.y, ipos.z) + rp;
  o.pos = S.viewProj * vec4f(wp, 1.0);
  o.n = vec3f(n.x * c + n.z * s, n.y, -n.x * s + n.z * c);
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
    let t = fract(S.params.x * 0.6);
    e *= 0.25 + 0.75 * (exp(-t * 18.0) + 0.6 * exp(-max(t - 0.18, 0.0) * 18.0) * step(0.18, t));
  }
  var o: FragOut;
  o.color = vec4f(col + S.accents[3].rgb * e, 1.0);
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
  o.pos = S.viewProj * vec4f(p.x, S.layerY[li] + 0.015, p.y, 1.0);
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
  let I = (0.06 + comet * 7.0) * level * core;
  var o: FragOut;
  o.color = vec4f(0.0);
  o.glow = vec4f(S.accents[in.layer].rgb * I, 1.0);
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
  let base = vec3f(via.x, 0.0, via.y);
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
  root.append(canvas, svg, list);

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
  const { size: texSize, layers: canvases } = buildLayerCanvases(data, pxPerMm);
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
  const sceneLayout = device.createPipelineLayout({ bindGroupLayouts: [sceneBGL] });
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
    hover: false, pointerFocus: -1, labelFocus: -1, candidate: -1, candidateSince: 0,
    y: [...Array(N)].map((_, i) => i * (cfg.slab + cfg.gapIdle)),
    focusW: new Array(N).fill(0), dim: new Array(N).fill(1), explode: 0,
    viewProj: null, invViewProj: null, cssW: 1, cssH: 1,
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focusTarget = () => (state.labelFocus >= 0 ? state.labelFocus : state.pointerFocus);
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
    state.hover = false; state.candidate = -1; state.pointerFocus = -1;
  });
  canvas.addEventListener('pointermove', (e) => {
    const c = pick(e.clientX, e.clientY);
    if (c !== state.candidate) { state.candidate = c; state.candidateSince = performance.now(); }
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    state.hover = true;
    const c = pick(e.clientX, e.clientY);
    state.pointerFocus = c === state.pointerFocus ? -1 : c;
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
    const proj = perspective(fov, aspect, dist * 0.5, dist * 2, shift);
    const view = lookAt(eye, target, [0, 1, 0]);
    state.viewProj = mul(proj, view);
    state.invViewProj = invert(state.viewProj);
    state.eye = eye;
    state.labelCol = labelCol;
  }

  // --- frame
  const accents = layerDefs.map((L) => hexLinear(L.accent));
  const sceneData = new Float32Array(64);
  const cpu = data.parts.find((p) => p.ref === 'U3') || { x: h, y: h };
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

    sceneData.set(state.viewProj, 0);
    sceneData.set([...state.eye, 1], 16);
    sceneData.set(v3.norm([-0.45, 1.0, -0.25]).concat(0), 20);
    sceneData.set(state.y, 24);
    sceneData.set(state.focusW, 28);
    sceneData.set(state.dim, 32);
    sceneData.set([time, state.explode, cfg.slab, cfg.pulsePeriod], 36);
    sceneData.set([cfg.pulseSpeed, cpu.x - h, cpu.y - h, 0], 40);
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
    pass.setPipeline(slabPipe);
    pass.setVertexBuffer(0, slabBuf);
    pass.draw(slabVerts.length / 9, N);
    pass.setPipeline(boxPipe);
    pass.setVertexBuffer(0, cubeBuf);
    pass.setVertexBuffer(1, partBuf);
    pass.draw(36, partData.length / 16);
    pass.setPipeline(pulsePipe);
    pass.setVertexBuffer(0, pulseBuf);
    pass.draw(6, pulseData.length / 8);
    pass.setPipeline(beamPipe);
    pass.setVertexBuffer(0, viaBuf);
    pass.draw(6, viaData.length / 4);
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
