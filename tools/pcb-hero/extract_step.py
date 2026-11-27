#!/usr/bin/env python3
"""Turn a KiCad STEP export of the board into the part models the stackup hero draws.

Usage: python3 tools/pcb-hero/extract_step.py board.step static/hero-pcb/parts.bin [--cache dir]

Needs cadquery-ocp (OpenCASCADE) and numpy:  pip install cadquery-ocp numpy

Every component of the assembly except the bare board is tessellated with its face colours and
written as one mesh in board millimetres (x right, y down the board as in KiCad, z up from the
board's top face). parts.bin is a small JSON header followed by the buffers:

  uint32 header length, header JSON, padding to 4 bytes, then
  vertices  int16 x, y, z (1/100 mm), int16 part number;  int8 normal x, y, z, pad;  uint8 r, g, b (sRGB), 255
            (16 bytes; the part number is the vertex's index into `parts`)
  indices   uint32
  header: { vertices, indices, scale, parts: [{ name, first, count, box: [x0, y0, z0, x1, y1, z1] }] }
          `first`/`count` are the part's range in the index buffer, so one part can be drawn on its own.

Reading a large STEP file takes minutes; --cache keeps the tessellated parts between runs.
"""
import sys, os, json, struct, pickle, time
import numpy as np

def read_parts(path, lin=0.06, ang=0.5):
    from OCP.STEPCAFControl import STEPCAFControl_Reader
    from OCP.TDocStd import TDocStd_Document
    from OCP.TCollection import TCollection_ExtendedString
    from OCP.XCAFDoc import XCAFDoc_DocumentTool, XCAFDoc_ColorSurf, XCAFDoc_ColorGen
    from OCP.TDF import TDF_Label
    from OCP.collections import Sequence_TDF_Label
    from OCP.TDataStd import TDataStd_Name
    from OCP.IFSelect import IFSelect_RetDone
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID, TopAbs_REVERSED
    from OCP.TopoDS import TopoDS
    from OCP.BRep import BRep_Tool
    from OCP.TopLoc import TopLoc_Location
    from OCP.Quantity import Quantity_Color, Quantity_TOC_sRGB
    from OCP.BRepAdaptor import BRepAdaptor_Surface
    from OCP.BRepLProp import BRepLProp_SLProps

    doc = TDocStd_Document(TCollection_ExtendedString('step'))
    reader = STEPCAFControl_Reader()
    reader.SetColorMode(True); reader.SetNameMode(True)
    if reader.ReadFile(path) != IFSelect_RetDone: raise SystemExit(f'cannot read {path}')
    reader.Transfer(doc)
    st = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    ct = XCAFDoc_DocumentTool.ColorTool_s(doc.Main())

    def name(label):
        n = TDataStd_Name()
        return n.Get().ToExtString() if label.FindAttribute(TDataStd_Name.GetID_s(), n) else ''
    def colour(shape):
        c = Quantity_Color()
        for kind in (XCAFDoc_ColorSurf, XCAFDoc_ColorGen):
            if ct.GetColor(shape, kind, c): return c.Values(Quantity_TOC_sRGB)
        return None
    def matrix(loc):
        t = loc.Transformation()
        return np.array([[t.Value(r, c) for c in range(1, 5)] for r in range(1, 4)])

    protos = {}   # prototype label entry -> (vertices, normals, colours, triangles)
    def tessellate(label):
        shape = st.GetShape_s(label)
        BRepMesh_IncrementalMesh(shape, lin, False, ang, True)
        base = colour(shape) or (0.5, 0.5, 0.5)
        V, N, C, T = [], [], [], []
        nv = 0
        def faces(of, inherited):
            nonlocal nv
            ex = TopExp_Explorer(of, TopAbs_FACE)
            while ex.More():
                face = TopoDS.Face(ex.Current()); ex.Next()
                loc = TopLoc_Location()
                tri = BRep_Tool.Triangulation_s(face, loc)
                if tri is None: continue
                m = matrix(loc)
                col = colour(face) or inherited
                n = tri.NbNodes()
                pts = np.array([[tri.Node(i).X(), tri.Node(i).Y(), tri.Node(i).Z()] for i in range(1, n + 1)])
                pts = pts @ m[:, :3].T + m[:, 3]
                # normals from the surface where the mesh has uv, else from the triangles
                rev = face.Orientation() == TopAbs_REVERSED
                tris = []
                for i in range(1, tri.NbTriangles() + 1):
                    a, b, c = tri.Triangle(i).Get()
                    tris.append((a - 1, c - 1, b - 1) if rev else (a - 1, b - 1, c - 1))
                tris = np.array(tris, dtype=np.int64).reshape(-1, 3)
                nrm = np.zeros((n, 3))
                if tri.HasUVNodes():
                    surf = BRepAdaptor_Surface(face, False)
                    props = BRepLProp_SLProps(surf, 1, 1e-6)
                    for i in range(1, n + 1):
                        uv = tri.UVNode(i)
                        props.SetParameters(uv.X(), uv.Y())
                        if props.IsNormalDefined():
                            d = props.Normal(); nrm[i - 1] = (d.X(), d.Y(), d.Z())
                    nrm = nrm @ m[:, :3].T
                    if rev: nrm = -nrm
                fn = np.cross(pts[tris[:, 1]] - pts[tris[:, 0]], pts[tris[:, 2]] - pts[tris[:, 0]])
                bad = np.linalg.norm(nrm, axis=1) < 0.5
                if bad.any():
                    acc = np.zeros((n, 3))
                    for k in range(3): np.add.at(acc, tris[:, k], fn)
                    nrm[bad] = acc[bad]
                V.append(pts); N.append(nrm); C.append(np.tile(col, (n, 1))); T.append(tris + nv)
                nv += n
        # solids carry their own colours; faces outside any solid take the part's
        seen = TopExp_Explorer(shape, TopAbs_SOLID)
        any_solid = False
        while seen.More():
            solid = seen.Current(); seen.Next(); any_solid = True
            faces(solid, colour(solid) or base)
        if not any_solid: faces(shape, base)
        if not V: return None
        return np.vstack(V), np.vstack(N), np.vstack(C), np.vstack(T)

    out = []
    def walk(label, m, path):
        ref = TDF_Label()
        target = label
        if st.IsReference_s(label):
            st.GetReferredShape_s(label, ref)
            loc = st.GetLocation_s(label)
            lm = matrix(loc)
            m = np.hstack([m[:, :3] @ lm[:, :3], (m[:, :3] @ lm[:, 3] + m[:, 3]).reshape(3, 1)])
            target = ref
        nm = name(label) or name(target)
        if st.IsAssembly_s(target):
            comps = Sequence_TDF_Label(); st.GetComponents_s(target, comps)
            for i in range(1, comps.Length() + 1): walk(comps.Value(i), m, path + [nm])
            return
        key = target.Tag(), target.Father().Tag(), name(target)
        if key not in protos: protos[key] = tessellate(target)
        mesh = protos[key]
        if mesh is None: return
        v, n, c, t = mesh
        out.append({'name': nm, 'proto': name(target), 'path': path, 'v': v @ m[:, :3].T + m[:, 3], 'n': n @ m[:, :3].T, 'c': c, 't': t})
    free = Sequence_TDF_Label(); st.GetFreeShapes(free)
    eye = np.hstack([np.eye(3), np.zeros((3, 1))])
    for i in range(1, free.Length() + 1): walk(free.Value(i), eye, [])
    return out

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    src, dst = args[0], args[1]
    cache = sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv else None
    pk = cache and os.path.join(cache, os.path.basename(src) + '.parts.pickle')
    if pk and os.path.exists(pk) and os.path.getmtime(pk) > os.path.getmtime(src):
        parts = pickle.load(open(pk, 'rb'))
    else:
        t = time.time()
        parts = read_parts(src)
        print(f'read {len(parts)} parts in {time.time() - t:.0f} s')
        if pk: os.makedirs(cache, exist_ok=True); pickle.dump(parts, open(pk, 'wb'))

    # The board itself (KiCad exports its body, copper, pads, vias, mask and silkscreen as
    # unnamed shapes as large as the board) gives the origin and is left out: the hero draws the
    # board from the KiCad file. A part made of several shapes is one part, named by its reference.
    def box(p): return np.concatenate([p['v'].min(0), p['v'].max(0)])
    def area(p): b = box(p); return (b[3] - b[0]) * (b[4] - b[1])
    body = max(parts, key=area)
    bb = box(body)
    is_board = lambda p: not p['name'] or p['name'].startswith('=>') or area(p) > 0.5 * area(body)
    top = max(box(p)[5] for p in parts if is_board(p))
    parts = [p for p in parts if not is_board(p)]
    # parts rest on the board: the height most of them start at is its top face
    lows = np.round([box(p)[2] for p in parts], 1)
    vals, counts = np.unique(lows, return_counts=True)
    top = float(vals[counts.argmax()]) if len(vals) else top
    bb[5] = top
    print('board', bb.round(2), 'top face at', top)
    merged = {}
    for p in parts:
        ref = p['path'][1] if len(p['path']) > 1 else p['name']
        m = merged.setdefault(ref, {'name': ref, 'v': [], 'n': [], 'c': [], 't': [], 'nv': 0})
        m['t'].append(p['t'] + m['nv']); m['nv'] += len(p['v'])
        for k in 'vnc': m[k].append(p[k])
    parts = [{'name': m['name'], **{k: np.vstack(m[k]) for k in 'vnct'}} for m in merged.values()]
    V, N, C, I, P, meta = [], [], [], [], [], []
    nv = ni = 0
    for p in parts:
        v = p['v'].copy()
        # board mm: x from the board's left edge, y down from its top edge (STEP's y points up), z up from its top face
        v = np.stack([v[:, 0] - bb[0], bb[4] - v[:, 1], v[:, 2] - bb[5]], axis=1)
        n = p['n'] * np.array([1, -1, 1])
        ln = np.linalg.norm(n, axis=1, keepdims=True); n = n / np.where(ln < 1e-9, 1, ln)
        t = p['t'][:, [0, 2, 1]]   # the y flip turns the triangles over
        # drop degenerate triangles
        a, b, c = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
        t = t[np.linalg.norm(np.cross(b - a, c - a), axis=1) > 1e-7]
        if not len(t): continue
        meta.append({'name': p['name'], 'first': ni, 'count': int(t.size), 'box': [round(float(x), 2) for x in np.concatenate([v.min(0), v.max(0)])]})
        P.append(np.full(len(v), len(meta) - 1))
        V.append(v); N.append(n); C.append(p['c']); I.append(t + nv)
        nv += len(v); ni += t.size
    V, N, C, I = np.vstack(V), np.vstack(N), np.vstack(C), np.vstack(I)
    scale = 100
    vb = np.zeros(nv, dtype=[('p', '<i2', 3), ('part', '<i2'), ('n', 'i1', 4), ('c', 'u1', 4)])
    vb['p'] = np.clip(np.round(V * scale), -32768, 32767)
    vb['part'] = np.concatenate(P)
    vb['n'][:, :3] = np.round(N * 127)
    vb['c'][:, :3] = np.round(np.clip(C, 0, 1) * 255)
    vb['c'][:, 3] = 255
    head = json.dumps({'vertices': nv, 'indices': int(I.size), 'scale': scale, 'stride': vb.dtype.itemsize, 'parts': meta}, separators=(',', ':')).encode()
    head += b' ' * (-(4 + len(head)) % 4)
    with open(dst, 'wb') as f:
        f.write(struct.pack('<I', len(head))); f.write(head); f.write(vb.tobytes()); f.write(I.astype('<u4').tobytes())
    print(f'{len(meta)} parts, {nv} vertices, {I.size // 3} triangles, {os.path.getsize(dst) / 1e6:.1f} MB -> {dst}')
    from collections import Counter
    print(Counter(m['name'] for m in meta).most_common(12))

if __name__ == '__main__':
    main()
