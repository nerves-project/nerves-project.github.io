// Rasterizes the extracted KiCad data into per-layer textures with Canvas2D.
//
// Two canvases per copper layer:
//   albedo   - sRGB colour, alpha = board coverage (holes/outside are transparent)
//   material - R: copper present, G: exposed metal (pads, rings), B: silkscreen / logo art

import { drawLogo } from './logos.js';

export const PALETTE = {
  mask: '#173f2a',          // soldermask over bare laminate
  maskCopper: '#24583a',    // soldermask over copper
  maskVia: '#2b6643',
  laminate: '#5c5434',      // FR4 core (inner layers)
  copper: '#c47a48',        // bare copper (inner planes)
  copperRing: '#dc9a62',
  gold: '#d9ad55',          // ENIG pads
  silk: '#eeeee6',
};

// Layer order is bottom -> top, matching the visual stack.
// art: logos drawn on the layer (board mm) - etched into inner copper, silkscreen on outer layers.
export const LAYER_SOURCES = [
  { cu: 'B.Cu', kind: 'outer', side: 'B', art: [
    { logo: 'hardhat', at: [15.5, 25], size: 9 },
    { text: 'Buildroot', at: [21, 25.4], size: 4.6, align: 'left' },
  ] },
  { cu: 'In2.Cu', kind: 'inner', art: [
    { logo: 'penguin', at: [11.5, 26.5], size: 10.5 },
    { text: 'Linux', at: [11.5, 33.6], size: 2.6 },
    { logo: 'uboot', at: [35, 26], size: 14 },
    { text: 'U-Boot', at: [35, 32.6], size: 2.6 },
  ] },
  { cu: 'In1.Cu', kind: 'inner' },
  { cu: 'F.Cu', kind: 'outer', side: 'F' },
];

const ART_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// style: { ink, clear } fill styles (clear null erases)
function drawArt(ctx, art = [], style) {
  for (const a of art) {
    if (a.logo) drawLogo(ctx, a.logo, a.at[0], a.at[1], a.size, style);
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

function contactShadows(ctx, parts, pxPerMm) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.filter = `blur(${0.3 * pxPerMm}px)`; // filter radius is in canvas pixels, not transformed units
  for (const p of parts) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((-p.rot * Math.PI) / 180);
    const grow = 0.25;
    roundedRect(ctx, -p.w / 2 - grow, -p.h / 2 - grow, p.w + grow * 2, p.h + grow * 2, 0.3);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function buildLayerCanvases(data, pxPerMm) {
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
        contactShadows(a, data.parts, pxPerMm);
        drawSilk(a, data.silk, PALETTE.silk);
        drawSilk(m, data.silk, '#0000ff');
      }
      drawArt(a, src.art, { ink: PALETTE.silk, clear: null });
      drawArt(m, src.art, { ink: '#0000ff', clear: null });
    } else {
      a.fillStyle = PALETTE.laminate;
      a.fillRect(0, 0, board.w, board.h);
      drawZones(a, zones, PALETTE.copper);
      drawZones(m, zones, '#ff0000');
      // copper art: the logo is etched out of the plane, its details stay copper
      drawArt(a, src.art, { ink: PALETTE.laminate, clear: PALETTE.copper });
      m.globalCompositeOperation = 'source-over';
      drawArt(m, src.art, { ink: '#0000ff', clear: '#ff0000' });
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
