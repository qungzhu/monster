"""Remove an extra (duplicate) tail from a GLB, keeping everything else.

Every pet must have exactly one tail. Reconstructed meshes sometimes grow a
second one (the chunky tabby had a thin tube trailing from its pom-pom tail).
Starting at a point on the extra tail's tip, the selection grows along the
surface while the mesh stays thin (local thickness < T, measured by casting
inward), so it stops where the tail meets the thicker pom-pom/body. That part
is deleted and the opening capped with the existing rim vertices, so skin
weights stay valid; skeleton, animations and textures are exported as they
were.

  .venv-blender/bin/python tools/blender/remove_tail.py IN.glb OUT.glb T X,Y,Z

T is in the mesh's local units; X,Y,Z is a point near the extra tail's tip
in the mesh's local space (Blender axes, Z up). Check the result from the
side and back before replacing a model. Used on cat2-rigged-safe.glb with
T=4 and tip -18.4,14.1,12.3.
"""
import bpy, bmesh, sys
from collections import deque
from mathutils import Vector
from mathutils.bvhtree import BVHTree

src, dst, T, tip_arg = sys.argv[-4], sys.argv[-3], float(sys.argv[-2]), sys.argv[-1]
tip_point = Vector(tuple(float(c) for c in tip_arg.split(',')))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
body = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = body.data

# Thickness in the rest pose (armature off while measuring).
arm = [m for m in body.modifiers if m.type == 'ARMATURE']
for m in arm:
    m.show_viewport = False
bpy.context.view_layer.update()
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
for m in arm:
    m.show_viewport = True
thick = []
for v in me.vertices:
    hit = bvh.ray_cast(v.co - v.normal * 0.05, -v.normal)
    thick.append((hit[0] - v.co).length if hit[0] else float('inf'))

# Weld by position so UV seams don't stop the growth.
key = {}
weld = [key.setdefault(tuple(round(c, 4) for c in v.co), len(key)) for v in me.vertices]
adj = {}
for e in me.edges:
    a, b = weld[e.vertices[0]], weld[e.vertices[1]]
    adj.setdefault(a, set()).add(b)
    adj.setdefault(b, set()).add(a)
gthick = {}
for i, g in enumerate(weld):
    gthick[g] = min(gthick.get(g, float('inf')), thick[i])

tip = min(range(len(me.vertices)), key=lambda i: (me.vertices[i].co - tip_point).length)
seen = {weld[tip]}
queue = deque([weld[tip]])
while queue:
    g = queue.popleft()
    for n in adj.get(g, ()):
        if n not in seen and gthick[n] < T:
            seen.add(n)
            queue.append(n)
doomed = {i for i, g in enumerate(weld) if g in seen}
print(f'removing {len(doomed)} of {len(me.vertices)} vertices')

bm = bmesh.new()
bm.from_mesh(me)
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
cut_edges = list(seen_e)
deg = {}
for e in cut_edges:
    for v in e.verts:
        deg[v] = deg.get(v, 0) + 1
print(f'cut rim: {len(cut_edges)} edges, {sum(1 for d in deg.values() if d != 2)} open ends')
cap = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=cut_edges)['geom']
cap = [f for f in cap if isinstance(f, bmesh.types.BMFace)]
bmesh.ops.recalc_face_normals(bm, faces=cap)
# New faces have no UVs (they'd sample a dark texel): give each corner the
# UV its vertex already has on the neighbouring fur.
cap_set = set(cap)
for layer in bm.loops.layers.uv.values():
    for f in cap:
        for loop in f.loops:
            other = next((l for l in loop.vert.link_loops if l.face not in cap_set), None)
            if other:
                loop[layer].uv = other[layer].uv.copy()
cap_verts = list({v for f in cap for v in f.verts})
for _ in range(3):  # round the cap off so it doesn't read as a flat cut
    bmesh.ops.smooth_vert(bm, verts=cap_verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
print(f'capped with {len(cap)} faces')
bm.to_mesh(me)
bm.free()
me.update()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='AUTO',
                          export_skins=True, export_animations=True, export_yup=True)
print('wrote', dst)
