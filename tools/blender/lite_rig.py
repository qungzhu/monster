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

# ---- anatomy: put the rig's joints where this cat's joints are.
# The plaza rig's joints are bunched in the middle of the body (front and
# hind legs a few cm apart, the head pivot in the chest), so any weights on
# it pull the cat out of shape when it moves. Find the feet, legs, spine,
# head and tail from the shape (cat faces -Y, Z up) and move each joint
# there, keeping every bone's orientation, so the clips (rotations) still
# play the same.
ANAT = {}


def mean(ps):
    return sum(ps, Vector()) / len(ps)


def place_joints():
    pts = [o.matrix_world @ v.co for o in new for v in o.data.vertices]
    lo, hi = world_box(new)
    H, L = hi.z - lo.z, hi.y - lo.y
    cx = (lo.x + hi.x) / 2
    feet = [p for p in pts if p.z < lo.z + 0.05 * H]
    if len(feet) < 40:
        return 'too few foot vertices'
    fys = sorted(p.y for p in feet)
    ymid = (fys[0] + fys[-1]) / 2
    left = 1 if arm.data.bones['LeftUpLeg'].head_local.x > cx else -1
    foot = {}
    for front in (True, False):
        for is_left in (True, False):
            q = [p for p in feet if (p.y < ymid) == front and ((p.x - cx) * left > 0) == is_left]
            if len(q) < 5:
                return f'no {"front" if front else "hind"} {"left" if is_left else "right"} foot'
            foot[(front, is_left)] = mean(q)
    hind_y = (foot[(False, True)].y + foot[(False, False)].y) / 2
    front_y = (foot[(True, True)].y + foot[(True, False)].y) / 2
    # body height over the hind legs (the head can tower over the front ones)
    col = [p.z for p in pts if abs(p.y - hind_y) < 0.08 * L and abs(p.x - cx) < 0.25 * (hi.x - lo.x)]
    body = (max(col) if col else lo.z + 0.6 * H) - lo.z

    def at(x, y, frac):
        return Vector((x, y, lo.z + frac * body))

    t = {}
    for (front, is_left), f in foot.items():
        side = 'Left' if is_left else 'Right'
        top = at(cx + 0.6 * (f.x - cx), f.y, 0.6)
        knee = at(f.x, f.y, 0.32)
        ankle = at(f.x, f.y, 0.1)
        if front:
            t[side + 'Shoulder'] = at(cx + 0.3 * (f.x - cx), f.y, 0.75)
            t[side + 'Arm'], t[side + 'ForeArm'], t[side + 'Hand'] = top, knee, ankle
        else:
            t[side + 'UpLeg'], t[side + 'Leg'], t[side + 'Foot'] = top, knee, ankle
            t[side + 'ToeBase'] = at(f.x, f.y - 0.04 * L, 0.02)
    hips = at(cx, hind_y, 0.62)
    chest = at(cx, front_y, 0.7)
    t['Hips'] = hips
    for name, k in (('Spine02', 0.33), ('Spine01', 0.66), ('Spine', 1.0)):
        t[name] = hips.lerp(chest, k)
    head_pts = [p for p in pts if p.y < front_y - 0.02 * L and p.z > lo.z + 0.65 * body]
    if len(head_pts) < 40:
        head_pts = [p for p in pts if p.z > lo.z + 0.8 * H]
    hc = mean(head_pts)
    t['neck'] = chest.lerp(hc, 0.35)
    t['Head'] = chest.lerp(hc, 0.6)
    ANAT['head_centre'] = hc

    # tail: what sticks out behind the hind feet
    y0 = fys[int(len(fys) * 0.8)]
    tail = [p for p in pts if p.y > y0 + 0.14 * L and (p.z > lo.z + 0.1 * H or p.y > y0 + 0.2 * L)]
    if len(tail) > 30:
        near = sorted(tail, key=lambda p: p.y)[:max(5, len(tail) // 10)]
        root = mean(near)
        root.x = cx
        tip = max(tail, key=lambda p: (p - root).length)
        t['Tail'] = root
        ANAT['tail_tip'] = tip
        ANAT['tail_dir'] = (mean(tail) - root).normalized()
        ANAT['tail_n'] = len(tail)

    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    ebs = arm.data.edit_bones
    for eb in ebs:
        eb.use_connect = False
    delta = {}

    def place(eb):
        d = (t[eb.name] - eb.head) if eb.name in t else delta.get(eb.parent.name if eb.parent else '', Vector())
        delta[eb.name] = d
        eb.head += d
        eb.tail += d
        for c in eb.children:
            place(c)
    for eb in [b for b in ebs if b.parent is None]:
        place(eb)
    bpy.ops.object.mode_set(mode='OBJECT')
    return None


if FIT == 'box':
    problem = place_joints()
    print('anatomy:', problem or 'joints placed')


def heat_weights(o):
    """Bone-heat weights for mesh o from the rig, on a copy of the armature
    whose bones run joint to joint (the imported bones' tails point far
    outside the cat, which would spoil the heat). Vertex groups are by bone
    name, so they work with the real armature and its clips unchanged."""
    tmp = arm.copy()
    tmp.data = arm.data.copy()
    bpy.context.scene.collection.objects.link(tmp)
    tmp.animation_data_clear()
    tmp.data.pose_position = 'REST'
    bpy.ops.object.select_all(action='DESELECT')
    tmp.select_set(True)
    bpy.context.view_layer.objects.active = tmp
    bpy.ops.object.mode_set(mode='EDIT')
    ebs = tmp.data.edit_bones
    for eb in ebs:
        eb.use_connect = False
    for eb in ebs:
        kids = [c for c in eb.children if (c.head - eb.head).length > 1e-6]
        if kids:
            eb.tail = sum((c.head for c in kids), Vector()) / len(kids)
        elif eb.parent:
            d = eb.head - eb.parent.head
            eb.tail = eb.head + d.normalized() * max(d.length * 0.6, 1e-3)
        if (eb.tail - eb.head).length < 1e-4:
            eb.tail = eb.head + Vector((0, 0, 0.01))
    if 'tail_tip' in ANAT:
        ebs['Tail'].tail = ANAT['tail_tip']
    if 'head_centre' in ANAT:
        eh = ebs['Head']
        eh.tail = eh.head + (ANAT['head_centre'] - eh.head) * 1.6
    # helper bones that are not body parts deform nothing
    for name in ('head_end', 'headfront'):
        if name in ebs:
            ebs[name].use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')

    copied = {g.name: g for g in o.vertex_groups}
    backup = {}
    for v in o.data.vertices:
        backup[v.index] = [(o.vertex_groups[g.group].name, g.weight) for g in v.groups]
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    tmp.select_set(True)
    bpy.context.view_layer.objects.active = tmp
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    # unbind from the temp armature (keep the groups)
    for m in list(o.modifiers):
        if m.type == 'ARMATURE':
            o.modifiers.remove(m)
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
    bpy.data.objects.remove(tmp)

    empty = 0
    for v in o.data.vertices:
        if sum(g.weight for g in v.groups) < 1e-3:
            empty += 1
            for name, w in backup[v.index]:
                g = o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
                g.add([v.index], w, 'REPLACE')
    for name in [g.name for g in old.vertex_groups]:
        if name not in o.vertex_groups:
            o.vertex_groups.new(name=name)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
    bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=2, expand=0.0)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    print(f'heat weights: {empty} of {len(o.data.vertices)} vertices fell back to copied weights')


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
        # The copied weights come from a different (low-poly) cat and drag
        # whole heads and chests around. Weight this cat by its own shape
        # instead (Blender's bone heat), then fall back to the copied
        # weights only where heat finds nothing.
        heat_weights(o)
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    am = o.modifiers.new('armature', 'ARMATURE')
    am.object = arm

bpy.data.objects.remove(old)
arm.data.pose_position = 'POSE'
if arm.animation_data:
    arm.animation_data.action = keep_action

if FIT == 'box':
    import math
    if ANAT.get('tail_dir') is not None:
        tail_dir = ANAT['tail_dir']
        root = arm.data.bones['Tail'].head_local
        print(f"tail: {ANAT['tail_n']} verts, root {tuple(round(c, 3) for c in root)}, dir {tuple(round(c, 2) for c in tail_dir)}")

        # ---- new clips from Idle: TailWag (happy wag) and BellyUp (tail
        # swish while the app rolls the cat onto its back)
        scene = bpy.context.scene
        idle = bpy.data.actions.get('Idle')
        X = Vector((1, 0, 0))
        axis = (arm.matrix_world.inverted().to_3x3() @ tail_dir.cross(X)).normalized()
        if idle and axis.length > 0.5:
            start, end = (int(v) for v in idle.frame_range)
            pb = arm.pose.bones
            AX = Vector((1, 0, 0))  # armature space: across the body

            def turn(name, ax, angle):
                b = pb[name]
                b.matrix = (Matrix.Translation(b.head) @ Matrix.Rotation(angle, 4, ax)
                            @ Matrix.Translation(-b.head) @ b.matrix)
                bpy.context.view_layer.update()

            def paw(chain):
                return pb[chain[-1]].tail.copy()

            # Which way each leg bone folds to bring its paw up toward the
            # belly (tested on the rest pose, so it works for any bone roll).
            front = {'Left': ['LeftArm', 'LeftForeArm', 'LeftHand'], 'Right': ['RightArm', 'RightForeArm', 'RightHand']}
            hind = {'Left': ['LeftUpLeg', 'LeftLeg', 'LeftFoot'], 'Right': ['RightUpLeg', 'RightLeg', 'RightFoot']}
            arm.animation_data.action = idle
            scene.frame_set(start)
            fold = {}
            for chains in (front, hind):
                for chain in chains.values():
                    for bone in chain[:2]:
                        before = paw(chain).z
                        m = pb[bone].matrix.copy()
                        turn(bone, AX, 0.3)
                        fold[bone] = 1 if paw(chain).z > before else -1
                        pb[bone].matrix = m
                        bpy.context.view_layer.update()

            for name, swings, amp in (('TailWag', 4, 0.55), ('BellyUp', 2, 0.4)):
                act = idle.copy()
                act.name = name
                arm.animation_data.action = act
                for f in range(start, end + 1):
                    scene.frame_set(f)
                    t = 2 * math.pi * (f - start) / (end - start)
                    keys = ['Tail']
                    if name == 'BellyUp':
                        # 翻肚皮 paws (the app turns the cat onto its back):
                        # front paws tucked to the chest and batting at the
                        # air one after the other, kneading little bats;
                        # hind legs bent and relaxed, gently cycling.
                        for side, chain in front.items():
                            ph = 0 if side == 'Left' else math.pi
                            bat = max(0.0, math.sin(3 * t + ph))  # quick swipe, then rest
                            turn(chain[0], AX, fold[chain[0]] * (0.3 + 0.35 * bat))
                            turn(chain[1], AX, fold[chain[1]] * (0.45 - 0.3 * bat))
                            keys += chain[:2]
                        for side, chain in hind.items():
                            ph = 0.5 if side == 'Left' else 0.5 + math.pi
                            turn(chain[0], AX, fold[chain[0]] * (0.2 + 0.08 * math.sin(t * 2 + ph)))
                            turn(chain[1], AX, fold[chain[1]] * 0.2)
                            keys += chain[:2]
                        # head rolls lazily side to side
                        turn('Head', Vector((0, 1, 0)), 0.15 * math.sin(t))
                        keys.append('Head')
                    b = pb['Tail']
                    a = amp * math.sin(swings * t)
                    b.matrix = (Matrix.Translation(b.head) @ Matrix.Rotation(a, 4, axis)
                                @ Matrix.Translation(-b.head) @ b.matrix)
                    bpy.context.view_layer.update()
                    for k in keys:
                        pb[k].keyframe_insert('rotation_quaternion')
            arm.animation_data.action = keep_action
    else:
        print('tail: none found')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', export_skins=True,
                          export_animations=True, export_animation_mode='ACTIONS',
                          export_image_format='WEBP', export_image_quality=85,
                          export_vertex_color='ACTIVE')
print('wrote', out_path)
