"""Make a light, rigged plaza model from a new (static) cat, reusing an
existing lite rig's skeleton and all its animation clips.

  .venv-blender/bin/python tools/blender/lite_rig.py RIG.glb NEW.glb OUT.glb [TRIS]

RIG.glb is an existing rigged lite model (armature + skinned mesh + clips,
e.g. public/models/lite/mesh-norweg.glb); NEW.glb is the new look (any
number of static meshes, e.g. body + tail). The new meshes are fitted onto
the old mesh (same height, feet on the same floor, centred), reduced to
about TRIS triangles in total (default 10000), skinned by copying the old
mesh's weights from the nearest surface point, and exported with the old
skeleton and clips. Each new mesh keeps its own material (the tail's
vertex colours stay on the tail).
"""
import bpy, bmesh, sys
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
rig_path, new_path, out_path = args[0], args[1], args[2]
TRIS = int(args[3]) if len(args) > 3 else 10000
# 'box' (or FIT=box): stretch the RIG onto the new cat per axis (length,
# width, height) instead of scaling the new cat to the rig's height, so a
# long-legged or long-bodied cat gets its legs on the rig's legs.
import os
FIT = args[4] if len(args) > 4 else os.environ.get('FIT', 'height')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def world_box(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        ev = o.evaluated_get(dg)
        pts += [ev.matrix_world @ v.co for v in ev.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi

# ---- the old rig (rest pose)
bpy.ops.import_scene.gltf(filepath=rig_path)
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
old = max((o for o in scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
for o in scene.objects:
    o.select_set(False)
keep_action = None
if arm.animation_data:
    keep_action = arm.animation_data.action
    arm.animation_data.action = None  # measure in rest pose
arm.data.pose_position = 'REST'
bpy.context.view_layer.update()
old_lo, old_hi = world_box([old])

# ---- the new look
before = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=new_path)
new = [o for o in scene.objects if o not in before and o.type == 'MESH']
for o in new:  # bake parent transforms in, then detach
    m = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = m
for o in scene.objects:
    if o not in before and o.type != 'MESH':
        bpy.data.objects.remove(o)
bpy.context.view_layer.update()
new_lo, new_hi = world_box(new)
old_c = Vector(((old_lo.x + old_hi.x) / 2, (old_lo.y + old_hi.y) / 2, old_lo.z))
new_c = Vector(((new_lo.x + new_hi.x) / 2, (new_lo.y + new_hi.y) / 2, new_lo.z))
if FIT == 'box':
    # Rig (armature + its mesh) stretched onto the new cat's bounding box.
    k = [(new_hi[i] - new_lo[i]) / (old_hi[i] - old_lo[i]) for i in range(3)]
    stretch = Matrix.Diagonal((k[0], k[1], k[2], 1.0))
    arm.matrix_world = Matrix.Translation(new_c) @ stretch @ Matrix.Translation(-old_c) @ arm.matrix_world
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    old.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    print(f'rig stretched x{k[0]:.2f} y{k[1]:.2f} z{k[2]:.2f}')
else:
    s = (old_hi.z - old_lo.z) / (new_hi.z - new_lo.z)   # Blender Z up
    for o in new:
        o.matrix_world = (
            Matrix.Translation(old_c) @ Matrix.Scale(s, 4) @ Matrix.Translation(-new_c)
            @ o.matrix_world)
bpy.context.view_layer.update()

# ---- reduce, apply transforms
total = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in new)
for o in new:
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if FIT == 'box':
        # glTF splits vertices along UV seams; weld them (UVs live on the
        # face corners in Blender, so nothing is lost) so the skin can't
        # tear open at a seam when its weights are smoothed.
        bm = bmesh.new()
        bm.from_mesh(o.data)
        size = max(o.dimensions)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=size * 1e-5)
        bm.to_mesh(o.data)
        bm.free()
    if total > TRIS:
        d = o.modifiers.new('dec', 'DECIMATE')
        d.ratio = TRIS / total
        bpy.ops.object.modifier_apply(modifier='dec')
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print(f'{o.name}: {tris} triangles')

# ---- skin: copy weights from the old mesh, bind to the old armature
old.data.update()
for o in new:
    for g in old.vertex_groups:
        o.vertex_groups.new(name=g.name)
    dt = o.modifiers.new('weights', 'DATA_TRANSFER')
    dt.object = old
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='weights')
    if FIT == 'box':
        # Soften the copied weights: the plaza rig's hard joints pull spikes
        # out of the legs at the extremes of the run cycle.
        bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
        bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.6, repeat=6, expand=0.0)
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        bpy.ops.object.mode_set(mode='OBJECT')
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    am = o.modifiers.new('armature', 'ARMATURE')
    am.object = arm

bpy.data.objects.remove(old)
arm.data.pose_position = 'POSE'
if arm.animation_data:
    arm.animation_data.action = keep_action

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_skins=True,
                          export_animations=True, export_animation_mode='ACTIONS',
                          export_image_format='WEBP', export_image_quality=85,
                          export_vertex_color='ACTIVE')
print('wrote', out_path)
