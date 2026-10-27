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
  .venv-blender/bin/python tools/blender/remove_tail.py IN.glb OUT.glb region "y > 0.5 and z > 0.27"

Thin mode: T is in the mesh's local units; X,Y,Z is a point near the extra
tail's tip in the mesh's local space (Blender axes, Z up). Region mode: a
Python condition on the vertex's local x, y, z — for an extra tail that is
as thick as the body (the Meshy Himalayan grew a second tail curling up
from its back). Check the result from the side and back before replacing a
model. Used on cat2-rigged-safe.glb (thin, T=4, tip -18.4,14.1,12.3) and
the Meshy Himalayan (region "y > 0.5 and z > 0.27").
"""
import bpy, bmesh, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshfix import cut_and_cap  # noqa: E402
from collections import deque
from mathutils import Vector
from mathutils.bvhtree import BVHTree

src, dst, mode, arg = sys.argv[-4], sys.argv[-3], sys.argv[-2], sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
body = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
me = body.data

if mode == 'region':
    test = eval(f'lambda x, y, z: {arg}')  # trusted, operator-supplied
    doomed = {v.index for v in me.vertices if test(*v.co)}
else:
    T, tip_point = float(mode), Vector(tuple(float(c) for c in arg.split(',')))
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
cap = cut_and_cap(bm, doomed)
print(f'capped with {len(cap)} faces')
bm.to_mesh(me)
bm.free()
me.update()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='AUTO',
                          export_skins=True, export_animations=True, export_yup=True)
print('wrote', dst)
