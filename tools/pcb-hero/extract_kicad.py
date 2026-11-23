#!/usr/bin/env python3
"""Extract a compact JSON description of a KiCad PCB for the Nerves stackup hero.

Usage: python3 tools/pcb-hero/extract_kicad.py path/to/board.kicad_pcb static/hero-pcb/pcb.json

Board-specific bits (board origin, CPU location used as the pulse origin) are at the top.
Board graphics on F.SilkS (gr_poly - the Protolux logo) and the kibuzzard footprints (the TRELLIS CORE
wordmark) are intentionally not exported.
"""
import re, sys, json, math, heapq, collections

TOK = re.compile(r'\(|\)|"(?:[^"\\]|\\.)*"|[^\s()"]+')
def parse(text):
    stack=[[]]
    for m in TOK.finditer(text):
        t=m.group(0)
        if t=='(':
            stack.append([])
        elif t==')':
            x=stack.pop(); stack[-1].append(x)
        elif t[0]=='"':
            stack[-1].append(t[1:-1].replace('\\"','"'))
        else:
            stack[-1].append(t)
    return stack[0][0]
def find(node,key): return [c for c in node if isinstance(c,list) and c and c[0]==key]
def get(node,key):
    r=find(node,key); return r[0] if r else None

src, out = sys.argv[1], sys.argv[2]
pcb = parse(open(src).read())

OX, OY = 49.999993, 50.0  # board top-left
R = lambda v: round(v, 3)
def P(x, y): return (float(x) - OX, float(y) - OY)

def arc_points(s, m, e, step_deg=6):
    (x1, y1), (x2, y2), (x3, y3) = s, m, e
    d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
    if abs(d) < 1e-9: return [s, e]
    ux = ((x1*x1 + y1*y1) * (y2 - y3) + (x2*x2 + y2*y2) * (y3 - y1) + (x3*x3 + y3*y3) * (y1 - y2)) / d
    uy = ((x1*x1 + y1*y1) * (x3 - x2) + (x2*x2 + y2*y2) * (x1 - x3) + (x3*x3 + y3*y3) * (x2 - x1)) / d
    r = math.hypot(x1 - ux, y1 - uy)
    a1 = math.atan2(y1 - uy, x1 - ux); a2 = math.atan2(y2 - uy, x2 - ux); a3 = math.atan2(y3 - uy, x3 - ux)
    def norm(a): return a % (2 * math.pi)
    # direction: ccw if mid lies between a1 and a3 going ccw
    ccw = norm(a2 - a1) < norm(a3 - a1)
    sweep = norm(a3 - a1) if ccw else -norm(a1 - a3)
    n = max(2, int(abs(math.degrees(sweep)) / step_deg) + 1)
    return [(ux + r * math.cos(a1 + sweep * i / n), uy + r * math.sin(a1 + sweep * i / n)) for i in range(n + 1)]

def xform(fx, fy, fa, lx, ly):
    a = math.radians(fa)
    return (fx + lx * math.cos(a) + ly * math.sin(a), fy - lx * math.sin(a) + ly * math.cos(a))

CU = ['F.Cu', 'In1.Cu', 'In2.Cu', 'B.Cu']
tracks = {l: [] for l in CU}  # (x1,y1,x2,y2,w,net)
for s in find(pcb, 'segment'):
    l = get(s, 'layer')[1]
    a = P(*get(s, 'start')[1:3]); b = P(*get(s, 'end')[1:3])
    tracks[l].append((a, b, float(get(s, 'width')[1]), int(get(s, 'net')[1])))
for s in find(pcb, 'arc'):
    l = get(s, 'layer')[1]
    pts = arc_points(P(*get(s, 'start')[1:3]), P(*get(s, 'mid')[1:3]), P(*get(s, 'end')[1:3]))
    w = float(get(s, 'width')[1]); net = int(get(s, 'net')[1])
    for i in range(len(pts) - 1):
        tracks[l].append((pts[i], pts[i + 1], w, net))

# distance-along-track for animated pulses, rooted near the CPU
CPU = P(69.7, 67.6)
def key(p): return (round(p[0], 2), round(p[1], 2))
track_out = {}
for l in CU:
    adj = collections.defaultdict(list)
    for i, (a, b, w, net) in enumerate(tracks[l]):
        L = math.dist(a, b)
        adj[key(a)].append((key(b), L)); adj[key(b)].append((key(a), L))
    dist = {}
    # components
    seen = set()
    for start in list(adj):
        if start in seen: continue
        comp = []; stack = [start]; seen.add(start)
        while stack:
            n = stack.pop(); comp.append(n)
            for m, _ in adj[n]:
                if m not in seen: seen.add(m); stack.append(m)
        root = min(comp, key=lambda n: math.dist(n, CPU))
        pq = [(0.0, root)]; dist[root] = 0.0
        while pq:
            d, n = heapq.heappop(pq)
            if d > dist[n]: continue
            for m, L in adj[n]:
                if d + L < dist.get(m, 1e18): dist[m] = d + L; heapq.heappush(pq, (d + L, m))
    track_out[l] = [[R(a[0]), R(a[1]), R(b[0]), R(b[1]), R(w), R(dist[key(a)]), R(dist[key(b)])] for a, b, w, net in tracks[l]]

zones = {l: [] for l in CU}
for z in find(pcb, 'zone'):
    for fp in find(z, 'filled_polygon'):
        l = get(fp, 'layer')[1]
        pts = [P(p[1], p[2]) for p in get(fp, 'pts')[1:] if p[0] == 'xy']
        zones[l].append([R(c) for p in pts for c in p])

vias = [[R(c) for c in P(*get(v, 'at')[1:3])] + [float(get(v, 'size')[1]), float(get(v, 'drill')[1])] for v in find(pcb, 'via')]

pads, parts, silk_lines, silk_polys, silk_texts, holes = [], [], [], [], [], []
KIND = {'C': 'cap', 'R': 'res', 'U': 'ic', 'L': 'ind', 'SW': 'button', 'Y': 'xtal', 'J': 'usbc', 'F': 'fuse', 'D': 'led', 'H': 'hole'}
for fp in find(pcb, 'footprint'):
    at = get(fp, 'at'); fx, fy = P(at[1], at[2]); fa = float(at[3]) if len(at) > 3 else 0.0
    ref = next((p[2] for p in find(fp, 'property') if p[1] == 'Reference'), '?')
    prefix = ''.join(c for c in ref if c.isalpha())
    kind = KIND.get(prefix)
    # silkscreen text (reference)
    for p in find(fp, 'property'):
        if p[1] == 'Reference' and get(p, 'layer')[1] == 'F.SilkS' and not get(p, 'hide') and not ref.startswith('kibuzzard'):
            pat = get(p, 'at'); tx, ty = xform(fx, fy, fa, float(pat[1]), float(pat[2]))
            size = float(get(get(get(p, 'effects'), 'font'), 'size')[1])
            silk_texts.append([ref, R(tx), R(ty), float(pat[3]) if len(pat) > 3 else 0.0, size])
    fab, crt = [], []
    for g in find(fp, 'fp_line') + find(fp, 'fp_rect') + find(fp, 'fp_poly') + find(fp, 'fp_circle') + find(fp, 'fp_arc'):
        layer = get(g, 'layer')[1]
        stroke = get(g, 'stroke'); sw = float(get(stroke, 'width')[1]) if stroke else 0.1
        if g[0] in ('fp_line', 'fp_rect'):
            a = (float(get(g, 'start')[1]), float(get(g, 'start')[2])); b = (float(get(g, 'end')[1]), float(get(g, 'end')[2]))
            loc = [a, b] if g[0] == 'fp_line' else [a, (b[0], a[1]), b, (a[0], b[1]), a]
        elif g[0] == 'fp_poly':
            loc = [(float(p[1]), float(p[2])) for p in get(g, 'pts')[1:] if p[0] == 'xy']
        elif g[0] == 'fp_arc':
            loc = arc_points(*[(float(get(g, k)[1]), float(get(g, k)[2])) for k in ('start', 'mid', 'end')])
        else:
            c = (float(get(g, 'center')[1]), float(get(g, 'center')[2])); e = (float(get(g, 'end')[1]), float(get(g, 'end')[2]))
            r = math.dist(c, e); loc = [(c[0] + r * math.cos(t * math.pi / 16), c[1] + r * math.sin(t * math.pi / 16)) for t in range(33)]
        if layer == 'F.Fab': fab += loc
        if layer == 'F.CrtYd': crt += loc
        if layer == 'F.SilkS' and not ref.startswith('kibuzzard'):
            glob = [xform(fx, fy, fa, x, y) for x, y in loc]
            flat = [R(c) for p in glob for c in p]
            filled = g[0] == 'fp_poly' and (get(g, 'fill') or ['', 'no'])[1] in ('yes', 'solid')
            (silk_polys if filled else silk_lines).append(flat if filled else [R(sw)] + flat)
    fp_pads = []
    for pd in find(fp, 'pad'):
        pat = get(pd, 'at'); lx, ly = float(pat[1]), float(pat[2]); pa = float(pat[3]) if len(pat) > 3 else 0.0
        gx, gy = xform(fx, fy, fa, lx, ly)
        size = get(pd, 'size'); w, h = float(size[1]), float(size[2])
        layers = get(pd, 'layers')[1:]
        drill = get(pd, 'drill'); dr = float(drill[1]) if drill and len(drill) > 1 and drill[1] != 'oval' else (float(drill[2]) if drill and len(drill) > 2 else 0)
        rr = get(pd, 'roundrect_rratio'); rr = float(rr[1]) if rr else (0.5 if pd[3] in ('circle', 'oval') else 0)
        side = 'A' if '*.Cu' in layers else ('F' if 'F.Cu' in layers else 'B')
        if pd[2] == 'np_thru_hole' or (kind == 'hole'):
            holes.append([R(gx), R(gy), R(max(dr, w) if pd[2] == 'np_thru_hole' else dr), R(w)])
            continue
        pads.append([R(gx), R(gy), R(w), R(h), pa, rr, side, R(dr)])
        fp_pads.append((lx, ly, w, h, pa - fa))
    if kind and kind != 'hole':
        pts = fab or crt or [(x + sx * w / 2, y + sy * h / 2) for x, y, w, h, _ in fp_pads for sx in (-1, 1) for sy in (-1, 1)]
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        gx, gy = xform(fx, fy, fa, cx, cy)
        part = {'ref': ref, 'kind': kind, 'x': R(gx), 'y': R(gy), 'rot': fa, 'w': R(max(xs) - min(xs)), 'h': R(max(ys) - min(ys))}
        if kind == 'ic':
            part['leads'] = [[R(x - cx), R(y - cy), R(w), R(h), R(a)] for x, y, w, h, a in fp_pads]
        parts.append(part)

data = {
    'source': 'Trellis Core by Protolux Electronics (CERN-OHL-P v2) https://github.com/protolux-electronics/trellis_core',
    'board': {'w': 50, 'h': 50, 'r': 3, 'thickness': 1.6},
    'holes': holes, 'vias': vias, 'pads': pads, 'parts': parts,
    'tracks': track_out, 'zones': zones,
    'silk': {'lines': silk_lines, 'polys': silk_polys, 'texts': silk_texts},
}
json.dump(data, open(out, 'w'), separators=(',', ':'))
for l in CU: print(l, len(track_out[l]), 'tracks', len(zones[l]), 'zones', sum(len(z) for z in zones[l]) // 2, 'pts')
print(len(vias), 'vias', len(pads), 'pads', len(parts), 'parts', len(holes), 'holes', len(silk_texts), 'texts', len(silk_polys), 'silk polys')
