"""Rebuild a reconstructed (Meshy) model into a clean, watertight surface,
optionally removing part of it first (an extra tail), and bake the original
colours onto the new surface.

Why: local cut-and-cap repairs on Meshy meshes leave ragged edges and stray
UV islands. Remeshing the whole surface makes the cut disappear, closes the
small holes these meshes have, and the bake keeps the face, eyes and coat
exactly as generated. Static (unrigged) models only — rigged ones would
lose their skin weights.

  .venv-blender/bin/python tools/blender/rebuild_mesh.py IN.glb OUT.glb \\
      [--remove "y > 0.56 and z > 0.19" [--collapse X,Y,Z]] [--smooth-at X,Y,Z,R]
      [--close 0.012] [--voxel 0.006] [--faces 60000] [--tex 2048]

--remove is a Python condition on the vertex's local x, y, z (Blender axes,
Z up) selecting what to take away (an extra tail). With --collapse the
selection is not deleted but pulled into a small blob at X,Y,Z inside the
body, which the remesh merges away; this leaves no scar, unlike cut-and-cap.
Check the result from the side and back.
"""
import bpy, bmesh, os, sys, math
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshfix import cut_and_cap  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
src, dst = argv[0], argv[1]
opt = lambda name, default: argv[argv.index(name) + 1] if name in argv else default
REMOVE = opt('--remove', None)
# Instead of deleting, pull the selection into this point (x,y,z) inside the
# body: the voxel remesh unions it away — no hole, no seam.
COLLAPSE = opt('--collapse', None)
# Sand a dent (e.g. a hole the generator left) after the remesh: x,y,z,radius.
SMOOTH_AT = opt('--smooth-at', None)
# Morphological closing distance: fills pockets/folds narrower than ~2x this.
CLOSE = float(opt('--close', 0))
VOXEL, FACES, TEX = float(opt('--voxel', 0.006)), int(opt('--faces', 60000)), int(opt('--tex', 2048))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
orig = max((o for o in scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if any(m.type == 'ARMATURE' for m in orig.modifiers):
    sys.exit('rigged model: use remove_tail.py instead (keeps skin weights)')

def select_only(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

# ---- 1. working copy, cut, rough cap (the remesh smooths it over)
select_only(orig)
bpy.ops.object.duplicate()
work = bpy.context.active_object
if REMOVE:
    test = eval(f'lambda x, y, z: {REMOVE}')  # trusted, operator-supplied
    bm = bmesh.new(); bm.from_mesh(work.data)
    doomed = [v for v in bm.verts if test(*v.co)]
    print(f'removing {len(doomed)} of {len(bm.verts)} vertices')
    # Where the cut is: the rim (kept vertices next to removed ones).
    gone = set(doomed)
    rim = {n for v in doomed for e in v.link_edges for n in e.verts if n not in gone}
    cut_centre = sum((v.co for v in rim), Vector()) / max(len(rim), 1)
    cut_radius = max(((v.co - cut_centre).length for v in rim), default=0)
    if COLLAPSE:
        target = Vector(tuple(float(c) for c in COLLAPSE.split(',')))
        for v in doomed:  # a small blob around the target, keeping the topology closed
            v.co = target + (v.co - target) * 0.04
        cut_radius = 0  # nothing to sand
    else:
        cap = cut_and_cap(bm, {v.index for v in doomed})
        # Paint the patch in the surrounding fur colour: average the texture
        # under the rim, give the cap its own flat material in the bake source.
        uv = bm.loops.layers.uv.active
        cap_ids = {f.index for f in cap}
        rim_uvs = [l[uv].uv.copy() for f in cap for v in f.verts for l in v.link_loops
                   if l.face.index not in cap_ids] if uv else []
        src_mat = work.data.materials[0]
        img = next((n.image for n in src_mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
        patch = (0.8, 0.75, 0.7)
        if img and rim_uvs:
            w, h = img.size
            px = img.pixels[:]
            acc = [0.0, 0.0, 0.0]
            for u in rim_uvs:
                x = min(w - 1, max(0, int(u.x % 1 * w))); y = min(h - 1, max(0, int(u.y % 1 * h)))
                i = (y * w + x) * 4
                for k in range(3):
                    acc[k] += px[i + k]
            patch = tuple(a / len(rim_uvs) for a in acc)
        for f in cap:
            f.material_index = 1
        pm = bpy.data.materials.new('patch')
        pm.use_nodes = True
        pm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*patch, 1)
        work.data.materials.append(pm)
        print(f'cap patch colour {tuple(round(c, 3) for c in patch)} from {len(rim_uvs)} rim samples')
    bm.to_mesh(work.data); bm.free()

# The voxel remesh needs a closed surface: reconstructed meshes also have a
# few small holes, and one open hole lets the inside "leak" (fragments).
bm = bmesh.new(); bm.from_mesh(work.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
filled = 0
for _ in range(6):
    # Peel off dangling slivers (faces with 2+ open edges) — they keep a
    # hole from closing — then fill what's left.
    slivers = [f for f in bm.faces if sum(e.is_boundary for e in f.edges) >= 2]
    if slivers:
        bmesh.ops.delete(bm, geom=slivers, context='FACES')
    filled += len(bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)['faces'])
    if not slivers and not any(e.is_boundary for e in bm.edges):
        break
open_edges = sum(1 for e in bm.edges if e.is_boundary)
bm.to_mesh(work.data); bm.free()
print(f'closed holes with {filled} faces, {open_edges} open edges left')

# The bake source is the repaired copy (tail gone, opening capped with fur
# colour), not the original: there the rays would find the old tail/hole.
select_only(work)
bpy.ops.object.duplicate()
source = bpy.context.active_object

# ---- 2. rebuild the surface: voxel remesh (watertight), soften, reduce
select_only(work)

def voxel_remesh(obj):
    rm = obj.modifiers.new('remesh', 'REMESH')
    rm.mode, rm.voxel_size, rm.adaptivity = 'VOXEL', VOXEL, 0.0
    bpy.ops.object.modifier_apply(modifier='remesh')

def offset_surface(obj, d):
    disp = obj.modifiers.new('offset', 'DISPLACE')
    disp.direction, disp.mid_level, disp.strength = 'NORMAL', 0.0, d
    bpy.ops.object.modifier_apply(modifier='offset')

voxel_remesh(work)
if CLOSE:
    # Closing = grow, merge, shrink: pockets narrower than ~2*CLOSE (the fold
    # an extra tail leaves at its root) fill up; the overall shape returns.
    offset_surface(work, CLOSE)
    voxel_remesh(work)
    offset_surface(work, -CLOSE)
    voxel_remesh(work)
    print(f'closed pockets narrower than {2 * CLOSE:.3f}')
sm = work.modifiers.new('smooth', 'CORRECTIVE_SMOOTH')
sm.factor, sm.iterations, sm.use_only_smooth = 0.5, 4, False
bpy.ops.object.modifier_apply(modifier='smooth')
if len(work.data.polygons) > FACES:
    dec = work.modifiers.new('dec', 'DECIMATE')
    dec.ratio = FACES / len(work.data.polygons)
    bpy.ops.object.modifier_apply(modifier='dec')
if REMOVE and cut_radius:
    # Sand the scar: strong smoothing that fades out away from the cut.
    bm = bmesh.new(); bm.from_mesh(work.data)
    reach = cut_radius * 1.8
    near = [v for v in bm.verts if (v.co - cut_centre).length < reach]
    for _ in range(40):
        bmesh.ops.smooth_vert(bm, verts=[v for v in near if (v.co - cut_centre).length < reach * 0.75],
                              factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bmesh.ops.smooth_vert(bm, verts=near, factor=0.2, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(work.data); bm.free()
    print(f'smoothed {len(near)} vertices around the cut')
if SMOOTH_AT:
    px, py, pz, pr = (float(c) for c in SMOOTH_AT.split(','))
    bm = bmesh.new(); bm.from_mesh(work.data)
    p = Vector((px, py, pz))
    zone = [v for v in bm.verts if (v.co - p).length < pr]
    core = [v for v in zone if (v.co - p).length < pr * 0.6]
    for _ in range(60):
        bmesh.ops.smooth_vert(bm, verts=core, factor=0.7, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bmesh.ops.smooth_vert(bm, verts=zone, factor=0.25, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(work.data); bm.free()
    print(f'sanded {len(zone)} vertices at {SMOOTH_AT}')
bpy.ops.object.shade_smooth()
print(f'rebuilt surface: {len(work.data.polygons)} faces')

# ---- 3. new UVs + bake the original colours onto them
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
img = bpy.data.images.new('baked_color', TEX, TEX)
mat = bpy.data.materials.new('fur')
mat.use_nodes = True
nt = mat.node_tree
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
nt.nodes.active = tex
work.data.materials.clear()
work.data.materials.append(mat)

scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = VOXEL * 5
scene.render.bake.max_ray_distance = VOXEL * 20
scene.render.bake.margin = 8
bpy.ops.object.select_all(action='DESELECT')
source.select_set(True)
work.select_set(True)
bpy.context.view_layer.objects.active = work
bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
print('baked colours')

# ---- 4. export just the rebuilt model
bpy.data.objects.remove(orig)
bpy.data.objects.remove(source)
work.name = 'cat'
select_only(work)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True,
                          export_image_format='WEBP', export_image_quality=90, export_yup=True)
print('wrote', dst)
