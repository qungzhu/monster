"""Shared mesh repairs for the Blender tools."""
import bmesh
from mathutils import Vector


def cut_and_cap(bm, doomed):
    """Delete the vertices in `doomed` (set of indices) and close the
    opening: weld the rim (UV seams split it), walk the full boundary loop,
    fan each loop around a slightly bulged centre vertex (skin weights and a
    single UV copied from the neighbouring fur), and smooth the scar.
    Returns the new cap faces."""
    # Create the role layer first: adding a layer reallocates element data and
    # invalidates Python references taken before it.
    if 'cap_role' not in bm.verts.layers.int:
        bm.verts.layers.int.new('cap_role')
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        v.tag = False
    for i in doomed:  # tag the rim: vertices that share a face with the removed tail
        for f in bm.verts[i].link_faces:
            for n in f.verts:
                if n.index not in doomed:
                    n.tag = True
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in doomed], context='VERTS')
    # UV seams split vertices, so the opening isn't one closed loop yet: weld the
    # rim by position (UVs live on face corners in BMesh, so seams survive).
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.tag], dist=1e-4)
    # The whole boundary loop the rim belongs to (walking boundary edges closes
    # any gap left by vertices that only touched the tail diagonally).
    boundary = [e for e in bm.edges if e.is_boundary]
    by_vert = {}
    for e in boundary:
        for v in e.verts:
            by_vert.setdefault(v, []).append(e)
    seen_e, stack = set(), [v for v in by_vert if v.tag]
    seen_v = set(stack)
    while stack:
        v = stack.pop()
        for e in by_vert[v]:
            if e in seen_e:
                continue
            seen_e.add(e)
            o = e.other_vert(v)
            if o not in seen_v:
                seen_v.add(o)
                stack.append(o)
    return fan_close(bm, list(seen_e))


def fan_close(bm, cut_edges):
    """Close the boundary loops formed by `cut_edges`: each loop is fanned
    around a slightly bulged centre vertex (skin weights and one UV copied
    from the neighbouring surface), then the scar is smoothed. Returns the
    new faces."""

    # Order the rim into chains and close each with a fan around a new centre
    # vertex (cleaner than triangulating an uneven, non-planar opening).
    adj_e = {}
    for e in cut_edges:
        for v in e.verts:
            adj_e.setdefault(v, []).append(e.other_vert(v))
    ends = [v for v, n in adj_e.items() if len(n) == 1]
    print(f'cut rim: {len(cut_edges)} edges, {len(ends)} open ends')
    chains, used = [], set()
    for start in ends + list(adj_e):
        if start in used:
            continue
        chain, prev, cur = [start], None, start
        used.add(start)
        while True:
            nxt = next((n for n in adj_e[cur] if n is not prev and n not in used), None)
            if nxt is None:
                break
            chain.append(nxt); used.add(nxt); prev, cur = cur, nxt
        if len(chain) >= 3:
            chains.append(chain)

    body_centre = sum((v.co for v in bm.verts), Vector()) / max(len(bm.verts), 1)
    deform = bm.verts.layers.deform.active
    uv_layers = list(bm.loops.layers.uv.values())
    cap, centres = [], []
    for chain in chains:
        centre = sum((v.co for v in chain), Vector()) / len(chain)
        # Bulge outward so the cap is round, never dented: away from the body's
        # centre (rim normals at a tail/body junction can point inward).
        outward = centre - body_centre
        if outward.length:
            centre += outward.normalized() * 0.3 * max((v.co - centre).length for v in chain)
        c = bm.verts.new(centre)
        centres.append(c)
        nearest = min(chain, key=lambda v: (v.co - centre).length)
        if deform:
            c[deform].clear()
            for gi, w in nearest[deform].items():
                c[deform][gi] = w
        ring = chain + ([chain[0]] if chain[0] in adj_e.get(chain[-1], []) else [])
        for a_, b_ in zip(ring, ring[1:]):
            try:
                cap.append(bm.faces.new((b_, a_, c)))
            except ValueError:
                pass  # face already exists
    # Turn each fan into a membrane: split the spokes, then relax the inner
    # points with the rim held still — like a soap film across the opening,
    # it meets the surrounding surface smoothly instead of as a cone.
    # Python references to BMesh elements don't survive the ops below, so the
    # roles live in a data layer: 1 = rim, 2 = inner (centres + new points).
    role = bm.verts.layers.int['cap_role']
    for v in bm.verts:
        v[role] = 0
    for chain in chains:
        for v in chain:
            v[role] = 1
    for c in centres:
        c[role] = 2
    spokes = [e for c in centres for e in c.link_edges]
    if spokes:
        new = bmesh.ops.subdivide_edges(bm, edges=spokes, cuts=6, use_grid_fill=False)
        for el in new['geom_inner'] + new['geom_split']:
            if isinstance(el, bmesh.types.BMVert) and el[role] == 0:
                el[role] = 2
    rim_list = [v for v in bm.verts if v[role] == 1]
    inner = [v for v in bm.verts if v[role] == 2]
    print(f'membrane: {len(inner)} inner vertices')
    for f in bm.faces:
        f.tag = False
    for v in inner:
        for f in v.link_faces:
            f.tag = True
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if f.tag])
    rim_list = [v for v in bm.verts if v[role] == 1]
    inner = [v for v in bm.verts if v[role] == 2]
    cap = [f for f in bm.faces if any(v[role] == 2 for v in f.verts)]
    for f in bm.faces:
        f.tag = False
    for f in cap:
        f.tag = True
    for _ in range(60):
        bmesh.ops.smooth_vert(bm, verts=list(inner), factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bmesh.ops.recalc_face_normals(bm, faces=cap)
    if deform:
        for v in inner:
            near = min(rim_list, key=lambda r: (r.co - v.co).length)
            v[deform].clear()
            for gi, w in near[deform].items():
                v[deform][gi] = w
    # One UV for the whole cap, taken from the fur next to it: a single colour
    # reads as part of the coat; per-vertex UVs from different islands don't.
    rim_all = rim_list
    for layer in uv_layers:
        probe = min(rim_all, key=lambda v: (v.co - sum((r.co for r in rim_all), Vector()) / len(rim_all)).length)
        other = next((l for l in probe.link_loops if not l.face.tag), None)
        if other:
            for f in cap:
                for loop in f.loops:
                    loop[layer].uv = other[layer].uv.copy()
    # Iron out the ragged cut: smooth the cap plus a few rings of surface around it.
    region = {v for f in cap for v in f.verts}
    for _ in range(3):
        region |= {n for v in list(region) for e in v.link_edges for n in e.verts}
    region = list(region)
    for _ in range(10):
        bmesh.ops.smooth_vert(bm, verts=region, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    return cap

