// Rasterizes the extracted KiCad data into per-layer textures with Canvas2D.
//
// Two canvases per copper layer:
//   albedo   - sRGB colour, alpha = board coverage (holes/outside are transparent)
//   material - R: copper present, G: exposed metal (pads, rings), B: silkscreen / logo art

import { drawLogo } from './logos.js';

// flat, friendly tones for the nearly cel-shaded look
export const PALETTE = {
  mask: '#3f8a5c',          // soldermask over bare laminate
  maskCopper: '#55a06f',    // soldermask over copper
  maskVia: '#62ab7b',
  laminate: '#cdb67c',      // FR4 core (inner layers)
  etch: '#9c8350',          // art etched out of an inner plane, a little darker so it reads
  copper: '#e49a62',        // bare copper (inner planes)
  copperRing: '#f2b47e',
  gold: '#efc25e',          // ENIG pads
  silk: '#fbfaf2',
};

// Layer order is bottom -> top, matching the visual stack.
// art: logos drawn on the layer (board mm) - etched into inner copper, silkscreen on outer layers.
//   { square, at, size } a plain square block marked with its name
//   { logo, at, size }  a mark from logos.js
//   { image, at, size } a logo file (path relative to this module), drawn monochrome by its alpha;
//                       with `threshold`, pixels darker than it are left out; with `halftone` (cell mm)
//                       a shaded logo becomes a dot screen, as silkscreen would print it
//                       with `color: true` the file is printed as is, in its own colours, matte
//   callout: { name, text, at, size } shows a callout when the art is hovered
//   { text, at, size }  a label
export const LAYER_SOURCES = [
  { cu: 'B.Cu', kind: 'outer', side: 'B', art: [
    { square: 'Buildroot', at: [20, 25], size: 11,
      callout: { name: 'Buildroot', text: 'Reliable, maintained, builds embedded Linux', at: [20, 25], size: 11 } },
  ] },
  { cu: 'In2.Cu', kind: 'inner', art: [
    { square: 'Linux', at: [11.5, 26.5], size: 10, callout: { name: 'Linux', text: 'I run Nerves actually..', at: [11.5, 26.5], size: 10 } },
    { square: 'U-Boot', at: [38.5, 28], size: 10, callout: { name: 'U-Boot', text: 'The standard in booting embedded Linux', at: [38.5, 28], size: 10 } },
  ] },
  { cu: 'In1.Cu', kind: 'inner' },
  { cu: 'F.Cu', kind: 'outer', side: 'F' },
];

const ART_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function drawImageArt(ctx, img, a, ink, pxPerMm, isMaterial) {
  const k = a.size / Math.max(img.naturalWidth, img.naturalHeight);
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  if (a.color) {
    // printed decal: the image itself on the albedo; on the material map it is matte and
    // takes no copper or metal, so it keeps its own colours
    if (!isMaterial) { ctx.drawImage(img, a.at[0] - w / 2, a.at[1] - h / 2, w, h); return; }
    const c = new OffscreenCanvas(Math.max(1, Math.ceil(w * pxPerMm)), Math.max(1, Math.ceil(h * pxPerMm)));
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(c, a.at[0] - w / 2, a.at[1] - h / 2, w, h);
    ctx.restore();
    return;
  }
  const c = new OffscreenCanvas(Math.max(1, Math.ceil(w * pxPerMm)), Math.max(1, Math.ceil(h * pxPerMm)));
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  if (a.halftone) {
    const px = g.getImageData(0, 0, c.width, c.height).data;
    const cell = Math.max(2, a.halftone * pxPerMm);
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = ink;
    g.beginPath();
    for (let cy = cell / 2; cy < c.height; cy += cell)
      for (let cx = cell / 2; cx < c.width; cx += cell) {
        const i = (Math.floor(cy) * c.width + Math.floor(cx)) * 4;
        const cov = px[i + 3] / 255;
        const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        const v = cov * Math.min(1, Math.max(0, (lum - 0.3) / 0.55));
        if (v < 0.04) continue;
        const r = cell * 0.56 * Math.sqrt(v);
        g.moveTo(cx + r, cy);
        g.arc(cx, cy, r, 0, Math.PI * 2);
      }
    g.fill();
    ctx.drawImage(c, a.at[0] - w / 2, a.at[1] - h / 2, w, h);
    return;
  }
  if (a.threshold) {
    const px = g.getImageData(0, 0, c.width, c.height);
    const d = px.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      d[i + 3] = d[i + 3] > 128 && lum >= a.threshold ? 255 : 0;
    }
    g.putImageData(px, 0, 0);
  }
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = ink;
  g.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(c, a.at[0] - w / 2, a.at[1] - h / 2, w, h);
}

// a generic block: rounded outline, a pin-1 dot and the name fitted inside
function drawSquare(ctx, a, ink) {
  const s = a.size, x = a.at[0] - s / 2, y = a.at[1] - s / 2;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, s * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s * 0.16, y + s * 0.16, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 10px ${ART_FONT}`;
  const fs = Math.min(s * 0.2, (10 * s * 0.74) / ctx.measureText(a.square).width);
  ctx.font = `700 ${fs}px ${ART_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(a.square, a.at[0], a.at[1] + fs * 0.04);
  ctx.restore();
}

// style: { ink, clear } fill styles (clear null erases)
function drawArt(ctx, art = [], style, images, pxPerMm, isMaterial = false) {
  for (const a of art) {
    if (a.square) drawSquare(ctx, a, style.ink);
    if (a.logo) drawLogo(ctx, a.logo, a.at[0], a.at[1], a.size, style);
    if (a.image && images?.get(a.image)) drawImageArt(ctx, images.get(a.image), a, style.ink, pxPerMm, isMaterial);
    if (a.text) {
      ctx.save();
      ctx.fillStyle = style.ink;
      ctx.font = `700 ${a.size}px ${ART_FONT}`;
      ctx.textAlign = a.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.text, a.at[0], a.at[1]);
      ctx.restore();
    }
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function polyPath(ctx, flat) {
  ctx.moveTo(flat[0], flat[1]);
  for (let i = 2; i < flat.length; i += 2) ctx.lineTo(flat[i], flat[i + 1]);
  ctx.closePath();
}

function drawPads(ctx, pads, side, color) {
  ctx.fillStyle = color;
  for (const [x, y, w, h, a, rr, padSide] of pads) {
    if (padSide !== side && padSide !== 'A') continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-a * Math.PI) / 180);
    roundedRect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * rr);
    ctx.fill();
    ctx.restore();
  }
}

function drawTracks(ctx, tracks, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2, w] of tracks) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawZones(ctx, zones, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const z of zones) polyPath(ctx, z);
  ctx.fill('nonzero');
}

function circles(ctx, list, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [x, y, d] of list) {
    ctx.moveTo(x + d / 2, y);
    ctx.arc(x, y, d / 2, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawSilk(ctx, silk, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const l of silk.lines) {
    ctx.lineWidth = l[0];
    ctx.beginPath();
    ctx.moveTo(l[1], l[2]);
    for (let i = 3; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]);
    ctx.stroke();
  }
  ctx.beginPath();
  for (const p of silk.polys) polyPath(ctx, p);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [text, x, y, rot, size] of silk.texts) {
    let a = ((rot % 360) + 360) % 360;
    if (a > 90 && a <= 270) a -= 180; // KiCad keeps text readable
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-a * Math.PI) / 180);
    ctx.scale(0.78, 1);
    ctx.font = `600 ${size * 1.3}px "DejaVu Sans Condensed", "Arial Narrow", "Roboto Condensed", sans-serif`;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// hard-edged cast shadows, offset away from the light, as a cel painter would block them in
function contactShadows(ctx, parts) {
  ctx.save();
  ctx.fillStyle = 'rgba(16, 52, 32, 0.32)';
  for (const p of parts) {
    ctx.save();
    ctx.translate(p.x + 0.35, p.y + 0.22);
    ctx.rotate((-p.rot * Math.PI) / 180);
    roundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 0.25);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function buildLayerCanvases(data, pxPerMm, images = new Map()) {
  const { board } = data;
  const size = Math.round(board.w * pxPerMm);
  const out = [];

  for (let li = 0; li < LAYER_SOURCES.length; li++) {
    const src = LAYER_SOURCES[li];
    const albedo = new OffscreenCanvas(size, size);
    const mat = new OffscreenCanvas(size, size);
    const a = albedo.getContext('2d');
    const m = mat.getContext('2d');
    for (const c of [a, m]) {
      c.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
      roundedRect(c, 0, 0, board.w, board.h, board.r);
      c.clip();
    }
    m.fillStyle = '#000';
    m.fillRect(0, 0, board.w, board.h);
    m.globalCompositeOperation = 'lighter';

    const tracks = data.tracks[src.cu] || [];
    const zones = data.zones[src.cu] || [];
    const viaRings = data.vias.map(([x, y, s]) => [x, y, s]);
    const viaDrills = data.vias.map(([x, y, , d]) => [x, y, d]);
    const holeRings = data.holes.map(([x, y, , w]) => [x, y, w]);
    const holeDrills = data.holes.map(([x, y, d]) => [x, y, d]);

    if (src.kind === 'outer') {
      a.fillStyle = PALETTE.mask;
      a.fillRect(0, 0, board.w, board.h);
      drawZones(a, zones, PALETTE.maskCopper);
      drawTracks(a, tracks, PALETTE.maskCopper);
      circles(a, viaRings, PALETTE.maskVia);
      drawZones(m, zones, '#ff0000');
      drawTracks(m, tracks, '#ff0000');
      circles(m, viaRings, '#ff0000');

      drawPads(a, data.pads, src.side, PALETTE.gold);
      drawPads(m, data.pads, src.side, '#ffff00');
      circles(a, holeRings, PALETTE.gold);
      circles(m, holeRings, '#ffff00');

      if (src.side === 'F') {
        contactShadows(a, data.parts);
        drawSilk(a, data.silk, PALETTE.silk);
        drawSilk(m, data.silk, '#0000ff');
      }
      drawArt(a, src.art, { ink: PALETTE.silk, clear: null }, images, pxPerMm);
      drawArt(m, src.art, { ink: '#0000ff', clear: null }, images, pxPerMm, true);
    } else {
      a.fillStyle = PALETTE.laminate;
      a.fillRect(0, 0, board.w, board.h);
      drawZones(a, zones, PALETTE.copper);
      drawZones(m, zones, '#ff0000');
      // copper art: the logo is etched out of the plane, its details stay copper
      drawArt(a, src.art, { ink: PALETTE.etch, clear: PALETTE.copper }, images, pxPerMm);
      m.globalCompositeOperation = 'source-over';
      drawArt(m, src.art, { ink: '#0000ff', clear: '#ff0000' }, images, pxPerMm, true);
      m.globalCompositeOperation = 'lighter';
      circles(a, viaRings, PALETTE.copperRing);
      circles(m, viaRings, '#ffff00');
      circles(a, holeRings, PALETTE.copperRing);
      circles(m, holeRings, '#ffff00');
    }

    // punch drills
    a.globalCompositeOperation = 'destination-out';
    circles(a, viaDrills, '#000');
    circles(a, holeDrills, '#000');
    a.globalCompositeOperation = 'source-over';

    out.push({ albedo, mat });
  }
  return { size, layers: out };
}
