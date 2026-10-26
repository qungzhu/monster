"""Plush base cat, prototype 2: metaballs (blended spheres/ellipsoids, like a
stuffed toy) -> mesh -> voxel remesh -> quad remesh. Eyes, nose and ears
are placed by ray-casting onto the head surface, so nothing floats.

Built at 10x scale (metaball resolution), scaled to metres at the end.
Z up, the cat faces -Y (glTF +Z after export).
Run: python base_cat.py OUT_DIR [TAG]
"""
import bpy, sys, math, os
from mathutils import Vector, Quaternion

OUT, TAG = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- body (metaballs)
mb = bpy.data.metaballs.new('plush')
mb.resolution = 0.06
mb.render_resolution = 0.06
mb.threshold = 0.32  # low threshold = plumper, softer blends (stuffed look)
mbo = bpy.data.objects.new('plush', mb)
scene.collection.objects.link(mbo)

def el(kind, co, r, size=(1, 1, 1), rot=None, stiff=2.0):
    e = mb.elements.new()
    e.type = kind
    e.co = co
    e.radius = r
    e.stiffness = stiff
    if kind in ('ELLIPSOID', 'CAPSULE'):
        e.size_x, e.size_y, e.size_z = size
    if rot:
        e.rotation = rot
    return e

UP = Quaternion((0, 1, 0), math.radians(90))   # capsule along Z
# Proportions from the owner's plush sheets: huge round head sitting
# straight on the body (no neck), deep round body, short chunky legs,
# big fluffy tail.
el('ELLIPSOID', (0, -1.05, 2.70), 1.48, (1.08, 0.92, 0.92))      # head
for x in (0.55, -0.55):
    el('BALL', (x, -1.55, 2.42), 0.52, stiff=1.0)                 # soft cheeks
el('BALL', (0, -1.85, 2.30), 0.36, stiff=1.0)                     # chin
el('ELLIPSOID', (0, 0.15, 1.30), 1.35, (1.0, 1.22, 0.85))         # body
el('BALL', (0, -0.80, 1.55), 1.05, stiff=1.6)                     # chest fluff
for x in (0.62, -0.62):                                           # front legs
    el('CAPSULE', (x, -0.80, 0.60), 0.48, (0.12, 1, 1), UP)
    el('BALL', (x, -0.88, 0.36), 0.48)
for x in (0.66, -0.66):                                           # hind legs
    el('CAPSULE', (x, 0.95, 0.62), 0.54, (0.12, 1, 1), UP)
    el('BALL', (x, 0.92, 0.38), 0.50)
for t in range(16):                                               # tail: dense chain
    f = t / 15
    y = 1.25 + 1.05 * math.sin(f * 1.25)
    z = 1.40 + 1.30 * f
    r = 0.42 + 0.22 * math.sin(f * math.pi * 0.8)
    el('BALL', (0, y, z), r, stiff=1.6)

# Metaballs -> mesh -> voxel remesh (watertight) -> quad remesh (clean topology).
bpy.context.view_layer.objects.active = mbo
mbo.select_set(True)
bpy.ops.object.convert(target='MESH')
body = bpy.context.active_object
body.name = 'cat_body'
rm = body.modifiers.new('voxel', 'REMESH')
rm.mode, rm.voxel_size, rm.use_smooth_shade = 'VOXEL', 0.055, True
bpy.ops.object.modifier_apply(modifier='voxel')
bpy.ops.object.shade_smooth()
print('body faces', len(body.data.polygons))

# ---------------------------------------------------------------- face features by ray-cast
deps = bpy.context.evaluated_depsgraph_get()

def surface(origin, direction):
    ok, loc, nor, _ = body.ray_cast(Vector(origin), Vector(direction).normalized(), depsgraph=deps)
    if not ok:
        raise RuntimeError(f'no surface hit from {origin}')
    return loc, nor

def eye(x):
    loc, nor = surface((x, -6, 2.70), (0, 1, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.24, location=loc - nor * 0.07)
    o = bpy.context.active_object
    o.scale = (1.0, 0.75, 1.1)
    bpy.ops.object.shade_smooth()
    return o

def nose():
    loc, nor = surface((0, -6, 2.40), (0, 1, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.1, location=loc + nor * 0.02)
    o = bpy.context.active_object
    o.scale = (1.3, 0.7, 0.85)
    bpy.ops.object.shade_smooth()
    return o

def ear(x):
    loc, nor = surface((x, -0.95, 6), (0, 0, -1))
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.56, radius2=0.0, depth=1.0, location=loc + Vector((0, 0, 0.30)))
    o = bpy.context.active_object
    o.scale = (1.0, 0.38, 1.0)
    o.rotation_euler = (math.radians(-6), math.radians(-12 if x > 0 else 12), 0)
    s = o.modifiers.new('sub', 'SUBSURF'); s.levels = s.render_levels = 1
    bpy.ops.object.modifier_apply(modifier='sub')
    bpy.ops.object.shade_smooth()
    return o

eyes = [eye(0.52), eye(-0.52)]
nose_o = nose()
ears = [ear(0.78), ear(-0.78)]

# ---------------------------------------------------------------- placeholder materials
def mat(name, color, rough=0.9, sheen=0.6, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Sheen Weight'].default_value = sheen
    p.inputs['Coat Weight'].default_value = coat
    return m

# ---- coat: colour-point (Himalayan), painted per vertex by body region
def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)

def lin(srgb):  # colour attributes are linear
    return Vector([c ** 2.2 for c in srgb])
BASE, POINT = lin((0.93, 0.86, 0.72)), lin((0.42, 0.36, 0.34))
def point_amount(co):
    mask = 1 - smooth(0.75, 1.40, (co - Vector((0, -2.15, 2.45))).length)      # face mask
    paws = 1 - smooth(0.55, 0.95, co.z)                                          # socks
    tail = smooth(1.55, 2.05, co.y) * smooth(1.3, 1.9, co.z)                     # tail
    return max(mask, paws, tail)

def paint(obj, fn):
    attr = obj.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for v in obj.data.vertices:
        a = fn(v.co)
        c = BASE.lerp(POINT, a)  # linear
        attr.data[v.index].color = (c.x, c.y, c.z, 1)

paint(body, point_amount)
for e in ears:
    paint(e, lambda co: 1.0)

fur = mat('fur', (1, 1, 1))
nt = fur.node_tree
ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
nt.links.new(ca.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
for o in [body, *ears]:
    o.data.materials.append(fur)

# Glossy plush-toy eyes: blue iris ring, dark pupil, clear coat.
eye_m = mat('eye', (0.01, 0.015, 0.05), rough=0.05, sheen=0.0, coat=1.0)
en = eye_m.node_tree
tc = en.nodes.new('ShaderNodeTexCoord')
sep = en.nodes.new('ShaderNodeSeparateXYZ')
en.links.new(tc.outputs['Object'], sep.inputs[0])
# Distance from the eye's front axis (object Y is the view direction).
vm = en.nodes.new('ShaderNodeVectorMath'); vm.operation = 'LENGTH'
cmb = en.nodes.new('ShaderNodeCombineXYZ')
en.links.new(sep.outputs['X'], cmb.inputs['X']); en.links.new(sep.outputs['Z'], cmb.inputs['Z'])
en.links.new(cmb.outputs[0], vm.inputs[0])
ramp = en.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = 0.10; ramp.color_ramp.elements[0].color = (0.005, 0.005, 0.012, 1)
ramp.color_ramp.elements[1].position = 0.17; ramp.color_ramp.elements[1].color = (0.06, 0.16, 0.45, 1)
e3 = ramp.color_ramp.elements.new(0.24); e3.color = (0.02, 0.05, 0.18, 1)
en.links.new(vm.outputs['Value'], ramp.inputs['Fac'])
en.links.new(ramp.outputs['Color'], en.nodes['Principled BSDF'].inputs['Base Color'])
for o in eyes:
    o.data.materials.append(eye_m)
nose_o.data.materials.append(mat('nose', (0.75, 0.35, 0.38), rough=0.5, sheen=0.2))

# To metres.
for o in [body, *eyes, nose_o, *ears]:
    o.location *= 0.1
    o.scale *= 0.1

# ---------------------------------------------------------------- render
w = bpy.data.worlds.new('w'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.9, 0.88, 0.88, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.35
scene.world = w
key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'AREA'))
key.data.energy, key.data.size = 25, 1.0
key.location = (0.6, -0.8, 1.0)
key.rotation_euler = (target := Vector((0, 0, 0.18)) - key.location).to_track_quat('-Z', 'Y').to_euler()
scene.collection.objects.link(key)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
bpy.context.active_object.data.materials.append(mat('floor', (0.8, 0.78, 0.78), sheen=0))

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.lens = 70
scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 48
scene.render.resolution_x = scene.render.resolution_y = 512
target = Vector((0, 0.05, 0.17))
for name, az in (('front', 0), ('q34', 40), ('side', 90)):
    a = math.radians(az)
    cam.location = target + Vector((math.sin(a) * 1.35, -math.cos(a) * 1.35, 0.2))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, f'{TAG}-{name}.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f'{TAG}.blend'))
print('done')
